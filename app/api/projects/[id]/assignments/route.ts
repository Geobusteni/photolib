// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { requireAdmin } from '@/lib/auth'
import {
  assignUserToProject,
  getProject,
  getProjectAssignments,
  removeUserFromProject,
} from '@/lib/projects'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params
  const assignments = await getProjectAssignments(id)
  return Response.json(
    assignments.map((a) => ({
      id: a.id,
      userId: a.userId,
      email: a.user.email,
      name: a.user.name,
      role: a.user.role,
    }))
  )
}

export async function POST(request: Request, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params

  if (!(await getProject(id))) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.userId) return Response.json({ error: 'userId required' }, { status: 400 })

  await assignUserToProject(id, body.userId)
  return Response.json({ ok: true }, { status: 201 })
}

export async function DELETE(request: Request, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params

  const body = await request.json().catch(() => null)
  if (!body?.userId) return Response.json({ error: 'userId required' }, { status: 400 })

  await removeUserFromProject(id, body.userId)
  return Response.json({ ok: true })
}
