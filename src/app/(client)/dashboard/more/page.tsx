'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function MorePage() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div>
      <header className="bg-white border-b border-[var(--border)] px-5 py-4">
        <img src="/logos/icon-navy.png" alt="Wayne Veitch Fitness" className="h-7 w-auto" />
      </header>
      <div className="px-5 py-6 max-w-lg mx-auto space-y-2 pb-24">
        <h1 className="text-2xl font-bold mb-4">More</h1>
        <div className="bg-white border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
          <div className="px-4 py-3 text-sm text-[var(--text-muted)]">Profile</div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 text-sm text-red-500"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}
