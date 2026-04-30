import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ClientsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'coach') redirect('/dashboard')

  const { data: clients } = await supabase
    .from('clients')
    .select(`
      id, package_label, checkin_day, is_active,
      profiles!inner ( full_name ),
      checkins ( week_starting, overall_rating, submitted_at )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Clients</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{clients?.length ?? 0} active</p>
        </div>
        <button className="bg-[var(--accent)] text-white text-sm px-4 py-2 rounded-md font-medium">
          + Add client
        </button>
      </div>

      <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-widest text-[var(--text-subtle)]">
              <th className="text-left px-4 py-3 font-medium">Client</th>
              <th className="text-left px-4 py-3 font-medium">Package</th>
              <th className="text-left px-4 py-3 font-medium">Check-in day</th>
              <th className="text-left px-4 py-3 font-medium">Last check-in</th>
              <th className="text-left px-4 py-3 font-medium">Overall</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {clients?.map((c: any) => {
              const name = c.profiles?.full_name ?? 'Unknown'
              const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
              const sortedCheckins = (c.checkins ?? []).sort((a: any, b: any) =>
                new Date(b.week_starting).getTime() - new Date(a.week_starting).getTime()
              )
              const lastCheckin = sortedCheckins[0]
              const lastDate = lastCheckin
                ? new Date(lastCheckin.week_starting).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
                : '—'
              const rating = lastCheckin?.overall_rating ?? null
              return (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/coach/clients/${c.id}`} className="flex items-center gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {initials}
                      </div>
                      <span className="font-medium group-hover:text-[var(--accent)] transition-colors">{name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{c.package_label ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{c.checkin_day != null ? days[c.checkin_day] : '—'}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{lastDate}</td>
                  <td className="px-4 py-3">
                    {rating != null ? (
                      <span className={`font-semibold ${rating >= 8 ? 'text-green-600' : rating >= 6 ? 'text-amber-500' : 'text-red-500'}`}>
                        {rating}/10
                      </span>
                    ) : <span className="text-[var(--text-subtle)]">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
