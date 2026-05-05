'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ClientsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    package_label: '', checkin_day: '',
  })

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase
      .from('clients')
      .select(`
        id, package_label, checkin_day, is_active,
        profiles!inner ( full_name ),
        checkins ( week_starting, overall_rating )
      `)
      .order('created_at', { ascending: true })
    setClients(data ?? [])
    setLoading(false)
  }

  async function handleAdd() {
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/coach/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password.trim(),
        package_label: form.package_label.trim() || null,
        checkin_day: form.checkin_day !== '' ? parseInt(form.checkin_day) : null,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Something went wrong')
      setSaving(false)
      return
    }
    await loadClients()
    setSaving(false)
    setShowAdd(false)
    setForm({ full_name: '', email: '', password: '', package_label: '', checkin_day: '' })
    router.push(`/coach/clients/${json.clientId}`)
  }

  const activeClients = clients.filter(c => c.is_active)
  const inactiveClients = clients.filter(c => !c.is_active)

  function ClientRow({ c }: { c: any }) {
    const name = c.profiles?.full_name ?? 'Unknown'
    const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    const sorted = (c.checkins ?? []).sort((a: any, b: any) =>
      new Date(b.week_starting).getTime() - new Date(a.week_starting).getTime()
    )
    const last = sorted[0]
    const lastDate = last
      ? new Date(last.week_starting).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
      : '—'
    const rating = last?.overall_rating ?? null
    return (
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3">
          <Link href={`/coach/clients/${c.id}`} className="flex items-center gap-3 group">
            <div className={`w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 ${c.is_active ? 'bg-[var(--accent)]' : 'bg-gray-300'}`}>
              {initials}
            </div>
            <span className="font-medium group-hover:text-[var(--accent)] transition-colors">{name}</span>
          </Link>
        </td>
        <td className="px-4 py-3 text-[var(--text-muted)]">{c.package_label ?? '—'}</td>
        <td className="px-4 py-3 text-[var(--text-muted)]">{c.checkin_day != null ? DAYS[c.checkin_day] : '—'}</td>
        <td className="px-4 py-3 text-[var(--text-muted)]">{lastDate}</td>
        <td className="px-4 py-3">
          {rating != null ? (
            <span className={`font-semibold ${rating >= 8 ? 'text-green-600' : rating >= 6 ? 'text-amber-500' : 'text-red-500'}`}>
              {rating}/10
            </span>
          ) : <span className="text-[var(--text-subtle)]">—</span>}
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {c.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
      </tr>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Clients</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{activeClients.length} active{inactiveClients.length > 0 ? `, ${inactiveClients.length} inactive` : ''}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-[var(--accent)] text-white text-sm px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
        >
          + Add client
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden mb-4 overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-widest text-[var(--text-subtle)]">
                  <th className="text-left px-4 py-3 font-medium">Client</th>
                  <th className="text-left px-4 py-3 font-medium">Package</th>
                  <th className="text-left px-4 py-3 font-medium">Check-in day</th>
                  <th className="text-left px-4 py-3 font-medium">Last check-in</th>
                  <th className="text-left px-4 py-3 font-medium">Overall</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {activeClients.map(c => <ClientRow key={c.id} c={c} />)}
                {activeClients.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No active clients yet</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {inactiveClients.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">Inactive</p>
              <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden opacity-60">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-[var(--border)]">
                    {inactiveClients.map(c => <ClientRow key={c.id} c={c} />)}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Client Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowAdd(false); setError(null) }} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 shadow-xl">
            <h2 className="text-base font-bold mb-4">Add new client</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">Full name *</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="jane@example.com"
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">Temporary password *</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Share this with the client"
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">Package</label>
                  <input
                    type="text"
                    value={form.package_label}
                    onChange={e => setForm(f => ({ ...f, package_label: e.target.value }))}
                    placeholder="WVF Membership"
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">Check-in day</label>
                  <select
                    value={form.checkin_day}
                    onChange={e => setForm(f => ({ ...f, checkin_day: e.target.value }))}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] bg-white"
                  >
                    <option value="">Select...</option>
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowAdd(false); setError(null) }}
                className="flex-1 border border-[var(--border)] rounded-lg py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !form.full_name.trim() || !form.email.trim() || !form.password.trim()}
                className="flex-1 bg-[var(--accent)] text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40"
              >
                {saving ? 'Creating...' : 'Create client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
