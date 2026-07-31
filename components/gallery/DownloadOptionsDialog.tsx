// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useKeyboard } from '@/hooks/useKeyboard'
import ProgressBar from '@/components/ui/ProgressBar'
import type { PhotoData } from './ImageTile'

interface DownloadOptionsDialogProps {
  photos: PhotoData[]
  projectId: string
  title: string
  onClose: () => void
}

type Phase =
  | { kind: 'choosing' }
  | { kind: 'zipping' }
  | { kind: 'fetching'; done: number; total: number }
  | { kind: 'error'; message: string }

// Only a coarse, render-time check for button copy — the real
// navigator.canShare({files}) check happens right before invoking share,
// once the actual File objects exist.
const shareCapable =
  typeof navigator !== 'undefined' &&
  typeof navigator.share === 'function' &&
  typeof navigator.canShare === 'function'

export default function DownloadOptionsDialog({
  photos,
  projectId,
  title,
  onClose,
}: DownloadOptionsDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const zipButtonRef = useRef<HTMLButtonElement>(null)
  const trapFocus = useFocusTrap(dialogRef)
  const [phase, setPhase] = useState<Phase>({ kind: 'choosing' })

  const downloadable = useMemo(() => photos.filter((p) => p.original), [photos])
  const busy = phase.kind === 'zipping' || phase.kind === 'fetching'

  useEffect(() => {
    zipButtonRef.current?.focus({ preventScroll: true })
  }, [])

  const keyMap = useMemo(
    () => ({
      Escape: () => {
        if (!busy) onClose()
      },
    }),
    [busy, onClose]
  )
  useKeyboard(keyMap, true)

  const handleZip = useCallback(async () => {
    setPhase({ kind: 'zipping' })
    try {
      const res = await fetch(`/api/projects/${projectId}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: photos.map((p) => p.id) }),
      })
      if (!res.ok) throw new Error('zip failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}.zip`
      a.click()
      URL.revokeObjectURL(url)
      onClose()
    } catch {
      setPhase({ kind: 'error', message: 'Could not build the ZIP archive. Please try again.' })
    }
  }, [photos, projectId, title, onClose])

  const handleIndividual = useCallback(async () => {
    if (downloadable.length === 0) return
    setPhase({ kind: 'fetching', done: 0, total: downloadable.length })

    try {
      const files: File[] = []
      for (const [i, p] of downloadable.entries()) {
        const res = await fetch(p.original as string)
        if (!res.ok) throw new Error(`could not fetch ${p.filename}`)
        const blob = await res.blob()
        files.push(new File([blob], p.filename, { type: blob.type || 'image/jpeg' }))
        setPhase({ kind: 'fetching', done: i + 1, total: downloadable.length })
      }

      if (shareCapable && navigator.canShare({ files })) {
        try {
          await navigator.share({ files })
          onClose()
        } catch (err) {
          // The user dismissing the native share sheet is a normal cancel,
          // not a failure.
          if (err instanceof Error && err.name === 'AbortError') {
            setPhase({ kind: 'choosing' })
          } else {
            setPhase({ kind: 'error', message: 'Could not share the photos. Please try again.' })
          }
        }
        return
      }

      // Unsupported browser/platform: fall back to a per-file download, reusing
      // the blobs already fetched above (a direct href to the API route would
      // trigger the browser's native download prompt on top of this one).
      for (const file of files) {
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
      }
      onClose()
    } catch {
      setPhase({ kind: 'error', message: 'Could not fetch all photos. Please try again.' })
    }
  }, [downloadable, onClose])

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal
      aria-labelledby="download-options-heading"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 focus:outline-none"
      onKeyDown={trapFocus}
    >
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-6 text-white">
        <h2 id="download-options-heading" className="text-base font-semibold">
          Download {photos.length} photo{photos.length === 1 ? '' : 's'}
        </h2>

        {phase.kind === 'choosing' && (
          <div className="mt-4 flex flex-col gap-3">
            <button
              ref={zipButtonRef}
              onClick={handleZip}
              className="flex h-11 items-center justify-center rounded-xl bg-white text-sm font-medium text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              Download as ZIP
            </button>
            <button
              onClick={handleIndividual}
              disabled={downloadable.length === 0}
              className="flex h-11 items-center justify-center rounded-xl border border-white/30 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-40"
            >
              {shareCapable ? 'Share photos' : 'Download individually'}
            </button>
            <button
              onClick={onClose}
              className="flex h-11 items-center justify-center rounded-xl text-sm font-medium text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              Cancel
            </button>
          </div>
        )}

        {phase.kind === 'zipping' && (
          <div className="mt-4" aria-live="polite">
            <p className="mb-2 text-sm text-zinc-300">Preparing your download…</p>
            <ProgressBar label="Preparing your download" />
          </div>
        )}

        {phase.kind === 'fetching' && (
          <div className="mt-4" aria-live="polite">
            <p className="mb-2 text-sm text-zinc-300">
              Fetching photo {phase.done} of {phase.total}…
            </p>
            <ProgressBar
              value={(phase.done / phase.total) * 100}
              label={`Fetching photo ${phase.done} of ${phase.total}`}
            />
          </div>
        )}

        {phase.kind === 'error' && (
          <div className="mt-4">
            <p role="alert" className="text-sm text-red-400">
              {phase.message}
            </p>
            <button
              onClick={() => setPhase({ kind: 'choosing' })}
              className="mt-3 flex h-11 items-center justify-center rounded-xl border border-white/30 px-4 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
