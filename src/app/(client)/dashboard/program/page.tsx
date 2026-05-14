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

function VideoPlayer({ url }: { url: string }) {
  const id = getYouTubeId(url)
  if (!id) return null
  return (
    <div className="mt-2 rounded-lg overflow-hidden bg-black aspect-video">
      <iframe
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

export default function ClientProgramPage() {
  const supabase = createClient()
  const router = useRouter()
  const [program, setProgram] = useState<any>(null)
  const [days, setDays] = useState<any[]>([])
  const [activeDay, setActiveDay] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: client } = await supabase
        .from('clients').select('id').eq('profile_id', user.id).single()
      if (!client) { setLoading(false); return }

      const { data: cp } = await supabase
        .from('client_programs')
        .select('program_id')
        .eq('client_id', client.id)
        .eq('is_active', true)
        .single()
      if (!cp) { setLoading(false); return }

      // Program metadata and days both need only cp.program_id — run in parallel
      const [{ data: prog }, { data: dayRows }] = await Promise.all([
        supabase.from('programs').select('id, name').eq('id', cp.program_id).single(),
        supabase.from('program_days')
          .select(`
            id, day_number, name, sort_order,
            program_sections (
              id, name, sort_order,
              program_exercises (
                id, label, superset_group, sets, reps_min, reps_max,
                duration_seconds, rir_min, rir_max, rest_seconds, notes, sort_order,
                exercises ( name, video_url )
              )
            )
          `)
          .eq('program_id', cp.program_id)
          .order('sort_order'),
      ])
      setProgram(prog)

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
        <img src="/logos/icon-navy.png" alt="Wayne Veitch Fitness" className="h-7 w-auto" />
      </header>

      <div className="px-5 py-5 max-w-lg mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !program ? (
          <div className="bg-white border border-[var(--border)] rounded-xl p-6 text-center">
            <div className="text-sm text-[var(--text-muted)]">No program assigned yet.</div>
            <div className="text-xs text-[var(--text-subtle)] mt-1">Your coach will set this up for you.</div>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold mb-4">{program.name}</h1>

            {/* Day tabs */}
            <div className="flex gap-1 overflow-x-auto mb-5 border-b border-[var(--border)] -mx-5 px-5">
              {days.map((d: any, i: number) => (
                <button
                  key={d.id}
                  onClick={() => { setActiveDay(i); setExpandedVideo(null) }}
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
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-[var(--text-muted)]">{currentDay.name}</p>
                  <Link
                    href={`/dashboard/program/workout/${currentDay.id}`}
                    className="flex items-center gap-1.5 bg-[var(--accent)] text-white text-xs font-semibold px-3.5 py-2 rounded-lg"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                    </svg>
                    Start workout
                  </Link>
                </div>
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
                              const hasVideo = !!ex.exercises?.video_url
                              const videoOpen = expandedVideo === ex.id
                              const isLast = gi === groupSuperset(section.program_exercises).length - 1 && ei === group.items.length - 1
                              return (
                                <div
                                  key={ex.id}
                                  className={`${!isLast || videoOpen ? 'border-b border-[var(--border)]' : ''} ${group.group && group.items.length > 1 ? 'bg-blue-50/30' : ''}`}
                                >
                                  <div className="flex items-start gap-3 px-4 py-3">
                                    <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500 mt-0.5">
                                      {ex.label}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium leading-tight">{ex.exercises?.name}</div>
                                      {ex.notes && <div className="text-xs text-[var(--text-muted)] mt-0.5">{ex.notes}</div>}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <div className="flex items-center gap-3 text-xs text-right">
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
                                      {hasVideo && (
                                        <button
                                          onClick={() => setExpandedVideo(videoOpen ? null : ex.id)}
                                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                                            videoOpen
                                              ? 'bg-[var(--accent)] text-white'
                                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                          }`}
                                          title="Watch demo"
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
                                  </div>
                                  {videoOpen && (
                                    <div className="px-4 pb-3">
                                      <VideoPlayer url={ex.exercises.video_url} />
                                    </div>
                                  )}
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
