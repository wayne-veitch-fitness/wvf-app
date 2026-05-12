import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, APP_URL, emailWrapper } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { checkinId } = await req.json()
    if (!checkinId) return NextResponse.json({ error: 'Missing checkinId' }, { status: 400 })

    const admin = createAdminClient()
    const { data: checkin } = await admin
      .from('checkins')
      .select('*, clients!inner(profile_id, profiles!inner(full_name))')
      .eq('id', checkinId)
      .single()

    // Verify the caller is either the coach or the client who owns this check-in
    if (checkin) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const isCoach = profile?.role === 'coach'
      const isOwner = checkin.clients?.profile_id === user.id
      if (!isCoach && !isOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (!checkin) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const coachEmail = process.env.COACH_EMAIL
    if (!coachEmail) {
      console.warn('COACH_EMAIL not set — skipping email')
      return NextResponse.json({ ok: true, skipped: true })
    }

    const clientName = checkin.clients?.profiles?.full_name ?? 'A client'
    const firstName  = clientName.split(' ')[0]
    const overall    = checkin.overall_rating
    const weekDate   = new Date(checkin.week_starting).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    const ratingColour = overall >= 8 ? '#16a34a' : overall >= 5 ? '#d97706' : '#dc2626'
    const checkinUrl = `${APP_URL}/coach/checkins/${checkinId}`

    await sendEmail({
      to: coachEmail,
      subject: `New check-in from ${clientName} — week of ${weekDate}`,
      html: emailWrapper(`
        <h2 style="margin:0 0 4px;font-size:20px;color:#111827;">New check-in from ${firstName}</h2>
        <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Week of ${weekDate}</p>

        ${overall ? `
        <div style="display:inline-block;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 20px;margin-bottom:20px;">
          <span style="font-size:13px;color:#6b7280;">Overall rating&nbsp;&nbsp;</span>
          <span style="font-size:22px;font-weight:700;color:${ratingColour};">${overall}<span style="font-size:14px;font-weight:400;color:#9ca3af;">/10</span></span>
        </div>
        ` : ''}

        ${checkin.weight_kg ? `
        <p style="margin:0 0 16px;font-size:14px;color:#374151;"><strong>Weight:</strong> ${checkin.weight_kg} kg</p>
        ` : ''}

        ${checkin.comments ? `
        <div style="background:#eff6ff;border-left:3px solid #3b82f6;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
          <p style="margin:0 0 4px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">${firstName}'s note</p>
          <p style="margin:0;font-size:14px;color:#1e3a8a;font-style:italic;">"${checkin.comments}"</p>
        </div>
        ` : ''}

        <a href="${checkinUrl}" style="display:block;background:#20243D;color:white;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          View check-in &amp; reply →
        </a>
      `),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('checkin-submitted email error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
