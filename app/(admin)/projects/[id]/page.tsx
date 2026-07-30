import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getProject, getProjectAssignments, listPhotos } from '@/lib/projects'
import { listUsers } from '@/lib/users'
import ProjectForm from '@/components/ui/ProjectForm'
import DeleteProjectButton from '@/components/ui/DeleteProjectButton'
import AdminPhotoGrid from './_components/AdminPhotoGrid'
import UploadZone from './_components/UploadZone'
import AssignmentManager from './_components/AssignmentManager'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const project = await getProject(id)
  return { title: project?.title ?? 'Project' }
}

function formatDate(date: Date | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  )
}

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()

  const project = await getProject(id)
  if (!project) notFound()

  const isAdmin = session.role === 'ADMIN'

  // Users may only open projects they are assigned to.
  if (!isAdmin) {
    const assignment = await prisma.projectAssignment.findUnique({
      where: { projectId_userId: { projectId: id, userId: session.userId } },
    })
    if (!assignment) redirect('/projects')
  }

  const photos = await listPhotos(id)
  const assignments = isAdmin ? await getProjectAssignments(id) : []
  const allUsers = isAdmin ? await listUsers() : []

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-sm text-zinc-500">
            <Link href="/projects" className="hover:underline">
              Projects
            </Link>
            {' / '}
          </p>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{project.title}</h1>
        </div>
        <a
          href={`/g/${project.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 shrink-0 items-center rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          View gallery ↗
        </a>
      </div>

      <dl className="flex flex-wrap gap-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <Stat label="Photos" value={photos.length} />
        <Stat label="Access" value={project.accessType === 'EMAIL' ? 'Email based' : 'Password'} />
        <Stat label="Gallery visits" value={project.visitCount} />
        <Stat label="Downloads" value={project.dlCount} />
        <Stat label="Last access" value={formatDate(project.lastAccess)} />
      </dl>

      <section>
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">Photos</h2>
        <UploadZone projectId={id} />
        {photos.length > 0 && (
          <div className="mt-4">
            <AdminPhotoGrid
              photos={photos.map((p) => ({ id: p.id, filename: p.filename }))}
              projectId={id}
            />
          </div>
        )}
      </section>

      {isAdmin && (
        <section>
          <h2 className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">People</h2>
          <p className="mb-4 text-sm text-zinc-500">
            Assign users who may manage this project, and guests who may view it by email.
          </p>
          <AssignmentManager
            projectId={id}
            assigned={assignments.map((a) => ({
              userId: a.userId,
              email: a.user.email,
              name: a.user.name,
              role: a.user.role,
            }))}
            allUsers={allUsers
              .filter((u) => u.role !== 'ADMIN')
              .map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role }))}
          />
        </section>
      )}

      {isAdmin && (
        <>
          <section>
            <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">Settings</h2>
            <div className="max-w-lg rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <ProjectForm
                mode="edit"
                projectId={id}
                defaults={{
                  title: project.title,
                  eventDate: project.eventDate,
                  expiresAt: project.expiresAt,
                  accessType: project.accessType,
                  zipEnabled: project.zipEnabled,
                  dlEnabled: project.dlEnabled,
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
        </>
      )}
    </div>
  )
}
