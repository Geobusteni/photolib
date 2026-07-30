import { getIronSession, IronSession } from 'iron-session'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import type { Role } from './generated/prisma/enums'

export interface SessionData {
  userId: string
  role: Role
}

export const sessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'photolib_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}

export async function requireAdmin(): Promise<SessionData> {
  const session = await getSession()
  if (!session.userId || session.role !== 'ADMIN') redirect('/login')
  return session
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession()
  if (!session.userId) redirect('/login')
  return session
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
