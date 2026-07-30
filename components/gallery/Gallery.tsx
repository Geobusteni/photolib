'use client'

import { useCallback, useEffect, useReducer, useRef } from 'react'
import Toolbar from './Toolbar'
import ImageTile, { type PhotoData } from './ImageTile'
import PhotoViewer from '@/components/lightbox/PhotoViewer'

type GalleryState =
  | { mode: 'gallery' }
  | { mode: 'selection'; selected: Set<string> }
  | { mode: 'viewer'; currentIndex: number }

type Action =
  | { type: 'ENTER_SELECTION' }
  | { type: 'EXIT_SELECTION' }
  | { type: 'TOGGLE_SELECT'; id: string }
  | { type: 'OPEN_VIEWER'; index: number }
  | { type: 'CLOSE_VIEWER' }
  | { type: 'GO_TO'; index: number }

function reducer(state: GalleryState, action: Action): GalleryState {
  switch (action.type) {
    case 'ENTER_SELECTION':
      if (state.mode === 'viewer') return state
      return { mode: 'selection', selected: new Set() }

    case 'EXIT_SELECTION':
      return { mode: 'gallery' }

    case 'TOGGLE_SELECT': {
      if (state.mode !== 'selection') return state
      const selected = new Set(state.selected)
      if (selected.has(action.id)) selected.delete(action.id)
      else selected.add(action.id)
      return { mode: 'selection', selected }
    }

    // The lightbox stays shut during selection; that rule lives here, not in the UI.
    case 'OPEN_VIEWER':
      if (state.mode === 'selection') return state
      return { mode: 'viewer', currentIndex: action.index }

    case 'GO_TO':
      if (state.mode !== 'viewer') return state
      return { mode: 'viewer', currentIndex: action.index }

    case 'CLOSE_VIEWER':
      return { mode: 'gallery' }

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
  const openedFrom = useRef<HTMLElement | null>(null)

  const lastIndex = photos.length - 1
  const selected = state.mode === 'selection' ? state.selected : null

  const openViewer = useCallback((index: number) => {
    openedFrom.current = document.querySelector<HTMLElement>(
      `[data-photo-index="${index}"]`
    )
    dispatch({ type: 'OPEN_VIEWER', index })
  }, [])

  const closeViewer = useCallback(() => {
    dispatch({ type: 'CLOSE_VIEWER' })
    // Focus must land back on the tile that opened the viewer.
    requestAnimationFrame(() => openedFrom.current?.focus())
  }, [])

  const goTo = useCallback(
    (index: number) => {
      dispatch({ type: 'GO_TO', index: Math.max(0, Math.min(lastIndex, index)) })
    },
    [lastIndex]
  )

  const downloadSelected = useCallback(async () => {
    if (!selected || selected.size === 0) return

    const res = await fetch(`/api/projects/${projectId}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoIds: Array.from(selected) }),
    })
    if (!res.ok) return

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }, [selected, projectId, title])

  // Gallery-level shortcuts. The viewer registers its own while it is open.
  useEffect(() => {
    if (state.mode === 'viewer') return

    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 's':
        case 'S':
          dispatch({ type: state.mode === 'gallery' ? 'ENTER_SELECTION' : 'EXIT_SELECTION' })
          break
        case 'Escape':
          if (state.mode === 'selection') dispatch({ type: 'EXIT_SELECTION' })
          break
        case 'd':
        case 'D':
          if (state.mode === 'selection') downloadSelected()
          break
        case 'z':
        case 'Z':
          if (state.mode === 'gallery' && zipEnabled) {
            window.location.href = `/api/projects/${projectId}/download`
          }
          break
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [state.mode, downloadSelected, zipEnabled, projectId])

  return (
    <>
      <Toolbar
        title={title}
        mode={state.mode === 'selection' ? 'selection' : 'gallery'}
        selectedCount={selected?.size ?? 0}
        zipEnabled={zipEnabled}
        projectId={projectId}
        onEnterSelection={() => dispatch({ type: 'ENTER_SELECTION' })}
        onExitSelection={() => dispatch({ type: 'EXIT_SELECTION' })}
        onDownloadSelected={downloadSelected}
      />

      <main className="columns-2 gap-1 pt-14 sm:columns-3 lg:columns-4">
        <h1 className="sr-only">{title}</h1>
        {photos.map((photo, index) => (
          <div key={photo.id} className="mb-1 break-inside-avoid">
            <ImageTile
              photo={photo}
              index={index}
              total={photos.length}
              mode={state.mode === 'selection' ? 'selection' : 'gallery'}
              selected={selected?.has(photo.id) ?? false}
              onOpen={openViewer}
              onToggleSelect={(id) => dispatch({ type: 'TOGGLE_SELECT', id })}
            />
          </div>
        ))}
      </main>

      {state.mode === 'viewer' && (
        <PhotoViewer
          photos={photos}
          currentIndex={state.currentIndex}
          onClose={closeViewer}
          onPrev={() => goTo(state.currentIndex - 1)}
          onNext={() => goTo(state.currentIndex + 1)}
          onFirst={() => goTo(0)}
          onLast={() => goTo(lastIndex)}
        />
      )}

      <div aria-live="polite" className="sr-only">
        {selected && selected.size > 0
          ? `${selected.size} photo${selected.size === 1 ? '' : 's'} selected`
          : null}
      </div>
    </>
  )
}
