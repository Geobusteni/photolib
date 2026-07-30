// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { requireAdmin } from '@/lib/auth'
import {
  getPhotoByOriginalName,
  getProject,
  insertPhoto,
  replacePhotoFile,
} from '@/lib/projects'
import { deletePhotoFiles, ensureProjectDirs, photosDir } from '@/lib/storage'
import { generateThumbs } from '@/lib/images'
import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
import { unzipSync } from 'fflate'

type Ctx = { params: Promise<{ id: string }> }

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg'])
const JPEG_EXTS = new Set(['.jpg', '.jpeg'])

/** What to do when a photo with the same original name already exists. */
type Strategy = 'ask' | 'overwrite' | 'rename' | 'skip'

function isJpegBuffer(buffer: Buffer): boolean {
  return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
}

/** Keeps just the file's own name — defeats any path trickery in a ZIP entry. */
function cleanName(name: string): string {
  return path.basename(name).replace(/[\r\n"]/g, '').trim() || 'photo.jpg'
}

async function uniqueName(projectId: string, name: string): Promise<string> {
  const ext = path.extname(name)
  const stem = path.basename(name, ext)
  for (let n = 2; ; n++) {
    const candidate = `${stem} (${n})${ext}`
    if (!(await getPhotoByOriginalName(projectId, candidate))) return candidate
  }
}

async function writePhotoFiles(projectId: string, buffer: Buffer) {
  const filename = `${crypto.randomUUID()}.jpg`
  await fs.writeFile(path.join(photosDir(projectId), filename), buffer)
  try {
    const { width, height } = await generateThumbs(projectId, filename)
    return { filename, width, height }
  } catch (error) {
    await deletePhotoFiles(projectId, filename)
    throw error
  }
}

interface Outcome {
  added: number
  skipped: number
  conflicts: string[]
}

async function storePhoto(
  projectId: string,
  buffer: Buffer,
  rawName: string,
  strategy: Strategy,
  outcome: Outcome
): Promise<void> {
  if (!isJpegBuffer(buffer)) return

  const originalName = cleanName(rawName)
  const existing = await getPhotoByOriginalName(projectId, originalName)

  if (existing) {
    if (strategy === 'ask') {
      outcome.conflicts.push(originalName)
      return
    }
    if (strategy === 'skip') {
      outcome.skipped++
      return
    }
    if (strategy === 'overwrite') {
      const written = await writePhotoFiles(projectId, buffer)
      try {
        await replacePhotoFile(existing.id, { ...written, size: buffer.length })
      } catch (error) {
        await deletePhotoFiles(projectId, written.filename)
        throw error
      }
      // Only drop the old files once the row points at the new ones.
      await deletePhotoFiles(projectId, existing.filename)
      outcome.added++
      return
    }
  }

  const name =
    existing && strategy === 'rename' ? await uniqueName(projectId, originalName) : originalName

  const written = await writePhotoFiles(projectId, buffer)
  try {
    await insertPhoto({
      projectId,
      originalName: name,
      filename: written.filename,
      width: written.width,
      height: written.height,
      size: buffer.length,
    })
    outcome.added++
  } catch (error) {
    await deletePhotoFiles(projectId, written.filename)
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

  const requested = String(formData.get('strategy') ?? 'ask')
  const strategy: Strategy = (['overwrite', 'rename', 'skip'] as const).includes(
    requested as never
  )
    ? (requested as Strategy)
    : 'ask'

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = path.extname(file.name).toLowerCase()
  const isZip =
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed' ||
    ext === '.zip'

  const outcome: Outcome = { added: 0, skipped: 0, conflicts: [] }

  try {
    if (ALLOWED_MIME.has(file.type) || JPEG_EXTS.has(ext)) {
      if (!isJpegBuffer(buffer)) {
        return Response.json({ error: 'File is not a valid JPEG' }, { status: 400 })
      }
      await storePhoto(id, buffer, file.name, strategy, outcome)
    } else if (isZip) {
      const unzipped = unzipSync(new Uint8Array(buffer))
      for (const [entryPath, data] of Object.entries(unzipped)) {
        if (!JPEG_EXTS.has(path.extname(entryPath).toLowerCase())) continue
        if (entryPath.startsWith('__MACOSX') || path.basename(entryPath).startsWith('.')) continue
        await storePhoto(id, Buffer.from(data), entryPath, strategy, outcome)
      }
      if (outcome.added === 0 && outcome.conflicts.length === 0 && outcome.skipped === 0) {
        return Response.json({ error: 'No JPEG images found in the archive' }, { status: 400 })
      }
    } else {
      return Response.json(
        { error: 'Only JPEG images and ZIP archives are accepted' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[upload] failed:', error)
    const message = error instanceof Error ? error.message : 'Upload failed'
    return Response.json({ error: message }, { status: 500 })
  }

  // 409 asks the client how to resolve; it is not a failure.
  if (outcome.conflicts.length > 0) {
    return Response.json(
      { conflicts: outcome.conflicts, added: outcome.added, skipped: outcome.skipped },
      { status: 409 }
    )
  }

  return Response.json({ ok: true, ...outcome })
}
