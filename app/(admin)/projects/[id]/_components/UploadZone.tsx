'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function UploadZone({ projectId }: { projectId: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)

  async function uploadFiles(files: FileList | File[]) {
    const allowed = Array.from(files).filter(
      (f) => f.type === 'image/jpeg' || f.type === 'application/zip' || f.name.endsWith('.zip')
    )

    if (allowed.length === 0) {
      setError('Only JPEG images and ZIP archives are accepted.')
      return
    }

    setUploading(true)
    setError(null)

    for (let i = 0; i < allowed.length; i++) {
      const file = allowed[i]
      setProgress(`Uploading ${i + 1} of ${allowed.length}: ${file.name}`)
      const form = new FormData()
      form.append('file', file)

      const res = await fetch(`/api/projects/${projectId}/upload`, {
        method: 'POST',
        body: form,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? `Failed to upload ${file.name}`)
        setUploading(false)
        setProgress(null)
        return
      }
    }

    setUploading(false)
    setProgress(null)
    router.refresh()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files)
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload photos — click or drag and drop JPEG images or a ZIP archive"
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 ${
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
          onChange={(e) => { if (e.target.files) uploadFiles(e.target.files) }}
          aria-hidden
          tabIndex={-1}
        />
        {uploading ? (
          <p className="text-sm text-zinc-500">{progress ?? 'Uploading…'}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Drop photos or a ZIP here
            </p>
            <p className="text-xs text-zinc-500">JPEG images or a single ZIP archive</p>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
