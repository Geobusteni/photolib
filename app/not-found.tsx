import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="text-center">
        <p className="mb-4 text-sm text-zinc-500">Page not found</p>
        <Link href="/projects" className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100">
          Go to projects
        </Link>
      </div>
    </div>
  )
}
