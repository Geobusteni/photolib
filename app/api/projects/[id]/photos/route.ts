import { verifyGalleryAccess } from '@/lib/gallery-auth'
import { getProject, listPhotos } from '@/lib/projects'
import { toPhotoData } from '@/lib/photo-data'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const project = await getProject(id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  if (!(await verifyGalleryAccess(id))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const photos = await listPhotos(id)
  return Response.json(photos.map((p) => toPhotoData(p, project.dlEnabled)))
}
