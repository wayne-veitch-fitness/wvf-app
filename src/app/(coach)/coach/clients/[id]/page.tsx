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
  const [client,    setClient]    = useState<any>(null)
  const [checkins,  setCheckins]  = useState<any[]>([])
  const [program,   setProgram]   = useState<any>(null)
  const [foodDiary, setFoodDiary] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showEdit,  setShowEdit]  = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState({ package_label: '', checkin_day: '' })
  const [expandedDiaryDate, setExpandedDiaryDate] = useState<string | null>(null)
  const [workoutLogs,  setWorkoutLogs]  = useState<any[]>([])
  const [setCountMap,  setSetCountMap]  = useState<Record<string, number>>({})
  const [pbCountMap,   setPbCountMap]   = useState<Record<string, number>>({})
  const [pbList,       setPbList]       = useState<{ name: string; weight: number; logId: string }[]>([])

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase
        .from('clients')
        .select('id, package_label, checkin_day, is_active, profiles!inner(full_name, avatar_url)')
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

      const { data: fd } = await supabase
        .from('food_diary')
        .select('*')
        .eq('client_id', params.id)
        .order('diary_date', { ascending: false })
        .limit(14)
      setFoodDiary(fd ?? [])

      // Workout logs + personal bests
      const { data: wlRows } = await supabase
        .from('workout_logs')
        .select('id, logged_at, program_days(name)')
        .eq('client_id', params.id)
        .order('logged_at', { ascending: false })

      const allLogIds = (wlRows ?? []).map((w: any) => w.id)
      let allSetLogs: any[] = []
      if (allLogIds.length > 0) {
        const { data: sl } = await supabase
          .from('set_logs')
          .select('workout_log_id, weight_kg, program_exercises(exercise_id, exercises(name))')
          .in('workout_log_id', allLogIds)
        allSetLogs = sl ?? []
      }

      const scMap: Record<string, number> = {}
      const pbByEx: Record<string, { weight: number; name: string; logId: string }> = {}
      for (const sl of allSetLogs) {
        scMap[sl.workout_log_id] = (scMap[sl.workout_log_id] ?? 0) + 1
        const exId   = sl.program_exercises?.exercise_id
        const exName = sl.program_exercises?.exercises?.name
        if (!exId || !sl.weight_kg) continue
        if (!pbByEx[exId] || sl.weight_kg > pbByEx[exId].weight) {
          pbByEx[exId] = { weight: sl.weight_kg, name: exName ?? 'Exercise', logId: sl.workout_log_id }
        }
      }
      const pcMap: Record<string, number> = {}
      for (const pb of Object.values(pbByEx)) {
        pcMap[pb.logId] = (pcMap[pb.logId] ?? 0) + 1
      }

      setWorkoutLogs(wlRows ?? [])
      setSetCountMap(scMap)
      setPbCountMap(pcMap)
      setPbList(Object.values(pbByEx).sort((a, b) => b.weight - a.weight))

      setLoading(false)
    }
    load()
  }, [params.id])

  async function handleEdit() {
    setSavingEdit(true)
    await supabase.from('clients').update({
      package_label: editForm.package_label.trim() || null,
      checkin_day: editForm.checkin_day !== '' ? parseInt(editForm.checkin_day) : null,
      updated_at: new Date().toISOString(),
    }).eq('id', params.id)
    const { data: updated } = await supabase
      .from('clients').select('id, package_label, checkin_day, is_active, profiles!inner(full_name, avatar_url)').eq('id', params.id).single()
    setClient(updated)
    setSavingEdit(false)
    setShowEdit(false)
  }

  async function handleToggleActive() {
    const newState = !client.is_active
    const msg = newState ? 'Reactivate this client?' : 'Deactivate this client? They will no longer appear in the active list.'
    if (!confirm(msg)) return
    await supabase.from('clients').update({ is_active: newState }).eq('id', params.id)
    setClient((c: any) => ({ ...c, is_active: newState }))
  }

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
        <div className={`w-14 h-14 rounded-full text-white font-bold text-xl flex items-center justify-center flex-shrink-0 ${client.is_active ? 'bg-[var(--accent)]' : 'bg-gray-300'}`}>
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditForm({ package_label: client.package_label ?? '', checkin_day: client.checkin_day?.toString() ?? '' }); setShowEdit(true) }}
            className="text-sm border border-[var(--border)] px-3 py-1.5 rounded-md font-medium hover:border-[var(--accent)] transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleToggleActive}
            className={`text-sm px-3 py-1.5 rounded-md font-medium transition-colors ${client.is_active ? 'text-red-500 border border-red-200 hover:bg-red-50' : 'text-green-600 border border-green-200 hover:bg-green-50'}`}
          >
            {client.is_active ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <WeightChart checkins={checkins} />
        <RatingsOverview checkins={checkins} />
      </div>

      {/* Workouts */}
      {workoutLogs.length > 0 && (
        <div className="mb-5">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
            Workouts
          </div>
          <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
            {workoutLogs.slice(0, 8).map((wl: any) => {
              const pbCount  = pbCountMap[wl.id] ?? 0
              const setCount = setCountMap[wl.id] ?? 0
              const dateLabel = new Date(wl.logged_at).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
              return (
                <div key={wl.id} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-b-0">
                  <div className="text-sm text-[var(--text-muted)] w-28 flex-shrink-0">{dateLabel}</div>
                  <div className="flex-1 text-sm truncate">{(wl.program_days as any)?.name ?? '—'}</div>
                  <div className="text-xs text-[var(--text-subtle)] flex-shrink-0">{setCount} sets</div>
                  {pbCount > 0 && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex-shrink-0">
                      🏆 {pbCount} PB{pbCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Personal bests */}
      {pbList.length > 0 && (
        <div className="mb-5">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
            Personal bests
          </div>
          <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
            {pbList.map((pb, i) => {
              const wl = workoutLogs.find((w: any) => w.id === pb.logId)
              const dateLabel = wl
                ? new Date(wl.logged_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
                : ''
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] last:border-b-0">
                  <span className="text-sm flex-1 truncate">{pb.name}</span>
                  <span className="text-sm font-bold text-amber-600">🏆 {pb.weight} kg</span>
                  {dateLabel && (
                    <span className="text-xs text-[var(--text-subtle)] flex-shrink-0">{dateLabel}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Food Diary */}
      {foodDiary.length > 0 && (
        <div className="mb-5">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
            Food diary
          </div>
          <div className="bg-white border border-[var(--border)] rounded-xl divide-y divide-[var(--border)] overflow-hidden">
            {foodDiary.map(fd => {
              const isOpen = expandedDiaryDate === fd.diary_date
              const [y, m, day] = fd.diary_date.split('-').map(Number)
              const dateLabel = new Date(y, m - 1, day).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
              const hasAny = fd.breakfast || fd.lunch || fd.dinner || fd.snacks
              return (
                <div key={fd.diary_date}>
                  <button
                    onClick={() => setExpandedDiaryDate(isOpen ? null : fd.diary_date)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <svg className={`w-3.5 h-3.5 text-[var(--text-subtle)] flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-sm flex-1">{dateLabel}</span>
                    {!hasAny && <span className="text-xs text-[var(--text-subtle)]">Nothing logged</span>}
                    {fd.water_litres != null && (
                      <span className="text-xs text-[var(--text-muted)]">💧 {fd.water_litres}L</span>
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 pt-2 space-y-3 border-t border-[var(--border)] bg-gray-50">
                      {[
                        { label: 'Breakfast', value: fd.breakfast },
                        { label: 'Lunch',     value: fd.lunch },
                        { label: 'Dinner',    value: fd.dinner },
                        { label: 'Snacks',    value: fd.snacks },
                      ].filter(x => x.value).map(x => (
                        <div key={x.label}>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)] mb-0.5">{x.label}</div>
                          <div className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">{x.value}</div>
                        </div>
                      ))}
                      {!hasAny && (
                        <p className="text-sm text-[var(--text-subtle)] italic">No meals logged for this day.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

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

      {/* Edit Client Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEdit(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 shadow-xl">
            <h2 className="text-base font-bold mb-4">Edit {name}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">Package</label>
                <input
                  type="text"
                  value={editForm.package_label}
                  onChange={e => setEditForm(f => ({ ...f, package_label: e.target.value }))}
                  placeholder="WVF Membership"
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">Check-in day</label>
                <select
                  value={editForm.checkin_day}
                  onChange={e => setEditForm(f => ({ ...f, checkin_day: e.target.value }))}
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] bg-white"
                >
                  <option value="">Not set</option>
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowEdit(false)} className="flex-1 border border-[var(--border)] rounded-lg py-2.5 text-sm font-medium">Cancel</button>
              <button
                onClick={handleEdit}
                disabled={savingEdit}
                className="flex-1 bg-[var(--accent)] text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40"
              >
                {savingEdit ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
