// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

/**
 * End-to-end smoke test against a running dev server.
 * Creates a throwaway admin and project, exercises the upload/download paths,
 * then removes everything it created.
 *
 *   npx tsx scripts/smoke.ts
 */
import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import { zipSync } from 'fflate'
import sharp from 'sharp'
import fs from 'node:fs'

for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/)
  if (m) process.env[m[1]] ??= m[2].replace(/^['"]|['"]$/g, '')
}

const BASE = 'http://localhost:3000'
const PASSWORD = 'smoke-test-pw-9271'
let cookie = ''
let failures = 0

function check(label: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  if (!ok) {
    failures++
    if (detail !== undefined) console.log('      ', detail)
  }
}

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { ...(init.headers ?? {}), cookie },
    redirect: 'manual',
  })
  const setCookie = res.headers.getSetCookie?.() ?? []
  for (const c of setCookie) cookie = c.split(';')[0] + (cookie ? '; ' + cookie : '')
  return res
}

async function jpeg(text: string) {
  return sharp({
    create: { width: 60, height: 40, channels: 3, background: { r: 20, g: 90, b: 140 } },
  })
    .jpeg()
    .toBuffer()
    .then((b) => new File([new Uint8Array(b)], text, { type: 'image/jpeg' }))
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  })

  const admin = await prisma.user.create({
    data: {
      email: `smoke-${Date.now()}@example.test`,
      username: `smoke-${Date.now()}`,
      password: await bcrypt.hash(PASSWORD, 10),
      name: 'Smoke Test',
      role: 'ADMIN',
    },
  })

  let projectId = ''

  try {
    const login = await call('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: admin.username, password: PASSWORD }),
    })
    check('login', login.ok, login.status)

    const created = await call('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Smoke Test', accessType: 'PASSWORD', password: 'gallery-pw' }),
    })
    const project = await created.json()
    projectId = project.id
    check('create project', created.ok, project)

    // 1. Password is readable back.
    const { decryptSecret } = await import('../lib/crypto')
    const stored = await prisma.project.findUnique({ where: { id: projectId } })
    check('password stored encrypted, not plain', stored!.password !== 'gallery-pw')
    check('password decrypts to original', decryptSecret(stored!.password) === 'gallery-pw')

    // 2. Original filename is preserved.
    const form1 = new FormData()
    form1.append('file', await jpeg('Beach Day 042.jpg'))
    const up1 = await call(`/api/projects/${projectId}/upload`, { method: 'POST', body: form1 })
    check('upload jpeg', up1.ok, await up1.clone().text())

    const photos = await prisma.photo.findMany({ where: { projectId } })
    check('originalName kept', photos[0]?.originalName === 'Beach Day 042.jpg', photos[0])
    check('disk name is a uuid', /^[0-9a-f-]{36}\.jpg$/.test(photos[0]?.filename ?? ''))

    // 3. Duplicate asks instead of guessing.
    const form2 = new FormData()
    form2.append('file', await jpeg('Beach Day 042.jpg'))
    const up2 = await call(`/api/projects/${projectId}/upload`, { method: 'POST', body: form2 })
    const conflict = await up2.json()
    check('duplicate returns 409', up2.status === 409, conflict)
    check('409 names the conflict', conflict.conflicts?.[0] === 'Beach Day 042.jpg', conflict)

    const form3 = new FormData()
    form3.append('file', await jpeg('Beach Day 042.jpg'))
    form3.append('strategy', 'rename')
    const up3 = await call(`/api/projects/${projectId}/upload`, { method: 'POST', body: form3 })
    check('rename strategy accepted', up3.ok, await up3.clone().text())
    const renamed = await prisma.photo.findMany({ where: { projectId }, orderBy: { sortOrder: 'asc' } })
    check('kept both under a new name', renamed[1]?.originalName === 'Beach Day 042 (2).jpg', renamed)

    const form4 = new FormData()
    form4.append('file', await jpeg('Beach Day 042.jpg'))
    form4.append('strategy', 'overwrite')
    const up4 = await call(`/api/projects/${projectId}/upload`, { method: 'POST', body: form4 })
    check('overwrite strategy accepted', up4.ok, await up4.clone().text())
    check('overwrite did not add a row', (await prisma.photo.count({ where: { projectId } })) === 2)

    // 4. No archive means no full ZIP.
    const noArchive = await call(`/api/projects/${projectId}/download`)
    check('download 404s without an uploaded archive', noArchive.status === 404, noArchive.status)

    const zip = zipSync({ 'a.txt': new TextEncoder().encode('hello') })
    const archiveForm = new FormData()
    archiveForm.append('file', new File([new Uint8Array(zip)], 'delivery.zip', { type: 'application/zip' }))
    const upArchive = await call(`/api/projects/${projectId}/archive`, {
      method: 'POST',
      body: archiveForm,
    })
    check('archive upload', upArchive.ok, await upArchive.clone().text())

    const withArchive = await call(`/api/projects/${projectId}/download`)
    check('download serves the uploaded archive', withArchive.ok, withArchive.status)
    check(
      'archive keeps its filename',
      withArchive.headers.get('content-disposition')?.includes('delivery.zip') ?? false,
      withArchive.headers.get('content-disposition')
    )

    // 5. Single photo downloads under its original name.
    const fresh = await prisma.photo.findMany({ where: { projectId } })
    const dl = await call(`/api/projects/${projectId}/photos/${fresh[0].id}/download`)
    check('photo download', dl.ok, dl.status)
    check(
      'photo download uses the original name',
      dl.headers.get('content-disposition')?.includes(fresh[0].originalName) ?? false,
      dl.headers.get('content-disposition')
    )

    // 6. Selection ZIP names its entries the same way.
    const sel = await call(`/api/projects/${projectId}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoIds: fresh.map((p) => p.id) }),
    })
    check('selection zip', sel.ok, sel.status)
    const selBuf = Buffer.from(await sel.arrayBuffer())
    check('selection zip contains original names', selBuf.includes(Buffer.from('Beach Day 042.jpg')))

    // 7. Raw uploads route no longer exposes originals.
    const raw = await call(`/api/uploads/${projectId}/photos/${fresh[0].filename}`)
    check('raw originals path is blocked', raw.status === 404, raw.status)
    const rawThumb = await call(
      `/api/uploads/${projectId}/thumbs/${fresh[0].filename.replace('.jpg', '')}-sm.jpg`
    )
    check('thumbnails still serve', rawThumb.ok, rawThumb.status)
  } finally {
    if (projectId) {
      await call(`/api/projects/${projectId}`, { method: 'DELETE' })
    }
    await prisma.user.delete({ where: { id: admin.id } }).catch(() => {})
    await prisma.$disconnect()
  }

  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`)
  process.exit(failures === 0 ? 0 : 1)
}

main()
