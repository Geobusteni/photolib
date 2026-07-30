import { getSession } from '@/lib/auth'
import { createUser, setupRequired } from '@/lib/users'

export async function POST(request: Request) {
  // Only usable while no admin exists — prevents privilege escalation later.
  if (!(await setupRequired())) {
    return Response.json({ error: 'Setup already completed' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.email || !body?.username || !body?.password) {
    return Response.json({ error: 'Email, username and password are required' }, { status: 400 })
  }
  if (String(body.password).length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const user = await createUser({
    email: body.email,
    username: body.username,
    password: body.password,
    name: body.name ?? null,
    role: 'ADMIN',
  })

  const session = await getSession()
  session.userId = user.id
  session.role = user.role
  await session.save()

  return Response.json({ ok: true })
}
