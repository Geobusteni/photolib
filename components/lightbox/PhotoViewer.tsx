'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGestures } from '@/hooks/useGestures'
import { useKeyboard } from '@/hooks/useKeyboard'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import ViewerControls from './ViewerControls'
import type { PhotoData } from '@/components/gallery/ImageTile'

interface PhotoViewerProps {
  photos: PhotoData[]
  currentIndex: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onFirst: () => void
  onLast: () => void
}

export default function PhotoViewer({
  photos,
  currentIndex,
  onClose,
  onPrev,
  onNext,
  onFirst,
  onLast,
}: PhotoViewerProps) {
  const reduced = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [actionPanel, setActionPanel] = useState(false)

  const photo = photos[currentIndex]

  const resetHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setControlsVisible(true)
    if (isFullscreen) {
      hideTimer.current = setTimeout(() => setControlsVisible(false), 3000)
    }
  }, [isFullscreen])

  useEffect(() => {
    closeButtonRef.current?.focus()
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [])

  // Controls only auto-hide in fullscreen; leaving it restores them permanently.
  useEffect(() => {
    const timer = hideTimer.current
    if (!isFullscreen) {
      if (timer) clearTimeout(timer)
      return
    }
    hideTimer.current = setTimeout(() => setControlsVisible(false), 3000)
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [isFullscreen])

  // Sync fullscreen state with browser API
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  const download = useCallback(() => {
    if (photo?.original) window.open(`${photo.original}?download`, '_blank')
  }, [photo])

  const keyMap = useMemo(
    () => ({
      Escape: () => {
        if (isFullscreen) document.exitFullscreen().catch(() => {})
        else onClose()
      },
      ArrowLeft: () => { onPrev(); resetHideTimer() },
      ArrowRight: () => { onNext(); resetHideTimer() },
      Home: () => { onFirst(); resetHideTimer() },
      End: () => { onLast(); resetHideTimer() },
      f: toggleFullscreen,
      F: toggleFullscreen,
      d: download,
      D: download,
    }),
    [isFullscreen, onClose, onPrev, onNext, onFirst, onLast, download, resetHideTimer]
  )

  useKeyboard(keyMap, true)

  useGestures(containerRef, {
    onSwipeLeft: onNext,
    onSwipeRight: onPrev,
    onSwipeDown: onClose,
    onSwipeUp: () => setActionPanel((v) => !v),
    onTap: () => {
      setControlsVisible((v) => !v)
      if (isFullscreen) resetHideTimer()
    },
  })

  if (!photo) return null

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={`Photo viewer: image ${currentIndex + 1} of ${photos.length}`}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black ${reduced ? '' : ''}`}
      onMouseMove={resetHideTimer}
    >
      {/* Hidden close button to hold focus on open */}
      <button
        ref={closeButtonRef}
        onClick={onClose}
        aria-label="Close viewer"
        className="sr-only focus:not-sr-only focus:absolute focus:right-4 focus:top-4 focus:z-10 focus:rounded-lg focus:bg-white/10 focus:px-4 focus:py-2 focus:text-white"
      >
        Close viewer
      </button>

      {/* Image area — takes pointer events for gestures */}
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center touch-none select-none"
        style={{ touchAction: 'none' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={photo.thumbLg}
          alt={`Photo ${currentIndex + 1} of ${photos.length}`}
          className="max-h-full max-w-full object-contain"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
          draggable={false}
        />
      </div>

      <ViewerControls
        currentIndex={currentIndex}
        total={photos.length}
        dlEnabled={!!photo.original}
        downloadUrl={photo.original}
        isFullscreen={isFullscreen}
        controlsVisible={controlsVisible}
        onPrev={onPrev}
        onNext={onNext}
        onClose={onClose}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Mobile action panel (swipe up) */}
      {actionPanel && photo.original && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 rounded-t-2xl bg-zinc-900 p-6 sm:hidden">
          <a
            href={`${photo.original}?download`}
            download
            className="flex h-12 items-center justify-center rounded-xl bg-white text-sm font-medium text-zinc-900"
            onClick={() => setActionPanel(false)}
          >
            Download image
          </a>
          <button
            onClick={() => setActionPanel(false)}
            className="h-12 rounded-xl text-sm font-medium text-zinc-400"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
