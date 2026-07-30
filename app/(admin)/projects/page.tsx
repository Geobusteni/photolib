import { listProjects, countPhotos } from '@/lib/projects'
import Link from 'next/link'

export const metadata = { title: 'Projects' }

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export default async function ProjectsPage() {
  const projects = listProjects()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Projects</h1>
        <Link
          href="/projects/new"
          className="inline-flex h-9 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">No projects yet.</p>
          <Link href="/projects/new" className="mt-2 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-100">
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Title</th>
                <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 sm:table-cell">Date</th>
                <th className="hidden px-4 py-3 text-right font-medium text-zinc-500 md:table-cell">Photos</th>
                <th className="hidden px-4 py-3 text-right font-medium text-zinc-500 md:table-cell">Visits</th>
                <th className="hidden px-4 py-3 text-right font-medium text-zinc-500 lg:table-cell">Downloads</th>
                <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 lg:table-cell">Last access</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-zinc-500 sm:table-cell">
                    {formatDate(p.event_date)}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-zinc-500 md:table-cell">
                    {countPhotos(p.id)}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-zinc-500 md:table-cell">
                    {p.visit_count}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-zinc-500 lg:table-cell">
                    {p.dl_count}
                  </td>
                  <td className="hidden px-4 py-3 text-zinc-500 lg:table-cell">
                    {formatDate(p.last_access)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
