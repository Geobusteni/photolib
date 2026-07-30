'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGestures } from '@/hooks/useGestures'
import { useKeyboard } from '@/hooks/useKeyboard'
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

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function PhotoViewer({
  photos,
  currentIndex,
  onClose,
  onPrev,
  onNext,
  onFirst,
  onLast,
}: PhotoViewerProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [actionPanel, setActionPanel] = useState(false)

  const photo = photos[currentIndex]

  const resetHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setControlsVisible(true)
    if (isFullscreen) hideTimer.current = setTimeout(() => setControlsVisible(false), 3000)
  }, [isFullscreen])

  // Focus the dialog itself rather than a control, so opening the viewer never
  // reveals a focus-styled button on top of the image.
  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true })
    const timer = hideTimer
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  // The page keeps scrolling behind an open lightbox otherwise.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // Closing the viewer must also leave the browser's fullscreen mode, otherwise
  // the page stays fullscreen with nothing in it.
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [])

  // Controls only auto-hide in fullscreen; leaving it restores them for good.
  useEffect(() => {
    if (!isFullscreen) return
    hideTimer.current = setTimeout(() => setControlsVisible(false), 3000)
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [isFullscreen])

  useEffect(() => {
    function onFsChange() {
      const active = !!document.fullscreenElement
      setIsFullscreen(active)
      if (!active) {
        if (hideTimer.current) clearTimeout(hideTimer.current)
        setControlsVisible(true)
      }
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  const download = useCallback(() => {
    if (photo?.original) window.location.href = photo.original
  }, [photo])

  const keyMap = useMemo(
    () => ({
      // Escape steps out of fullscreen first, then closes.
      Escape: () => {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
        else onClose()
      },
      ArrowLeft: () => {
        onPrev()
        resetHideTimer()
      },
      ArrowRight: () => {
        onNext()
        resetHideTimer()
      },
      Home: () => {
        onFirst()
        resetHideTimer()
      },
      End: () => {
        onLast()
        resetHideTimer()
      },
      f: toggleFullscreen,
      F: toggleFullscreen,
      d: download,
      D: download,
    }),
    [onClose, onPrev, onNext, onFirst, onLast, download, resetHideTimer, toggleFullscreen]
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

  function trapFocus(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !dialogRef.current) return
    const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    )
    if (items.length === 0) {
      e.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  if (!photo) return null

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal
      tabIndex={-1}
      aria-label={`Photo viewer: image ${currentIndex + 1} of ${photos.length}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black focus:outline-none"
      onMouseMove={resetHideTimer}
      onKeyDown={trapFocus}
    >
      <div
        ref={containerRef}
        className="absolute inset-0 flex touch-none select-none items-center justify-center"
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
        downloadUrl={photo.original}
        isFullscreen={isFullscreen}
        controlsVisible={controlsVisible}
        onPrev={onPrev}
        onNext={onNext}
        onClose={onClose}
        onToggleFullscreen={toggleFullscreen}
      />

      {actionPanel && photo.original && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 rounded-t-2xl bg-zinc-900 p-6 sm:hidden">
          <a
            href={photo.original}
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
