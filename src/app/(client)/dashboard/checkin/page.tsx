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

function RatingButtons({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5 mt-2 flex-wrap">
      {[1,2,3,4,5,6,7,8,9,10].map(n => {
        const selected = value === n
        const colour = selected
          ? n >= 8 ? 'bg-green-500 border-green-500 text-white'
          : n >= 5 ? 'bg-amber-400 border-amber-400 text-white'
          : 'bg-red-400 border-red-400 text-white'
          : 'bg-white border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-9 h-9 rounded-full border-2 text-sm font-semibold transition-all ${colour}`}
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}

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

  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const weekStart = monday.toISOString().split('T')[0]

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: client } = await supabase.from('clients').select('id').eq('profile_id', user.id).single()
      if (!client) return
      setClientId(client.id)

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
        <div className="px-5 py-14 max-w-lg mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Check-in submitted!</h2>
          <p className="text-sm text-[var(--text-muted)]">Wayne will review this and get back to you.</p>
        </div>
      </div>
    )
  }

  const allRated = WEEKLY_METRICS.every(m => ratings[m.key])

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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Weight */}
          <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-4">
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
          <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-4">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-0.5">
              Rate each area 1–10
            </p>
            <p className="text-xs text-[var(--text-subtle)] mb-5">
              1 = poor / not consistent &nbsp;·&nbsp; 10 = excellent / very consistent
            </p>
            <div className="space-y-5">
              {WEEKLY_METRICS.map(m => (
                <div key={m.key}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{m.label}</span>
                    {ratings[m.key] ? (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        ratings[m.key] >= 8 ? 'bg-green-100 text-green-700'
                        : ratings[m.key] >= 5 ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-600'
                      }`}>
                        {ratings[m.key]}/10
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-subtle)]">tap to rate</span>
                    )}
                  </div>
                  <RatingButtons
                    value={ratings[m.key] ?? 0}
                    onChange={v => setRatings(r => ({ ...r, [m.key]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-4">
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-1">
              Comments / anything Wayne should know?
            </label>
            <p className="text-xs text-[var(--text-subtle)] mb-2">
              e.g. busy week, poor sleep, soreness, cravings, wins, challenges, mindset, work stress
            </p>
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
            disabled={submitting || !allRated}
            className="w-full bg-[var(--accent)] text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40"
          >
            {submitting ? 'Submitting...' : existing ? 'Update check-in' : 'Submit check-in'}
          </button>
          {!allRated && (
            <p className="text-xs text-center text-[var(--text-subtle)]">Rate all 10 areas to submit</p>
          )}
        </form>
      </div>
    </div>
  )
}
