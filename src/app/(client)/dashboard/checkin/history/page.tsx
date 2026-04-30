import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function ratingColour(r: number) {
  if (r >= 8) return 'bg-green-100 text-green-700'
  if (r >= 5) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-600'
}

export default async function CheckinHistoryPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: client } = await supabase
    .from('clients').select('id').eq('profile_id', user.id).single()

  const checkins = client ? (await supabase
    .from('checkins')
    .select('id, week_starting, weight_kg, overall_rating, coach_reply, reviewed_at, is_monthly')
    .eq('client_id', client.id)
    .order('week_starting', { ascending: false })).data ?? [] : []

  return (
    <div className="pb-24">
      <header className="bg-white border-b border-[var(--border)] px-5 py-4 flex items-center gap-3">
        <Link href="/dashboard/checkin" className="text-[var(--text-muted)] hover:text-[var(--text)]">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <span className="text-sm font-bold tracking-widest">WVF</span>
      </header>

      <div className="px-5 py-5 max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-1">Check-in history</h1>
        <p className="text-xs text-[var(--text-muted)] mb-5">{checkins.length} check-in{checkins.length !== 1 ? 's' : ''} total</p>

        {checkins.length === 0 ? (
          <div className="text-center py-12 text-sm text-[var(--text-muted)]">No check-ins yet.</div>
        ) : (
          <div className="space-y-2">
            {checkins.map((c: any) => {
              const date = new Date(c.week_starting)
              const label = date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
              return (
                <Link
                  key={c.id}
                  href={`/dashboard/checkin/${c.id}`}
                  className="bg-white border border-[var(--border)] rounded-xl px-4 py-3 flex items-center justify-between hover:border-[var(--accent)] transition-colors block"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Week of {label}</span>
                        {c.is_monthly && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">Monthly</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {c.weight_kg && (
                          <span className="text-xs text-[var(--text-muted)]">{c.weight_kg} kg</span>
                        )}
                        {c.coach_reply ? (
                          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Wayne replied
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--text-subtle)]">Awaiting reply</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.overall_rating && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ratingColour(c.overall_rating)}`}>
                        {c.overall_rating}/10
                      </span>
                    )}
                    <svg className="w-4 h-4 text-[var(--text-subtle)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
