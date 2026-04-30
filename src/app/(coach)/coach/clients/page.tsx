import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ClientsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'coach') redirect('/dashboard')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Clients</h1>
        <button className="bg-[var(--accent)] text-white text-sm px-4 py-2 rounded-md font-medium">
          + Add client
        </button>
      </div>
      <div className="bg-white border border-[var(--border)] rounded-xl p-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">No clients yet.</p>
        <p className="text-xs text-[var(--text-subtle)] mt-1">Click + Add client to invite your first client.</p>
      </div>
    </div>
  )
}
