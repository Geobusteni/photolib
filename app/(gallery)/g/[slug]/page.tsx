import { notFound } from 'next/navigation'
import { getProject, listPhotos, incrementVisit } from '@/lib/projects'
import { verifyGalleryAccess } from '@/lib/gallery-auth'
import PasswordGate from '@/components/gallery/PasswordGate'
import Gallery from '@/components/gallery/Gallery'
import type { PhotoData } from '@/components/gallery/ImageTile'
import type { Metadata } from 'next'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const project = getProject(slug)
  if (!project) return { title: 'Gallery' }
  return {
    title: project.title,
    robots: { index: false, follow: false },
  }
}

export default async function GalleryPage({ params }: Props) {
  const { slug } = await params
  const project = getProject(slug)
  if (!project) notFound()

  // Check expiration
  if (project.expires_at && new Date(project.expires_at) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <p className="text-center text-sm text-zinc-500">This gallery has expired.</p>
      </div>
    )
  }

  const hasAccess = await verifyGalleryAccess(slug)

  if (!hasAccess) {
    return <PasswordGate projectId={slug} />
  }

  // Track visit (fire and forget)
  setImmediate(() => incrementVisit(slug))

  const photos = listPhotos(slug)
  const photoData: PhotoData[] = photos.map((p) => {
    const base = p.filename.replace(/\.[^.]+$/, '')
    return {
      id: p.id,
      filename: p.filename,
      width: p.width,
      height: p.height,
      thumbSm: `/api/uploads/${slug}/thumbs/${encodeURIComponent(base)}-sm.jpg`,
      thumbLg: `/api/uploads/${slug}/thumbs/${encodeURIComponent(base)}-lg.jpg`,
      original: project.dl_enabled ? `/api/uploads/${slug}/photos/${encodeURIComponent(p.filename)}` : null,
    }
  })

  return (
    <div className="min-h-screen bg-black">
      <Gallery
        photos={photoData}
        title={project.title}
        projectId={slug}
        zipEnabled={project.zip_enabled === 1}
      />
    </div>
  )
}
