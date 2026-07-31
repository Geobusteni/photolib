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

// Revoking the object URL must wait until the browser has actually started
// reading the blob — revoking synchronously after click() races the
// (often async) download start and can silently no-op it.
const REVOKE_DELAY_MS = 1000

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}

// Individual downloads/shares use the compressed ~2048px "share" variant, not the true
// original — mobile navigator.share() fails/times out fetching multi-MB originals over a
// cellular connection. Full-resolution originals stay reserved for the ZIP paths.
async function fetchAsFile(photo: PhotoData): Promise<File> {
  const url = `${photo.original as string}?variant=share`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`could not fetch ${photo.filename}`)
  const blob = await res.blob()
  return new File([blob], photo.filename, { type: blob.type || 'image/jpeg' })
}

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
  const singlePhotoPrefetchRef = useRef<Promise<File> | null>(null)

  const downloadable = useMemo(() => photos.filter((p) => p.original), [photos])
  const busy = phase.kind === 'zipping' || phase.kind === 'fetching'
  const singlePhoto = downloadable.length === 1 ? downloadable[0] : null

  useEffect(() => {
    zipButtonRef.current?.focus({ preventScroll: true })
  }, [])

  // Fetch the single photo as soon as the dialog opens so that, by the time
  // the user taps Share, navigator.share() can fire off the fresh click with
  // no network-bound await in between — that gap is what lets browsers'
  // user-activation window for Web Share expire on slow connections.
  useEffect(() => {
    if (!singlePhoto) return
    const promise = fetchAsFile(singlePhoto)
    promise.catch(() => {})
    singlePhotoPrefetchRef.current = promise
    // singlePhoto is derived fresh each render; keying on its id (not the
    // object) avoids re-fetching on every re-render of the same photo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singlePhoto?.id])

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
      downloadBlob(blob, `${title}.zip`)
      onClose()
    } catch {
      setPhase({ kind: 'error', message: 'Could not build the ZIP archive. Please try again.' })
    }
  }, [photos, projectId, title, onClose])

  // Single-photo path (the lightbox's only usage): consumes the eager
  // prefetch so navigator.share() runs immediately off the click, keeping
  // it inside the browser's user-activation window.
  const handleSingleIndividual = useCallback(async () => {
    const photo = downloadable[0]
    setPhase({ kind: 'fetching', done: 0, total: 1 })

    try {
      const file = await (singlePhotoPrefetchRef.current ?? fetchAsFile(photo))
      setPhase({ kind: 'fetching', done: 1, total: 1 })

      if (shareCapable && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file] })
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

      downloadBlob(file, file.name)
      onClose()
    } catch {
      setPhase({ kind: 'error', message: 'Could not fetch the photo. Please try again.' })
    }
  }, [downloadable, onClose])

  const handleMultiIndividual = useCallback(async () => {
    setPhase({ kind: 'fetching', done: 0, total: downloadable.length })

    try {
      const files: File[] = []
      for (const [i, p] of downloadable.entries()) {
        files.push(await fetchAsFile(p))
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
      files.forEach((file) => downloadBlob(file, file.name))
      onClose()
    } catch {
      setPhase({ kind: 'error', message: 'Could not fetch all photos. Please try again.' })
    }
  }, [downloadable, onClose])

  const handleIndividual = useCallback(async () => {
    if (downloadable.length === 0) return
    if (downloadable.length === 1) {
      await handleSingleIndividual()
    } else {
      await handleMultiIndividual()
    }
  }, [downloadable, handleSingleIndividual, handleMultiIndividual])

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
