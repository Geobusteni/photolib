'use client'

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
  total: number
  mode: 'gallery' | 'selection'
  selected: boolean
  onOpen: (index: number) => void
  onToggleSelect: (id: string) => void
}

export default function ImageTile({
  photo,
  index,
  total,
  mode,
  selected,
  onOpen,
  onToggleSelect,
}: ImageTileProps) {
  const selecting = mode === 'selection'
  const position = `${index + 1} of ${total}`

  function handleClick() {
    if (selecting) onToggleSelect(photo.id)
    else onOpen(index)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === ' ') {
      e.preventDefault()
      onToggleSelect(photo.id)
    }
  }

  return (
    <button
      data-photo-index={index}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={
        selecting
          ? `${selected ? 'Deselect' : 'Select'} photo ${position}`
          : `Open photo ${position}`
      }
      aria-pressed={selecting ? selected : undefined}
      className="group relative block w-full overflow-hidden rounded-sm bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumbSm}
        srcSet={`${photo.thumbSm} 400w, ${photo.thumbLg} 1200w`}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="block h-full w-full object-cover"
      />

      {selecting && (
        <span
          aria-hidden
          className={`absolute inset-0 flex items-center justify-center transition-colors ${
            selected ? 'bg-black/40' : 'group-hover:bg-black/10'
          }`}
        >
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
              selected ? 'border-white bg-white' : 'border-white/80'
            }`}
          >
            {selected && (
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden>
                <path
                  d="M1 5l3 3 7-7"
                  stroke="#000"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        </span>
      )}
    </button>
  )
}
