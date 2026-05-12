'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface DiaryEntry {
  id?: string
  breakfast: string
  lunch: string
  dinner: string
  snacks: string
  water_litres: string
}

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', placeholder: 'e.g. 2 eggs, toast, black coffee...' },
  { key: 'lunch',     label: 'Lunch',     placeholder: 'e.g. chicken salad, sparkling water...' },
  { key: 'dinner',    label: 'Dinner',    placeholder: 'e.g. salmon, rice, roasted veggies...' },
  { key: 'snacks',    label: 'Snacks',    placeholder: 'e.g. protein bar, handful of almonds...' },
] as const

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(dateStr: string, n: number): string {
  const [y, m, day] = dateStr.split('-').map(Number)
  const d = new Date(y, m - 1, day)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateLabel(dateStr: string): string {
  const today = todayStr()
  const yesterday = addDays(today, -1)
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  const [y, m, day] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

const EMPTY: DiaryEntry = { breakfast: '', lunch: '', dinner: '', snacks: '', water_litres: '' }

export default function FoodPage() {
  const supabase = createClient()
  const router = useRouter()
  const [clientId, setClientId] = useState<string | null>(null)
  const [date, setDate] = useState(todayStr())
  const [entry, setEntry] = useState<DiaryEntry>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<Partial<DiaryEntry>>({})
  const clientIdRef = useRef<string | null>(null)
  const dateRef = useRef(date)

  // Keep refs in sync
  useEffect(() => { dateRef.current = date }, [date])
  useEffect(() => { clientIdRef.current = clientId }, [clientId])

  // Init: get client id
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: client } = await supabase
        .from('clients').select('id').eq('profile_id', user.id).single()
      if (!client) { router.push('/dashboard'); return }
      setClientId(client.id)
    }
    init()
  }, [])

  // Load entry when clientId or date changes
  useEffect(() => {
    if (!clientId) return
    loadEntry(clientId, date)
  }, [clientId, date])

  async function loadEntry(cid: string, d: string) {
    setLoading(true)
    const { data } = await supabase
      .from('food_diary')
      .select('*')
      .eq('client_id', cid)
      .eq('diary_date', d)
      .maybeSingle()
    setEntry(data ? {
      id: data.id,
      breakfast: data.breakfast ?? '',
      lunch: data.lunch ?? '',
      dinner: data.dinner ?? '',
      snacks: data.snacks ?? '',
      water_litres: data.water_litres != null ? String(data.water_litres) : '',
    } : { ...EMPTY })
    setLoading(false)
  }

  function flashSaved() {
    setSaving(false)
    setSaved(true)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSaved(false), 2500)
  }

  async function persistEntry(cid: string, d: string, fields: Partial<DiaryEntry>) {
    const payload: Record<string, unknown> = { client_id: cid, diary_date: d, updated_at: new Date().toISOString() }
    for (const [k, v] of Object.entries(fields)) {
      if (k === 'water_litres') {
        payload[k] = v === '' ? null : parseFloat(v as string)
      } else {
        payload[k] = (v as string) || null
      }
    }
    await supabase.from('food_diary').upsert(payload, { onConflict: 'client_id,diary_date' })
  }

  const scheduleAutosave = useCallback((field: string, value: string) => {
    pendingRef.current = { ...pendingRef.current, [field]: value }
    setSaving(true)
    setSaved(false)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const cid = clientIdRef.current
      const d = dateRef.current
      if (!cid) return
      const pending = { ...pendingRef.current }
      pendingRef.current = {}
      await persistEntry(cid, d, pending)
      flashSaved()
    }, 1500)
  }, [])

  async function saveNow() {
    const cid = clientIdRef.current
    const d = dateRef.current
    if (!cid) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const pending = { ...pendingRef.current }
    pendingRef.current = {}
    setSaving(true)
    setSaved(false)
    await persistEntry(cid, d, Object.keys(pending).length > 0 ? pending : entry)
    flashSaved()
  }

  function handleChange(field: string, value: string) {
    setEntry(prev => ({ ...prev, [field]: value }))
    scheduleAutosave(field, value)
  }

  const isToday = date === todayStr()

  if (!clientId) return null

  return (
    <div>
      <header className="bg-white border-b border-[var(--border)] px-5 py-4">
        <img src="/logos/icon-navy.png" alt="Wayne Veitch Fitness" className="h-7 w-auto" />
      </header>
      <div className="px-5 py-6 max-w-lg mx-auto pb-24">

        {/* Header + date navigation */}
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold flex-1">Food diary</h1>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setDate(d => addDays(d, -1))}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-[var(--text-muted)] w-20 text-center">
              {formatDateLabel(date)}
            </span>
            <button
              onClick={() => setDate(d => addDays(d, 1))}
              disabled={isToday}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Save status indicator */}
        <div className="h-5 mb-3 flex items-center">
          {saving && !saved && (
            <span className="text-[11px] text-[var(--text-subtle)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
              Saving...
            </span>
          )}
          {saved && (
            <span className="text-[11px] text-green-600 flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {MEALS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-1.5">
                  {label}
                </label>
                <textarea
                  value={entry[key as keyof DiaryEntry] as string}
                  onChange={e => handleChange(key, e.target.value)}
                  placeholder={placeholder}
                  rows={3}
                  className="w-full border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] resize-none bg-white"
                />
              </div>
            ))}

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-1.5">
                Water (litres)
              </label>
              <input
                type="number"
                value={entry.water_litres}
                onChange={e => handleChange('water_litres', e.target.value)}
                placeholder="e.g. 2.5"
                step="0.1"
                min="0"
                max="20"
                className="w-full border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] bg-white"
              />
            </div>

            <button
              onClick={saveNow}
              disabled={saving}
              className="w-full bg-[var(--accent)] text-white py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50 transition-opacity"
            >
              {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
