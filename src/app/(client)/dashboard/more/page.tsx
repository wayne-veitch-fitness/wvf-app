'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function MorePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<{ full_name: string | null; email: string | null } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setProfile({ full_name: data?.full_name ?? null, email: user.email ?? null })
    }
    load()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : '?'

  return (
    <div>
      <header className="bg-white border-b border-[var(--border)] px-5 py-4">
        <img src="/logos/icon-navy.png" alt="Wayne Veitch Fitness" className="h-7 w-auto" />
      </header>
      <div className="px-5 py-6 max-w-lg mx-auto pb-24">
        <h1 className="text-2xl font-bold mb-5">More</h1>

        {/* Profile card */}
        {profile && (
          <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-4 flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] text-white font-bold text-lg flex items-center justify-center flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{profile.full_name ?? 'My Account'}</div>
              <div className="text-xs text-[var(--text-muted)] truncate">{profile.email}</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 text-sm text-red-500 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}
