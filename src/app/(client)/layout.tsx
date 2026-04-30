import ClientNav from '@/components/client-nav'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20">
      {children}
      <ClientNav />
    </div>
  )
}
