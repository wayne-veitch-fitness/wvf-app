'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ClientProgramPage() {
  const supabase = createClient()
  const router = useRouter()
  const [program, setProgram] = useState<any>(null)
  const [days, setDays] = useState<any[]>([])
  const [activeDay, setActiveDay] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Get client record
      const { data: client } = await supabase
        .from('clients').select('id').eq('profile_id', user.id).single()
      if (!client) { setLoading(false); return }

      // Get active program
      const { data: cp } = await supabase
        .from('client_programs')
        .select('program_id')
        .eq('client_id', client.id)
        .eq('is_active', true)
        .single()
      if (!cp) { setLoading(false); return }

      const { data: prog } = await supabase
        .from('programs').select('id, name').eq('id', cp.program_id).single()
      setProgram(prog)

      const { data: dayRows } = await supabase
        .from('program_days')
        .select(`
          id, day_number, name, sort_order,
          program_sections (
            id, name, sort_order,
            program_exercises (
              id, label, superset_group, sets, reps_min, reps_max,
              duration_seconds, rir_min, rir_max, rest_seconds, notes, sort_order,
              exercises ( name )
            )
          )
        `)
        .eq('program_id', cp.program_id)
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
    load()
  }, [])

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

  const currentDay = days[activeDay]

  return (
    <div className="pb-24">
      <header className="bg-white border-b border-[var(--border)] px-5 py-4 sticky top-0 z-10">
        <span className="text-sm font-bold tracking-widest">WVF</span>
      </header>

      <div className="px-5 py-5 max-w-lg mx-auto">
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading your program...</p>
        ) : !program ? (
          <div className="bg-white border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--text-muted)]">
            No program assigned yet. Your coach will set this up for you.
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold mb-4">{program.name}</h1>

            {/* Day tabs */}
            <div className="flex gap-1 overflow-x-auto mb-5 border-b border-[var(--border)] -mx-5 px-5">
              {days.map((d: any, i: number) => (
                <button
                  key={d.id}
                  onClick={() => setActiveDay(i)}
                  className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors -mb-px flex-shrink-0 ${
                    activeDay === i
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--text-muted)]'
                  }`}
                >
                  Day {d.day_number}
                </button>
              ))}
            </div>

            {currentDay && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-4">{currentDay.name}</p>
                <div className="space-y-4">
                  {currentDay.program_sections.map((section: any) => (
                    <div key={section.id}>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
                        {section.name}
                      </div>
                      <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
                        {groupSuperset(section.program_exercises).map((group, gi) => (
                          <div key={gi}>
                            {group.group && group.items.length > 1 && (
                              <div className="px-4 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                                Superset
                              </div>
                            )}
                            {group.items.map((ex: any, ei: number) => {
                              const reps = repsLabel(ex)
                              const isLast = gi === groupSuperset(section.program_exercises).length - 1 && ei === group.items.length - 1
                              return (
                                <div key={ex.id} className={`flex items-start gap-3 px-4 py-3 ${!isLast ? 'border-b border-[var(--border)]' : ''} ${group.group && group.items.length > 1 ? 'bg-blue-50/30' : ''}`}>
                                  <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500 mt-0.5">
                                    {ex.label}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium leading-tight">{ex.exercises?.name}</div>
                                    {ex.notes && <div className="text-xs text-[var(--text-muted)] mt-0.5">{ex.notes}</div>}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-right flex-shrink-0">
                                    {ex.sets && (
                                      <div className="text-center min-w-[28px]">
                                        <div className="font-semibold">{ex.sets}</div>
                                        <div className="text-[var(--text-muted)]">sets</div>
                                      </div>
                                    )}
                                    {reps && (
                                      <div className="text-center min-w-[36px]">
                                        <div className="font-semibold">{reps}</div>
                                        <div className="text-[var(--text-muted)]">reps</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
