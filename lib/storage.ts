import fs from 'fs/promises'
import path from 'path'

function uploadRoot(): string {
  const dir = process.env.UPLOAD_DIR ?? './uploads'
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir)
}

export function projectDir(projectId: string): string {
  return path.join(uploadRoot(), projectId)
}

export function photosDir(projectId: string): string {
  return path.join(projectDir(projectId), 'photos')
}

export function thumbsDir(projectId: string): string {
  return path.join(projectDir(projectId), 'thumbs')
}

export function archiveDir(projectId: string): string {
  return path.join(projectDir(projectId), 'archive')
}

export async function ensureProjectDirs(projectId: string): Promise<void> {
  await Promise.all([
    fs.mkdir(photosDir(projectId), { recursive: true }),
    fs.mkdir(thumbsDir(projectId), { recursive: true }),
    fs.mkdir(archiveDir(projectId), { recursive: true }),
  ])
}

export async function deleteProjectFiles(projectId: string): Promise<void> {
  const dir = projectDir(projectId)
  await fs.rm(dir, { recursive: true, force: true })
}

/** The client-facing ZIP is always stored under this fixed name. */
export const ARCHIVE_FILE = 'archive.zip'

export function archivePath(projectId: string): string {
  return path.join(archiveDir(projectId), ARCHIVE_FILE)
}

export async function deleteArchiveFile(projectId: string): Promise<void> {
  await fs.rm(archivePath(projectId), { force: true })
}

export async function deletePhotoFiles(projectId: string, filename: string): Promise<void> {
  const base = path.basename(filename, path.extname(filename))
  await Promise.all([
    fs.rm(path.join(photosDir(projectId), filename), { force: true }),
    fs.rm(path.join(thumbsDir(projectId), `${base}-sm.jpg`), { force: true }),
    fs.rm(path.join(thumbsDir(projectId), `${base}-lg.jpg`), { force: true }),
  ])
}

export function safeResolvePath(root: string, requestedPath: string): string | null {
  const resolved = path.resolve(root, requestedPath)
  if (!resolved.startsWith(path.resolve(root))) return null
  return resolved
}
