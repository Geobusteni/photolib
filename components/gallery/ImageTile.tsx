'use client'

import { useRef } from 'react'

export interface PhotoData {
  id: string
  filename: string
  width: number
  height: number
  thumbSm: string
  thumbLg: string
  original: string | null
}

interface ImageTileProps {
  photo: PhotoData
  index: number
  mode: 'gallery' | 'selection'
  selected: boolean
  onOpen: (index: number) => void
  onToggleSelect: (id: string) => void
}

export default function ImageTile({
  photo,
  index,
  mode,
  selected,
  onOpen,
  onToggleSelect,
}: ImageTileProps) {
  const ref = useRef<HTMLButtonElement>(null)

  function handleClick() {
    if (mode === 'selection') {
      onToggleSelect(photo.id)
    } else {
      onOpen(index)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') onOpen(index)
    if (e.key === ' ') {
      e.preventDefault()
      onToggleSelect(photo.id)
    }
  }

  const aspectRatio = photo.width > 0 ? photo.height / photo.width : 1

  return (
    <button
      ref={ref}
      data-photo-id={photo.id}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={
        mode === 'selection'
          ? `${selected ? 'Deselect' : 'Select'} photo ${index + 1}`
          : `Open photo ${index + 1}`
      }
      aria-pressed={mode === 'selection' ? selected : undefined}
      className="group relative w-full overflow-hidden rounded-sm bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumbSm}
        srcSet={`${photo.thumbSm} 400w, ${photo.thumbLg} 1200w`}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        alt={`Photo ${index + 1}`}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-opacity duration-200 @media(prefers-reduced-motion:reduce):transition-none"
        style={{ display: 'block' }}
      />

      {mode === 'selection' && (
        <div
          aria-hidden
          className={`absolute inset-0 flex items-center justify-center transition-colors ${
            selected ? 'bg-black/40' : 'bg-transparent group-hover:bg-black/10'
          }`}
        >
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors ${
              selected
                ? 'border-white bg-white'
                : 'border-white/70 bg-transparent'
            }`}
          >
            {selected && (
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden>
                <path d="M1 5l3 3 7-7" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
        </div>
      )}
    </button>
  )
}

export type { ImageTileProps }
