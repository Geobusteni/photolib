'use client'

import { useRef, useState } from 'react'

export default function PasswordGate({ projectId }: { projectId: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const password = inputRef.current?.value ?? ''

    try {
      const res = await fetch(`/api/projects/${projectId}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        window.location.reload()
      } else {
        setError('Incorrect password')
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-xs">
        <h1 className="mb-6 text-center text-lg font-medium text-zinc-100">
          This gallery is private
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && (
            <p role="alert" className="text-center text-sm text-red-400">
              {error}
            </p>
          )}
          <input
            ref={inputRef}
            type="password"
            placeholder="Gallery password"
            autoFocus
            autoComplete="current-password"
            required
            className="h-11 rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-center text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/30"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-11 rounded-lg bg-zinc-100 text-sm font-medium text-zinc-900 transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'View gallery'}
          </button>
        </form>
      </div>
    </div>
  )
}
