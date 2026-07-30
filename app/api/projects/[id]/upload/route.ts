import { requireAdmin } from '@/lib/auth'
import { getProject, insertPhoto } from '@/lib/projects'
import { ensureProjectDirs, photosDir } from '@/lib/storage'
import { generateThumbs } from '@/lib/images'
import { nanoid } from 'nanoid'
import path from 'path'
import fs from 'fs/promises'
import { unzipSync } from 'fflate'

type Ctx = { params: Promise<{ id: string }> }

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg'])
const JPEG_EXTS = new Set(['.jpg', '.jpeg'])

async function processJpeg(
  projectId: string,
  buffer: Buffer,
  originalName: string
): Promise<void> {
  const photoId = nanoid(10)
  const ext = path.extname(originalName).toLowerCase() || '.jpg'
  const filename = `${photoId}${ext}`
  const dest = path.join(photosDir(projectId), filename)

  await fs.writeFile(dest, buffer)
  const { width, height } = await generateThumbs(projectId, filename)

  insertPhoto({
    id: photoId,
    project_id: projectId,
    filename,
    width,
    height,
    size: buffer.length,
    sort_order: Date.now(),
  })
}

export async function POST(request: Request, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params

  const project = getProject(id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  await ensureProjectDirs(id)

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const isZip =
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed' ||
    file.name.toLowerCase().endsWith('.zip')
  const isJpeg =
    ALLOWED_MIME.has(file.type) || JPEG_EXTS.has(path.extname(file.name).toLowerCase())

  if (isJpeg) {
    await processJpeg(id, buffer, file.name)
    return Response.json({ ok: true })
  }

  if (isZip) {
    const unzipped = unzipSync(new Uint8Array(buffer))
    for (const [entryPath, data] of Object.entries(unzipped)) {
      const ext = path.extname(entryPath).toLowerCase()
      if (!JPEG_EXTS.has(ext)) continue
      if (path.basename(entryPath).startsWith('__MACOSX')) continue
      await processJpeg(id, Buffer.from(data), path.basename(entryPath))
    }
    return Response.json({ ok: true })
  }

  return Response.json(
    { error: 'Only JPEG images and ZIP archives are accepted' },
    { status: 400 }
  )
}
