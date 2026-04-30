import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CoachDashboardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'coach') redirect('/dashboard')

  const stats = [
    { label: 'Active clients', value: '--' },
    { label: 'Check-ins to review', value: '--' },
    { label: 'Programs active', value: '--' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">
          Hey{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h1>
        <button className="bg-[var(--accent)] text-white text-sm px-4 py-2 rounded-md font-medium">
          + New client
        </button>
      </div>

      <div className="flex gap-8 mb-8">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
            Check-ins waiting for you
          </div>
          <div className="bg-white border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--text-muted)]">
            No pending check-ins.
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
            Recent training logs
          </div>
          <div className="bg-white border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--text-muted)]">
            No recent activity.
          </div>
        </div>
      </div>
    </div>
  )
}
