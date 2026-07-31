// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import sharp from 'sharp'
import path from 'path'
import { photosDir, thumbsDir } from './storage'

interface ThumbResult {
  width: number
  height: number
}

// Sent by navigator.share()/the individual-download fallback in place of the true
// original, so mobile sharing isn't fetching a multi-MB file within the browser's
// user-activation window. Shared with the backfill script for already-uploaded photos.
export const SHARE_THUMB_WIDTH = 2048
export const SHARE_THUMB_QUALITY = 82

export function shareThumbFilename(filename: string): string {
  return `${path.basename(filename, path.extname(filename))}-share.jpg`
}

export async function generateThumbs(projectId: string, filename: string): Promise<ThumbResult> {
  const src = path.join(photosDir(projectId), filename)
  const base = path.basename(filename, path.extname(filename))
  const thumbDir = thumbsDir(projectId)

  const meta = await sharp(src).metadata()

  await Promise.all([
    sharp(src)
      .resize({ width: 400, withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toFile(path.join(thumbDir, `${base}-sm.jpg`)),
    sharp(src)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toFile(path.join(thumbDir, `${base}-lg.jpg`)),
    sharp(src)
      .resize({ width: SHARE_THUMB_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: SHARE_THUMB_QUALITY, progressive: true })
      .toFile(path.join(thumbDir, shareThumbFilename(filename))),
  ])

  return { width: meta.width ?? 0, height: meta.height ?? 0 }
}
