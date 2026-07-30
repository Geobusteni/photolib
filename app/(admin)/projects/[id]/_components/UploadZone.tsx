'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Strategy = 'overwrite' | 'rename' | 'skip'

interface Conflict {
  files: File[]
  names: string[]
}

export default function UploadZone({ projectId }: { projectId: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<Conflict | null>(null)

  const busy = status !== null

  async function send(file: File, strategy?: Strategy) {
    const form = new FormData()
    form.append('file', file)
    if (strategy) form.append('strategy', strategy)
    const res = await fetch(`/api/projects/${projectId}/upload`, { method: 'POST', body: form })
    return { res, data: await res.json().catch(() => ({})) }
  }

  async function upload(files: File[], strategy?: Strategy) {
    const accepted = files.filter(
      (f) =>
        f.type === 'image/jpeg' ||
        /\.jpe?g$/i.test(f.name) ||
        f.type === 'application/zip' ||
        /\.zip$/i.test(f.name)
    )

    if (accepted.length === 0) {
      setError('Only JPEG images and ZIP archives are accepted.')
      return
    }

    setError(null)
    setConflict(null)

    const pending: File[] = []
    const names: string[] = []

    for (const [i, file] of accepted.entries()) {
      setStatus(`Uploading ${i + 1} of ${accepted.length}: ${file.name}`)
      const { res, data } = await send(file, strategy)

      if (res.status === 409) {
        pending.push(file)
        names.push(...(data.conflicts ?? []))
        continue
      }
      if (!res.ok) {
        setError(data.error ?? `Could not upload ${file.name}`)
        setStatus(null)
        router.refresh()
        return
      }
    }

    setStatus(null)
    router.refresh()

    if (pending.length > 0) setConflict({ files: pending, names })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) upload(Array.from(e.dataTransfer.files))
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload photos. Click to choose files, or drop JPEG images or a ZIP archive here."
        aria-busy={busy}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!busy) inputRef.current?.click()
          }
        }}
        className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 ${
          dragging
            ? 'border-zinc-400 bg-zinc-100 dark:border-zinc-500 dark:bg-zinc-800'
            : 'border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,.jpg,.jpeg,.zip,application/zip"
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            if (e.target.files?.length) upload(Array.from(e.target.files))
            e.target.value = ''
          }}
        />
        {busy ? (
          <p className="text-sm text-zinc-500">{status}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Drop photos or a ZIP here
            </p>
            <p className="text-xs text-zinc-500">
              Original filenames are kept. A ZIP dropped here is unpacked into photos.
            </p>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {conflict && (
        <div
          role="alertdialog"
          aria-labelledby="conflict-heading"
          className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40"
        >
          <h3
            id="conflict-heading"
            className="text-sm font-semibold text-amber-900 dark:text-amber-200"
          >
            {conflict.names.length} photo{conflict.names.length === 1 ? '' : 's'} already exist
          </h3>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            {conflict.names.slice(0, 5).join(', ')}
            {conflict.names.length > 5 && ` and ${conflict.names.length - 5} more`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => upload(conflict.files, 'rename')}
              className="h-9 rounded-lg bg-amber-900 px-4 text-sm font-medium text-white hover:bg-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 dark:bg-amber-200 dark:text-amber-950"
            >
              Keep both
            </button>
            <button
              onClick={() => upload(conflict.files, 'overwrite')}
              className="h-9 rounded-lg border border-amber-400 px-4 text-sm font-medium text-amber-900 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
            >
              Replace existing
            </button>
            <button
              onClick={() => setConflict(null)}
              className="h-9 rounded-lg px-4 text-sm font-medium text-amber-900 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:text-amber-200 dark:hover:bg-amber-900/40"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
