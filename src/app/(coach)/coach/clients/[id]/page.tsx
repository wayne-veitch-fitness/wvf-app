'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const METRICS = [
  { key: 'sleep_rating',     label: 'Sleep',      short: 'Sleep' },
  { key: 'nutrition_rating', label: 'Nutrition',   short: 'Nutrition' },
  { key: 'steps_rating',     label: 'Daily steps', short: 'Steps' },
  { key: 'water_rating',     label: 'Water',       short: 'Water' },
  { key: 'activity_rating',  label: 'Activity',    short: 'Activity' },
  { key: 'training_rating',  label: 'Training',    short: 'Training' },
  { key: 'stress_rating',    label: 'Stress mgmt', short: 'Stress' },
  { key: 'energy_rating',    label: 'Energy',      short: 'Energy' },
  { key: 'recovery_rating',  label: 'Recovery',    short: 'Recovery' },
  { key: 'overall_rating',   label: 'Overall',     short: 'Overall' },
]

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

  const first = weights[0], last = weights[weights.length - 1]
  const diff = (last - first).toFixed(1)
  const isDown = last < first

  return (
    <div className="bg-white border border-[var(--border)] rounded-xl px-4 pt-4 pb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)]">Weight trend</div>
        <div className={`text-sm font-bold ${isDown ? 'text-green-600' : 'text-red-500'}`}>
          {isDown ? '↓' : '↑'} {Math.abs(parseFloat(diff))} kg
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
        <defs>
          <linearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
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
        {/* Area fill */}
        <path d={area} fill="url(#wgrad)" />
        {/* Line */}
        <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
        {/* Dots + date labels */}
        {sorted.map((c, i) => {
          const label = new Date(c.week_starting).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
          return (
            <g key={i}>
              <circle cx={x(i)} cy={y(weights[i])} r="3" fill="#3b82f6" />
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

function RatingsOverview({ checkins }: { checkins: any[] }) {
  const latest = [...checkins]
    .filter(c => METRICS.some(m => c[m.key]))
    .sort((a, b) => new Date(b.week_starting).getTime() - new Date(a.week_starting).getTime())[0]
  if (!latest) return null

  return (
    <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-3">
        Latest ratings · {new Date(latest.week_starting).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
        {METRICS.map(m => {
          const val = latest[m.key]
          if (!val) return null
          const colour = val >= 8 ? 'bg-green-500' : val >= 5 ? 'bg-amber-400' : 'bg-red-400'
          return (
            <div key={m.key} className="flex items-center gap-2">
              <div className="w-24 text-xs text-[var(--text-muted)] flex-shrink-0">{m.short}</div>
              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${colour}`} style={{ width: `${(val / 10) * 100}%` }} />
              </div>
              <div className={`text-xs font-bold w-4 text-right flex-shrink-0 ${
                val >= 8 ? 'text-green-600' : val >= 5 ? 'text-amber-500' : 'text-red-500'
              }`}>{val}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const router   = useRouter()
  const [client,   setClient]   = useState<any>(null)
  const [checkins, setCheckins] = useState<any[]>([])
  const [program,  setProgram]  = useState<any>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase
        .from('clients')
        .select('id, package_label, checkin_day, profiles!inner(full_name, avatar_url)')
        .eq('id', params.id)
        .single()
      if (!c) { router.push('/coach/clients'); return }
      setClient(c)

      const { data: ci } = await supabase
        .from('checkins')
        .select('*')
        .eq('client_id', params.id)
        .order('week_starting', { ascending: false })
      setCheckins(ci ?? [])

      const { data: cp } = await supabase
        .from('client_programs')
        .select('programs(id, name)')
        .eq('client_id', params.id)
        .eq('is_active', true)
        .single()
      setProgram((cp?.programs as any) ?? null)

      setLoading(false)
    }
    load()
  }, [params.id])

  if (loading) return <div className="text-sm text-[var(--text-muted)]">Loading...</div>
  if (!client) return null

  const name     = client.profiles?.full_name ?? 'Client'
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
  const days     = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const lastCheckin = checkins[0]
  const totalCheckins = checkins.length

  // Compute weight change
  const weightCheckins = [...checkins].filter(c => c.weight_kg).sort((a,b) =>
    new Date(a.week_starting).getTime() - new Date(b.week_starting).getTime()
  )
  const firstWeight  = weightCheckins[0]?.weight_kg
  const latestWeight = weightCheckins[weightCheckins.length - 1]?.weight_kg
  const weightChange = firstWeight && latestWeight ? (latestWeight - firstWeight).toFixed(1) : null

  // Average overall rating
  const overallRatings = checkins.filter(c => c.overall_rating).map(c => c.overall_rating)
  const avgOverall = overallRatings.length
    ? (overallRatings.reduce((a, b) => a + b, 0) / overallRatings.length).toFixed(1)
    : null

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-xs text-[var(--text-muted)]">
        <Link href="/coach/clients" className="hover:text-[var(--accent)]">Clients</Link>
        <span className="text-[var(--text-subtle)]">/</span>
        <span>{name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-[var(--accent)] text-white font-bold text-xl flex items-center justify-center flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{name}</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-[var(--text-muted)]">{client.package_label ?? 'No package'}</span>
            {client.checkin_day != null && (
              <span className="text-xs text-[var(--text-muted)]">· Check-in: {days[client.checkin_day]}</span>
            )}
            {program && (
              <Link href={`/coach/programs/${program.id}`}>
                <span className="text-xs text-[var(--accent)] hover:underline">· {program.name}</span>
              </Link>
            )}
          </div>
        </div>
        <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full">Active</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Check-ins',    value: totalCheckins },
          { label: 'Current weight', value: latestWeight ? `${latestWeight} kg` : '—' },
          { label: 'Weight change',  value: weightChange ? `${parseFloat(weightChange) > 0 ? '+' : ''}${weightChange} kg` : '—',
            colour: weightChange ? parseFloat(weightChange) < 0 ? 'text-green-600' : 'text-red-500' : '' },
          { label: 'Avg overall',  value: avgOverall ? `${avgOverall}/10` : '—',
            colour: avgOverall ? parseFloat(avgOverall) >= 8 ? 'text-green-600' : 'text-amber-500' : '' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[var(--border)] rounded-xl px-4 py-3">
            <div className={`text-2xl font-bold ${(s as any).colour ?? ''}`}>{s.value}</div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        <WeightChart checkins={checkins} />
        <RatingsOverview checkins={checkins} />
      </div>

      {/* Check-in history */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
          Check-in history
        </div>
        <div className="bg-white border border-[var(--border)] rounded-xl divide-y divide-[var(--border)] overflow-hidden">
          {checkins.map((c: any) => {
            const date = new Date(c.week_starting).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
            const reviewed = !!c.reviewed_at
            return (
              <Link key={c.id} href={`/coach/checkins/${c.id}`}>
                <div className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex-shrink-0 w-28 text-sm text-[var(--text-muted)]">{date}</div>
                  {c.is_monthly && (
                    <span className="text-[10px] bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                      Monthly
                    </span>
                  )}
                  <div className="flex-1 text-xs text-[var(--text-muted)] truncate italic">
                    {c.comments ? `"${c.comments}"` : ''}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {c.weight_kg && (
                      <span className="text-xs text-[var(--text-muted)]">{c.weight_kg} kg</span>
                    )}
                    {c.overall_rating && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        c.overall_rating >= 8 ? 'bg-green-100 text-green-700'
                        : c.overall_rating >= 5 ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-600'
                      }`}>{c.overall_rating}/10</span>
                    )}
                    {reviewed
                      ? <span className="text-xs text-green-600 font-medium">Replied ✓</span>
                      : <span className="text-xs text-[var(--accent)] font-medium">Pending</span>
                    }
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
