// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

interface ViewerControlsProps {
  currentIndex: number
  total: number
  canDownload: boolean
  isFullscreen: boolean
  controlsVisible: boolean
  onPrev: () => void
  onNext: () => void
  onClose: () => void
  onToggleFullscreen: () => void
  onOpenDownload: () => void
}

export default function ViewerControls({
  currentIndex,
  total,
  canDownload,
  isFullscreen,
  controlsVisible,
  onPrev,
  onNext,
  onClose,
  onToggleFullscreen,
  onOpenDownload,
}: ViewerControlsProps) {
  const visible = controlsVisible

  return (
    <>
      {/* Top bar */}
      <div
        aria-hidden={!visible}
        className={`absolute inset-x-0 top-0 z-10 flex h-14 items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 transition-opacity duration-200 [.reduce-motion_&]:transition-none ${
          visible ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <span className="text-sm text-white/70">
          {currentIndex + 1} / {total}
        </span>
        <div className="flex items-center gap-1">
          {canDownload && (
            <button
              onClick={onOpenDownload}
              aria-label="Download image"
              className={iconBtn}
              tabIndex={visible ? 0 : -1}
            >
              <DownloadIcon />
            </button>
          )}
          <button
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className={iconBtn}
            tabIndex={visible ? 0 : -1}
          >
            {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
          </button>
          <button
            onClick={onClose}
            aria-label="Close viewer"
            className={iconBtn}
            tabIndex={visible ? 0 : -1}
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Prev / Next */}
      <button
        onClick={onPrev}
        disabled={currentIndex === 0}
        aria-label="Previous image"
        className={`${navBtn} left-2 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'} disabled:opacity-0`}
        tabIndex={visible ? 0 : -1}
      >
        <ChevronLeftIcon />
      </button>
      <button
        onClick={onNext}
        disabled={currentIndex === total - 1}
        aria-label="Next image"
        className={`${navBtn} right-2 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'} disabled:opacity-0`}
        tabIndex={visible ? 0 : -1}
      >
        <ChevronRightIcon />
      </button>
    </>
  )
}

const iconBtn =
  'flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors'

const navBtn =
  'absolute top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/50 transition-opacity duration-200 [.reduce-motion_&]:transition-none'

function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 3v10M6 9l4 4 4-4M3 15h14" />
    </svg>
  )
}

function FullscreenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" />
    </svg>
  )
}

function ExitFullscreenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <path d="M7 3v4H3M13 3v4h4M17 13h-4v4M7 17v-4H3" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <path d="M4 4l12 12M16 4L4 16" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M13 4l-6 6 6 6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 4l6 6-6 6" />
    </svg>
  )
}
