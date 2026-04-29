import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CoachDashboardPage() {
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

  if ((profile as { role: string } | null)?.role !== 'coach') {
    redirect('/dashboard')
  }

  const stats = [
    { label: 'Active clients', value: '--' },
    { label: 'Check-ins to review', value: '--' },
    { label: 'Programs active', value: '--' },
  ]

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Browser chrome (matches wireframe) */}
      <div className="bg-[#eeeeec] border-b border-[var(--border)] px-4 py-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#c8c8c5]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#c8c8c5]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#c8c8c5]" />
        <span className="ml-4 bg-white rounded px-2.5 py-1">app.wvfitness.com.au/coach</span>
      </div>

      <div className="flex min-h-[calc(100vh-36px)]">
        {/* Sidebar */}
        <aside className="w-56 bg-[#fafaf9] border-r border-[var(--border)] p-4 flex-shrink-0">
          <div className="text-xs font-bold tracking-widest mb-5">WVF COACH</div>
          <nav className="space-y-0.5">
            {([
              ['Dashboard', true],
              ['Clients', false],
              ['Programs', false],
              ['Exercise library', false],
              ['Resources', false],
              ['Settings', false],
            ] as [string, boolean][]).map(([label, active]) => (
              <div
                key={label}
                className={`px-3 py-2 rounded-md text-sm cursor-default ${
                  active
                    ? 'bg-[var(--accent)] text-white font-medium'
                    : 'text-[var(--text)] hover:bg-[var(--accent-soft)]'
                }`}
              >
                {label}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-semibold">Hey Wayne</h1>
            <button className="bg-[var(--accent)] text-white text-sm px-4 py-2 rounded-md font-medium">
              + New client
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-8 mb-8">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide mt-0.5">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Placeholder panels */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
                Check-ins waiting for you
              </div>
              <div className="bg-white border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--text-muted)]">
                No pending check-ins.
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
                Recent training logs
              </div>
              <div className="bg-white border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--text-muted)]">
                No recent activity.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
