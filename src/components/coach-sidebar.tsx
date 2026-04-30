'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { label: 'Dashboard',        href: '/coach' },
  { label: 'Check-ins',        href: '/coach/checkins' },
  { label: 'Clients',          href: '/coach/clients' },
  { label: 'Programs',         href: '/coach/programs' },
  { label: 'Exercise library', href: '/coach/exercises' },
  { label: 'Resources',        href: '/coach/resources' },
  { label: 'Settings',         href: '/coach/settings' },
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
    <aside className="w-56 border-r border-[var(--border)] flex flex-col flex-shrink-0 min-h-screen" style={{ backgroundColor: '#20243D' }}>
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <img src="/logos/main-white.png" alt="Wayne Veitch Fitness" className="h-8 w-auto" />
        <div className="text-[10px] font-semibold tracking-widest text-white/40 mt-2 uppercase">Coach Portal</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ label, href }) => {
          const active = pathname === href || (href !== '/coach' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/60 hover:bg-white/8 hover:text-white/90'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/8 transition-colors"
        >
          Log out
        </button>
      </div>
    </aside>
  )
}
