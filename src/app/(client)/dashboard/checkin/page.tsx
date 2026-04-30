'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

function AlreadySubmitted({ checkin, monday, onEdit }: { checkin: any; monday: Date; onEdit: () => void }) {
  const date = monday.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })
  const overall = checkin.overall_rating
  const colour = overall >= 8 ? 'bg-green-100 text-green-700'
    : overall >= 5 ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-600'

  return (
    <div className="pb-24">
      <header className="bg-white border-b border-[var(--border)] px-5 py-4">
        <span className="text-sm font-bold tracking-widest">WVF</span>
      </header>
      <div className="px-5 py-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <div className="text-base font-bold">Check-in submitted</div>
            <div className="text-xs text-[var(--text-muted)]">Week of {date}</div>
          </div>
        </div>

        {/* This week's summary */}
        <div className="bg-white border border-[var(--border)] rounded-xl divide-y divide-[var(--border)] mb-3">
          {checkin.weight_kg && (
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-[var(--text-muted)]">Weight</span>
              <span className="text-sm font-semibold">{checkin.weight_kg} kg</span>
            </div>
          )}
          {overall && (
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-[var(--text-muted)]">Overall rating</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colour}`}>{overall}/10</span>
            </div>
          )}
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-[var(--text-muted)]">Wayne's reply</span>
            {checkin.coach_reply
              ? <span className="text-xs font-medium text-green-600">✓ Replied</span>
              : <span className="text-xs text-[var(--text-subtle)]">Pending</span>
            }
          </div>
        </div>

        {checkin.coach_reply && (
          <div className="bg-[var(--accent)] rounded-xl px-4 py-4 mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/70 mb-2">Wayne's reply</div>
            <p className="text-sm text-white leading-relaxed">{checkin.coach_reply}</p>
          </div>
        )}

        <div className="space-y-2 mt-4">
          <Link
            href="/dashboard/checkin/history"
            className="w-full bg-white border border-[var(--border)] rounded-xl py-3 text-sm font-medium text-center flex items-center justify-center gap-2 hover:border-[var(--accent)] transition-colors"
          >
            View all check-ins
            <svg className="w-4 h-4 text-[var(--text-subtle)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <button
            onClick={onEdit}
            className="w-full text-sm text-[var(--text-muted)] py-2"
          >
            Edit this week's check-in
          </button>
        </div>
      </div>
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
  const [showForm, setShowForm]     = useState(false)
  const [loading, setLoading]       = useState(true)

  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const weekStart = monday.toISOString().split('T')[0]

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: client } = await supabase.from('clients').select('id').eq('profile_id', user.id).single()
      if (!client) { setLoading(false); return }
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
      setLoading(false)
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

  if (loading) {
    return (
      <div className="pb-24">
        <header className="bg-white border-b border-[var(--border)] px-5 py-4">
          <span className="text-sm font-bold tracking-widest">WVF</span>
        </header>
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
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
          <p className="text-sm text-[var(--text-muted)] mb-6">Wayne will review this and get back to you.</p>
          <Link
            href="/dashboard/checkin/history"
            className="text-sm text-[var(--accent)] font-medium"
          >
            View check-in history →
          </Link>
        </div>
      </div>
    )
  }

  // Already submitted this week and not in edit mode
  if (existing && !showForm) {
    return <AlreadySubmitted checkin={existing} monday={monday} onEdit={() => setShowForm(true)} />
  }

  const allRated = WEEKLY_METRICS.every(m => ratings[m.key])

  return (
    <div className="pb-24">
      <header className="bg-white border-b border-[var(--border)] px-5 py-4 flex items-center gap-3">
        {showForm && existing && (
          <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
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
