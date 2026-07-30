'use client'

import { useState } from 'react'

export default function PasswordReveal({ password }: { password: string }) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard is unavailable (insecure context); revealing is enough.
      setVisible(true)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
        {visible ? password : '••••••••'}
      </code>
      <button
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        className="rounded px-1.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        {visible ? 'Hide' : 'Show'}
      </button>
      <button
        onClick={copy}
        className="rounded px-1.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Password copied to clipboard' : ''}
      </span>
    </div>
  )
}
