'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
    router.push('/projects')
    router.refresh()
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="h-9 rounded-lg border border-red-300 px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
      >
        Delete project
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">This cannot be undone.</p>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="h-9 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {loading ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="h-9 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Cancel
      </button>
    </div>
  )
}
