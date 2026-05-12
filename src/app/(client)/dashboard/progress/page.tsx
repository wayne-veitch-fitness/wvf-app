'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WELLNESS_METRICS = [
  { key: 'sleep_rating',     label: 'Sleep' },
  { key: 'energy_rating',    label: 'Energy' },
  { key: 'nutrition_rating', label: 'Nutrition' },
  { key: 'recovery_rating',  label: 'Recovery' },
  { key: 'stress_rating',    label: 'Stress mgmt' },
  { key: 'training_rating',  label: 'Training' },
]

function calcStreak(checkins: any[]): number {
  if (!checkins.length) return 0
  const sorted = [...checkins].sort(
    (a, b) => new Date(b.week_starting).getTime() - new Date(a.week_starting).getTime()
  )
  // Allow streak if most recent check-in is this week or last week
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const now       = Date.now()
  const newest    = new Date(sorted[0].week_starting).getTime()
  if (now - newest > 2 * msPerWeek) return 0  // too stale to count

  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].week_starting).getTime()
    const curr = new Date(sorted[i].week_starting).getTime()
    if (Math.round((prev - curr) / msPerWeek) === 1) streak++
    else break
  }
  return streak
}

// ─── Weight chart ─────────────────────────────────────────────────────────────

function WeightChart({ checkins }: { checkins: any[] }) {
  const sorted = [...checkins]
    .filter(c => c.weight_kg)
    .sort((a, b) => new Date(a.week_starting).getTime() - new Date(b.week_starting).getTime())
  if (sorted.length < 2) return null

  const weights = sorted.map(c => parseFloat(c.weight_kg))
  const min = Math.min(...weights) - 1
  const max = Math.max(...weights) + 1
  const W = 480, H = 120, pad = { l: 40, r: 16, t: 12, b: 28 }
  const cw = W - pad.l - pad.r
  const ch = H - pad.t - pad.b
  const x = (i: number) => pad.l + (i / (sorted.length - 1)) * cw
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * ch
  const points = sorted.map((_, i) => `${x(i)},${y(weights[i])}`).join(' ')
  const area = `M${x(0)},${y(weights[0])} ` +
    sorted.map((_, i) => `L${x(i)},${y(weights[i])}`).join(' ') +
    ` L${x(sorted.length - 1)},${pad.t + ch} L${x(0)},${pad.t + ch} Z`

  const first    = weights[0]
  const last     = weights[weights.length - 1]
  const diff     = parseFloat((last - first).toFixed(1))
  const isDown   = diff < 0
  const diffLabel = diff === 0 ? 'No change' : `${isDown ? '↓' : '↑'} ${Math.abs(diff)} kg`

  return (
    <div className="bg-white border border-[var(--border)] rounded-xl px-4 pt-4 pb-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)]">Weight</div>
        <div className={`text-sm font-bold ${isDown ? 'text-green-600' : diff > 0 ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>
          {diffLabel}
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-xs text-[var(--text-muted)]">Started {first} kg</span>
        <span className="text-[var(--text-subtle)]">→</span>
        <span className="text-sm font-bold">{last} kg now</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 110 }}>
        <defs>
          <linearGradient id="pg-wgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#20243D" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#20243D" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map(t => {
          const yy  = pad.t + t * ch
          const val = (max - t * (max - min)).toFixed(1)
          return (
            <g key={t}>
              <line x1={pad.l} y1={yy} x2={W - pad.r} y2={yy} stroke="#f0f0f0" strokeWidth="1" />
              <text x={pad.l - 4} y={yy + 4} textAnchor="end" fontSize="9" fill="#aaa">{val}</text>
            </g>
          )
        })}
        <path d={area} fill="url(#pg-wgrad)" />
        <polyline points={points} fill="none" stroke="#20243D" strokeWidth="2" strokeLinejoin="round" />
        {sorted.map((c, i) => {
          const label = new Date(c.week_starting).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
          return (
            <g key={i}>
              <circle cx={x(i)} cy={y(weights[i])} r="3" fill="#20243D" />
              {(i === 0 || i === sorted.length - 1 || sorted.length <= 5) && (
                <text x={x(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#aaa">{label}</text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [loading,   setLoading]   = useState(true)
  const [checkins,  setCheckins]  = useState<any[]>([])
  const [pbList,    setPbList]    = useState<{ name: string; weight: number }[]>([])
  const [totalWorkouts,    setTotalWorkouts]    = useState(0)
  const [workoutsThisMonth, setWorkoutsThisMonth] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: client } = await supabase
        .from('clients').select('id').eq('profile_id', user.id).single()
      if (!client) { setLoading(false); return }

      // Check-ins (for weight chart, streak, wellness)
      const { data: ci } = await supabase
        .from('checkins')
        .select('week_starting, weight_kg, overall_rating, sleep_rating, energy_rating, nutrition_rating, recovery_rating, stress_rating, training_rating')
        .eq('client_id', client.id)
        .order('week_starting', { ascending: false })
      setCheckins(ci ?? [])

      // Workout logs (for stats + PBs)
      const { data: wlRows } = await supabase
        .from('workout_logs')
        .select('id, logged_at')
        .eq('client_id', client.id)
        .order('logged_at', { ascending: false })

      const allLogIds = (wlRows ?? []).map((w: any) => w.id)
      setTotalWorkouts(allLogIds.length)

      const now        = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      setWorkoutsThisMonth(
        (wlRows ?? []).filter((w: any) => w.logged_at >= monthStart).length
      )

      // Set logs for PBs
      if (allLogIds.length > 0) {
        const { data: sl } = await supabase
          .from('set_logs')
          .select('workout_log_id, weight_kg, program_exercises(exercise_id, exercises(name))')
          .in('workout_log_id', allLogIds)
          .not('weight_kg', 'is', null)

        const pbByEx: Record<string, { weight: number; name: string }> = {}
        for (const s of sl ?? []) {
          const pe     = s.program_exercises as any
          const exId   = pe?.exercise_id
          const exName = pe?.exercises?.name
          if (!exId || !s.weight_kg) continue
          if (!pbByEx[exId] || s.weight_kg > pbByEx[exId].weight) {
            pbByEx[exId] = { weight: s.weight_kg, name: exName ?? 'Exercise' }
          }
        }
        setPbList(
          Object.values(pbByEx)
            .sort((a, b) => a.name.localeCompare(b.name))
        )
      }

      setLoading(false)
    }
    load()
  }, [])

  // Wellness: average of last 4 check-ins that have ratings
  const recentWithRatings = checkins
    .filter(c => WELLNESS_METRICS.some(m => c[m.key] != null))
    .slice(0, 4)

  const wellnessAverages = WELLNESS_METRICS.map(m => {
    const vals = recentWithRatings.map(c => c[m.key]).filter((v): v is number => v != null)
    return { ...m, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null }
  }).filter(m => m.avg !== null)

  const streak = calcStreak(checkins)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="pb-24">
      <header className="bg-white border-b border-[var(--border)] px-5 py-4">
        <img src="/logos/icon-navy.png" alt="Wayne Veitch Fitness" className="h-7 w-auto" />
      </header>

      <div className="px-5 py-6 max-w-lg mx-auto space-y-5">
        <h1 className="text-2xl font-bold">My progress</h1>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Workouts',    value: totalWorkouts },
            { label: 'This month',  value: workoutsThisMonth },
            { label: streak > 1 ? `${streak}-week streak` : 'Check-ins', value: streak > 1 ? '🔥' : checkins.length },
          ].map(s => (
            <div key={s.label} className="bg-white border border-[var(--border)] rounded-xl px-3 py-3 text-center">
              <div className="text-2xl font-bold leading-tight">{s.value}</div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Weight chart */}
        {checkins.filter(c => c.weight_kg).length >= 2 ? (
          <WeightChart checkins={checkins} />
        ) : checkins.filter(c => c.weight_kg).length === 1 ? (
          <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-1">Weight</div>
            <div className="text-2xl font-bold">
              {checkins.find(c => c.weight_kg)?.weight_kg} <span className="text-sm font-normal text-[var(--text-muted)]">kg</span>
            </div>
            <div className="text-xs text-[var(--text-subtle)] mt-1">Chart appears after your second weigh-in</div>
          </div>
        ) : null}

        {/* Personal bests */}
        {pbList.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
              Personal bests
            </div>
            <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
              {pbList.map((pb, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-b-0">
                  <span className="text-sm flex-1 truncate">{pb.name}</span>
                  <span className="text-sm font-bold text-amber-600">🏆 {pb.weight} kg</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wellness averages */}
        {wellnessAverages.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
              Wellness · avg last {recentWithRatings.length} check-in{recentWithRatings.length !== 1 ? 's' : ''}
            </div>
            <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-4 space-y-3">
              {wellnessAverages.map(m => {
                const pct    = ((m.avg ?? 0) / 10) * 100
                const colour = (m.avg ?? 0) >= 7 ? 'bg-green-500' : (m.avg ?? 0) >= 5 ? 'bg-amber-400' : 'bg-red-400'
                const textCol = (m.avg ?? 0) >= 7 ? 'text-green-600' : (m.avg ?? 0) >= 5 ? 'text-amber-500' : 'text-red-500'
                return (
                  <div key={m.key} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-[var(--text-muted)] flex-shrink-0">{m.label}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${colour}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className={`text-xs font-bold w-6 text-right flex-shrink-0 ${textCol}`}>
                      {(m.avg ?? 0).toFixed(1)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {checkins.length === 0 && totalWorkouts === 0 && (
          <div className="bg-white border border-[var(--border)] rounded-xl p-8 text-center">
            <div className="text-3xl mb-3">📈</div>
            <div className="text-sm font-semibold text-[var(--text)]">Nothing to show yet</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              Your progress will appear here after your first check-in and workout.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
