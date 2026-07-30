import type { PhotoData } from '@/components/gallery/ImageTile'

interface PhotoRecord {
  id: string
  projectId: string
  filename: string
  width: number
  height: number
}

export function toPhotoData(photo: PhotoRecord, dlEnabled: boolean): PhotoData {
  const base = photo.filename.replace(/\.[^.]+$/, '')
  const dir = `/api/uploads/${photo.projectId}`
  return {
    id: photo.id,
    filename: photo.filename,
    width: photo.width,
    height: photo.height,
    thumbSm: `${dir}/thumbs/${base}-sm.jpg`,
    thumbLg: `${dir}/thumbs/${base}-lg.jpg`,
    original: dlEnabled ? `${dir}/photos/${photo.filename}` : null,
  }
}
