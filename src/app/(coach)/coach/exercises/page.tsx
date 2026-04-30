import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ExercisesPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'coach') redirect('/dashboard')

  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, created_at')
    .order('name', { ascending: true })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Exercise library</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{exercises?.length ?? 0} exercises</p>
        </div>
        <button className="bg-[var(--accent)] text-white text-sm px-4 py-2 rounded-md font-medium">
          + Add exercise
        </button>
      </div>

      <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
          {exercises?.map((ex: any, i: number) => (
            <div
              key={ex.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-[var(--border)] cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm font-medium">{ex.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
