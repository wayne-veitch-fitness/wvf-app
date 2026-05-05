'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
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

function NavLinks({ pathname, onNavigate }: { pathname: string, onNavigate?: () => void }) {
  return (
    <nav className="flex-1 p-3 space-y-0.5">
      {navItems.map(({ label, href }) => {
        const active = pathname === href || (href !== '/coach' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`block px-3 py-2.5 rounded-lg text-sm transition-colors ${
              active
                ? 'bg-white/15 text-white font-medium'
                : 'text-white/60 hover:bg-white/10 hover:text-white/90'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

export default function CoachSidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* ── Mobile top header ───────────────────────────────────────────── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 border-b border-white/10"
        style={{ backgroundColor: '#20243D' }}
      >
        <img src="/logos/main-white.png" alt="Wayne Veitch Fitness" className="h-7 w-auto" />
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* ── Mobile drawer ───────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          {/* Drawer */}
          <aside className="relative w-64 flex flex-col min-h-screen" style={{ backgroundColor: '#20243D' }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10">
              <div>
                <img src="/logos/main-white.png" alt="Wayne Veitch Fitness" className="h-7 w-auto" />
                <div className="text-[10px] font-semibold tracking-widest text-white/40 mt-1.5 uppercase">Coach Portal</div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 text-white/40 hover:text-white/70">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            <div className="p-3 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
              >
                Log out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 border-r border-[var(--border)] flex-col flex-shrink-0 min-h-screen" style={{ backgroundColor: '#20243D' }}>
        <div className="px-5 pt-6 pb-5 border-b border-white/10">
          <img src="/logos/main-white.png" alt="Wayne Veitch Fitness" className="h-8 w-auto" />
          <div className="text-[10px] font-semibold tracking-widest text-white/40 mt-2 uppercase">Coach Portal</div>
        </div>
        <NavLinks pathname={pathname} />
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/8 transition-colors"
          >
            Log out
          </button>
        </div>
      </aside>
    </>
  )
}
