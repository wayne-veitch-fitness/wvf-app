import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const METRICS = [
  { key: 'sleep_rating',     label: 'Sleep' },
  { key: 'nutrition_rating', label: 'Nutrition' },
  { key: 'steps_rating',     label: 'Steps' },
  { key: 'water_rating',     label: 'Water' },
  { key: 'activity_rating',  label: 'Activity' },
  { key: 'training_rating',  label: 'Training' },
  { key: 'stress_rating',    label: 'Stress' },
  { key: 'energy_rating',    label: 'Energy' },
  { key: 'recovery_rating',  label: 'Recovery' },
  { key: 'overall_rating',   label: 'Overall' },
]

function RatingDot({ value }: { value: number | null }) {
  if (!value) return <span className="text-[var(--text-subtle)]">—</span>
  const colour = value >= 8 ? 'bg-green-500' : value >= 5 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold ${colour}`}>
      {value}
    </span>
  )
}

export default async function CheckinsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') redirect('/dashboard')

  const { data: pending } = await supabase
    .from('checkins')
    .select(`
      id, week_starting, weight_kg, comments, submitted_at,
      sleep_rating, nutrition_rating, steps_rating, water_rating, activity_rating,
      training_rating, stress_rating, energy_rating, recovery_rating, overall_rating,
      clients!inner ( profiles!inner ( full_name ) )
    `)
    .is('reviewed_at', null)
    .order('submitted_at', { ascending: false })

  const { data: reviewed } = await supabase
    .from('checkins')
    .select(`
      id, week_starting, weight_kg, overall_rating, reviewed_at, coach_reply,
      clients!inner ( profiles!inner ( full_name ) )
    `)
    .not('reviewed_at', 'is', null)
    .order('reviewed_at', { ascending: false })
    .limit(20)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Check-ins</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {pending?.length ?? 0} pending · {reviewed?.length ?? 0} reviewed
          </p>
        </div>
      </div>

      {/* Pending */}
      {pending && pending.length > 0 && (
        <div className="mb-8">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
            Waiting for your reply
          </div>
          <div className="space-y-2">
            {pending.map((c: any) => {
              const name = c.clients?.profiles?.full_name ?? 'Client'
              const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
              const date = new Date(c.week_starting).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
              return (
                <Link key={c.id} href={`/coach/checkins/${c.id}`}>
                  <div className="bg-white border-2 border-[var(--accent)] rounded-xl px-4 py-4 hover:shadow-sm transition-shadow cursor-pointer">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-[var(--accent)] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{name}</div>
                        <div className="text-xs text-[var(--text-muted)]">Week of {date}</div>
                      </div>
                      {c.weight_kg && (
                        <div className="text-right">
                          <div className="text-sm font-bold">{c.weight_kg} kg</div>
                          <div className="text-xs text-[var(--text-muted)]">weight</div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {METRICS.map(m => (
                        <div key={m.key} className="text-center">
                          <RatingDot value={(c as any)[m.key]} />
                          <div className="text-[9px] text-[var(--text-subtle)] mt-0.5 w-7 truncate text-center">{m.label}</div>
                        </div>
                      ))}
                    </div>
                    {c.comments && (
                      <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-[var(--text-muted)] italic">
                        "{c.comments}"
                      </div>
                    )}
                    <div className="mt-3 text-xs font-semibold text-[var(--accent)]">Tap to reply →</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {pending?.length === 0 && (
        <div className="bg-white border border-[var(--border)] rounded-xl p-6 text-center mb-8">
          <div className="text-2xl mb-2">✓</div>
          <p className="text-sm font-medium">All caught up!</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">No pending check-ins right now.</p>
        </div>
      )}

      {/* Reviewed */}
      {reviewed && reviewed.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
            Recently reviewed
          </div>
          <div className="bg-white border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
            {reviewed.map((c: any) => {
              const name = c.clients?.profiles?.full_name ?? 'Client'
              const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
              const date = new Date(c.week_starting).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
              return (
                <Link key={c.id} href={`/coach/checkins/${c.id}`}>
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{name}</div>
                      <div className="text-xs text-[var(--text-muted)]">Week of {date}</div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {c.overall_rating && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          c.overall_rating >= 8 ? 'bg-green-100 text-green-700'
                          : c.overall_rating >= 5 ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-600'
                        }`}>{c.overall_rating}/10</span>
                      )}
                      <span className="text-xs text-green-600 font-medium">Replied ✓</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
