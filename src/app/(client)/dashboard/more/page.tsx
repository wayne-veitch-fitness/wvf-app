'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function MorePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<{ full_name: string | null; email: string | null } | null>(null)
  const [showPwForm, setShowPwForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwDone, setPwDone] = useState(false)

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

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return }
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters'); return }
    setPwLoading(true)
    setPwError(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwLoading(false)
    if (error) { setPwError(error.message); return }
    setPwDone(true)
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => { setPwDone(false); setShowPwForm(false) }, 2500)
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
        <div className="bg-white border border-[var(--border)] rounded-xl divide-y divide-[var(--border)] mb-4">
          <button
            onClick={() => { setShowPwForm(v => !v); setPwError(null); setPwDone(false) }}
            className="w-full text-left px-4 py-3 text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Change password
          </button>

          {showPwForm && (
            <div className="px-4 py-4 bg-gray-50">
              {pwDone ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Password updated!
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">New password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">Confirm new password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Repeat password"
                      className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  {pwError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{pwError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowPwForm(false); setPwError(null); setNewPassword(''); setConfirmPassword('') }}
                      className="flex-1 border border-[var(--border)] rounded-lg py-2 text-sm font-medium bg-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={pwLoading}
                      className="flex-1 bg-[var(--accent)] text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-40"
                    >
                      {pwLoading ? 'Saving…' : 'Update'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

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
