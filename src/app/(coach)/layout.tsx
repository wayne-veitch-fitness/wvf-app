import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import CoachSidebar from '@/components/coach-sidebar'

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') redirect('/dashboard')

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <CoachSidebar />
      <main className="flex-1 p-4 pt-20 md:p-8 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
