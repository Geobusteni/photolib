'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Role = 'ADMIN' | 'USER' | 'GUEST'

interface Person {
  userId: string
  email: string
  name: string | null
  role: Role
}

interface Candidate {
  id: string
  email: string
  name: string | null
  role: Role
}

export default function AssignmentManager({
  projectId,
  assigned,
  allUsers,
}: {
  projectId: string
  assigned: Person[]
  allUsers: Candidate[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState('')

  const assignedIds = new Set(assigned.map((a) => a.userId))
  const available = allUsers.filter((u) => !assignedIds.has(u.id))

  async function add() {
    if (!selected) return
    const res = await fetch(`/api/projects/${projectId}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selected }),
    })
    if (!res.ok) {
      setError((await res.json()).error ?? 'Could not assign user')
      return
    }
    setSelected('')
    router.refresh()
  }

  async function remove(userId: string) {
    const res = await fetch(`/api/projects/${projectId}/assignments`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (!res.ok) {
      setError((await res.json()).error ?? 'Could not remove user')
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {assigned.length === 0 ? (
        <p className="text-sm text-zinc-500">Nobody is assigned to this project yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {assigned.map((person) => (
            <li key={person.userId} className="flex items-center justify-between gap-4">
              <span className="text-sm text-zinc-900 dark:text-zinc-100">
                {person.name ? `${person.name} · ` : ''}
                {person.email}
                <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {person.role === 'GUEST' ? 'Guest' : 'User'}
                </span>
              </span>
              <button
                onClick={() => remove(person.userId)}
                aria-label={`Remove ${person.email} from this project`}
                className="text-sm text-red-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-red-400"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 && (
        <div className="flex gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <label htmlFor="assign-user" className="sr-only">
            Select a person to assign
          </label>
          <select
            id="assign-user"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="h-10 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">Choose a person…</option>
            {available.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email} ({u.role === 'GUEST' ? 'Guest' : 'User'})
              </option>
            ))}
          </select>
          <button
            onClick={add}
            disabled={!selected}
            className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Assign
          </button>
        </div>
      )}
    </div>
  )
}
