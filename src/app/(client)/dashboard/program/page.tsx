import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProgramPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div>
      <header className="bg-white border-b border-[var(--border)] px-5 py-4">
        <span className="text-sm font-semibold tracking-widest">WVF</span>
      </header>
      <div className="px-5 py-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-4">My program</h1>
        <div className="bg-white border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--text-muted)]">
          No program assigned yet. Your coach will set this up for you.
        </div>
      </div>
    </div>
  )
}
