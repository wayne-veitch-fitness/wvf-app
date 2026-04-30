import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function FoodPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div>
      <header className="bg-white border-b border-[var(--border)] px-5 py-4">
        <span className="text-sm font-semibold tracking-widest">WVF</span>
      </header>
      <div className="px-5 py-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-4">Food diary</h1>
        <div className="space-y-3">
          {['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map((meal) => (
            <div key={meal} className="bg-white border border-[var(--border)] rounded-xl p-4">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">{meal}</div>
              <p className="text-sm text-[var(--text-muted)]">Nothing logged yet.</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
