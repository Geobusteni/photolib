import { NextRequest } from 'next/server'
import { getProject } from '@/lib/projects'
import { checkGalleryPassword, grantGalleryAccess } from '@/lib/gallery-auth'
import { checkRateLimit } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const { allowed } = checkRateLimit(`gallery-auth:${ip}:${id}`)
  if (!allowed) {
    return Response.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  const project = getProject(id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body?.password || typeof body.password !== 'string') {
    return Response.json({ error: 'Password required' }, { status: 400 })
  }

  const valid = await checkGalleryPassword(body.password, project.password)
  if (!valid) return Response.json({ error: 'Incorrect password' }, { status: 401 })

  await grantGalleryAccess(id)
  return Response.json({ ok: true })
}
