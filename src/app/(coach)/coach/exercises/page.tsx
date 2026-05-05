'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

function getYouTubeId(url: string): string | null {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

export default function ExercisesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [exercises, setExercises] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', video_url: '' })
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      await loadExercises()
    }
    init()
  }, [])

  async function loadExercises() {
    const { data } = await supabase
      .from('exercises')
      .select('id, name, video_url, created_at')
      .order('name', { ascending: true })
    setExercises(data ?? [])
    setLoading(false)
  }

  function openEdit(ex: any) {
    setEditing(ex)
    setForm({ name: ex.name, video_url: ex.video_url ?? '' })
    setShowNew(false)
  }

  function openNew() {
    setEditing(null)
    setForm({ name: '', video_url: '' })
    setShowNew(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    if (editing) {
      await supabase.from('exercises').update({
        name: form.name.trim(),
        video_url: form.video_url.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', editing.id)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('exercises').insert({
        name: form.name.trim(),
        video_url: form.video_url.trim() || null,
        created_by: user!.id,
      })
    }
    await loadExercises()
    setSaving(false)
    setEditing(null)
    setShowNew(false)
  }

  const filtered = exercises.filter(ex =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  )

  const isOpen = editing !== null || showNew

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Exercise library</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{exercises.length} exercises</p>
        </div>
        <button
          onClick={openNew}
          className="bg-[var(--accent)] text-white text-sm px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
        >
          + Add exercise
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-subtle)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search exercises..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--accent)]"
        />
      </div>

      {/* Exercise list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No exercises found</div>
          ) : (
            filtered.map((ex, i) => {
              const hasVideo = !!ex.video_url
              const videoId = hasVideo ? getYouTubeId(ex.video_url) : null
              return (
                <div
                  key={ex.id}
                  onClick={() => openEdit(ex)}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${i < filtered.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {videoId ? (
                      <img
                        src={`https://img.youtube.com/vi/${videoId}/default.jpg`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{ex.name}</span>
                  </div>
                  {hasVideo ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">
                      Video
                    </span>
                  ) : (
                    <span className="text-[10px] text-[var(--text-subtle)] flex-shrink-0">No video</span>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Edit / New drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setEditing(null); setShowNew(false) }} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 shadow-xl">
            <h2 className="text-base font-bold mb-4">{editing ? 'Edit exercise' : 'New exercise'}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
                  Exercise name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Romanian Deadlift"
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
                  YouTube demo URL (optional)
                </label>
                <input
                  type="url"
                  value={form.video_url}
                  onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                />
                {form.video_url && getYouTubeId(form.video_url) && (
                  <div className="mt-2 rounded-lg overflow-hidden aspect-video bg-black">
                    <iframe
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${getYouTubeId(form.video_url)}?rel=0`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setEditing(null); setShowNew(false) }}
                className="flex-1 border border-[var(--border)] rounded-lg py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex-1 bg-[var(--accent)] text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
