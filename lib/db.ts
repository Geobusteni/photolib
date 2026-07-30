import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'photolib.db')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
  }
  return _db
}

export function initDb(): void {
  const db = getDb()

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      event_date  TEXT,
      password    TEXT NOT NULL,
      expires_at  TEXT,
      zip_enabled INTEGER NOT NULL DEFAULT 1,
      dl_enabled  INTEGER NOT NULL DEFAULT 1,
      dl_count    INTEGER NOT NULL DEFAULT 0,
      visit_count INTEGER NOT NULL DEFAULT 0,
      last_access TEXT,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photos (
      id          TEXT PRIMARY KEY,
      project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      filename    TEXT NOT NULL,
      width       INTEGER NOT NULL,
      height      INTEGER NOT NULL,
      size        INTEGER NOT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL
    );
  `)
}
