// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { setupRequired } from '@/lib/users'
import LogoutButton from '@/components/ui/LogoutButton'

// Every admin route depends on the session and live database state.
export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (await setupRequired()) redirect('/setup')

  const session = await getSession()
  if (!session.userId) redirect('/login')

  const isAdmin = session.role === 'ADMIN'

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <nav className="flex items-center gap-5" aria-label="Main">
            <Link
              href="/projects"
              className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
            >
              Photolib
            </Link>
            <Link
              href="/projects"
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Projects
            </Link>
            {isAdmin && (
              <Link
                href="/users"
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Users
              </Link>
            )}
          </nav>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
