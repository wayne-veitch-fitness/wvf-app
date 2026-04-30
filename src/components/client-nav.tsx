'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Home', href: '/dashboard' },
  { label: 'Program', href: '/dashboard/program' },
  { label: 'Food', href: '/dashboard/food' },
  { label: 'Check-in', href: '/dashboard/checkin' },
  { label: 'More', href: '/dashboard/more' },
]

export default function ClientNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] grid grid-cols-5 py-2 pb-4">
      {navItems.map(({ label, href }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 text-[10px] py-1 ${
              active ? 'text-[var(--accent)] font-medium' : 'text-[var(--text-subtle)]'
            }`}
          >
            <div className="w-5 h-5 rounded bg-current opacity-60" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
