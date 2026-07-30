'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  projectId: string
  archiveName: string | null
  archiveSize: number | null
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export default function ArchiveManager({ projectId, archiveName, archiveSize }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File) {
    setError(null)
    setBusy(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/projects/${projectId}/archive`, { method: 'POST', body: form })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setError(data.error ?? 'Upload failed')
      return
    }
    router.refresh()
  }

  async function remove() {
    setBusy(true)
    await fetch(`/api/projects/${projectId}/archive`, { method: 'DELETE' })
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Download archive</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Clients only see a “Download ZIP” button when you upload an archive here. Photolib never
        builds a full archive on its own — clients can still zip their own selection.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) upload(file)
          e.target.value = ''
        }}
      />

      {archiveName ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            {archiveName}
            {archiveSize != null && (
              <span className="text-zinc-500"> · {formatSize(archiveSize)}</span>
            )}
          </span>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="h-9 rounded-lg border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Replace
          </button>
          <button
            onClick={remove}
            disabled={busy}
            className="h-9 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-3 h-9 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {busy ? 'Uploading…' : 'Upload archive'}
        </button>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
