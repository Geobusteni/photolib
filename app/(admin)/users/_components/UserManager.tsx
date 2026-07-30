'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Role = 'ADMIN' | 'USER' | 'GUEST'

interface UserRow {
  id: string
  email: string
  username: string | null
  name: string | null
  role: Role
}

const inputClass =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Admin',
  USER: 'User',
  GUEST: 'Guest',
}

export default function UserManager({
  users,
  currentUserId,
}: {
  users: UserRow[]
  currentUserId: string
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [role, setRole] = useState<Role>('USER')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isGuest = role === 'GUEST'

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const value = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.value || undefined

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: value('email'),
        username: isGuest ? null : value('username'),
        password: isGuest ? null : value('password'),
        name: value('name'),
        role,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      setError((await res.json()).error ?? 'Could not create user')
      return
    }

    form.reset()
    setAdding(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setError((await res.json()).error ?? 'Could not delete user')
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Email</th>
              <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 sm:table-cell">Name</th>
              <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 md:table-cell">Username</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Role</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-500">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{u.email}</td>
                <td className="hidden px-4 py-3 text-zinc-500 sm:table-cell">{u.name ?? '—'}</td>
                <td className="hidden px-4 py-3 text-zinc-500 md:table-cell">{u.username ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {ROLE_LABEL[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.id !== currentUserId && (
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-sm text-red-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-red-400"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding ? (
        <form
          onSubmit={handleCreate}
          className="flex max-w-lg flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Add user</h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-role" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Role
            </label>
            <select
              id="new-role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className={inputClass}
            >
              <option value="ADMIN">Admin — full access</option>
              <option value="USER">User — assigned projects only</option>
              <option value="GUEST">Guest — read only, email identified</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email <span className="text-red-500" aria-hidden>*</span>
            </label>
            <input id="email" name="email" type="email" required className={inputClass} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Name
            </label>
            <input id="name" name="name" type="text" className={inputClass} />
          </div>

          {!isGuest && (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="username" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Username <span className="text-red-500" aria-hidden>*</span>
                </label>
                <input id="username" name="username" type="text" required className={inputClass} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Password <span className="text-red-500" aria-hidden>*</span>
                </label>
                <p className="text-xs text-zinc-500">At least 8 characters</p>
                <input
                  id="password"
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                  className={inputClass}
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="h-10 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {loading ? 'Adding…' : 'Add user'}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="h-10 rounded-lg border border-zinc-300 px-5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div>
          <button
            onClick={() => setAdding(true)}
            className="h-9 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add user
          </button>
        </div>
      )}
    </div>
  )
}
