import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Verify caller is coach
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  // Resolve the auth user ID from the clients table
  const { data: client } = await admin
    .from('clients')
    .select('profile_id')
    .eq('id', params.id)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  // Deleting the auth user cascades: auth.users → profiles → clients
  // → checkins, food_diary, workout_logs, client_programs (all ON DELETE CASCADE)
  const { error } = await admin.auth.admin.deleteUser(client.profile_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
