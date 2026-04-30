'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const WEEKLY_METRICS = [
  { key: 'sleep_rating',     label: 'Sleep' },
  { key: 'nutrition_rating', label: 'Nutrition' },
  { key: 'steps_rating',     label: 'Daily steps' },
  { key: 'water_rating',     label: 'Water intake' },
  { key: 'activity_rating',  label: 'General activity' },
  { key: 'training_rating',  label: 'Training consistency' },
  { key: 'stress_rating',    label: 'Stress management' },
  { key: 'energy_rating',    label: 'Energy levels' },
  { key: 'recovery_rating',  label: 'Recovery / body soreness' },
  { key: 'overall_rating',   label: 'Overall week' },
]

export default function CheckinPage() {
  const supabase = createClient()
  const router = useRouter()
  const [clientId, setClientId] = useState<string | null>(null)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [weight, setWeight]   = useState('')
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [existing, setExisting]     = useState<any>(null)

  // Get monday of current week
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((day + 6) % 7))
  const weekStart = monday.toISOString().split('T')[0]

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: client } = await supabase.from('clients').select('id').eq('profile_id', user.id).single()
      if (!client) return
      setClientId(client.id)

      // Check if already submitted this week
      const { data: prev } = await supabase
        .from('checkins').select('*').eq('client_id', client.id).eq('week_starting', weekStart).single()
      if (prev) {
        setExisting(prev)
        const r: Record<string, number> = {}
        WEEKLY_METRICS.forEach(m => { if (prev[m.key]) r[m.key] = prev[m.key] })
        setRatings(r)
        setWeight(prev.weight_kg?.toString() ?? '')
        setComments(prev.comments ?? '')
      }
    }
    init()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) return
    setSubmitting(true)

    const payload: any = {
      client_id: clientId,
      week_starting: weekStart,
      weight_kg: weight ? parseFloat(weight) : null,
      comments,
      ...ratings,
    }

    if (existing) {
      await supabase.from('checkins').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('checkins').insert(payload)
    }
    setSubmitting(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="pb-24">
        <header className="bg-white border-b border-[var(--border)] px-5 py-4">
          <span className="text-sm font-bold tracking-widest">WVF</span>
        </header>
        <div className="px-5 py-10 max-w-lg mx-auto text-center">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-xl font-bold mb-2">Check-in submitted!</h2>
          <p className="text-sm text-[var(--text-muted)]">Wayne will review this and get back to you.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24">
      <header className="bg-white border-b border-[var(--border)] px-5 py-4">
        <span className="text-sm font-bold tracking-widest">WVF</span>
      </header>
      <div className="px-5 py-5 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold">Weekly check-in</h1>
          {existing && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Editing</span>}
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-5">
          Week of {monday.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Weight */}
          <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-3">
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-2">
              Body weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="e.g. 82.5"
              className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* 10 Ratings */}
          <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">
              Rate each area 1–10
            </p>
            <p className="text-xs text-[var(--text-subtle)] mb-4">1 = poor / not consistent &nbsp;·&nbsp; 10 = excellent / very consistent</p>
            <div className="space-y-4">
              {WEEKLY_METRICS.map(m => {
                const val = ratings[m.key] ?? 0
                return (
                  <div key={m.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{m.label}</span>
                      <span className={`text-sm font-bold min-w-[24px] text-right ${val >= 8 ? 'text-green-600' : val >= 5 ? 'text-amber-500' : val > 0 ? 'text-red-500' : 'text-[var(--text-subtle)]'}`}>
                        {val > 0 ? val : '—'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1} max={10} step={1}
                      value={val || 5}
                      onChange={e => setRatings(r => ({ ...r, [m.key]: parseInt(e.target.value) }))}
                      className="w-full accent-[var(--accent)]"
                    />
                    <div className="flex justify-between text-[10px] text-[var(--text-subtle)] mt-0.5">
                      <span>1</span><span>5</span><span>10</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Comments */}
          <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-3">
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-2">
              Comments / anything Wayne should know?
            </label>
            <p className="text-xs text-[var(--text-subtle)] mb-2">e.g. busy week, poor sleep, soreness, cravings, wins, challenges, mindset, work stress</p>
            <textarea
              value={comments}
              onChange={e => setComments(e.target.value)}
              rows={3}
              placeholder="How did the week go?"
              className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--accent)] resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[var(--accent)] text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : existing ? 'Update check-in' : 'Submit check-in'}
          </button>
        </form>
      </div>
    </div>
  )
}
