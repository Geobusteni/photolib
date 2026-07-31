// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { verifyGalleryAccess } from '@/lib/gallery-auth'
import { getPhoto, getProject, incrementDownload } from '@/lib/projects'
import { photosDir, thumbsDir } from '@/lib/storage'
import { shareThumbFilename } from '@/lib/images'
import fs from 'fs/promises'
import path from 'path'

type Ctx = { params: Promise<{ id: string; photoId: string }> }

/**
 * Serves a single photo under the name the photographer uploaded.
 * `?variant=share` serves the compressed ~2048px share variant instead of the true
 * original — used by the lightbox's Share/individual-download flow so mobile
 * `navigator.share()` isn't handed a multi-MB file. ZIP downloads always use the
 * true original and don't go through this route's variant switch.
 */
export async function GET(req: Request, ctx: Ctx) {
  const { id, photoId } = await ctx.params
  const isShareVariant = new URL(req.url).searchParams.get('variant') === 'share'

  const project = await getProject(id)
  if (!project) return new Response('Not found', { status: 404 })
  if (!project.dlEnabled) return new Response('Downloads are disabled', { status: 403 })
  if (!(await verifyGalleryAccess(id))) return new Response('Unauthorized', { status: 401 })

  const photo = await getPhoto(photoId)
  if (!photo || photo.projectId !== id) return new Response('Not found', { status: 404 })

  const filePath = isShareVariant
    ? path.join(thumbsDir(id), shareThumbFilename(photo.filename))
    : path.join(photosDir(id), photo.filename)

  let buffer: Buffer
  try {
    buffer = await fs.readFile(filePath)
  } catch {
    return new Response('Not found', { status: 404 })
  }

  await incrementDownload(id)

  const name = photo.originalName.replace(/["\r\n]/g, '')
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Content-Length': String(buffer.length),
    },
  })
}
