// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { getSession, verifyPassword } from '@/lib/auth'
import { getUserByEmail, getUserByUsername } from '@/lib/users'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body?.identifier || !body?.password) {
    return Response.json({ error: 'Missing credentials' }, { status: 400 })
  }

  const identifier = String(body.identifier).trim()
  const user = identifier.includes('@')
    ? await getUserByEmail(identifier)
    : await getUserByUsername(identifier)

  // Guests never log in — they are identified by email at the gallery.
  if (!user || !user.password || user.role === 'GUEST') {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await verifyPassword(body.password, user.password)
  if (!valid) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const session = await getSession()
  session.userId = user.id
  session.role = user.role
  await session.save()

  return Response.json({ ok: true, role: user.role })
}

export async function DELETE() {
  const session = await getSession()
  session.destroy()
  return Response.json({ ok: true })
}
