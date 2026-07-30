// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { requireAdmin } from '@/lib/auth'
import { countPhotos, deleteProject, getProject, updateProject } from '@/lib/projects'
import { deleteProjectFiles } from '@/lib/storage'
import { encryptSecret } from '@/lib/crypto'
import type { UpdateProjectData } from '@/lib/projects'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params
  const project = await getProject(id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ ...project, photoCount: await countPhotos(id) })
}

export async function PUT(request: Request, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params
  const project = await getProject(id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Invalid body' }, { status: 400 })

  const updates: UpdateProjectData = {}
  if (body.title !== undefined) updates.title = body.title
  if (body.eventDate !== undefined) updates.eventDate = body.eventDate ? new Date(body.eventDate) : null
  if (body.expiresAt !== undefined) updates.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
  if (body.zipEnabled !== undefined) updates.zipEnabled = body.zipEnabled
  if (body.dlEnabled !== undefined) updates.dlEnabled = body.dlEnabled
  if (body.accessType === 'EMAIL' || body.accessType === 'PASSWORD') {
    updates.accessType = body.accessType
    // Switching to email access retires the shared password.
    if (body.accessType === 'EMAIL') updates.password = null
  }
  if (body.password) updates.password = encryptSecret(body.password)

  return Response.json(await updateProject(id, updates))
}

export async function DELETE(_req: Request, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params
  const project = await getProject(id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  await deleteProject(id)
  await deleteProjectFiles(id)
  return Response.json({ ok: true })
}
