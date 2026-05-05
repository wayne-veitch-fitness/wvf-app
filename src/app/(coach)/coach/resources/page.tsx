'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Resource {
  id: string
  folder_id: string
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
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const [showAddFolder, setShowAddFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [savingFolder, setSavingFolder] = useState(false)

  const [uploads, setUploads] = useState<Record<string, boolean>>({})
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => { loadFolders() }, [])

  async function loadFolders() {
    const { data } = await supabase
      .from('resource_folders')
      .select(`
        id, name, sort_order,
        resources ( id, folder_id, name, storage_path, created_at )
      `)
      .order('sort_order', { ascending: true })
    setFolders((data ?? []) as Folder[])
    setLoading(false)
  }

  function toggleFolder(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleAddFolder() {
    if (!newFolderName.trim()) return
    setSavingFolder(true)
    const maxOrder = folders.length ? Math.max(...folders.map(f => f.sort_order)) : 0
    await supabase.from('resource_folders').insert({
      name: newFolderName.trim(),
      sort_order: maxOrder + 1,
    })
    setNewFolderName('')
    setSavingFolder(false)
    setShowAddFolder(false)
    await loadFolders()
  }

  async function handleDeleteFolder(folderId: string, folderName: string) {
    if (!confirm(`Delete folder "${folderName}" and all its files? This cannot be undone.`)) return
    const folder = folders.find(f => f.id === folderId)
    if (folder?.resources?.length) {
      await supabase.storage.from('resources').remove(folder.resources.map(r => r.storage_path))
    }
    await supabase.from('resource_folders').delete().eq('id', folderId)
    await loadFolders()
  }

  async function handleUpload(folderId: string, file: File) {
    const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${folderId}/${Date.now()}_${sanitized}`
    setUploads(prev => ({ ...prev, [folderId]: true }))
    const { error } = await supabase.storage.from('resources').upload(path, file, { upsert: false })
    if (error) {
      alert(`Upload failed: ${error.message}`)
      setUploads(prev => ({ ...prev, [folderId]: false }))
      return
    }
    await supabase.from('resources').insert({ folder_id: folderId, name: file.name, storage_path: path })
    setUploads(prev => ({ ...prev, [folderId]: false }))
    await loadFolders()
  }

  async function handleDeleteResource(resource: Resource) {
    if (!confirm(`Delete "${resource.name}"?`)) return
    await supabase.storage.from('resources').remove([resource.storage_path])
    await supabase.from('resources').delete().eq('id', resource.id)
    await loadFolders()
  }

  async function handleOpen(storagePath: string) {
    const { data, error } = await supabase.storage.from('resources').createSignedUrl(storagePath, 3600)
    if (error || !data?.signedUrl) { alert('Could not open file'); return }
    window.open(data.signedUrl, '_blank')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Resources</h1>
        <button
          onClick={() => setShowAddFolder(true)}
          className="bg-[var(--accent)] text-white text-sm px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
        >
          + New folder
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : folders.length === 0 ? (
        <div className="bg-white border border-[var(--border)] rounded-xl p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">No folders yet.</p>
          <p className="text-xs text-[var(--text-subtle)] mt-1">Create a folder then upload PDFs and guides for your clients.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {folders.map(folder => {
            const isOpen = expanded.has(folder.id)
            const uploading = uploads[folder.id] ?? false
            const resources = (folder.resources ?? []).slice().sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
            return (
              <div key={folder.id} className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleFolder(folder.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <svg className={`w-4 h-4 text-[var(--text-subtle)] flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
                  </svg>
                  <span className="font-medium text-sm flex-1">{folder.name}</span>
                  <span className="text-xs text-[var(--text-subtle)]">
                    {resources.length} file{resources.length !== 1 ? 's' : ''}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-[var(--border)]">
                    {resources.length === 0 && !uploading && (
                      <p className="text-sm text-[var(--text-muted)] px-4 py-3">No files yet.</p>
                    )}
                    {resources.map(r => (
                      <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] hover:bg-gray-50 group">
                        <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5z" />
                        </svg>
                        <span className="text-sm flex-1 truncate">{r.name}</span>
                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpen(r.storage_path)} className="text-xs text-[var(--accent)] font-medium hover:underline">
                            Open
                          </button>
                          <button onClick={() => handleDeleteResource(r)} className="text-xs text-red-500 hover:text-red-700">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="px-4 py-3 bg-gray-50 border-t border-[var(--border)]">
                      {uploading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-[var(--text-muted)]">Uploading...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <input
                            ref={el => { fileInputRefs.current[folder.id] = el }}
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.mp4,.mov"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) handleUpload(folder.id, file)
                              if (e.target) e.target.value = ''
                            }}
                          />
                          <button
                            onClick={() => fileInputRefs.current[folder.id]?.click()}
                            className="text-sm text-[var(--accent)] font-medium hover:underline"
                          >
                            + Upload file
                          </button>
                          <button
                            onClick={() => handleDeleteFolder(folder.id, folder.name)}
                            className="text-xs text-[var(--text-subtle)] hover:text-red-500 transition-colors"
                          >
                            Delete folder
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAddFolder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowAddFolder(false); setNewFolderName('') }} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 shadow-xl">
            <h2 className="text-base font-bold mb-4">New folder</h2>
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddFolder()}
              placeholder="e.g. Nutrition Guides"
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
              autoFocus
            />
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowAddFolder(false); setNewFolderName('') }}
                className="flex-1 border border-[var(--border)] rounded-lg py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFolder}
                disabled={savingFolder || !newFolderName.trim()}
                className="flex-1 bg-[var(--accent)] text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40"
              >
                {savingFolder ? 'Creating...' : 'Create folder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
