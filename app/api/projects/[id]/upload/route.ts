import { requireAdmin } from '@/lib/auth'
import { getProject, insertPhoto } from '@/lib/projects'
import { deletePhotoFiles, ensureProjectDirs, photosDir } from '@/lib/storage'
import { generateThumbs } from '@/lib/images'
import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
import { unzipSync } from 'fflate'

type Ctx = { params: Promise<{ id: string }> }

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg'])
const JPEG_EXTS = new Set(['.jpg', '.jpeg'])

// JPEG magic bytes — guards against a renamed file claiming to be an image.
function isJpegBuffer(buffer: Buffer): boolean {
  return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
}

async function processJpeg(projectId: string, buffer: Buffer): Promise<void> {
  if (!isJpegBuffer(buffer)) return

  const filename = `${crypto.randomUUID()}.jpg`
  await fs.writeFile(path.join(photosDir(projectId), filename), buffer)

  try {
    const { width, height } = await generateThumbs(projectId, filename)
    await insertPhoto({ projectId, filename, width, height, size: buffer.length })
  } catch (error) {
    // Never leave files on disk that no database row points at.
    await deletePhotoFiles(projectId, filename)
    throw error
  }
}

export async function POST(request: Request, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params

  const project = await getProject(id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  await ensureProjectDirs(id)

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = path.extname(file.name).toLowerCase()
  const isZip =
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed' ||
    ext === '.zip'

  try {
    if (ALLOWED_MIME.has(file.type) || JPEG_EXTS.has(ext)) {
      if (!isJpegBuffer(buffer)) {
        return Response.json({ error: 'File is not a valid JPEG' }, { status: 400 })
      }
      await processJpeg(id, buffer)
      return Response.json({ ok: true, added: 1 })
    }

    if (isZip) {
      const unzipped = unzipSync(new Uint8Array(buffer))
      let added = 0
      for (const [entryPath, data] of Object.entries(unzipped)) {
        if (!JPEG_EXTS.has(path.extname(entryPath).toLowerCase())) continue
        if (entryPath.startsWith('__MACOSX')) continue
        await processJpeg(id, Buffer.from(data))
        added++
      }
      if (added === 0) {
        return Response.json({ error: 'No JPEG images found in the archive' }, { status: 400 })
      }
      return Response.json({ ok: true, added })
    }
  } catch (error) {
    console.error('[upload] failed:', error)
    const message = error instanceof Error ? error.message : 'Upload failed'
    return Response.json({ error: message }, { status: 500 })
  }

  return Response.json(
    { error: 'Only JPEG images and ZIP archives are accepted' },
    { status: 400 }
  )
}
