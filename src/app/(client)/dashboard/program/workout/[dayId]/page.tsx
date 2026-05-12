'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type SetEntry = {
  dbId?: string
  setNumber: number
  weightKg: string
  reps: string
  durationSeconds: string
  logged: boolean
  newPbWeight: boolean
  newPbVolume: boolean
}

type PbData = { bestWeightKg: number; bestVolume: number }

type LastSet = {
  setNumber: number
  weightKg: number | null
  reps: number | null
  durationSeconds: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getYouTubeId(url: string | null): string | null {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

function groupSuperset(exercises: any[]) {
  const groups: { group: string | null; items: any[] }[] = []
  for (const ex of exercises) {
    const g = ex.superset_group ?? null
    const last = groups[groups.length - 1]
    if (last && last.group === g && g !== null) last.items.push(ex)
    else groups.push({ group: g, items: [ex] })
  }
  return groups
}

function repsTarget(ex: any): string | null {
  if (ex.duration_seconds) return `${ex.duration_seconds}s`
  if (ex.reps_min && ex.reps_max && ex.reps_min !== ex.reps_max) return `${ex.reps_min}–${ex.reps_max}`
  if (ex.reps_min) return `${ex.reps_min}`
  return null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WorkoutPage({ params }: { params: Promise<{ dayId: string }> }) {
  const supabase = createClient()
  const router   = useRouter()

  const [dayId,         setDayId]         = useState<string | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [day,           setDay]           = useState<any>(null)
  const [clientId,      setClientId]      = useState<string | null>(null)
  const [workoutLogId,  setWorkoutLogId]  = useState<string | null>(null)
  const [sets,          setSets]          = useState<Record<string, SetEntry[]>>({})
  const [lastSets,      setLastSets]      = useState<Record<string, LastSet[]>>({})
  const [pbs,           setPbs]           = useState<Record<string, PbData>>({})    // keyed by exercise_id
  const [exIdMap,       setExIdMap]       = useState<Record<string, string>>({})    // program_exercise_id → exercise_id
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null)
  const [finishing,     setFinishing]     = useState(false)

  // Resolve async params (Next.js 15 compatible)
  useEffect(() => {
    Promise.resolve(params).then(p => setDayId(p.dayId))
  }, [params])

  useEffect(() => {
    if (!dayId) return
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: client } = await supabase
        .from('clients').select('id').eq('profile_id', user.id).single()
      if (!client) { router.push('/dashboard/program'); return }
      setClientId(client.id)

      // Load the day's full exercise structure
      const { data: dayData } = await supabase
        .from('program_days')
        .select(`
          id, name, day_number,
          program_sections (
            id, name, sort_order,
            program_exercises (
              id, label, superset_group, sets, reps_min, reps_max,
              duration_seconds, rir_min, rir_max, rest_seconds, notes, sort_order,
              exercises ( id, name, video_url )
            )
          )
        `)
        .eq('id', dayId)
        .single()

      if (!dayData) { router.push('/dashboard/program'); return }

      const sortedDay = {
        ...dayData,
        program_sections: [...(dayData.program_sections ?? [])]
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((s: any) => ({
            ...s,
            program_exercises: [...(s.program_exercises ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order),
          })),
      }
      setDay(sortedDay)

      // Build program_exercise_id → exercise_id map
      const idMap: Record<string, string> = {}
      const allProgramExercises: any[] = []
      for (const section of sortedDay.program_sections) {
        for (const pe of section.program_exercises) {
          if (pe.exercises?.id) idMap[pe.id] = pe.exercises.id
          allProgramExercises.push(pe)
        }
      }
      setExIdMap(idMap)

      // ── Last session ────────────────────────────────────────────────────────
      const { data: prevLogs } = await supabase
        .from('workout_logs')
        .select('id, logged_at')
        .eq('client_id', client.id)
        .eq('program_day_id', dayId)
        .order('logged_at', { ascending: false })
        .limit(1)

      const lastSetsMap: Record<string, LastSet[]> = {}
      if (prevLogs?.[0]) {
        const { data: prevSets } = await supabase
          .from('set_logs')
          .select('program_exercise_id, set_number, weight_kg, reps, duration_seconds')
          .eq('workout_log_id', prevLogs[0].id)
          .order('set_number')

        for (const s of prevSets ?? []) {
          if (!lastSetsMap[s.program_exercise_id]) lastSetsMap[s.program_exercise_id] = []
          lastSetsMap[s.program_exercise_id].push({
            setNumber:       s.set_number,
            weightKg:        s.weight_kg,
            reps:            s.reps,
            durationSeconds: s.duration_seconds,
          })
        }
      }
      setLastSets(lastSetsMap)

      // ── Personal bests ──────────────────────────────────────────────────────
      const { data: allLogs } = await supabase
        .from('workout_logs')
        .select('id')
        .eq('client_id', client.id)

      const logIds = allLogs?.map(w => w.id) ?? []
      const pbMap: Record<string, PbData> = {}

      if (logIds.length > 0) {
        const { data: pbSets } = await supabase
          .from('set_logs')
          .select('program_exercise_id, weight_kg, reps')
          .in('workout_log_id', logIds)
          .not('weight_kg', 'is', null)

        for (const s of pbSets ?? []) {
          const exerciseId = idMap[s.program_exercise_id]
          if (!exerciseId || !s.weight_kg) continue
          const vol = s.weight_kg * (s.reps ?? 1)
          if (!pbMap[exerciseId]) {
            pbMap[exerciseId] = { bestWeightKg: s.weight_kg, bestVolume: vol }
          } else {
            if (s.weight_kg > pbMap[exerciseId].bestWeightKg) pbMap[exerciseId].bestWeightKg = s.weight_kg
            if (vol > pbMap[exerciseId].bestVolume)            pbMap[exerciseId].bestVolume = vol
          }
        }
      }
      setPbs(pbMap)

      // ── Initialise set state ─────────────────────────────────────────────────
      // Pre-fill weight/reps from last session; leave empty if no history
      const initialSets: Record<string, SetEntry[]> = {}
      for (const pe of allProgramExercises) {
        const count   = pe.sets ?? 3
        const prevFor = lastSetsMap[pe.id] ?? []
        initialSets[pe.id] = Array.from({ length: count }, (_, i) => {
          const prev = prevFor[i]
          return {
            setNumber:       i + 1,
            weightKg:        prev?.weightKg?.toString()        ?? '',
            reps:            prev?.reps?.toString()            ?? '',
            durationSeconds: prev?.durationSeconds?.toString() ?? '',
            logged:          false,
            newPbWeight:     false,
            newPbVolume:     false,
          }
        })
      }
      setSets(initialSets)
      setLoading(false)
    }
    init()
  }, [dayId])

  // ── Lazy-create workout log on first set logged ──────────────────────────────
  async function ensureWorkoutLog(): Promise<string | null> {
    if (workoutLogId) return workoutLogId
    if (!clientId || !dayId) return null
    const { data: wl } = await supabase
      .from('workout_logs')
      .insert({ client_id: clientId, program_day_id: dayId })
      .select('id')
      .single()
    if (wl) { setWorkoutLogId(wl.id); return wl.id }
    return null
  }

  // ── Log a single set ─────────────────────────────────────────────────────────
  async function logSet(programExerciseId: string, setIdx: number) {
    const set = sets[programExerciseId]?.[setIdx]
    if (!set) return

    const logId = await ensureWorkoutLog()
    if (!logId) return

    const weightKg       = set.weightKg       ? parseFloat(set.weightKg)       : null
    const reps           = set.reps           ? parseInt(set.reps)             : null
    const durationSeconds = set.durationSeconds ? parseInt(set.durationSeconds) : null

    const { data: saved } = await supabase
      .from('set_logs')
      .upsert({
        ...(set.dbId ? { id: set.dbId } : {}),
        workout_log_id:      logId,
        program_exercise_id: programExerciseId,
        set_number:          set.setNumber,
        weight_kg:           weightKg,
        reps,
        duration_seconds:    durationSeconds,
      })
      .select('id')
      .single()

    // PB detection
    const exerciseId = exIdMap[programExerciseId]
    let newPbWeight = false
    let newPbVolume = false

    if (weightKg && exerciseId) {
      const cur = pbs[exerciseId]
      if (!cur || weightKg > cur.bestWeightKg) {
        newPbWeight = true
        setPbs(p => ({ ...p, [exerciseId]: { ...p[exerciseId], bestWeightKg: weightKg } }))
      }
      if (reps) {
        const vol = weightKg * reps
        if (!cur || vol > cur.bestVolume) {
          newPbVolume = true
          setPbs(p => ({ ...p, [exerciseId]: { ...p[exerciseId], bestVolume: vol } }))
        }
      }
    }

    setSets(prev => ({
      ...prev,
      [programExerciseId]: prev[programExerciseId].map((s, i) =>
        i === setIdx ? { ...s, dbId: saved?.id, logged: true, newPbWeight, newPbVolume } : s
      ),
    }))
  }

  function updateSet(
    programExerciseId: string,
    setIdx: number,
    field: 'weightKg' | 'reps' | 'durationSeconds',
    value: string,
  ) {
    setSets(prev => ({
      ...prev,
      [programExerciseId]: prev[programExerciseId].map((s, i) =>
        i === setIdx ? { ...s, [field]: value, logged: false } : s
      ),
    }))
  }

  function addSet(programExerciseId: string) {
    setSets(prev => {
      const current  = prev[programExerciseId] ?? []
      const lastLogged = [...current].reverse().find(s => s.logged)
      return {
        ...prev,
        [programExerciseId]: [
          ...current,
          {
            setNumber:       current.length + 1,
            weightKg:        lastLogged?.weightKg        ?? '',
            reps:            lastLogged?.reps            ?? '',
            durationSeconds: lastLogged?.durationSeconds ?? '',
            logged:          false,
            newPbWeight:     false,
            newPbVolume:     false,
          },
        ],
      }
    })
  }

  function lastTimeLabel(programExerciseId: string): string | null {
    const prev = lastSets[programExerciseId]
    if (!prev?.length) return null
    return prev
      .map(s => {
        if (s.durationSeconds) return `${s.durationSeconds}s`
        if (s.weightKg && s.reps) return `${s.weightKg}×${s.reps}`
        if (s.reps) return `${s.reps} reps`
        return null
      })
      .filter(Boolean)
      .join(' / ')
  }

  async function finishWorkout() {
    setFinishing(true)
    router.push('/dashboard/program')
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const loggedSetCount = Object.values(sets).flat().filter(s => s.logged).length

  return (
    <div className="pb-28">
      {/* Sticky header */}
      <header className="bg-white border-b border-[var(--border)] px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Link href="/dashboard/program" className="text-sm text-[var(--text-muted)] flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Program
          </Link>
          <div className="text-center">
            <div className="text-sm font-semibold leading-tight">{day?.name}</div>
            {loggedSetCount > 0 && (
              <div className="text-[10px] text-[var(--text-muted)]">{loggedSetCount} set{loggedSetCount !== 1 ? 's' : ''} logged</div>
            )}
          </div>
          <button
            onClick={finishWorkout}
            disabled={finishing}
            className="text-sm font-semibold text-[var(--accent)] disabled:opacity-40"
          >
            {finishing ? 'Saving…' : 'Finish'}
          </button>
        </div>
      </header>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-6">
        {day?.program_sections?.map((section: any) => (
          <div key={section.id}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
              {section.name}
            </div>

            <div className="space-y-3">
              {groupSuperset(section.program_exercises).map((group, gi) => (
                <div key={gi}>
                  {group.group && group.items.length > 1 && (
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                      Superset
                    </div>
                  )}

                  {group.items.map((ex: any) => {
                    const exerciseId = ex.exercises?.id
                    const pb         = exerciseId ? pbs[exerciseId] : null
                    const prevLabel  = lastTimeLabel(ex.id)
                    const exSets     = sets[ex.id] ?? []
                    const isTimed    = !!ex.duration_seconds
                    const target     = repsTarget(ex)
                    const videoId    = getYouTubeId(ex.exercises?.video_url)
                    const videoOpen  = expandedVideo === ex.id

                    return (
                      <div
                        key={ex.id}
                        className={`bg-white border border-[var(--border)] rounded-xl overflow-hidden ${
                          group.group && group.items.length > 1 ? 'border-blue-200' : ''
                        }`}
                      >
                        {/* Exercise header */}
                        <div className="px-4 pt-3 pb-2.5 border-b border-[var(--border)]">
                          <div className="flex items-start gap-3">
                            {ex.label && (
                              <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500 mt-0.5">
                                {ex.label}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-sm font-semibold leading-tight">{ex.exercises?.name}</span>
                                {target && ex.sets && (
                                  <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                                    {ex.sets}×{target}
                                  </span>
                                )}
                              </div>
                              {ex.notes && (
                                <div className="text-xs text-[var(--text-muted)] mt-0.5">{ex.notes}</div>
                              )}
                              {/* Last time + PB */}
                              {(prevLabel || pb) && (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                                  {prevLabel && (
                                    <span className="text-xs text-[var(--text-muted)]">
                                      Last: {prevLabel}
                                    </span>
                                  )}
                                  {pb?.bestWeightKg > 0 && (
                                    <span className="text-xs text-amber-600 font-semibold">
                                      🏆 {pb.bestWeightKg} kg
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {/* Video button */}
                            {videoId && (
                              <button
                                onClick={() => setExpandedVideo(videoOpen ? null : ex.id)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                                  videoOpen
                                    ? 'bg-[var(--accent)] text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                              >
                                {videoOpen ? (
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                ) : (
                                  <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                )}
                              </button>
                            )}
                          </div>

                          {/* YouTube embed */}
                          {videoOpen && videoId && (
                            <div className="mt-2 rounded-lg overflow-hidden bg-black aspect-video">
                              <iframe
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          )}
                        </div>

                        {/* Set column headers */}
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 border-b border-[var(--border)]">
                          <div className="w-7 text-[10px] font-semibold text-[var(--text-subtle)] uppercase tracking-wide text-center">
                            Set
                          </div>
                          <div className={`text-[10px] font-semibold text-[var(--text-subtle)] uppercase tracking-wide text-center ${isTimed ? 'flex-1' : 'flex-1'}`}>
                            {isTimed ? 'Time (s)' : 'kg'}
                          </div>
                          {!isTimed && (
                            <div className="w-16 text-[10px] font-semibold text-[var(--text-subtle)] uppercase tracking-wide text-center">
                              Reps
                            </div>
                          )}
                          <div className="w-9" />
                        </div>

                        {/* Set rows */}
                        {exSets.map((set, setIdx) => {
                          const isPb = set.logged && (set.newPbWeight || set.newPbVolume)
                          return (
                            <div
                              key={setIdx}
                              className={`flex items-center gap-2 px-4 py-2 border-b border-[var(--border)] last:border-b-0 transition-colors ${
                                isPb ? 'bg-amber-50' : set.logged ? 'bg-green-50/50' : ''
                              }`}
                            >
                              <div className="w-7 text-center text-sm font-semibold text-[var(--text-muted)]">
                                {set.setNumber}
                              </div>

                              {isTimed ? (
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={set.durationSeconds}
                                  onChange={e => updateSet(ex.id, setIdx, 'durationSeconds', e.target.value)}
                                  placeholder={ex.duration_seconds?.toString() ?? '30'}
                                  className="flex-1 text-center border border-[var(--border)] rounded-lg py-1.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                                />
                              ) : (
                                <>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    value={set.weightKg}
                                    onChange={e => updateSet(ex.id, setIdx, 'weightKg', e.target.value)}
                                    placeholder="—"
                                    className="flex-1 text-center border border-[var(--border)] rounded-lg py-1.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                                  />
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    value={set.reps}
                                    onChange={e => updateSet(ex.id, setIdx, 'reps', e.target.value)}
                                    placeholder={ex.reps_min?.toString() ?? '—'}
                                    className="w-16 text-center border border-[var(--border)] rounded-lg py-1.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                                  />
                                </>
                              )}

                              {/* Log / confirm button */}
                              <button
                                onClick={() => logSet(ex.id, setIdx)}
                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                                  isPb
                                    ? 'bg-amber-400 text-white'
                                    : set.logged
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                                title={isPb ? 'New PB!' : set.logged ? 'Logged' : 'Log set'}
                              >
                                {isPb ? (
                                  <span className="text-sm leading-none">🏆</span>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          )
                        })}

                        {/* Add set */}
                        <button
                          onClick={() => addSet(ex.id)}
                          className="w-full py-2.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-gray-50 transition-colors"
                        >
                          + Add set
                        </button>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Finish workout */}
        <button
          onClick={finishWorkout}
          disabled={finishing}
          className="w-full bg-[var(--accent)] text-white py-4 rounded-xl font-semibold text-sm disabled:opacity-40"
        >
          {finishing ? 'Saving…' : 'Finish workout'}
        </button>
      </div>
    </div>
  )
}
