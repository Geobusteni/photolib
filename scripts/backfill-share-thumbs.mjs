// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

/**
 * Generates the "-share.jpg" thumb for every already-uploaded photo that doesn't have
 * one yet (added after this variant was introduced for mobile photo sharing). Safe to
 * re-run — existing "-share.jpg" files are left untouched.
 *
 * Width/quality must match SHARE_THUMB_WIDTH/SHARE_THUMB_QUALITY in lib/images.ts.
 *
 *   node scripts/backfill-share-thumbs.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const SHARE_THUMB_WIDTH = 2048
const SHARE_THUMB_QUALITY = 82

for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/)
  if (m) process.env[m[1]] ??= m[2].replace(/^['"]|['"]$/g, '')
}

const uploadDir = process.env.UPLOAD_DIR ?? './uploads'
const uploadRoot = path.isAbsolute(uploadDir) ? uploadDir : path.join(process.cwd(), uploadDir)

if (!fs.existsSync(uploadRoot)) {
  console.error(`Upload directory not found: ${uploadRoot}`)
  process.exit(1)
}

let generated = 0
let skipped = 0

for (const projectId of fs.readdirSync(uploadRoot)) {
  const photosDir = path.join(uploadRoot, projectId, 'photos')
  const thumbsDir = path.join(uploadRoot, projectId, 'thumbs')
  if (!fs.existsSync(photosDir)) continue

  for (const filename of fs.readdirSync(photosDir)) {
    if (path.extname(filename).toLowerCase() !== '.jpg') continue

    const base = path.basename(filename, path.extname(filename))
    const shareThumbPath = path.join(thumbsDir, `${base}-share.jpg`)

    if (fs.existsSync(shareThumbPath)) {
      skipped++
      continue
    }

    fs.mkdirSync(thumbsDir, { recursive: true })
    await sharp(path.join(photosDir, filename))
      .resize({ width: SHARE_THUMB_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: SHARE_THUMB_QUALITY, progressive: true })
      .toFile(shareThumbPath)
    generated++
    console.log(`generated ${projectId}/${base}-share.jpg`)
  }
}

console.log(`\nDone. Generated ${generated}, skipped ${skipped} (already had a share thumb).`)
