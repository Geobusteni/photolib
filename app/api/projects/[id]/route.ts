import { requireAdmin } from '@/lib/auth'
import { getProject, updateProject, deleteProject, countPhotos } from '@/lib/projects'
import { deleteProjectFiles } from '@/lib/storage'
import bcrypt from 'bcryptjs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params
  const project = getProject(id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ ...project, photo_count: countPhotos(id) })
}

export async function PUT(request: Request, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params
  const project = getProject(id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Invalid body' }, { status: 400 })

  const updates: Parameters<typeof updateProject>[1] = {}
  if (body.title !== undefined) updates.title = body.title
  if (body.event_date !== undefined) updates.event_date = body.event_date
  if (body.expires_at !== undefined) updates.expires_at = body.expires_at
  if (body.zip_enabled !== undefined) updates.zip_enabled = body.zip_enabled
  if (body.dl_enabled !== undefined) updates.dl_enabled = body.dl_enabled
  if (body.password) updates.password = await bcrypt.hash(body.password, 12)

  const updated = updateProject(id, updates)
  return Response.json(updated)
}

export async function DELETE(_req: Request, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params
  const project = getProject(id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  deleteProject(id)
  await deleteProjectFiles(id)
  return Response.json({ ok: true })
}
