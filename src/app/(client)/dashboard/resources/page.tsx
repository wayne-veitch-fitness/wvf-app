'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Resource {
  id: string
  name: string
  storage_path: string
  created_at: string
}

interface SubFolder {
  id: string
  name: string
  sort_order: number
  parent_folder_id: string
  resources: Resource[]
}

interface TopFolder {
  id: string
  name: string
  sort_order: number
  resources: Resource[]
  subfolders: SubFolder[]
}

export default function ResourcesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [topFolders, setTopFolders] = useState<TopFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [opening, setOpening] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: folders }, { data: resources }] = await Promise.all([
        supabase.from('resource_folders').select('id, name, sort_order, parent_folder_id').order('sort_order'),
        supabase.from('resources').select('id, folder_id, name, storage_path, created_at').order('created_at'),
      ])

      const allFolders = folders ?? []
      const allResources = resources ?? []

      const top: TopFolder[] = allFolders
        .filter(f => !f.parent_folder_id)
        .map(f => ({
          ...f,
          resources: allResources.filter(r => r.folder_id === f.id),
          subfolders: allFolders
            .filter(sf => sf.parent_folder_id === f.id)
            .map(sf => ({
              ...sf,
              parent_folder_id: sf.parent_folder_id!,
              resources: allResources.filter(r => r.folder_id === sf.id),
            })),
        }))

      setTopFolders(top)
      setLoading(false)
    }
    load()
  }, [])

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleOpen(resource: Resource) {
    setOpening(resource.id)
    const { data, error } = await supabase.storage.from('resources').createSignedUrl(resource.storage_path, 3600)
    setOpening(null)
    if (error || !data?.signedUrl) { alert('Could not open file. Please try again.'); return }
    window.open(data.signedUrl, '_blank')
  }

  function FileRow({ r }: { r: Resource }) {
    return (
      <button
        onClick={() => handleOpen(r)}
        disabled={opening === r.id}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left border-b border-[var(--border)] last:border-b-0"
      >
        <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5z" />
        </svg>
        <span className="text-sm flex-1">{r.name}</span>
        {opening === r.id ? (
          <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin flex-shrink-0" />
        ) : (
          <svg className="w-4 h-4 text-[var(--text-subtle)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        )}
      </button>
    )
  }

  const hasContent = topFolders.some(tf =>
    tf.resources.length > 0 || tf.subfolders.some(sf => sf.resources.length > 0)
  )

  return (
    <div>
      <header className="bg-white border-b border-[var(--border)] px-5 py-4">
        <img src="/logos/icon-navy.png" alt="Wayne Veitch Fitness" className="h-7 w-auto" />
      </header>
      <div className="px-5 py-6 max-w-lg mx-auto pb-24">
        <h1 className="text-2xl font-bold mb-5">Resources</h1>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasContent ? (
          <div className="bg-white border border-[var(--border)] rounded-xl p-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">No resources available yet.</p>
            <p className="text-xs text-[var(--text-subtle)] mt-1">Your coach will upload guides and resources here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topFolders
              .filter(tf => tf.resources.length > 0 || tf.subfolders.some(sf => sf.resources.length > 0))
              .map(tf => (
                <div key={tf.id}>
                  {/* Category label */}
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
                    </svg>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)]">
                      {tf.name}
                    </span>
                  </div>

                  <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
                    {/* Sub-folders */}
                    {tf.subfolders
                      .filter(sf => sf.resources.length > 0)
                      .map(sf => {
                        const isOpen = expanded.has(sf.id)
                        return (
                          <div key={sf.id} className="border-b border-[var(--border)] last:border-b-0">
                            <button
                              onClick={() => toggle(sf.id)}
                              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                            >
                              <svg className={`w-3.5 h-3.5 text-[var(--text-subtle)] flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                              <svg className="w-4 h-4 text-amber-300 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
                              </svg>
                              <span className="text-sm flex-1 font-medium">{sf.name}</span>
                              <span className="text-xs text-[var(--text-subtle)]">{sf.resources.length}</span>
                            </button>
                            {isOpen && sf.resources.map(r => (
                              <div key={r.id} className="pl-4">
                                <FileRow r={r} />
                              </div>
                            ))}
                          </div>
                        )
                      })}

                    {/* Direct files */}
                    {tf.resources.map(r => <FileRow key={r.id} r={r} />)}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
