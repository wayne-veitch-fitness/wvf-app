import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, welcomeEmailHtml, APP_URL } from '@/lib/email'

const createClientSchema = z.object({
  full_name:     z.string().min(2, 'Name must be at least 2 characters').max(100),
  email:         z.string().email('Invalid email address'),
  password:      z.string().min(8, 'Password must be at least 8 characters').max(72),
  package_label: z.string().max(100).optional(),
  checkin_day:   z.number().int().min(0).max(6).optional().nullable(),
})

export async function POST(req: NextRequest) {
  // Verify caller is coach
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = createClientSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid input'
    return NextResponse.json({ error: message }, { status: 400 })
  }
  const { full_name, email, password, package_label, checkin_day } = parsed.data

  const admin = createAdminClient()

  // Create auth user
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: 'client' },
  })
  if (authErr || !created.user) {
    return NextResponse.json({ error: authErr?.message ?? 'Failed to create user' }, { status: 400 })
  }

  const newUserId = created.user.id

  // Ensure profile exists (trigger should fire, but upsert as safety net)
  await admin.from('profiles').upsert({
    id: newUserId,
    full_name,
    role: 'client',
  })

  // Create client record
  const { data: clientRow, error: clientErr } = await admin.from('clients').insert({
    profile_id: newUserId,
    package_label: package_label || null,
    checkin_day: checkin_day ?? null,
    is_active: true,
  }).select('id').single()

  if (clientErr) {
    return NextResponse.json({ error: clientErr.message }, { status: 400 })
  }

  // Send welcome email
  await sendEmail({
    to: email,
    subject: `Welcome to Wayne Veitch Fitness 🎉`,
    html: welcomeEmailHtml({
      firstName: full_name.split(' ')[0],
      email,
      password,
      appUrl: APP_URL,
    }),
  })

  return NextResponse.json({ clientId: clientRow.id })
}
