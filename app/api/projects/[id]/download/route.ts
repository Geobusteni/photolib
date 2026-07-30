import { verifyGalleryAccess } from '@/lib/gallery-auth'
import { getProject, listPhotos, getPhoto, incrementDownload } from '@/lib/projects'
import { photosDir } from '@/lib/storage'
import path from 'path'
import fs from 'fs/promises'
import { zipSync } from 'fflate'

type Ctx = { params: Promise<{ id: string }> }

async function buildZip(
  filePaths: { src: string; name: string }[]
): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {}
  await Promise.all(
    filePaths.map(async ({ src, name }) => {
      const buf = await fs.readFile(src)
      files[name] = new Uint8Array(buf)
    })
  )
  return zipSync(files, { level: 1 })
}

function zipResponse(data: Uint8Array, filename: string): Response {
  return new Response(Buffer.from(data), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}.zip"`,
      'Content-Length': String(data.length),
    },
  })
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const project = getProject(id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!project.zip_enabled) return Response.json({ error: 'ZIP download disabled' }, { status: 403 })

  const hasAccess = await verifyGalleryAccess(id)
  if (!hasAccess) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const photos = listPhotos(id)
  const dir = photosDir(id)
  const filePaths = photos.map((p) => ({
    src: path.join(dir, p.filename),
    name: p.filename,
  }))

  const data = await buildZip(filePaths)
  setImmediate(() => incrementDownload(id))
  return zipResponse(data, project.title)
}

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const project = getProject(id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  const hasAccess = await verifyGalleryAccess(id)
  if (!hasAccess) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!Array.isArray(body?.photoIds) || body.photoIds.length === 0) {
    return Response.json({ error: 'photoIds required' }, { status: 400 })
  }

  const dir = photosDir(id)
  const filePaths: { src: string; name: string }[] = []

  for (const photoId of body.photoIds as string[]) {
    const photo = getPhoto(photoId)
    if (!photo || photo.project_id !== id) continue
    filePaths.push({ src: path.join(dir, photo.filename), name: photo.filename })
  }

  if (filePaths.length === 0) return Response.json({ error: 'No valid photos' }, { status: 400 })

  const data = await buildZip(filePaths)
  setImmediate(() => incrementDownload(id))
  return zipResponse(data, `${project.title}-selection`)
}
