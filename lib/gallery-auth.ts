import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions, getSession } from './auth'
import bcrypt from 'bcryptjs'

const GALLERY_SESSION_OPTIONS = (projectId: string) => ({
  password: process.env.SESSION_SECRET!,
  cookieName: `photolib_gallery_${projectId}`,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
})

interface GallerySessionData {
  projectId: string
  granted: boolean
}

export async function verifyGalleryAccess(projectId: string): Promise<boolean> {
  // Admin always has access
  const adminSession = await getSession()
  if (adminSession.admin) return true

  // Check gallery cookie
  const cookieStore = await cookies()
  const gallerySession = await getIronSession<GallerySessionData>(
    cookieStore,
    GALLERY_SESSION_OPTIONS(projectId)
  )
  return gallerySession.granted === true && gallerySession.projectId === projectId
}

export async function grantGalleryAccess(projectId: string): Promise<void> {
  const cookieStore = await cookies()
  const gallerySession = await getIronSession<GallerySessionData>(
    cookieStore,
    GALLERY_SESSION_OPTIONS(projectId)
  )
  gallerySession.projectId = projectId
  gallerySession.granted = true
  await gallerySession.save()
}

export async function checkGalleryPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
