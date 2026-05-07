'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.wvfitness.com.au'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
    if (profile?.role === 'coach') router.push('/coach')
    else router.push('/dashboard')
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_URL}/auth/callback?next=/auth/reset-password`,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setResetSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(160deg, #edf1f8 0%, #f4f5f8 50%, #F7E4E1 100%)' }}>
      <div className="w-full max-w-sm">

        <div className="text-center mb-10">
          <img src="/logos/main-navy.png" alt="Wayne Veitch Fitness" className="h-12 w-auto mx-auto mb-6" />
          <p className="text-sm text-[var(--text-muted)]">
            {mode === 'login' ? 'Sign in to your training portal' : 'Reset your password'}
          </p>
        </div>

        <div className="bg-white border border-[var(--border)] rounded-2xl p-8 shadow-sm">
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Password</label>
                  <button type="button" onClick={() => { setMode('forgot'); setError(null) }} className="text-xs text-[var(--accent)] hover:underline">
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white py-3 rounded-lg text-sm font-semibold disabled:opacity-60 transition-opacity mt-2"
                style={{ backgroundColor: 'var(--brand-navy)' }}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : resetSent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold mb-1">Check your email</p>
              <p className="text-xs text-[var(--text-muted)]">We sent a reset link to <strong>{email}</strong>. Click the link to set a new password.</p>
              <button onClick={() => { setMode('login'); setResetSent(false) }} className="mt-4 text-xs text-[var(--accent)] hover:underline">
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  autoFocus
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
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <button type="button" onClick={() => { setMode('login'); setError(null) }} className="w-full text-sm text-[var(--text-muted)] py-1 hover:text-[var(--accent)] transition-colors">
                Back to sign in
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-[var(--text-subtle)] mt-6">
          Contact Wayne to get access.
        </p>
      </div>
    </div>
  )
}
