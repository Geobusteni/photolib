// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { requireAdmin } from '@/lib/auth'
import { countAdmins, deleteUser, getUser, toPublicUser, updateUser } from '@/lib/users'
import type { Role } from '@/lib/users'

type Ctx = { params: Promise<{ id: string }> }

const ROLES: Role[] = ['ADMIN', 'USER', 'GUEST']

export async function PUT(request: Request, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params

  const user = await getUser(id)
  if (!user) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Invalid body' }, { status: 400 })

  // Never allow the last admin to be demoted — it would lock everyone out.
  if (user.role === 'ADMIN' && body.role && body.role !== 'ADMIN') {
    if ((await countAdmins()) <= 1) {
      return Response.json({ error: 'Cannot demote the only administrator' }, { status: 400 })
    }
  }

  try {
    const updated = await updateUser(id, {
      email: body.email,
      username: body.username,
      password: body.password || undefined,
      name: body.name,
      role: ROLES.includes(body.role) ? body.role : undefined,
    })
    return Response.json(toPublicUser(updated))
  } catch {
    return Response.json({ error: 'A user with that email or username already exists' }, { status: 409 })
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await requireAdmin()
  const { id } = await ctx.params

  const user = await getUser(id)
  if (!user) return Response.json({ error: 'Not found' }, { status: 404 })

  if (user.id === session.userId) {
    return Response.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }
  if (user.role === 'ADMIN' && (await countAdmins()) <= 1) {
    return Response.json({ error: 'Cannot delete the only administrator' }, { status: 400 })
  }

  await deleteUser(id)
  return Response.json({ ok: true })
}
