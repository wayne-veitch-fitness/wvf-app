import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ClientDashboardPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Non-null assertion: redirect() returns `never` so user is always defined here
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  if ((profile as { role: string } | null)?.role === 'coach') {
    redirect('/coach')
  }

  const navItems = ['Home', 'Program', 'Food', 'Check-in', 'More']

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="bg-white border-b border-[var(--border)] px-5 py-4 flex items-center justify-between">
        <span className="text-sm font-semibold tracking-widest">WVF</span>
        <div className="w-7 h-7 rounded-full bg-[var(--placeholder)] flex items-center justify-center text-xs text-[var(--text-muted)] font-medium">
          {profile?.full_name?.[0] ?? '?'}
        </div>
      </header>

      <main className="px-5 py-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-1">
          Hey{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          {new Date().toLocaleDateString('en-AU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>

        <div className="space-y-3">
          <div className="bg-white border border-[var(--border)] rounded-xl p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
              Today&apos;s workout
            </div>
            <p className="text-sm text-[var(--text-muted)]">No program assigned yet.</p>
          </div>

          <div className="bg-white border border-[var(--border)] rounded-xl p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
              Weekly check-in
            </div>
            <p className="text-sm text-[var(--text-muted)]">Nothing due yet.</p>
          </div>

          <div className="bg-white border border-[var(--border)] rounded-xl p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
              Today&apos;s food
            </div>
            <p className="text-sm text-[var(--text-muted)]">Nothing logged yet.</p>
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] grid grid-cols-5 py-2 pb-4">
        {navItems.map((label) => (
          <div
            key={label}
            className="flex flex-col items-center gap-0.5 text-[10px] py-1 text-[var(--text-subtle)]"
          >
            <div className="w-5 h-5 rounded bg-current opacity-30" />
            {label}
          </div>
        ))}
      </nav>
    </div>
  )
}
