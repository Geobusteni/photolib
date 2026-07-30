// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import type { PhotoData } from '@/components/gallery/ImageTile'

interface PhotoRecord {
  id: string
  projectId: string
  filename: string
  originalName: string
  width: number
  height: number
}

export function toPhotoData(photo: PhotoRecord, dlEnabled: boolean): PhotoData {
  const base = photo.filename.replace(/\.[^.]+$/, '')
  const dir = `/api/uploads/${photo.projectId}`
  return {
    id: photo.id,
    filename: photo.originalName,
    width: photo.width,
    height: photo.height,
    thumbSm: `${dir}/thumbs/${base}-sm.jpg`,
    thumbLg: `${dir}/thumbs/${base}-lg.jpg`,
    // Downloads route through the photo id so the server can restore the original name.
    original: dlEnabled ? `/api/projects/${photo.projectId}/photos/${photo.id}/download` : null,
  }
}
