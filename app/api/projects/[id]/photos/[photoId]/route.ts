import { requireAdmin } from '@/lib/auth'
import { getPhoto, deletePhoto } from '@/lib/projects'
import { deletePhotoFiles } from '@/lib/storage'

type Ctx = { params: Promise<{ id: string; photoId: string }> }

export async function DELETE(_req: Request, ctx: Ctx) {
  await requireAdmin()
  const { id, photoId } = await ctx.params

  const photo = getPhoto(photoId)
  if (!photo || photo.project_id !== id) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  deletePhoto(photoId)
  await deletePhotoFiles(id, photo.filename)

  return Response.json({ ok: true })
}
