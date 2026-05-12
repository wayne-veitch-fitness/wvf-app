import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_URL, emailWrapper, sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Only the coach can trigger reply notifications
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { checkinId } = await req.json()
    if (!checkinId) return NextResponse.json({ error: 'Missing checkinId' }, { status: 400 })

    const admin = createAdminClient()
    const { data: checkin } = await admin
      .from('checkins')
      .select('*, clients!inner(profile_id, profiles!inner(full_name))')
      .eq('id', checkinId)
      .single()

    if (!checkin) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const profileId  = checkin.clients?.profile_id
    const clientName = checkin.clients?.profiles?.full_name ?? 'there'
    const firstName  = clientName.split(' ')[0]
    const weekDate   = new Date(checkin.week_starting).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

    const { data: authUser } = await admin.auth.admin.getUserById(profileId)
    const clientEmail = authUser?.user?.email

    if (!clientEmail) {
      console.warn('No email address found for client — skipping reply notification')
      return NextResponse.json({ ok: true, skipped: true })
    }

    const html = emailWrapper(`
      <h2 style="margin:0 0 4px;font-size:20px;color:#111827;">Hey ${firstName}, Wayne has replied!</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Your check-in for the week of ${weekDate} has been reviewed.</p>

      ${checkin.coach_reply ? `
      <div style="background:#20243D;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Wayne's reply</p>
        <p style="margin:0;font-size:14px;color:white;line-height:1.6;">${checkin.coach_reply.replace(/\n/g, '<br>')}</p>
      </div>
      ` : ''}

      <a href="${APP_URL}/dashboard/checkin" style="display:block;background:#20243D;color:white;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
        Open the app →
      </a>
    `)

    await sendEmail({
      to: clientEmail,
      subject: 'Wayne has replied to your check-in',
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('coach-replied email error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
