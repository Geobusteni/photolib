import { getSession, verifyPassword } from '@/lib/auth'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body?.username || !body?.password) {
    return Response.json({ error: 'Missing credentials' }, { status: 400 })
  }

  const usernameMatch = body.username === process.env.ADMIN_USERNAME
  const passwordMatch = await verifyPassword(body.password, process.env.ADMIN_PASSWORD_HASH ?? '')

  if (!usernameMatch || !passwordMatch) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const session = await getSession()
  session.admin = true
  await session.save()

  return Response.json({ ok: true })
}

export async function DELETE() {
  const session = await getSession()
  session.destroy()
  return Response.json({ ok: true })
}
