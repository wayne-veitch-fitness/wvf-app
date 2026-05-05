import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend, FROM, APP_URL, emailWrapper } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    // Must be authenticated
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { checkinId } = await req.json()
    if (!checkinId) return NextResponse.json({ error: 'Missing checkinId' }, { status: 400 })

    // Get checkin + client name
    const admin = createAdminClient()
    const { data: checkin } = await admin
      .from('checkins')
      .select('*, clients!inner(profile_id, profiles!inner(full_name))')
      .eq('id', checkinId)
      .single()

    if (!checkin) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const clientName  = checkin.clients?.profiles?.full_name ?? 'A client'
    const firstName   = clientName.split(' ')[0]
    const overall     = checkin.overall_rating
    const weekDate    = new Date(checkin.week_starting).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    const coachEmail  = process.env.COACH_EMAIL
    const checkinUrl  = `${APP_URL}/coach/checkins/${checkinId}`

    if (!coachEmail) {
      console.warn('COACH_EMAIL env var not set — skipping email')
      return NextResponse.json({ ok: true, skipped: true })
    }

    const ratingColour = overall >= 8 ? '#16a34a' : overall >= 5 ? '#d97706' : '#dc2626'

    const html = emailWrapper('New check-in', `
      <h2 style="margin:0 0 4px;font-size:20px;color:#111827;">New check-in from ${firstName}</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Week of ${weekDate}</p>

      ${overall ? `
      <div style="display:inline-block;background:#f3f4f6;border-radius:10px;padding:12px 20px;margin-bottom:20px;">
        <span style="font-size:13px;color:#6b7280;">Overall rating&nbsp;&nbsp;</span>
        <span style="font-size:22px;font-weight:700;color:${ratingColour};">${overall}<span style="font-size:14px;font-weight:400;color:#9ca3af;">/10</span></span>
      </div>
      ` : ''}

      ${checkin.weight_kg ? `
      <p style="margin:0 0 16px;font-size:14px;color:#374151;">
        <strong>Weight:</strong> ${checkin.weight_kg} kg
      </p>
      ` : ''}

      ${checkin.comments ? `
      <div style="background:#eff6ff;border-left:3px solid #3b82f6;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
        <p style="margin:0;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;margin-bottom:6px;">${firstName}'s note</p>
        <p style="margin:0;font-size:14px;color:#1e3a8a;font-style:italic;">"${checkin.comments}"</p>
      </div>
      ` : ''}

      <a href="${checkinUrl}" style="display:block;background:#20243D;color:white;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:8px;">
        View check-in &amp; reply →
      </a>
    `)

    await resend.emails.send({
      from: FROM,
      to: coachEmail,
      subject: `New check-in from ${clientName} — week of ${weekDate}`,
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Email error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
