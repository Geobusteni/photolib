import { verifyGalleryAccess } from '@/lib/gallery-auth'
import { getProject, listPhotos } from '@/lib/projects'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const project = getProject(id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  const hasAccess = await verifyGalleryAccess(id)
  if (!hasAccess) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const photos = listPhotos(id)
  return Response.json(
    photos.map((p) => {
      const base = p.filename.replace(/\.[^.]+$/, '')
      return {
        id: p.id,
        filename: p.filename,
        width: p.width,
        height: p.height,
        thumbSm: `/api/uploads/${id}/thumbs/${encodeURIComponent(base)}-sm.jpg`,
        thumbLg: `/api/uploads/${id}/thumbs/${encodeURIComponent(base)}-lg.jpg`,
        original: project.dl_enabled ? `/api/uploads/${id}/photos/${encodeURIComponent(p.filename)}` : null,
      }
    })
  )
}
