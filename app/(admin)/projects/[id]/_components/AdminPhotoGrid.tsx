'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { Photo } from '@/lib/projects'

export default function AdminPhotoGrid({
  photos,
  projectId,
}: {
  photos: Photo[]
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
      {photos.map((photo) => (
        <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Image
            src={`/api/uploads/${projectId}/thumbs/${encodeURIComponent(photo.filename.replace(/\.[^.]+$/, ''))}-sm.jpg`}
            alt={photo.filename}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
          />
          <button
            onClick={() => handleDelete(photo.id)}
            disabled={deleting === photo.id}
            aria-label={`Delete ${photo.filename}`}
            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 disabled:opacity-50"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
