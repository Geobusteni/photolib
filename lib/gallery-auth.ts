import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { getSession } from './auth'
import prisma from './prisma'
import { decryptSecret, secretsMatch } from './crypto'

interface GallerySessionData {
  projectId: string
  granted: boolean
  email?: string
}

function gallerySessionOptions(projectId: string) {
  return {
    password: process.env.SESSION_SECRET!,
    cookieName: `photolib_gallery_${projectId}`,
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7,
    },
  }
}

async function getGallerySession(projectId: string) {
  const cookieStore = await cookies()
  return getIronSession<GallerySessionData>(cookieStore, gallerySessionOptions(projectId))
}

export async function verifyGalleryAccess(projectId: string): Promise<boolean> {
  const adminSession = await getSession()
  if (adminSession.userId && adminSession.role === 'ADMIN') return true

  // USER role: must be assigned to this project
  if (adminSession.userId && adminSession.role === 'USER') {
    const assignment = await prisma.projectAssignment.findUnique({
      where: { projectId_userId: { projectId, userId: adminSession.userId } },
    })
    return !!assignment
  }

  const gallerySession = await getGallerySession(projectId)
  return gallerySession.granted === true && gallerySession.projectId === projectId
}

export async function getGalleryEmail(projectId: string): Promise<string | null> {
  const gallerySession = await getGallerySession(projectId)
  if (gallerySession.granted && gallerySession.projectId === projectId) {
    return gallerySession.email ?? null
  }
  return null
}

export async function grantGalleryAccess(projectId: string, email?: string): Promise<void> {
  const gallerySession = await getGallerySession(projectId)
  gallerySession.projectId = projectId
  gallerySession.granted = true
  if (email) gallerySession.email = email
  await gallerySession.save()
}

export function verifyPasswordAccess(plain: string, stored: string): boolean {
  const actual = decryptSecret(stored)
  if (actual === null) return false
  return secretsMatch(plain, actual)
}

export async function verifyEmailAccess(projectId: string, email: string): Promise<boolean> {
  const normalised = email.toLowerCase().trim()
  const user = await prisma.user.findUnique({ where: { email: normalised } })
  if (!user) return false
  const assignment = await prisma.projectAssignment.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  })
  return !!assignment
}
