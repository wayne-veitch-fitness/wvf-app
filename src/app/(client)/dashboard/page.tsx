import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ClientDashboardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role === 'coach') redirect('/coach')

  const { data: client } = await supabase
    .from('clients').select('id').eq('profile_id', user.id).single()

  let lastCheckin = null
  let programName = null

  if (client) {
    const { data: checkins } = await supabase
      .from('checkins')
      .select('week_starting, overall_rating, weight_kg, comments')
      .eq('client_id', client.id)
      .order('week_starting', { ascending: false })
      .limit(1)
    lastCheckin = checkins?.[0] ?? null

    const { data: cp } = await supabase
      .from('client_programs')
      .select('programs(name)')
      .eq('client_id', client.id)
      .eq('is_active', true)
      .single()
    programName = (cp?.programs as any)?.name ?? null
  }

  const name = profile?.full_name?.split(' ')[0] ?? 'there'
  const checkinDate = lastCheckin
    ? new Date(lastCheckin.week_starting).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    : null

  return (
    <div className="pb-24">
      <header className="bg-white border-b border-[var(--border)] px-5 py-4 flex items-center justify-between">
        <img src="/logos/icon-navy.png" alt="Wayne Veitch Fitness" className="h-7 w-auto" />
        <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white text-xs font-bold flex items-center justify-center">
          {profile?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() ?? '?'}
        </div>
      </header>

      <div className="px-5 py-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-1">Hey {name} 👋</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">Here's your overview for this week.</p>

        {!client && (
          <div className="bg-[var(--accent)] text-white rounded-xl px-5 py-5 mb-5">
            <div className="font-semibold mb-1">You're all set up!</div>
            <div className="text-sm opacity-80">Wayne is getting your profile ready. Your program and check-ins will appear here once everything is configured.</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-1">Program</div>
            <div className="text-sm font-semibold leading-tight">{programName ?? 'Not assigned'}</div>
          </div>
          <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-1">Last check-in</div>
            <div className="text-sm font-semibold">{checkinDate ?? '—'}</div>
            {lastCheckin?.overall_rating && (
              <div className="text-xs text-[var(--text-muted)] mt-0.5">{lastCheckin.overall_rating}/10 overall</div>
            )}
          </div>
        </div>

        {lastCheckin?.weight_kg && (
          <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-4 mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-1">Current weight</div>
            <div className="text-2xl font-bold">{lastCheckin.weight_kg} <span className="text-sm font-normal text-[var(--text-muted)]">kg</span></div>
          </div>
        )}

        {lastCheckin?.comments && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-400 mb-1">Your last note</div>
            <div className="text-sm text-blue-800 italic">"{lastCheckin.comments}"</div>
          </div>
        )}
      </div>
    </div>
  )
}
