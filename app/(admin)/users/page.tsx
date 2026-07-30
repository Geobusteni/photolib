// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { listUsers } from '@/lib/users'
import UserManager from './_components/UserManager'

export const metadata = { title: 'Users' }

export default async function UsersPage() {
  const session = await getSession()
  if (session.role !== 'ADMIN') redirect('/projects')

  const users = await listUsers()

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Users</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Admins have full access. Users can only see projects they are assigned to. Guests need no
        password and are identified by email on email-based galleries.
      </p>
      <UserManager
        users={users.map((u) => ({
          id: u.id,
          email: u.email,
          username: u.username,
          name: u.name,
          role: u.role,
        }))}
        currentUserId={session.userId}
      />
    </div>
  )
}
