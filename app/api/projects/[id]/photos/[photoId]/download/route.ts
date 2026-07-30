// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { verifyGalleryAccess } from '@/lib/gallery-auth'
import { getPhoto, getProject, incrementDownload } from '@/lib/projects'
import { photosDir } from '@/lib/storage'
import fs from 'fs/promises'
import path from 'path'

type Ctx = { params: Promise<{ id: string; photoId: string }> }

/** Serves a single original under the name the photographer uploaded. */
export async function GET(_req: Request, ctx: Ctx) {
  const { id, photoId } = await ctx.params

  const project = await getProject(id)
  if (!project) return new Response('Not found', { status: 404 })
  if (!project.dlEnabled) return new Response('Downloads are disabled', { status: 403 })
  if (!(await verifyGalleryAccess(id))) return new Response('Unauthorized', { status: 401 })

  const photo = await getPhoto(photoId)
  if (!photo || photo.projectId !== id) return new Response('Not found', { status: 404 })

  let buffer: Buffer
  try {
    buffer = await fs.readFile(path.join(photosDir(id), photo.filename))
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
