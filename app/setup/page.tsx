// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { redirect } from 'next/navigation'
import { setupRequired } from '@/lib/users'
import SetupForm from './_components/SetupForm'

export const metadata = { title: 'Setup' }
export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  if (!(await setupRequired())) redirect('/login')

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Welcome to Photolib
        </h1>
        <p className="mb-8 mt-2 text-sm text-zinc-500">
          Create the first administrator account to get started.
        </p>
        <SetupForm />
      </div>
    </div>
  )
}
