import { createServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
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

const MONTHLY_METRICS = [
  { key: 'body_fat_pct',      label: 'Body fat',         unit: '%' },
  { key: 'body_fat_mass_kg',  label: 'Fat mass',         unit: 'kg' },
  { key: 'muscle_mass_kg',    label: 'Muscle mass',      unit: 'kg' },
  { key: 'navel_cm',          label: 'Waist (navel)',    unit: 'cm' },
  { key: 'arm_cm',            label: 'Arm',              unit: 'cm' },
  { key: 'under_bust_cm',     label: 'Under bust',       unit: 'cm' },
  { key: 'calf_cm',           label: 'Calf',             unit: 'cm' },
]

function RatingBubble({ value }: { value: number }) {
  const colour = value >= 8
    ? 'bg-green-500 text-white'
    : value >= 5
    ? 'bg-amber-400 text-white'
    : 'bg-red-400 text-white'
  return (
    <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${colour}`}>
      {value}
    </span>
  )
}

export default async function CheckinDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: client } = await supabase
    .from('clients').select('id').eq('profile_id', user.id).single()
  if (!client) redirect('/dashboard')

  const { data: checkin } = await supabase
    .from('checkins')
    .select('*')
    .eq('id', params.id)
    .eq('client_id', client.id)
    .single()

  if (!checkin) notFound()

  const date = new Date(checkin.week_starting)
  const label = date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  const reviewedDate = checkin.reviewed_at
    ? new Date(checkin.reviewed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  const ratedMetrics = METRICS.filter(m => checkin[m.key] != null)

  return (
    <div className="pb-24">
      <header className="bg-white border-b border-[var(--border)] px-5 py-4 flex items-center gap-3">
        <Link href="/dashboard/checkin/history" className="text-[var(--text-muted)] hover:text-[var(--text)]">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <img src="/logos/icon-navy.png" alt="Wayne Veitch Fitness" className="h-7 w-auto" />
      </header>

      <div className="px-5 py-5 max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-0.5">
          <h1 className="text-xl font-bold">Week of {label}</h1>
          {checkin.is_monthly && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Monthly</span>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-5">
          {checkin.coach_reply
            ? `Wayne replied · ${reviewedDate}`
            : 'Awaiting Wayne\'s reply'}
        </p>

        {/* Weight */}
        {checkin.weight_kg && (
          <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-4 mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-1">Body weight</div>
            <div className="text-2xl font-bold">{checkin.weight_kg} <span className="text-sm font-normal text-[var(--text-muted)]">kg</span></div>
          </div>
        )}

        {/* Wayne's reply */}
        {checkin.coach_reply && (
          <div className="bg-[var(--accent)] rounded-xl px-4 py-4 mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/70 mb-2">Wayne's reply</div>
            <p className="text-sm text-white leading-relaxed">{checkin.coach_reply}</p>
          </div>
        )}

        {!checkin.coach_reply && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-blue-600">Wayne hasn't replied to this check-in yet. You'll get a notification when he does.</p>
          </div>
        )}

        {/* Ratings */}
        {ratedMetrics.length > 0 && (
          <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-4 mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-3">Ratings</div>
            <div className="space-y-3">
              {ratedMetrics.map(m => (
                <div key={m.key} className="flex items-center gap-3">
                  <RatingBubble value={checkin[m.key]} />
                  <span className="text-sm text-[var(--text)]">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        {checkin.comments && (
          <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-4 mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-2">Your note</div>
            <p className="text-sm text-[var(--text)] leading-relaxed">{checkin.comments}</p>
          </div>
        )}

        {/* Monthly measurements */}
        {checkin.is_monthly && (
          <div className="bg-white border border-[var(--border)] rounded-xl px-4 py-4 mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-3">Monthly measurements</div>
            <div className="grid grid-cols-2 gap-3">
              {MONTHLY_METRICS.filter(m => checkin[m.key] != null).map(m => (
                <div key={m.key}>
                  <div className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wide">{m.label}</div>
                  <div className="text-base font-bold">{checkin[m.key]} <span className="text-xs font-normal text-[var(--text-muted)]">{m.unit}</span></div>
                </div>
              ))}
            </div>
            {checkin.proud_of && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <div className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wide mb-1">Most proud of</div>
                <p className="text-sm">{checkin.proud_of}</p>
              </div>
            )}
            {checkin.improve_next && (
              <div className="mt-2">
                <div className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wide mb-1">Improve next month</div>
                <p className="text-sm">{checkin.improve_next}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
