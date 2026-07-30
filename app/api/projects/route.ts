import { requireAdmin } from '@/lib/auth'
import { createProject, listProjects } from '@/lib/projects'
import { ensureProjectDirs } from '@/lib/storage'
import bcrypt from 'bcryptjs'

export async function GET() {
  await requireAdmin()
  return Response.json(await listProjects())
}

export async function POST(request: Request) {
  await requireAdmin()

  const body = await request.json().catch(() => null)
  if (!body?.title) {
    return Response.json({ error: 'Title is required' }, { status: 400 })
  }

  const accessType = body.accessType === 'EMAIL' ? 'EMAIL' : 'PASSWORD'
  if (accessType === 'PASSWORD' && !body.password) {
    return Response.json(
      { error: 'Password is required for password-protected projects' },
      { status: 400 }
    )
  }

  const project = await createProject({
    title: body.title,
    eventDate: body.eventDate ? new Date(body.eventDate) : null,
    accessType,
    password: accessType === 'PASSWORD' ? await bcrypt.hash(body.password, 12) : null,
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    zipEnabled: body.zipEnabled !== false,
    dlEnabled: body.dlEnabled !== false,
  })

  await ensureProjectDirs(project.id)
  return Response.json(project, { status: 201 })
}
