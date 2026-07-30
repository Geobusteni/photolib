// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import sharp from 'sharp'
import path from 'path'
import { photosDir, thumbsDir } from './storage'

interface ThumbResult {
  width: number
  height: number
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
  ])

  return { width: meta.width ?? 0, height: meta.height ?? 0 }
}
