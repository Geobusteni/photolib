// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { safeResolvePath, thumbsDir } from '@/lib/storage'
import { verifyGalleryAccess } from '@/lib/gallery-auth'
import fs from 'fs/promises'

type Ctx = { params: Promise<{ path: string[] }> }

/**
 * Thumbnails only. Originals and archives are served by their own routes so they
 * can set the original filename and count downloads — exposing the whole project
 * directory here would bypass both.
 */
export async function GET(_request: Request, ctx: Ctx) {
  const { path: parts } = await ctx.params

  const [projectId, kind, ...rest] = parts
  if (!projectId || kind !== 'thumbs' || rest.length === 0) {
    return new Response('Not found', { status: 404 })
  }

  const resolved = safeResolvePath(thumbsDir(projectId), rest.join('/'))
  if (!resolved || !resolved.endsWith('.jpg')) return new Response('Forbidden', { status: 403 })

  if (!(await verifyGalleryAccess(projectId))) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const buffer = await fs.readFile(resolved)
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        // Private: the URL is stable but the gallery behind it is not public.
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
