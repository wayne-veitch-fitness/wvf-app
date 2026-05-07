'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function ratingColour(r: number) {
  if (r >= 8) return 'bg-green-100 text-green-700'
  if (r >= 5) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-600'
}

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

  const first = weights[0]
  const last = weights[weights.length - 1]
  const diff = (last - first).toFixed(1)
  const isDown = last < first

  return (
    <div className="bg-white border border-[var(--border)] rounded-xl px-4 pt-4 pb-2 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)]">Weight trend</div>
        <div className={`text-sm font-bold ${isDown ? 'text-green-600' : 'text-red-500'}`}>
          {isDown ? '↓' : '↑'} {Math.abs(parseFloat(diff))} kg overall
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 110 }}>
        <defs>
          <linearGradient id="wgrad-client" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#20243D" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#20243D" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map(t => {
          const yy = pad.t + t * ch
          const val = (max - t * (max - min)).toFixed(1)
          return (
            <g key={t}>
              <line x1={pad.l} y1={yy} x2={W - pad.r} y2={yy} stroke="#f0f0f0" strokeWidth="1" />
              <text x={pad.l - 4} y={yy + 4} textAnchor="end" fontSize="9" fill="#aaa">{val}</text>
            </g>
          )
        })}
        <path d={area} fill="url(#wgrad-client)" />
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

function OverallChart({ checkins }: { checkins: any[] }) {
  const sorted = [...checkins]
    .filter(c => c.overall_rating)
    .sort((a, b) => new Date(a.week_starting).getTime() - new Date(b.week_starting).getTime())

  if (sorted.length < 2) return null

  const ratings = sorted.map(c => c.overall_rating)
  const W = 480, H = 80, pad = { l: 24, r: 16, t: 10, b: 24 }
  const cw = W - pad.l - pad.r
  const ch = H - pad.t - pad.b

  const x = (i: number) => pad.l + (i / (sorted.length - 1)) * cw
  const y = (v: number) => pad.t + (1 - (v - 1) / 9) * ch

  const points = sorted.map((_, i) => `${x(i)},${y(ratings[i])}`).join(' ')
  const avg = (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1)

  return (
    <div className="bg-white border border-[var(--border)] rounded-xl px-4 pt-4 pb-2 mb-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)]">Overall rating trend</div>
        <div className="text-sm font-bold text-[var(--text-muted)]">avg {avg}/10</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 70 }}>
        {[1, 5, 10].map(v => {
          const yy = y(v)
          return (
            <g key={v}>
              <line x1={pad.l} y1={yy} x2={W - pad.r} y2={yy} stroke="#f0f0f0" strokeWidth="1" />
              <text x={pad.l - 4} y={yy + 4} textAnchor="end" fontSize="9" fill="#aaa">{v}</text>
            </g>
          )
        })}
        <polyline points={points} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" />
        {sorted.map((c, i) => {
          const r = ratings[i]
          const colour = r >= 8 ? '#22c55e' : r >= 5 ? '#f59e0b' : '#ef4444'
          return <circle key={i} cx={x(i)} cy={y(r)} r="3.5" fill={colour} />
        })}
      </svg>
    </div>
  )
}

export default function CheckinHistoryPage() {
  const supabase = createClient()
  const router = useRouter()
  const [checkins, setCheckins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: client } = await supabase
        .from('clients').select('id').eq('profile_id', user.id).single()
      if (!client) { setLoading(false); return }
      const { data } = await supabase
        .from('checkins')
        .select('id, week_starting, weight_kg, overall_rating, coach_reply, reviewed_at, is_monthly')
        .eq('client_id', client.id)
        .order('week_starting', { ascending: false })
      setCheckins(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const weightCheckins = [...checkins]
    .filter(c => c.weight_kg)
    .sort((a, b) => new Date(a.week_starting).getTime() - new Date(b.week_starting).getTime())
  const startWeight = weightCheckins[0]?.weight_kg
  const currentWeight = weightCheckins[weightCheckins.length - 1]?.weight_kg
  const weightChange = startWeight && currentWeight ? (currentWeight - startWeight).toFixed(1) : null

  return (
    <div className="pb-24">
      <header className="bg-white border-b border-[var(--border)] px-5 py-4 flex items-center gap-3">
        <Link href="/dashboard/checkin" className="text-[var(--text-muted)] hover:text-[var(--text)]">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <img src="/logos/icon-navy.png" alt="Wayne Veitch Fitness" className="h-7 w-auto" />
      </header>

      <div className="px-5 py-5 max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-1">My progress</h1>
        <p className="text-xs text-[var(--text-muted)] mb-5">
          {checkins.length} check-in{checkins.length !== 1 ? 's' : ''} total
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : checkins.length === 0 ? (
          <div className="text-center py-12 text-sm text-[var(--text-muted)]">No check-ins yet.</div>
        ) : (
          <>
            {/* Stats row */}
            {currentWeight && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-white border border-[var(--border)] rounded-xl px-3 py-3 text-center">
                  <div className="text-lg font-bold">{startWeight}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Start kg</div>
                </div>
                <div className="bg-white border border-[var(--border)] rounded-xl px-3 py-3 text-center">
                  <div className="text-lg font-bold">{currentWeight}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Current kg</div>
                </div>
                <div className="bg-white border border-[var(--border)] rounded-xl px-3 py-3 text-center">
                  <div className={`text-lg font-bold ${weightChange && parseFloat(weightChange) < 0 ? 'text-green-600' : weightChange && parseFloat(weightChange) > 0 ? 'text-red-500' : ''}`}>
                    {weightChange ? `${parseFloat(weightChange) > 0 ? '+' : ''}${weightChange}` : '—'}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Change kg</div>
                </div>
              </div>
            )}

            {/* Charts */}
            <WeightChart checkins={checkins} />
            <OverallChart checkins={checkins} />

            {/* Check-in list */}
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">All check-ins</div>
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
          </>
        )}
      </div>
    </div>
  )
}
