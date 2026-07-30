import { notFound } from 'next/navigation'
import { getProject, listPhotos } from '@/lib/projects'
import ProjectForm from '@/components/ui/ProjectForm'
import DeleteProjectButton from '@/components/ui/DeleteProjectButton'
import AdminPhotoGrid from './_components/AdminPhotoGrid'
import UploadZone from './_components/UploadZone'
import Link from 'next/link'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const project = getProject(id)
  return { title: project?.title ?? 'Project' }
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  )
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params
  const project = getProject(id)
  if (!project) notFound()

  const photos = listPhotos(id)

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-sm text-zinc-500">
            <Link href="/projects" className="hover:underline">Projects</Link>
            {' / '}
          </p>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{project.title}</h1>
        </div>
        <a
          href={`/g/${project.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 shrink-0 items-center rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          View gallery ↗
        </a>
      </div>

      <dl className="flex flex-wrap gap-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <Stat label="Photos" value={photos.length} />
        <Stat label="Gallery visits" value={project.visit_count} />
        <Stat label="Downloads" value={project.dl_count} />
        <Stat label="Last access" value={formatDate(project.last_access)} />
      </dl>

      <section>
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">Photos</h2>
        <UploadZone projectId={id} />
        {photos.length > 0 && (
          <div className="mt-4">
            <AdminPhotoGrid photos={photos} projectId={id} />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">Settings</h2>
        <div className="max-w-lg rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <ProjectForm
            mode="edit"
            projectId={id}
            defaults={{
              title: project.title,
              event_date: project.event_date,
              expires_at: project.expires_at,
              zip_enabled: project.zip_enabled === 1,
              dl_enabled: project.dl_enabled === 1,
            }}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold text-red-600 dark:text-red-400">Danger zone</h2>
        <div className="rounded-xl border border-red-200 bg-white p-4 dark:border-red-900 dark:bg-zinc-900">
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
            Deleting this project will permanently remove all photos and data.
          </p>
          <DeleteProjectButton projectId={id} />
        </div>
      </section>
    </div>
  )
}
