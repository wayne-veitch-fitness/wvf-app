import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function CoachDashboardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'coach') redirect('/dashboard')

  // Fetch real stats
  const { count: clientCount } = await supabase
    .from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true)

  const { count: programCount } = await supabase
    .from('programs').select('*', { count: 'exact', head: true })

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { count: pendingCheckins } = await supabase
    .from('checkins').select('*', { count: 'exact', head: true })
    .is('reviewed_at', null)
    .gte('week_starting', oneWeekAgo)

  // Recent check-ins (last 5 unreviewed)
  const { data: recentCheckins } = await supabase
    .from('checkins')
    .select(`
      id, week_starting, overall_rating, submitted_at, comments,
      clients!inner ( profiles!inner ( full_name ) )
    `)
    .is('reviewed_at', null)
    .order('submitted_at', { ascending: false })
    .limit(5)

  const stats = [
    { label: 'Active clients',      value: clientCount ?? 0 },
    { label: 'Check-ins to review', value: pendingCheckins ?? 0 },
    { label: 'Programs',            value: programCount ?? 0 },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">
          Hey{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h1>
        <Link href="/coach/clients">
          <button className="bg-[var(--accent)] text-white text-sm px-4 py-2 rounded-md font-medium">
            + New client
          </button>
        </Link>
      </div>

      <div className="flex gap-10 mb-8">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
            Check-ins waiting for you
          </div>
          {recentCheckins && recentCheckins.length > 0 ? (
            <div className="bg-white border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
              {recentCheckins.map((c: any) => {
                const name = c.clients?.profiles?.full_name ?? 'Client'
                const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                const date = new Date(c.week_starting).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{name}</div>
                      <div className="text-xs text-[var(--text-muted)] truncate">{c.comments}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold">{c.overall_rating}/10</div>
                      <div className="text-xs text-[var(--text-muted)]">{date}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--text-muted)]">
              All caught up — no pending check-ins.
            </div>
          )}
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
            Quick links
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/coach/clients',   label: 'Clients'          },
              { href: '/coach/programs',  label: 'Programs'         },
              { href: '/coach/exercises', label: 'Exercise library' },
              { href: '/coach/settings',  label: 'Settings'         },
            ].map((link) => (
              <Link key={link.href} href={link.href}>
                <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-medium hover:border-[var(--accent)] transition-colors cursor-pointer">
                  {link.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
