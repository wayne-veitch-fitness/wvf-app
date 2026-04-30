'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ProgramDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const router = useRouter()
  const [program, setProgram] = useState<any>(null)
  const [days, setDays] = useState<any[]>([])
  const [activeDay, setActiveDay] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
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
              duration_seconds, rir_min, rir_max, rest_seconds, notes, sort_order,
              exercises ( name )
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
    load()
  }, [params.id])

  if (loading) return <div className="text-sm text-[var(--text-muted)]">Loading program...</div>
  if (!program) return null

  const currentDay = days[activeDay]

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
      if (last && last.group === g && g !== null) {
        last.items.push(ex)
      } else {
        groups.push({ group: g, items: [ex] })
      }
    }
    return groups
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Link href="/coach/programs" className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)]">
          Programs
        </Link>
        <span className="text-xs text-[var(--text-subtle)]">/</span>
        <span className="text-xs text-[var(--text-muted)]">{program.name}</span>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-semibold">{program.name}</h1>
        <button className="text-sm text-[var(--accent)] border border-[var(--accent)] px-3 py-1.5 rounded-md font-medium hover:bg-[var(--accent)] hover:text-white transition-colors">
          Edit program
        </button>
      </div>

      {program.description && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5 text-xs text-blue-800 leading-relaxed whitespace-pre-line">
          {program.description}
        </div>
      )}

      {/* Day tabs */}
      <div className="flex gap-1 mb-5 border-b border-[var(--border)]">
        {days.map((d: any, i: number) => (
          <button
            key={d.id}
            onClick={() => setActiveDay(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
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
              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
                {section.name}
              </div>
              <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
                {groupSuperset(section.program_exercises).map((group, gi) => (
                  <div key={gi}>
                    {group.group && group.items.length > 1 && (
                      <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                        Superset
                      </div>
                    )}
                    {group.items.map((ex: any, ei: number) => {
                      const reps = repsLabel(ex)
                      return (
                        <div
                          key={ex.id}
                          className={`flex items-start gap-4 px-4 py-3 ${
                            ei < group.items.length - 1 || gi < groupSuperset(section.program_exercises).length - 1
                              ? 'border-b border-[var(--border)]'
                              : ''
                          } ${group.group && group.items.length > 1 ? 'bg-blue-50/30' : ''}`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500">
                            {ex.label}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{ex.exercises?.name}</div>
                            {ex.notes && (
                              <div className="text-xs text-[var(--text-muted)] mt-0.5">{ex.notes}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-right flex-shrink-0">
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
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
