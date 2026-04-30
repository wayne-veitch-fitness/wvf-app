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
        <img src="/logos/icon-navy.png" alt="Wayne Veitch Fitness" className="h-7 w-auto" />
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
          <img src="/logos/icon-navy.png" alt="Wayne Veitch Fitness" className="h-7 w-auto" />
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
          <img src="/logos/icon-navy.png" alt="Wayne Veitch Fitness" className="h-7 w-auto" />
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
          </L