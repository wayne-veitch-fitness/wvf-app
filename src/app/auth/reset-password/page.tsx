'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Exchange the code in the URL for a session
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setError('This reset link is invalid or has expired. Please request a new one.')
        else setReady(true)
      })
    } else {
      // No code — check if already has a recovery session
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setReady(true)
        else setError('This reset link is invalid or has expired. Please request a new one.')
      })
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(160deg, #edf1f8 0%, #f4f5f8 50%, #F7E4E1 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <img src="/logos/main-navy.png" alt="Wayne Veitch Fitness" className="h-12 w-auto mx-auto mb-6" />
          <p className="text-sm text-[var(--text-muted)]">Set your new password</p>
        </div>

        <div className="bg-white border border-[var(--border)] rounded-2xl p-8 shadow-sm">
          {done ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold">Password updated!</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Taking you to your dashboard…</p>
            </div>
          ) : error && !ready ? (
            <div className="text-center py-4">
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <button onClick={() => router.push('/login')} className="text-sm text-[var(--accent)] hover:underline">
                Back to sign in
              </button>
            </div>
          ) : !ready ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Confirm new password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="Repeat password"
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white py-3 rounded-lg text-sm font-semibold disabled:opacity-60 transition-opacity"
                style={{ backgroundColor: 'var(--brand-navy)' }}
              >
                {loading ? 'Saving…' : 'Set new password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
