'use client'

import { useReducer, useEffect, useCallback, useRef } from 'react'
import Toolbar from './Toolbar'
import ImageTile, { type PhotoData } from './ImageTile'
import PhotoViewer from '@/components/lightbox/PhotoViewer'

type GalleryMode =
  | { mode: 'gallery' }
  | { mode: 'selection'; selected: Set<string> }
  | { mode: 'viewer'; currentIndex: number }

type Action =
  | { type: 'ENTER_SELECTION' }
  | { type: 'EXIT_SELECTION' }
  | { type: 'TOGGLE_SELECT'; id: string }
  | { type: 'OPEN_VIEWER'; index: number }
  | { type: 'CLOSE_VIEWER' }
  | { type: 'VIEWER_PREV' }
  | { type: 'VIEWER_NEXT' }

function reducer(state: GalleryMode, action: Action): GalleryMode {
  switch (action.type) {
    case 'ENTER_SELECTION':
      if (state.mode === 'viewer') return state
      return { mode: 'selection', selected: new Set() }

    case 'EXIT_SELECTION':
      return { mode: 'gallery' }

    case 'TOGGLE_SELECT': {
      if (state.mode !== 'selection') return state
      const next = new Set(state.selected)
      if (next.has(action.id)) next.delete(action.id)
      else next.add(action.id)
      return { mode: 'selection', selected: next }
    }

    case 'OPEN_VIEWER':
      if (state.mode === 'selection') return state
      return { mode: 'viewer', currentIndex: action.index }

    case 'CLOSE_VIEWER':
      return { mode: 'gallery' }

    case 'VIEWER_PREV':
      if (state.mode !== 'viewer') return state
      return { ...state, currentIndex: Math.max(0, state.currentIndex - 1) }

    case 'VIEWER_NEXT':
      return state // handled with photos.length context below

    default:
      return state
  }
}

interface GalleryProps {
  photos: PhotoData[]
  title: string
  projectId: string
  zipEnabled: boolean
}

export default function Gallery({ photos, title, projectId, zipEnabled }: GalleryProps) {
  const [state, dispatch] = useReducer(reducer, { mode: 'gallery' })
  const openedFromRef = useRef<HTMLButtonElement | null>(null)

  const openViewer = useCallback((index: number) => {
    const tile = document.querySelector<HTMLButtonElement>(
      `[data-photo-id="${photos[index]?.id}"]`
    )
    openedFromRef.current = tile
    dispatch({ type: 'OPEN_VIEWER', index })
  }, [photos])

  const closeViewer = useCallback(() => {
    dispatch({ type: 'CLOSE_VIEWER' })
    // Return focus to the tile that triggered the viewer
    requestAnimationFrame(() => openedFromRef.current?.focus())
  }, [])

  const goNext = useCallback(() => {
    if (state.mode !== 'viewer') return
    const next = Math.min(photos.length - 1, state.currentIndex + 1)
    dispatch({ type: 'OPEN_VIEWER', index: next })
  }, [state, photos.length])

  const goPrev = useCallback(() => {
    dispatch({ type: 'VIEWER_PREV' })
  }, [])

  async function downloadSelected() {
    if (state.mode !== 'selection' || state.selected.size === 0) return
    const photoIds = Array.from(state.selected)
    const res = await fetch(`/api/projects/${projectId}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoIds }),
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'photos.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (state.mode === 'viewer') {
        if (e.key === 'Escape') closeViewer()
        if (e.key === 'ArrowLeft') goPrev()
        if (e.key === 'ArrowRight') goNext()
        return
      }

      if (e.key === 's' || e.key === 'S') {
        if (state.mode === 'gallery') dispatch({ type: 'ENTER_SELECTION' })
        else dispatch({ type: 'EXIT_SELECTION' })
      }
      if (e.key === 'Escape' && state.mode === 'selection') {
        dispatch({ type: 'EXIT_SELECTION' })
      }
      if ((e.key === 'd' || e.key === 'D') && state.mode === 'selection') {
        downloadSelected()
      }
      if ((e.key === 'z' || e.key === 'Z') && state.mode === 'gallery' && zipEnabled) {
        window.location.href = `/api/projects/${projectId}/download`
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [state, closeViewer, goPrev, goNext, zipEnabled, projectId])

  const currentIndex = state.mode === 'viewer' ? state.currentIndex : 0
  const selectedSet = state.mode === 'selection' ? state.selected : new Set<string>()

  return (
    <>
      <Toolbar
        title={title}
        mode={state.mode === 'viewer' ? 'gallery' : state.mode}
        selectedCount={selectedSet.size}
        zipEnabled={zipEnabled}
        projectId={projectId}
        onEnterSelection={() => dispatch({ type: 'ENTER_SELECTION' })}
        onExitSelection={() => dispatch({ type: 'EXIT_SELECTION' })}
        onDownloadSelected={downloadSelected}
      />

      <main
        className="columns-2 gap-1 pt-14 sm:columns-3 lg:columns-4"
        aria-label="Photo gallery"
      >
        {photos.map((photo, index) => (
          <div key={photo.id} className="mb-1 break-inside-avoid">
            <ImageTile
              photo={photo}
              index={index}
              mode={state.mode === 'selection' ? 'selection' : 'gallery'}
              selected={selectedSet.has(photo.id)}
              onOpen={openViewer}
              onToggleSelect={(id) => dispatch({ type: 'TOGGLE_SELECT', id })}
            />
          </div>
        ))}
      </main>

      {state.mode === 'viewer' && (
        <PhotoViewer
          photos={photos}
          currentIndex={currentIndex}
          onClose={closeViewer}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}

      {/* Live region for screen readers */}
      <div aria-live="polite" aria-atomic className="sr-only">
        {state.mode === 'selection' && selectedSet.size > 0
          ? `${selectedSet.size} photo${selectedSet.size === 1 ? '' : 's'} selected`
          : null}
      </div>
    </>
  )
}
