// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGestures } from '@/hooks/useGestures'
import { useImageZoom } from '@/hooks/useImageZoom'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useKeyboard } from '@/hooks/useKeyboard'
import {
  exitFullscreen,
  isFullscreenActive,
  isFullscreenSupported,
  requestFullscreen,
} from '@/lib/fullscreen'
import ViewerControls from './ViewerControls'
import type { PhotoData } from '@/components/gallery/ImageTile'

// 'simulated' covers platforms (iOS Safari) with no Fullscreen API for
// non-video elements: the button still does something meaningful everywhere.
type FullscreenMode = 'off' | 'native' | 'simulated'

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
  const dialogRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [fullscreenMode, setFullscreenMode] = useState<FullscreenMode>('off')
  const isFullscreen = fullscreenMode !== 'off'
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [actionPanel, setActionPanel] = useState(false)
  const zoom = useImageZoom(containerRef)

  const photo = photos[currentIndex]

  // Zoom must not follow the viewer across photos.
  useEffect(() => {
    zoom.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex])

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
  // the page stays fullscreen with nothing in it. Simulated fullscreen needs no
  // native call — its state just disappears along with the component.
  useEffect(() => {
    return () => {
      if (isFullscreenActive()) exitFullscreen().catch(() => {})
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

  // Latest fullscreenMode for the fullscreenchange listener below, which is
  // registered once and must not read a stale closure value.
  const fullscreenModeRef = useRef(fullscreenMode)
  useEffect(() => {
    fullscreenModeRef.current = fullscreenMode
  })

  const exitFullscreenUI = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setControlsVisible(true)
    setFullscreenMode('off')
  }, [])

  // Only a native session ends externally (browser back-gesture, system UI);
  // simulated mode has no corresponding DOM event and is only ever changed by
  // our own toggleFullscreen/Escape handling.
  useEffect(() => {
    function onFsChange() {
      if (!isFullscreenActive() && fullscreenModeRef.current === 'native') exitFullscreenUI()
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [exitFullscreenUI])

  const toggleFullscreen = useCallback(() => {
    if (fullscreenMode !== 'off') {
      if (fullscreenMode === 'native') exitFullscreen().catch(() => {})
      exitFullscreenUI()
      return
    }
    if (!isFullscreenSupported()) {
      setFullscreenMode('simulated')
      return
    }
    requestFullscreen(document.documentElement)
      .then(() => setFullscreenMode('native'))
      .catch(() => setFullscreenMode('simulated'))
  }, [fullscreenMode, exitFullscreenUI])

  const download = useCallback(() => {
    if (photo?.original) window.location.href = photo.original
  }, [photo])

  const keyMap = useMemo(
    () => ({
      // Escape steps out of fullscreen first, then closes. Applies uniformly
      // whether fullscreen is native or simulated.
      Escape: () => {
        if (fullscreenMode !== 'off') {
          if (fullscreenMode === 'native') exitFullscreen().catch(() => {})
          exitFullscreenUI()
        } else {
          onClose()
        }
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
    [
      onClose,
      onPrev,
      onNext,
      onFirst,
      onLast,
      download,
      resetHideTimer,
      toggleFullscreen,
      fullscreenMode,
      exitFullscreenUI,
    ]
  )

  useKeyboard(keyMap, true)

  useGestures(
    containerRef,
    {
      onSwipeLeft: onNext,
      onSwipeRight: onPrev,
      onSwipeDown: onClose,
      onSwipeUp: () => setActionPanel((v) => !v),
      onTap: () => {
        setControlsVisible((v) => !v)
        if (isFullscreen) resetHideTimer()
      },
      onDoubleTap: zoom.onDoubleTap,
      onPinchStart: zoom.onPinchStart,
      onPinchMove: zoom.onPinchMove,
      onPinchEnd: zoom.onPinchEnd,
      onPanMove: zoom.onPanMove,
      onPanEnd: zoom.onPanEnd,
    },
    { zoomed: zoom.isZoomed() }
  )

  const trapFocus = useFocusTrap(dialogRef)

  if (!photo) return null

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal
      tabIndex={-1}
      aria-label={`Photo viewer: image ${currentIndex + 1} of ${photos.length}`}
      className="fixed inset-0 z-50 flex h-dvh items-center justify-center bg-black focus:outline-none"
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
          style={{
            userSelect: 'none',
            pointerEvents: 'none',
            transform: `translate(${zoom.zoom.x}px, ${zoom.zoom.y}px) scale(${zoom.zoom.scale})`,
            transition: zoom.zoom.snapping ? 'transform 200ms' : 'none',
          }}
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
