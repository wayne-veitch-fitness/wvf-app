'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const DEFAULT_SECTIONS = ['Warm Up', 'Workout', 'Cool Down']

export default function NewProgramPage() {
  const supabase = createClient()
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [numDays, setNumDays] = useState(3)
  const [dayNames, setDayNames] = useState<string[]>(['Day 1', 'Day 2', 'Day 3'])
  const [saving, setSaving] = useState(false)

  function handleNumDays(n: number) {
    setNumDays(n)
    setDayNames(prev => {
      const next = [...prev]
      while (next.length < n) next.push(`Day ${next.length + 1}`)
      return next.slice(0, n)
    })
  }

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: prog, error } = await supabase
      .from('programs')
      .insert({ name: name.trim(), description: description.trim() || null, created_by: user.id, is_template: true })
      .select('id')
      .single()

    if (error || !prog) { setSaving(false); return }

    // Create days + sections
    for (let i = 0; i < numDays; i++) {
      const { data: day } = await supabase
        .from('program_days')
        .insert({ program_id: prog.id, day_number: i + 1, name: dayNames[i] || `Day ${i + 1}`, sort_order: i + 1 })
        .select('id')
        .single()

      if (day) {
        await supabase.from('program_sections').insert(
          DEFAULT_SECTIONS.map((sname, si) => ({
            program_day_id: day.id,
            name: sname,
            sort_order: si + 1,
          }))
        )
      }
    }

    router.push(`/coach/programs/${prog.id}`)
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-5">
        <Link href="/coach/programs" className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)]">Programs</Link>
        <span className="text-xs text-[var(--text-subtle)]">/</span>
        <span className="text-xs text-[var(--text-muted)]">New program</span>
      </div>

      <h1 className="text-xl font-semibold mb-6">New program</h1>

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
            Program name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. 2026 May – Aug (3 Day Program)"
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Weekly structure, goals, notes for the client..."
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
            Number of training days
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => handleNumDays(n)}
                className={`w-11 h-11 rounded-full border-2 text-sm font-semibold transition-all ${
                  numDays === n
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                    : 'bg-white border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
            Day names
          </label>
          <div className="space-y-2">
            {dayNames.map((dn, i) => (
              <input
                key={i}
                type="text"
                value={dn}
                onChange={e => {
                  const next = [...dayNames]
                  next[i] = e.target.value
                  setDayNames(next)
                }}
                placeholder={`Day ${i + 1}`}
                className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            ))}
          </div>
          <p className="text-xs text-[var(--text-subtle)] mt-1.5">
            Each day gets Warm Up, Workout, and Cool Down sections automatically.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href="/coach/programs"
            className="flex-1 border border-[var(--border)] rounded-lg py-2.5 text-sm font-medium text-center"
          >
            Cancel
          </Link>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="flex-1 bg-[var(--accent)] text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40"
          >
            {saving ? 'Creating...' : 'Create program'}
          </button>
        </div>
      </div>
    </div>
  )
}
