'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function getYouTubeId(url: string): string | null {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

export default function ProgramDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const router = useRouter()
  const [program, setProgram] = useState<any>(null)
  const [days, setDays] = useState<any[]>([])
  const [activeDay, setActiveDay] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)

  // Add exercise modal state
  const [addModal, setAddModal] = useState<{ sectionId: string; sectionName: string } | null>(null)
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [allExercises, setAllExercises] = useState<any[]>([])
  const [selectedExercise, setSelectedExercise] = useState<any | null>(null)
  const [exForm, setExForm] = useState({ sets: '3', reps_min: '', reps_max: '', notes: '', label: '', superset_group: '', rir_min: '', rir_max: '', rest_seconds: '', log_type: 'weighted' })
  const [savingEx, setSavingEx] = useState(false)

  // Assign program state
  const [assignModal, setAssignModal] = useState(false)
  const [allClients, setAllClients] = useState<any[]>([])
  const [assignedClientIds, setAssignedClientIds] = useState<string[]>([])
  const [savingAssign, setSavingAssign] = useState(false)

  useEffect(() => {
    loadProgram()
  }, [params.id])

  async function loadProgram() {
    const { data: prog } = await supabase.from('programs').select('*').eq('id', params.id).single()
    if (!prog) { router.push('/coach/programs'); return }
    setProgram(prog)

    const { data: dayRows } = await supabase
      .from('program_days')
      .select(`
        id, day_number, name, sort_order,
        program_sections (
          id, name, sort_order,
          program_exercises (
            id, label, superset_group, sets, reps_min, reps_max,
            duration_seconds, rir_min, rir_max, rest_seconds, notes, sort_order, log_type,
            exercises ( id, name, video_url )
          )
        )
      `)
      .eq('program_id', params.id)
      .order('sort_order')

    const sorted = (dayRows ?? []).map((d: any) => ({
      ...d,
      program_sections: [...(d.program_sections ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order).map((s: any) => ({
        ...s,
        program_exercises: [...(s.program_exercises ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
      }))
    }))
    setDays(sorted)
    setLoading(false)
  }

  async function openAssign() {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, profiles!inner(full_name)')
      .eq('is_active', true)
      .order('id')
    setAllClients(clients ?? [])

    const { data: assigned } = await supabase
      .from('client_programs')
      .select('client_id')
      .eq('program_id', params.id)
      .eq('is_active', true)
    setAssignedClientIds((assigned ?? []).map((a: any) => a.client_id))
    setAssignModal(true)
  }

  async function toggleAssign(clientId: string) {
    const isAssigned = assignedClientIds.includes(clientId)
    if (isAssigned) {
      await supabase.from('client_programs')
        .update({ is_active: false })
        .eq('client_id', clientId).eq('program_id', params.id)
      setAssignedClientIds(prev => prev.filter(id => id !== clientId))
    } else {
      const { data: existing } = await supabase.from('client_programs')
        .select('id').eq('client_id', clientId).eq('program_id', params.id).single()
      if (existing) {
        await supabase.from('client_programs').update({ is_active: true }).eq('id', existing.id)
      } else {
        await supabase.from('client_programs').insert({ client_id: clientId, program_id: params.id, is_active: true })
      }
      // Deactivate other programs for this client
      await supabase.from('client_programs')
        .update({ is_active: false })
        .eq('client_id', clientId)
        .neq('program_id', params.id)
      setAssignedClientIds(prev => [...prev, clientId])
    }
  }

  async function openAddExercise(sectionId: string, sectionName: string) {
    if (allExercises.length === 0) {
      const { data } = await supabase.from('exercises').select('id, name, video_url').order('name')
      setAllExercises(data ?? [])
    }
    setSelectedExercise(null)
    setExerciseSearch('')
    setExForm({ sets: '3', reps_min: '', reps_max: '', notes: '', label: '', superset_group: '', rir_min: '', rir_max: '', rest_seconds: '', log_type: 'weighted' })
    setAddModal({ sectionId, sectionName })
  }

  async function handleAddExercise() {
    if (!selectedExercise || !addModal) return
    setSavingEx(true)
    const currentSection = days[activeDay]?.program_sections?.find((s: any) => s.id === addModal.sectionId)
    const nextOrder = (currentSection?.program_exercises?.length ?? 0) + 1
    await supabase.from('program_exercises').insert({
      program_section_id: addModal.sectionId,
      exercise_id: selectedExercise.id,
      sets: exForm.sets ? parseInt(exForm.sets) : null,
      reps_min: exForm.reps_min ? parseInt(exForm.reps_min) : null,
      reps_max: exForm.reps_max ? parseInt(exForm.reps_max) : null,
      notes: exForm.notes || null,
      label: exForm.label || null,
      superset_group: exForm.superset_group || null,
      rir_min: exForm.rir_min ? parseInt(exForm.rir_min) : null,
      rir_max: exForm.rir_max ? parseInt(exForm.rir_max) : null,
      rest_seconds: exForm.rest_seconds ? parseInt(exForm.rest_seconds) : null,
      log_type: exForm.log_type,
      sort_order: nextOrder,
    })
    await loadProgram()
    setSavingEx(false)
    setAddModal(null)
  }

  async function removeExercise(peId: string) {
    if (!confirm('Remove this exercise? Any workout sets clients have logged for it will also be deleted.')) return
    const { error } = await supabase.from('program_exercises').delete().eq('id', peId)
    if (error) {
      alert(`Could not remove exercise: ${error.message}`)
      return
    }
    await loadProgram()
  }

  async function updateLogType(peId: string, logType: string) {
    await supabase.from('program_exercises').update({ log_type: logType }).eq('id', peId)
    await loadProgram()
  }

  async function handleDelete() {
    if (!confirm(`Delete "${program?.name}"? This will remove all days and exercises. This cannot be undone.`)) return
    await supabase.from('programs').delete().eq('id', params.id)
    router.push('/coach/programs')
  }

  function repsLabel(ex: any) {
    if (ex.duration_seconds) return `${ex.duration_seconds}s`
    if (ex.reps_min && ex.reps_max && ex.reps_min !== ex.reps_max) return `${ex.reps_min}–${ex.reps_max}`
    if (ex.reps_min) return `${ex.reps_min}`
    return null
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

  const filteredExercises = allExercises.filter(ex =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  )

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!program) return null

  const currentDay = days[activeDay]

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-1">
        <Link href="/coach/programs" className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)]">Programs</Link>
        <span className="text-xs text-[var(--text-subtle)]">/</span>
        <span className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">{program.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h1 className="text-xl font-semibold leading-tight">{program.name}</h1>
        <div className="flex gap-2 flex-shrink-0">
          {editMode && (
            <button
              onClick={handleDelete}
              className="text-sm border border-red-200 text-red-500 px-3 py-1.5 rounded-md font-medium hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          )}
          <button
            onClick={openAssign}
            className="text-sm border border-[var(--border)] px-3 py-1.5 rounded-md font-medium hover:border-[var(--accent)] transition-colors"
          >
            Assign
          </button>
          <button
            onClick={() => setEditMode(!editMode)}
            className={`text-sm px-3 py-1.5 rounded-md font-medium transition-colors ${
              editMode
                ? 'bg-[var(--accent)] text-white'
                : 'border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white'
            }`}
          >
            {editMode ? 'Done editing' : 'Edit'}
          </button>
        </div>
      </div>

      {program.description && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5 text-xs text-blue-800 leading-relaxed whitespace-pre-line">
          {program.description}
        </div>
      )}

      {/* Day tabs */}
      <div className="flex gap-1 mb-5 border-b border-[var(--border)] overflow-x-auto">
        {days.map((d: any, i: number) => (
          <button
            key={d.id}
            onClick={() => setActiveDay(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap flex-shrink-0 ${
              activeDay === i
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      {currentDay && (
        <div className="space-y-5">
          {currentDay.program_sections.map((section: any) => (
            <div key={section.id}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-subtle)]">
                  {section.name}
                </div>
                {editMode && (
                  <button
                    onClick={() => openAddExercise(section.id, section.name)}
                    className="text-xs text-[var(--accent)] font-semibold hover:underline"
                  >
                    + Add exercise
                  </button>
                )}
              </div>
              <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
                {section.program_exercises.length === 0 ? (
                  <div className="px-4 py-4 text-xs text-[var(--text-subtle)] text-center">
                    {editMode ? 'No exercises yet — click + Add exercise' : 'No exercises in this section'}
                  </div>
                ) : (
                  groupSuperset(section.program_exercises).map((group, gi) => (
                    <div key={gi}>
                      {group.group && group.items.length > 1 && (
                        <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                          Superset
                        </div>
                      )}
                      {group.items.map((ex: any, ei: number) => {
                        const reps = repsLabel(ex)
                        const videoId = ex.exercises?.video_url ? getYouTubeId(ex.exercises.video_url) : null
                        return (
                          <div
                            key={ex.id}
                            className={`${
                              ei < group.items.length - 1 || gi < groupSuperset(section.program_exercises).length - 1
                                ? 'border-b border-[var(--border)]'
                                : ''
                            } ${group.group && group.items.length > 1 ? 'bg-blue-50/30' : ''}`}
                          >
                          <div className="flex items-start gap-4 px-4 py-3">
                            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                              {videoId ? (
                                <img src={`https://img.youtube.com/vi/${videoId}/default.jpg`} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                  {ex.label}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{ex.exercises?.name}</span>
                                {ex.log_type && ex.log_type !== 'weighted' && (
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                    ex.log_type === 'check'      ? 'bg-purple-100 text-purple-700' :
                                    ex.log_type === 'bodyweight' ? 'bg-blue-100 text-blue-700' :
                                    ex.log_type === 'timed'      ? 'bg-amber-100 text-amber-700' : ''
                                  }`}>
                                    {ex.log_type === 'check' ? 'Mark done' : ex.log_type === 'bodyweight' ? 'Bodyweight' : 'Timed'}
                                  </span>
                                )}
                              </div>
                              {ex.notes && <div className="text-xs text-[var(--text-muted)] mt-0.5">{ex.notes}</div>}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-3 text-xs text-right flex-shrink-0">
                                {ex.sets && (
                                  <div className="text-center">
                                    <div className="font-semibold">{ex.sets}</div>
                                    <div className="text-[var(--text-muted)]">sets</div>
                                  </div>
                                )}
                                {reps && (
                                  <div className="text-center">
                                    <div className="font-semibold">{reps}</div>
                                    <div className="text-[var(--text-muted)]">reps</div>
                                  </div>
                                )}
                                {(ex.rir_min != null || ex.rir_max != null) && (
                                  <div className="text-center">
                                    <div className="font-semibold">
                                      {ex.rir_min === ex.rir_max ? ex.rir_min : `${ex.rir_min ?? 0}–${ex.rir_max}`}
                                    </div>
                                    <div className="text-[var(--text-muted)]">RIR</div>
                                  </div>
                                )}
                                {ex.rest_seconds && (
                                  <div className="text-center">
                                    <div className="font-semibold">{ex.rest_seconds}s</div>
                                    <div className="text-[var(--text-muted)]">rest</div>
                                  </div>
                                )}
                              </div>
                              {editMode && (
                                <button
                                  onClick={() => removeExercise(ex.id)}
                                  className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 flex-shrink-0"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                          {/* Inline log type editor — only in edit mode */}
                          {editMode && (
                            <div className="flex items-center gap-1.5 px-4 pb-2.5">
                              {([
                                { value: 'weighted',   label: 'Weighted' },
                                { value: 'bodyweight', label: 'Bodyweight' },
                                { value: 'timed',      label: 'Timed' },
                                { value: 'check',      label: 'Mark done' },
                              ] as const).map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => updateLogType(ex.id, opt.value)}
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                                    (ex.log_type ?? 'weighted') === opt.value
                                      ? 'bg-[var(--accent)] text-white'
                                      : 'bg-gray-100 text-[var(--text-muted)] hover:bg-gray-200'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                          </div>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Exercise Modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAddModal(null)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-xl flex flex-col max-h-[90vh]">
            <div className="px-5 pt-5 pb-3 border-b border-[var(--border)] flex-shrink-0">
              <h2 className="text-base font-bold">Add to {addModal.sectionName}</h2>
            </div>

            {!selectedExercise ? (
              <>
                <div className="px-4 pt-3 pb-2 flex-shrink-0">
                  <input
                    type="text"
                    placeholder="Search exercises..."
                    value={exerciseSearch}
                    onChange={e => setExerciseSearch(e.target.value)}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto flex-1">
                  {filteredExercises.map((ex, i) => {
                    const vid = ex.video_url ? getYouTubeId(ex.video_url) : null
                    return (
                      <button
                        key={ex.id}
                        onClick={() => setSelectedExercise(ex)}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left ${i < filteredExercises.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                          {vid ? (
                            <img src={`https://img.youtube.com/vi/${vid}/default.jpg`} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-medium">{ex.name}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="px-5 py-4 border-t border-[var(--border)] flex-shrink-0">
                  <button onClick={() => setAddModal(null)} className="w-full border border-[var(--border)] rounded-lg py-2.5 text-sm font-medium">Cancel</button>
                </div>
              </>
            ) : (
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                    {selectedExercise.video_url && getYouTubeId(selectedExercise.video_url) ? (
                      <img src={`https://img.youtube.com/vi/${getYouTubeId(selectedExercise.video_url)}/default.jpg`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold">{selectedExercise.name}</span>
                  <button onClick={() => setSelectedExercise(null)} className="ml-auto text-xs text-[var(--text-muted)]">Change</button>
                </div>

                {/* Log type selector */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
                    Logging type
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([
                      { value: 'weighted',   label: 'Weighted',   sub: 'kg + reps' },
                      { value: 'bodyweight', label: 'Bodyweight', sub: 'reps only' },
                      { value: 'timed',      label: 'Timed',      sub: 'seconds' },
                      { value: 'check',      label: 'Mark done',  sub: 'no log' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setExForm(prev => ({ ...prev, log_type: opt.value }))}
                        className={`flex flex-col items-center px-2 py-2 rounded-lg border text-center transition-colors ${
                          exForm.log_type === opt.value
                            ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                            : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]'
                        }`}
                      >
                        <span className="text-xs font-semibold leading-tight">{opt.label}</span>
                        <span className={`text-[10px] mt-0.5 leading-tight ${exForm.log_type === opt.value ? 'text-white/70' : 'text-[var(--text-subtle)]'}`}>{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'sets', label: 'Sets' },
                    { key: 'reps_min', label: 'Reps (min)' },
                    { key: 'reps_max', label: 'Reps (max)' },
                    { key: 'rir_min', label: 'RIR (min)' },
                    { key: 'rir_max', label: 'RIR (max)' },
                    { key: 'rest_seconds', label: 'Rest (sec)' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">{f.label}</label>
                      <input
                        type="number"
                        value={(exForm as any)[f.key]}
                        onChange={e => setExForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full border border-[var(--border)] rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">Label (e.g. A1)</label>
                    <input
                      type="text"
                      value={exForm.label}
                      onChange={e => setExForm(prev => ({ ...prev, label: e.target.value }))}
                      placeholder="A1"
                      className="w-full border border-[var(--border)] rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">Superset group</label>
                    <input
                      type="text"
                      value={exForm.superset_group}
                      onChange={e => setExForm(prev => ({ ...prev, superset_group: e.target.value }))}
                      placeholder="A"
                      className="w-full border border-[var(--border)] rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">Notes</label>
                  <input
                    type="text"
                    value={exForm.notes}
                    onChange={e => setExForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g. Drive knee towards wall"
                    className="w-full border border-[var(--border)] rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setAddModal(null)} className="flex-1 border border-[var(--border)] rounded-lg py-2.5 text-sm font-medium">Cancel</button>
                  <button
                    onClick={handleAddExercise}
                    disabled={savingEx}
                    className="flex-1 bg-[var(--accent)] text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40"
                  >
                    {savingEx ? 'Adding...' : 'Add exercise'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign to Clients Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAssignModal(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl">
            <div className="px-5 pt-5 pb-3 border-b border-[var(--border)]">
              <h2 className="text-base font-bold">Assign to clients</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Assigning replaces any existing active program for that client</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {allClients.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">No active clients</div>
              ) : (
                allClients.map((c: any, i: number) => {
                  const assigned = assignedClientIds.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleAssign(c.id)}
                      className={`w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 text-left ${i < allClients.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        assigned ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-gray-300'
                      }`}>
                        {assigned && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium">{(c.profiles as any)?.full_name}</span>
                      {assigned && <span className="ml-auto text-[10px] text-green-600 font-semibold">Assigned</span>}
                    </button>
                  )
                })
              )}
            </div>
            <div className="px-5 py-4 border-t border-[var(--border)]">
              <button
                onClick={() => setAssignModal(false)}
                className="w-full bg-[var(--accent)] text-white rounded-lg py-2.5 text-sm font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
