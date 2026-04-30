import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'coach') redirect('/dashboard')

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Settings</h1>
      <div className="bg-white border border-[var(--border)] rounded-xl p-6 max-w-md">
        <p className="text-sm text-[var(--text-muted)]">Settings coming soon.</p>
      </div>
    </div>
  )
}
