import { verifyGalleryAccess } from '@/lib/gallery-auth'
import { getPhoto, getProject, incrementDownload, listPhotos } from '@/lib/projects'
import { photosDir } from '@/lib/storage'
import path from 'path'
import fs from 'fs/promises'
import { zipSync } from 'fflate'

type Ctx = { params: Promise<{ id: string }> }

async function buildZip(filePaths: { src: string; name: string }[]): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {}
  await Promise.all(
    filePaths.map(async ({ src, name }) => {
      files[name] = new Uint8Array(await fs.readFile(src))
    })
  )
  return zipSync(files, { level: 1 })
}

function zipResponse(data: Uint8Array, filename: string): Response {
  const safeName = filename.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'photos'
  return new Response(Buffer.from(data), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}.zip"`,
      'Content-Length': String(data.length),
    },
  })
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const project = await getProject(id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!project.zipEnabled) {
    return Response.json({ error: 'ZIP download disabled' }, { status: 403 })
  }
  if (!(await verifyGalleryAccess(id))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const photos = await listPhotos(id)
  const dir = photosDir(id)
  const data = await buildZip(
    photos.map((p) => ({ src: path.join(dir, p.filename), name: p.filename }))
  )

  await incrementDownload(id)
  return zipResponse(data, project.title)
}

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const project = await getProject(id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!(await verifyGalleryAccess(id))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!Array.isArray(body?.photoIds) || body.photoIds.length === 0) {
    return Response.json({ error: 'photoIds required' }, { status: 400 })
  }

  const dir = photosDir(id)
  const filePaths: { src: string; name: string }[] = []

  for (const photoId of body.photoIds as string[]) {
    const photo = await getPhoto(photoId)
    if (!photo || photo.projectId !== id) continue
    filePaths.push({ src: path.join(dir, photo.filename), name: photo.filename })
  }

  if (filePaths.length === 0) {
    return Response.json({ error: 'No valid photos' }, { status: 400 })
  }

  const data = await buildZip(filePaths)
  await incrementDownload(id)
  return zipResponse(data, `${project.title}-selection`)
}
