import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getProject, incrementVisit, listPhotos } from '@/lib/projects'
import { verifyGalleryAccess } from '@/lib/gallery-auth'
import { toPhotoData } from '@/lib/photo-data'
import AccessGate from '@/components/gallery/AccessGate'
import Gallery from '@/components/gallery/Gallery'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const project = await getProject(slug)
  return {
    title: project?.title ?? 'Gallery',
    robots: { index: false, follow: false },
  }
}

export default async function GalleryPage({ params }: Props) {
  const { slug } = await params
  const project = await getProject(slug)
  if (!project) notFound()

  if (project.expiresAt && new Date(project.expiresAt) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <p className="text-center text-sm text-zinc-400">This gallery has expired.</p>
      </div>
    )
  }

  if (!(await verifyGalleryAccess(slug))) {
    return <AccessGate projectId={slug} accessType={project.accessType} />
  }

  await incrementVisit(slug)

  const photos = await listPhotos(slug)

  return (
    <div className="min-h-screen bg-black">
      <Gallery
        photos={photos.map((p) => toPhotoData(p, project.dlEnabled))}
        title={project.title}
        projectId={slug}
        hasArchive={project.zipEnabled && !!project.archiveName}
      />
    </div>
  )
}
