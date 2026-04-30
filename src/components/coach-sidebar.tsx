'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { label: 'Dashboard',       href: '/coach' },
  { label: 'Check-ins',       href: '/coach/checkins' },
  { label: 'Clients',         href: '/coach/clients' },
  { label: 'Programs',        href: '/coach/programs' },
  { label: 'Exercise library',href: '/coach/exercises' },
  { label: 'Resources',       href: '/coach/resources' },
  { label: 'Settings',        href: '/coach/settings' },
]

export default function CoachSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-56 bg-[#fafaf9] border-r border-[var(--border)] flex flex-col flex-shrink-0 min-h-screen">
      <div className="p-4 flex-1">
        <div className="text-xs font-bold tracking-widest mb-5">WVF COACH</div>
        <nav className="space-y-0.5">
          {navItems.map(({ label, href }) => {
            const active = pathname === href || (href !== '/coach' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={`block px-3 py-2 rounded-md text-sm ${
                  active
                    ? 'bg-[var(--accent)] text-white font-medium'
                    : 'text-[var(--text)] hover:bg-[var(--accent-soft)]'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-[var(--border)]">
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-md text-sm text-[var(--text-muted)] hover:bg-[var(--accent-soft)]"
        >
          Log out
        </button>
      </div>
    </aside>
  )
}
