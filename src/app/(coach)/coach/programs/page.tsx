import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ProgramsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'coach') redirect('/dashboard')

  const { data: programs } = await supabase
    .from('programs')
    .select(`
      id, name, description, updated_at,
      program_days ( id ),
      client_programs ( id, is_active )
    `)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Programs</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{programs?.length ?? 0} programs</p>
        </div>
        <Link href="/coach/programs/new" className="bg-[var(--accent)] text-white text-sm px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity">
          + New program
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {programs?.map((p: any) => {
          const dayCount = p.program_days?.length ?? 0
          const clientCount = p.client_programs?.filter((cp: any) => cp.is_active)?.length ?? 0
          const updated = new Date(p.updated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
          const firstLine = p.description?.split('\n')[0] ?? ''
          return (
            <Link key={p.id} href={`/coach/programs/${p.id}`}>
              <div className="bg-white border border-[var(--border)] rounded-xl px-5 py-4 hover:border-[var(--accent)] transition-colors cursor-pointer">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm leading-snug">{p.name}</div>
                    {firstLine && (
                      <div className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{firstLine}</div>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--text-muted)]">
                      <span>{dayCount} day{dayCount !== 1 ? 's' : ''}</span>
                      <span className="font-medium text-[var(--text)]">{clientCount} client{clientCount !== 1 ? 's' : ''}</span>
                      <span className="hidden sm:inline">Updated {updated}</span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-[var(--text-subtle)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
