import { getDb } from './db'
import { nanoid } from 'nanoid'

export interface Project {
  id: string
  title: string
  event_date: string | null
  password: string
  expires_at: string | null
  zip_enabled: number
  dl_enabled: number
  dl_count: number
  visit_count: number
  last_access: string | null
  created_at: string
}

export interface Photo {
  id: string
  project_id: string
  filename: string
  width: number
  height: number
  size: number
  sort_order: number
  created_at: string
}

export interface CreateProjectData {
  title: string
  event_date?: string | null
  password: string
  expires_at?: string | null
  zip_enabled?: boolean
  dl_enabled?: boolean
}

export interface UpdateProjectData {
  title?: string
  event_date?: string | null
  password?: string
  expires_at?: string | null
  zip_enabled?: boolean
  dl_enabled?: boolean
}

export function listProjects(): Project[] {
  return getDb()
    .prepare('SELECT * FROM projects ORDER BY created_at DESC')
    .all() as Project[]
}

export function getProject(id: string): Project | null {
  return (
    (getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined) ?? null
  )
}

export function createProject(data: CreateProjectData): Project {
  const id = nanoid(10)
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO projects (id, title, event_date, password, expires_at, zip_enabled, dl_enabled, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      data.title,
      data.event_date ?? null,
      data.password,
      data.expires_at ?? null,
      data.zip_enabled !== false ? 1 : 0,
      data.dl_enabled !== false ? 1 : 0,
      now
    )
  return getProject(id)!
}

export function updateProject(id: string, data: UpdateProjectData): Project | null {
  const project = getProject(id)
  if (!project) return null

  const fields: string[] = []
  const values: unknown[] = []

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
  if (data.event_date !== undefined) { fields.push('event_date = ?'); values.push(data.event_date) }
  if (data.password !== undefined) { fields.push('password = ?'); values.push(data.password) }
  if (data.expires_at !== undefined) { fields.push('expires_at = ?'); values.push(data.expires_at) }
  if (data.zip_enabled !== undefined) { fields.push('zip_enabled = ?'); values.push(data.zip_enabled ? 1 : 0) }
  if (data.dl_enabled !== undefined) { fields.push('dl_enabled = ?'); values.push(data.dl_enabled ? 1 : 0) }

  if (fields.length === 0) return project

  values.push(id)
  getDb().prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return getProject(id)!
}

export function deleteProject(id: string): void {
  getDb().prepare('DELETE FROM projects WHERE id = ?').run(id)
}

export function incrementVisit(id: string): void {
  getDb()
    .prepare(
      `UPDATE projects SET visit_count = visit_count + 1, last_access = ? WHERE id = ?`
    )
    .run(new Date().toISOString(), id)
}

export function incrementDownload(id: string): void {
  getDb()
    .prepare('UPDATE projects SET dl_count = dl_count + 1 WHERE id = ?')
    .run(id)
}

export function listPhotos(projectId: string): Photo[] {
  return getDb()
    .prepare('SELECT * FROM photos WHERE project_id = ? ORDER BY sort_order ASC, created_at ASC')
    .all(projectId) as Photo[]
}

export function getPhoto(id: string): Photo | null {
  return (
    (getDb().prepare('SELECT * FROM photos WHERE id = ?').get(id) as Photo | undefined) ?? null
  )
}

export function insertPhoto(data: Omit<Photo, 'created_at'>): Photo {
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO photos (id, project_id, filename, width, height, size, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(data.id, data.project_id, data.filename, data.width, data.height, data.size, data.sort_order, now)
  return getDb().prepare('SELECT * FROM photos WHERE id = ?').get(data.id) as Photo
}

export function deletePhoto(id: string): void {
  getDb().prepare('DELETE FROM photos WHERE id = ?').run(id)
}

export function countPhotos(projectId: string): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) as n FROM photos WHERE project_id = ?')
    .get(projectId) as { n: number }
  return row.n
}
