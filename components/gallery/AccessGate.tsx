// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useRef, useState } from 'react'

export default function AccessGate({
  projectId,
  accessType,
}: {
  projectId: string
  accessType: 'PASSWORD' | 'EMAIL'
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isEmail = accessType === 'EMAIL'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const value = inputRef.current?.value ?? ''
    const payload = isEmail ? { email: value } : { password: value }

    try {
      const res = await fetch(`/api/projects/${projectId}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        window.location.reload()
        return
      }

      setError((await res.json()).error ?? 'Access denied')
      inputRef.current?.focus()
      inputRef.current?.select()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-xs">
        <h1 className="mb-2 text-center text-lg font-medium text-zinc-100">
          This gallery is private
        </h1>
        <p className="mb-6 text-center text-sm text-zinc-500">
          {isEmail
            ? 'Enter the email address the gallery was shared with.'
            : 'Enter the password you were given.'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && (
            <p role="alert" className="text-center text-sm text-red-400">
              {error}
            </p>
          )}

          <label htmlFor="access" className="sr-only">
            {isEmail ? 'Email address' : 'Gallery password'}
          </label>
          <input
            ref={inputRef}
            id="access"
            type={isEmail ? 'email' : 'password'}
            inputMode={isEmail ? 'email' : undefined}
            placeholder={isEmail ? 'you@example.com' : 'Gallery password'}
            autoComplete={isEmail ? 'email' : 'current-password'}
            autoFocus
            required
            className="h-11 rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-center text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/40"
          />

          <button
            type="submit"
            disabled={loading}
            className="h-11 rounded-lg bg-zinc-100 text-sm font-medium text-zinc-900 transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'View gallery'}
          </button>
        </form>
      </div>
    </div>
  )
}
