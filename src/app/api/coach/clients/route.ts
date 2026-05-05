import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  // Verify caller is coach
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { full_name, email, password, package_label, checkin_day } = await req.json()
  if (!full_name || !email || !password) {
    return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
  }

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

  return NextResponse.json({ clientId: clientRow.id })
}
