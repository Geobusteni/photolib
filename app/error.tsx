'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="text-center">
        <p className="mb-4 text-sm text-zinc-500">Something went wrong.</p>
        <button
          onClick={reset}
          className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
