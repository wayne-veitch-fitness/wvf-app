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
  parent_folder_id: null
  resources: Resource[]
  subfolders: SubFolder[]
}

interface PendingUpload {
  file: File
  folderId: string
  folderName: string
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const FolderIcon = () => (
  <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
    <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
  </svg>
)

const FileIcon = () => (
  <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5z" />
  </svg>
)

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg className={`w-3.5 h-3.5 text-[var(--text-subtle)] flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
)

const UploadIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
)

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function nameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.slice(0, lastDot) : filename
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ResourcesPage() {
  const supabase = createClient()
  const [topFolders,       setTopFolders]       = useState<TopFolder[]>([])
  const [loading,          setLoading]          = useState(true)
  const [expanded,         setExpanded]         = useState<Set<string>>(new Set())

  // Add category
  const [showAddCategory,  setShowAddCategory]  = useState(false)
  const [newCategoryName,  setNewCategoryName]  = useState('')
  const [savingCategory,   setSavingCategory]   = useState(false)

  // Add sub-folder
  const [addingSubfolderTo, setAddingSubfolderTo] = useState<string | null>(null)
  const [newSubfolderName,  setNewSubfolderName]  = useState('')

  // Upload
  const [uploading,        setUploading]        = useState<Record<string, boolean>>({})
  const [dragOver,         setDragOver]         = useState<string | null>(null)   // folderId being dragged over
  const [pending,          setPending]          = useState<PendingUpload | null>(null)
  const [pendingName,      setPendingName]      = useState('')
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: folders }, { data: resources }] = await Promise.all([
      supabase.from('resource_folders').select('id, name, sort_order, parent_folder_id').order('sort_order'),
      supabase.from('resources').select('id, folder_id, name, storage_path, created_at').order('created_at'),
    ])
    const allFolders   = folders   ?? []
    const allResources = resources ?? []
    const top: TopFolder[] = allFolders
      .filter(f => !f.parent_folder_id)
      .map(f => ({
        ...f,
        parent_folder_id: null,
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

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Called when a file is picked or dropped — opens rename modal ─────────────
  function stagePendingUpload(folderId: string, folderName: string, file: File) {
    setPending({ file, folderId, folderName })
    setPendingName(nameWithoutExtension(file.name))
  }

  // ── Performs the actual upload after name is confirmed ───────────────────────
  async function confirmUpload() {
    if (!pending) return
    const { file, folderId } = pending
    const displayName = pendingName.trim() || nameWithoutExtension(file.name)
    const ext         = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
    const sanitized   = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path        = `${folderId}/${Date.now()}_${sanitized}`

    setPending(null)
    setUploading(prev => ({ ...prev, [folderId]: true }))

    const { error } = await supabase.storage
      .from('resources')
      .upload(path, file, { upsert: false })

    if (error) {
      alert(`Upload failed: ${error.message}`)
      setUploading(prev => ({ ...prev, [folderId]: false }))
      return
    }

    // Store with coach's chosen display name (add extension back if missing)
    const finalName = displayName.toLowerCase().endsWith(ext.toLowerCase())
      ? displayName
      : `${displayName}${ext}`

    await supabase.from('resources').insert({ folder_id: folderId, name: finalName, storage_path: path })
    setUploading(prev => ({ ...prev, [folderId]: false }))
    await loadData()
  }

  // ── Folder / resource management ─────────────────────────────────────────────

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return
    setSavingCategory(true)
    const maxOrder = topFolders.length ? Math.max(...topFolders.map(f => f.sort_order)) : 0
    await supabase.from('resource_folders').insert({ name: newCategoryName.trim(), sort_order: maxOrder + 1 })
    setNewCategoryName('')
    setSavingCategory(false)
    setShowAddCategory(false)
    await loadData()
  }

  async function handleAddSubfolder(parentId: string) {
    if (!newSubfolderName.trim()) return
    const parent   = topFolders.find(f => f.id === parentId)
    const maxOrder = parent?.subfolders.length ? Math.max(...parent.subfolders.map(s => s.sort_order)) : 0
    await supabase.from('resource_folders').insert({
      name: newSubfolderName.trim(),
      sort_order: maxOrder + 1,
      parent_folder_id: parentId,
    })
    setNewSubfolderName('')
    setAddingSubfolderTo(null)
    await loadData()
  }

  async function handleDeleteFolder(id: string, name: string, isTop: boolean) {
    const msg = isTop
      ? `Delete category "${name}" and everything inside it? This cannot be undone.`
      : `Delete sub-folder "${name}" and all its files?`
    if (!confirm(msg)) return
    const allFolderIds = [id]
    if (isTop) {
      topFolders.find(f => f.id === id)?.subfolders.forEach(sf => allFolderIds.push(sf.id))
    }
    const { data: filesToDelete } = await supabase
      .from('resources').select('storage_path').in('folder_id', allFolderIds)
    if (filesToDelete?.length) {
      await supabase.storage.from('resources').remove(filesToDelete.map(f => f.storage_path))
    }
    await supabase.from('resource_folders').delete().eq('id', id)
    await loadData()
  }

  async function handleDeleteResource(resource: Resource) {
    if (!confirm(`Delete "${resource.name}"?`)) return
    await supabase.storage.from('resources').remove([resource.storage_path])
    await supabase.from('resources').delete().eq('id', resource.id)
    await loadData()
  }

  async function handleOpen(storagePath: string) {
    const { data, error } = await supabase.storage.from('resources').createSignedUrl(storagePath, 3600)
    if (error || !data?.signedUrl) { alert('Could not open file'); return }
    window.open(data.signedUrl, '_blank')
  }

  // ── Sub-components ────────────────────────────────────────────────────────────

  function FileInput({ folderId, folderName }: { folderId: string; folderName: string }) {
    return (
      <input
        ref={el => { fileInputRefs.current[folderId] = el }}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.mp4,.mov"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) stagePendingUpload(folderId, folderName, file)
          if (e.target) e.target.value = ''
        }}
      />
    )
  }

  function DropZone({ folderId, folderName, indent = false }: { folderId: string; folderName: string; indent?: boolean }) {
    const isOver     = dragOver === folderId
    const isUploading = uploading[folderId]

    return (
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(folderId) }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null) }}
        onDrop={e => {
          e.preventDefault()
          setDragOver(null)
          const file = e.dataTransfer.files?.[0]
          if (file) stagePendingUpload(folderId, folderName, file)
        }}
        onClick={() => !isUploading && fileInputRefs.current[folderId]?.click()}
        className={`
          flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors rounded-lg
          border-2 border-dashed py-4 mx-4 my-3
          ${indent ? 'ml-8' : ''}
          ${isOver
            ? 'border-[var(--accent)] bg-blue-50 text-[var(--accent)]'
            : 'border-gray-200 text-[var(--text-subtle)] hover:border-gray-300 hover:bg-gray-50'}
        `}
      >
        {isUploading ? (
          <>
            <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-[var(--accent)]">Uploading…</span>
          </>
        ) : (
          <>
            <UploadIcon />
            <span className="text-xs font-medium">
              {isOver ? 'Drop to upload' : 'Drop a file here, or click to browse'}
            </span>
          </>
        )}
      </div>
    )
  }

  function ResourceRow({ r, indent = false }: { r: Resource; indent?: boolean }) {
    return (
      <div className={`flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] last:border-b-0 hover:bg-gray-50 group ${indent ? 'pl-8' : ''}`}>
        <FileIcon />
        <span className="text-sm flex-1 truncate">{r.name}</span>
        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => handleOpen(r.storage_path)} className="text-xs text-[var(--accent)] font-medium hover:underline">Open</button>
          <button onClick={() => handleDeleteResource(r)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Resources</h1>
        <button
          onClick={() => setShowAddCategory(true)}
          className="bg-[var(--accent)] text-white text-sm px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
        >
          + New category
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : topFolders.length === 0 ? (
        <div className="bg-white border border-[var(--border)] rounded-xl p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">No categories yet.</p>
          <p className="text-xs text-[var(--text-subtle)] mt-1">Create a category to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topFolders.map(tf => {
            const isOpen    = expanded.has(tf.id)
            const totalFiles = tf.resources.length + tf.subfolders.reduce((n, sf) => n + sf.resources.length, 0)
            const subCount  = tf.subfolders.length

            return (
              <div key={tf.id} className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">

                {/* Category header */}
                <button onClick={() => toggle(tf.id)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left">
                  <ChevronIcon open={isOpen} />
                  <FolderIcon />
                  <span className="font-semibold text-sm flex-1">{tf.name}</span>
                  <span className="text-xs text-[var(--text-subtle)]">
                    {subCount > 0 ? `${subCount} sub-folder${subCount !== 1 ? 's' : ''}, ` : ''}{totalFiles} file{totalFiles !== 1 ? 's' : ''}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-[var(--border)]">
                    <FileInput folderId={tf.id} folderName={tf.name} />

                    {/* Sub-folders */}
                    {tf.subfolders.map(sf => {
                      const sfOpen = expanded.has(sf.id)
                      return (
                        <div key={sf.id} className="border-b border-[var(--border)]">
                          <button onClick={() => toggle(sf.id)} className="w-full flex items-center gap-3 pl-8 pr-4 py-3 hover:bg-gray-50 transition-colors text-left">
                            <ChevronIcon open={sfOpen} />
                            <FolderIcon />
                            <span className="text-sm flex-1">{sf.name}</span>
                            <span className="text-xs text-[var(--text-subtle)]">{sf.resources.length} file{sf.resources.length !== 1 ? 's' : ''}</span>
                          </button>

                          {sfOpen && (
                            <div className="border-t border-[var(--border)]">
                              <FileInput folderId={sf.id} folderName={sf.name} />
                              {sf.resources.map(r => <ResourceRow key={r.id} r={r} indent />)}
                              <DropZone folderId={sf.id} folderName={sf.name} indent />
                              <div className="flex justify-end px-4 pb-2.5">
                                <button
                                  onClick={() => handleDeleteFolder(sf.id, sf.name, false)}
                                  className="text-xs text-[var(--text-subtle)] hover:text-red-500 transition-colors"
                                >
                                  Delete sub-folder
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Direct files in category */}
                    {tf.resources.map(r => <ResourceRow key={r.id} r={r} />)}

                    {/* Add sub-folder inline */}
                    {addingSubfolderTo === tf.id && (
                      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)] bg-blue-50">
                        <FolderIcon />
                        <input
                          type="text"
                          value={newSubfolderName}
                          onChange={e => setNewSubfolderName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddSubfolder(tf.id)
                            if (e.key === 'Escape') { setAddingSubfolderTo(null); setNewSubfolderName('') }
                          }}
                          placeholder="e.g. 2026"
                          className="flex-1 text-sm border border-[var(--border)] rounded px-2 py-1 focus:outline-none focus:border-[var(--accent)]"
                          autoFocus
                        />
                        <button onClick={() => handleAddSubfolder(tf.id)} className="text-xs text-[var(--accent)] font-semibold">Add</button>
                        <button onClick={() => { setAddingSubfolderTo(null); setNewSubfolderName('') }} className="text-xs text-[var(--text-subtle)]">Cancel</button>
                      </div>
                    )}

                    {/* Drop zone for category */}
                    <DropZone folderId={tf.id} folderName={tf.name} />

                    {/* Category footer */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-t border-[var(--border)]">
                      <button
                        onClick={() => { setAddingSubfolderTo(tf.id); setNewSubfolderName('') }}
                        className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                      >
                        + Sub-folder
                      </button>
                      <button
                        onClick={() => handleDeleteFolder(tf.id, tf.name, true)}
                        className="text-xs text-[var(--text-subtle)] hover:text-red-500 transition-colors"
                      >
                        Delete category
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Rename & upload modal ─────────────────────────────────────────── */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPending(null)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 shadow-xl">
            <h2 className="text-base font-bold mb-1">Upload file</h2>
            <p className="text-xs text-[var(--text-muted)] mb-5">
              To: <span className="font-medium text-[var(--text)]">{pending.folderName}</span>
              <span className="ml-3 text-[var(--text-subtle)]">
                {pending.file.name} · {formatBytes(pending.file.size)}
              </span>
            </p>

            <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
              Display name
            </label>
            <input
              type="text"
              value={pendingName}
              onChange={e => setPendingName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmUpload() }}
              placeholder={nameWithoutExtension(pending.file.name)}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
              autoFocus
            />
            <p className="text-[11px] text-[var(--text-subtle)] mt-1.5">
              This is what clients will see. The file extension will be kept.
            </p>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setPending(null)}
                className="flex-1 border border-[var(--border)] rounded-lg py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpload}
                disabled={!pendingName.trim()}
                className="flex-1 bg-[var(--accent)] text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add category modal ────────────────────────────────────────────── */}
      {showAddCategory && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowAddCategory(false); setNewCategoryName('') }} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 shadow-xl">
            <h2 className="text-base font-bold mb-4">New category</h2>
            <input
              type="text"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              placeholder="e.g. Recipes, Helpful Guides, Training Tips"
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
              autoFocus
            />
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowAddCategory(false); setNewCategoryName('') }}
                className="flex-1 border border-[var(--border)] rounded-lg py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                disabled={savingCategory || !newCategoryName.trim()}
                className="flex-1 bg-[var(--accent)] text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40"
              >
                {savingCategory ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
