// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import prisma from './prisma'
import { hashPassword } from './auth'
import type { Role } from './generated/prisma/enums'

export type { Role }

export interface CreateUserData {
  email: string
  username?: string | null
  password?: string | null
  name?: string | null
  role: Role
}

export interface UpdateUserData {
  email?: string
  username?: string | null
  password?: string | null
  name?: string | null
  role?: Role
}

export interface PublicUser {
  id: string
  email: string
  username: string | null
  name: string | null
  role: Role
  createdAt: Date
}

/** Strips the password hash before a user record crosses the network. */
export function toPublicUser(user: {
  id: string
  email: string
  username: string | null
  name: string | null
  role: Role
  createdAt: Date
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  }
}

export async function countAdmins(): Promise<number> {
  return prisma.user.count({ where: { role: 'ADMIN' } })
}

export async function setupRequired(): Promise<boolean> {
  return (await countAdmins()) === 0
}

export async function listUsers() {
  return prisma.user.findMany({ orderBy: [{ role: 'asc' }, { createdAt: 'desc' }] })
}

export async function getUser(id: string) {
  return prisma.user.findUnique({ where: { id } })
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
}

export async function getUserByUsername(username: string) {
  return prisma.user.findUnique({ where: { username } })
}

export async function createUser(data: CreateUserData) {
  // Guests are identified by email only and never hold a password.
  const isGuest = data.role === 'GUEST'
  return prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      username: isGuest ? null : (data.username ?? null),
      password: isGuest || !data.password ? null : await hashPassword(data.password),
      name: data.name ?? null,
      role: data.role,
    },
  })
}

export async function updateUser(id: string, data: UpdateUserData) {
  const patch: Record<string, unknown> = {}
  if (data.email !== undefined) patch.email = data.email.toLowerCase().trim()
  if (data.username !== undefined) patch.username = data.username || null
  if (data.name !== undefined) patch.name = data.name || null
  if (data.role !== undefined) patch.role = data.role
  if (data.password) patch.password = await hashPassword(data.password)
  if (data.role === 'GUEST') {
    patch.password = null
    patch.username = null
  }
  return prisma.user.update({ where: { id }, data: patch })
}

export async function deleteUser(id: string) {
  return prisma.user.delete({ where: { id } })
}
