import { requireAdmin } from '@/lib/auth'
import { getProject, setArchive } from '@/lib/projects'
import { archivePath, deleteArchiveFile, ensureProjectDirs } from '@/lib/storage'
import fs from 'fs/promises'
import path from 'path'

type Ctx = { params: Promise<{ id: string }> }

// PK\x03\x04 — every ZIP starts with this.
function isZipBuffer(buffer: Buffer): boolean {
  return (
    buffer.length > 3 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
  )
}

export async function POST(request: Request, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params

  const project = await getProject(id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  if (!isZipBuffer(buffer)) {
    return Response.json({ error: 'The archive must be a ZIP file' }, { status: 400 })
  }

  try {
    await ensureProjectDirs(id)
    await fs.writeFile(archivePath(id), buffer)
    await setArchive(id, {
      archiveName: path.basename(file.name) || 'archive.zip',
      archiveSize: buffer.length,
    })
    return Response.json({ ok: true, archiveName: file.name, archiveSize: buffer.length })
  } catch (error) {
    console.error('[archive] upload failed:', error)
    await deleteArchiveFile(id).catch(() => {})
    return Response.json({ error: 'Could not store the archive' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params

  if (!(await getProject(id))) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  await deleteArchiveFile(id)
  await setArchive(id, null)
  return Response.json({ ok: true })
}
