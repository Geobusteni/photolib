import { requireAdmin } from '@/lib/auth'
import { listProjects, createProject } from '@/lib/projects'
import { ensureProjectDirs } from '@/lib/storage'
import bcrypt from 'bcryptjs'

export async function GET() {
  await requireAdmin()
  return Response.json(listProjects())
}

export async function POST(request: Request) {
  await requireAdmin()

  const body = await request.json().catch(() => null)
  if (!body?.title || !body?.password) {
    return Response.json({ error: 'title and password are required' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(body.password, 12)
  const project = createProject({
    title: body.title,
    event_date: body.event_date ?? null,
    password: passwordHash,
    expires_at: body.expires_at ?? null,
    zip_enabled: body.zip_enabled !== false,
    dl_enabled: body.dl_enabled !== false,
  })

  await ensureProjectDirs(project.id)
  return Response.json(project, { status: 201 })
}
