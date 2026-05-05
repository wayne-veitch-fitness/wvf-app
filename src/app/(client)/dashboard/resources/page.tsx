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

interface Folder {
  id: string
  name: string
  sort_order: number
  resources: Resource[]
}

export default function ResourcesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('resource_folders')
        .select(`
          id, name, sort_order,
          resources ( id, name, storage_path, created_at )
        `)
        .order('sort_order', { ascending: true })
      setFolders((data ?? []) as Folder[])
      setLoading(false)
    }
    load()
  }, [])

  async function handleOpen(resource: Resource) {
    setOpening(resource.id)
    const { data, error } = await supabase.storage
      .from('resources')
      .createSignedUrl(resource.storage_path, 3600)
    setOpening(null)
    if (error || !data?.signedUrl) { alert('Could not open file. Please try again.'); return }
    window.open(data.signedUrl, '_blank')
  }

  const hasFiles = folders.some(f => f.resources?.length > 0)

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
        ) : !hasFiles ? (
          <div className="bg-white border border-[var(--border)] rounded-xl p-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">No resources available yet.</p>
            <p className="text-xs text-[var(--text-subtle)] mt-1">Your coach will upload guides and resources here.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {folders
              .filter(f => f.resources?.length > 0)
              .map(folder => (
                <div key={folder.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
                    </svg>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)]">
                      {folder.name}
                    </span>
                  </div>
                  <div className="bg-white border border-[var(--border)] rounded-xl divide-y divide-[var(--border)] overflow-hidden">
                    {(folder.resources ?? [])
                      .slice()
                      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                      .map(r => (
                        <button
                          key={r.id}
                          onClick={() => handleOpen(r)}
                          disabled={opening === r.id}
                          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
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
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
