'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PhotoRow {
  id: string
  filename: string
}

export default function AdminPhotoGrid({
  photos,
  projectId,
}: {
  photos: PhotoRow[]
  projectId: string
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(photoId: string) {
    setDeleting(photoId)
    await fetch(`/api/projects/${projectId}/photos/${photoId}`, { method: 'DELETE' })
    setDeleting(null)
    router.refresh()
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
      {photos.map((photo) => {
        const base = photo.filename.replace(/\.[^.]+$/, '')
        return (
          <div
            key={photo.id}
            className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/uploads/${projectId}/thumbs/${base}-sm.jpg`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <button
              onClick={() => handleDelete(photo.id)}
              disabled={deleting === photo.id}
              aria-label={`Delete photo ${photo.filename}`}
              className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full text-white opacity-0 transition-opacity focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover:opacity-100 disabled:opacity-50"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/70">
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                  <path
                    d="M1 1l8 8M9 1L1 9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
