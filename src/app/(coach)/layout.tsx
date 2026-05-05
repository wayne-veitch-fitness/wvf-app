import CoachSidebar from '@/components/coach-sidebar'

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <CoachSidebar />
      <main className="flex-1 p-4 pt-20 md:p-8 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
