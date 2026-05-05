'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const METRICS = [
  { key: 'sleep_rating',     label: 'Sleep' },
  { key: 'nutrition_rating', label: 'Nutrition' },
  { key: 'steps_rating',     label: 'Daily steps' },
  { key: 'water_rating',     label: 'Water intake' },
  { key: 'activity_rating',  label: 'General activity' },
  { key: 'training_rating',  label: 'Training consistency' },
  { key: 'stress_rating',    label: 'Stress management' },
  { key: 'energy_rating',    label: 'Energy levels' },
  { key: 'recovery_rating',  label: 'Recovery / soreness' },
  { key: 'overall_rating',   label: 'Overall week' },
]

function RatingBar({ label, value }: { label: string; value: number | null }) {
  if (!value) return null
  const colour = value >= 8 ? 'bg-green-500' : value >= 5 ? 'bg-amber-400' : 'bg-red-400'
  const pct = (value / 10) * 100
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-xs text-[var(--text-muted)] flex-shrink-0">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <div className={`w-8 text-right text-sm font-bold flex-shrink-0 ${
        value >= 8 ? 'text-green-600' : value >= 5 ? 'text-amber-500' : 'text-red-500'
      }`}>{value}</div>
    </div>
  )
}

export default function CheckinDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const router   = useRouter()
  const [checkin, setCheckin]   = useState<any>(null)
  const [reply, setReply]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('checkins')
        .select(`
          *,
          clients!inner (
            id,
            profiles!inner ( full_name )
          )
        `)
        .eq('id', params.id)
        .single()
      if (!data) { router.push('/coach/checkins'); return }
      setCheckin(data)
      setReply(data.coach_reply ?? '')
      setLoading(false)
    }
    load()
  }, [params.id])

  async function handleSave() {
    setSaving(true)
    const isFirstReply = !checkin.reviewed_at
    await supabase
      .from('checkins')
      .update({ coach_reply: reply, reviewed_at: new Date().toISOString() })
      .eq('id', params.id)
    // Email the client on first reply only
    if (isFirstReply) {
      fetch('/api/email/coach-replied', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkinId: params.id }),
      }).catch(() => {})
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    setCheckin((c: any) => ({ ...c, coach_reply: reply, reviewed_at: new Date().toISOString() }))
  }

  if (loading) return <div className="text-sm text-[var(--text-muted)] p-4">Loading...</div>
  if (!checkin) return null

  const name = checkin.clients?.profiles?.full_name ?? 'Client'
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
  const weekDate = new Date(checkin.week_starting).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  const avgRating = (() => {
    const vals = METRICS.map(m => checkin[m.key]).filter(Boolean)
    return vals.length ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1) : null
  })()

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-xs text-[var(--text-muted)]">
        <Link href="/coach/checkins" className="hover:text-[var(--accent)]">Check-ins</Link>
        <span className="text-[var(--text-subtle)]">/</span>
        <span>{name} · {weekDate}</span>
      </div>

      {/* Client header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-[var(--accent)] text-white font-bold text-lg flex items-center justify-center flex-shrink-0">
          {initials}
        </div>
        <div>
          <h1 className="text-xl font-bold">{name}</h1>
          <p className="text-sm text-[var(--text-muted)]">Week of {weekDate}</p>
        </div>
        <div className="ml-auto text-right">
          {checkin.weight_kg && (
            <div>
              <div className="text-2xl font-bold">{checkin.weight_kg} <span className="text-sm font-normal text-[var(--text-muted)]">kg</span></div>
              <div className="text-xs text-[var(--text-muted)]">body weight</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: ratings + comments */}
        <div className="space-y-4">
          {/* Summary pill */}
          {avgRating && (
            <div className="flex items-center gap-3 bg-white border border-[var(--border)] rounded-xl px-4 py-3">
              <div className={`text-3xl font-bold ${parseFloat(avgRating) >= 8 ? 'text-green-600' : parseFloat(avgRating) >= 5 ? 'text-amber-500' : 'text-red-500'}`}>
                {avgRating}
              </div>
              <div>
                <div className="text-sm font-medium">Average rating</div>
                <div className="text-xs text-[var(--text-muted)]">across all 10 areas</div>
              </div>
            </div>
          )}

          {/* Ratings breakdown */}
          <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-4 space-y-3">
            {METRICS.map(m => (
              <RatingBar key={m.key} label={m.label} value={checkin[m.key]} />
            ))}
          </div>

          {/* Client comments */}
          {checkin.comments && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-400 mb-1">
                {name.split(' ')[0]}'s note
              </div>
              <p className="text-sm text-blue-900 italic">"{checkin.comments}"</p>
            </div>
          )}
        </div>

        {/* Right: reply box */}
        <div className="space-y-4">
          <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-3">
              Your reply to {name.split(' ')[0]}
            </div>
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              rows={8}
              placeholder={`Great work this week ${name.split(' ')[0]}! Here's what I noticed...`}
              className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[var(--accent)] resize-none"
            />
            <button
              onClick={handleSave}
              disabled={saving || !reply.trim()}
              className="mt-3 w-full bg-[var(--accent)] text-white py-2.5 rounded-lg font-semibold text-sm disabled:opacity-40 transition-opacity"
            >
              {saving ? 'Saving...' : saved ? '✓ Saved!' : checkin.reviewed_at ? 'Update reply' : 'Send reply'}
            </button>
          </div>

          {/* Monthly measurements if present */}
          {checkin.is_monthly && (
            <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-3">
                Monthly measurements
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ['Body fat',    checkin.body_fat_pct      ? `${checkin.body_fat_pct}%`    : null],
                  ['Fat mass',    checkin.body_fat_mass_kg  ? `${checkin.body_fat_mass_kg} kg` : null],
                  ['Muscle mass', checkin.muscle_mass_kg    ? `${checkin.muscle_mass_kg} kg`  : null],
                  ['Chest',       checkin.chest_cm          ? `${checkin.chest_cm} cm`      : null],
                  ['Navel',       checkin.navel_cm          ? `${checkin.navel_cm} cm`       : null],
                  ['Hips',        checkin.hips_cm           ? `${checkin.hips_cm} cm`        : null],
                  ['Thigh',       checkin.thigh_cm          ? `${checkin.thigh_cm} cm`       : null],
                  ['Arm',         checkin.arm_cm            ? `${checkin.arm_cm} cm`         : null],
                ].filter(([, v]) => v).map(([label, val]) => (
                  <div key={label as string} className="bg-gray-50 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wide">{label}</div>
                    <div className="font-semibold">{val}</div>
                  </div>
                ))}
              </div>
              {checkin.proud_of && (
                <div className="mt-3">
                  <div className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wide mb-1">Proud of this month</div>
                  <p className="text-xs text-[var(--text)]">{checkin.proud_of}</p>
                </div>
              )}
              {checkin.improve_next && (
                <div className="mt-2">
                  <div className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wide mb-1">Wants to improve</div>
                  <p className="text-xs text-[var(--text)]">{checkin.improve_next}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
