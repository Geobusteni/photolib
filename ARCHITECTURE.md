# Photolib – Architecture

> Read `AGENTS.md` first for project philosophy and feature scope.

---

## Tech Stack

| Layer      | Technology                      |
|------------|---------------------------------|
| Framework  | Next.js 16 (App Router)         |
| Language   | TypeScript 5                    |
| UI         | React 19                        |
| Styling    | Tailwind CSS 4                  |
| Database   | SQLite via `better-sqlite3`     |
| Auth       | Iron Session (signed cookies)   |
| Images     | Sharp (server-side thumbnails)  |

> Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`.

---

## Repository Layout

```
photolib/
├── AGENTS.md              # AI instructions (read first)
├── ARCHITECTURE.md        # This file
├── app/                   # Next.js App Router root
│   ├── (admin)/           # Route group — admin area
│   │   ├── layout.tsx     # Admin shell (auth guard)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── projects/
│   │       ├── page.tsx              # Project list
│   │       ├── new/
│   │       │   └── page.tsx
│   │       └── [id]/
│   │           └── page.tsx          # Edit project
│   ├── (gallery)/         # Route group — client area
│   │   └── g/
│   │       └── [slug]/
│   │           └── page.tsx          # Password-protected gallery
│   ├── api/               # Route Handlers
│   │   ├── auth/
│   │   │   └── route.ts              # POST login / DELETE logout
│   │   └── projects/
│   │       ├── route.ts              # GET list, POST create
│   │       └── [id]/
│   │           ├── route.ts          # GET, PUT, DELETE project
│   │           ├── upload/
│   │           │   └── route.ts      # POST image/ZIP upload
│   │           └── download/
│   │               └── route.ts      # GET ZIP archive stream
│   ├── layout.tsx         # Root layout (html, body, fonts)
│   └── globals.css
├── components/            # Shared UI components
│   ├── gallery/
│   │   ├── Gallery.tsx
│   │   ├── ImageTile.tsx
│   │   └── Toolbar.tsx
│   ├── lightbox/
│   │   ├── PhotoViewer.tsx
│   │   ├── ViewerControls.tsx
│   │   └── GestureHandler.tsx
│   ├── selection/
│   │   └── SelectionManager.tsx
│   └── ui/               # Generic primitives (Button, etc.)
├── lib/                   # Server-only utilities
│   ├── db.ts              # SQLite connection singleton
│   ├── auth.ts            # Session helpers
│   ├── images.ts          # Sharp thumbnail generation
│   └── projects.ts        # Data access layer
├── hooks/                 # Client-side hooks
│   ├── useKeyboard.ts
│   ├── useGestures.ts
│   └── useReducedMotion.ts
├── uploads/               # Runtime file storage (gitignored)
│   └── [project-slug]/
│       ├── photos/        # Original JPEGs
│       ├── thumbs/        # Generated thumbnails
│       └── archive/       # ZIP files
└── next.config.ts
```

---

## Routing

| URL                        | Audience | Purpose                        |
|----------------------------|----------|--------------------------------|
| `/login`                   | Admin    | Photographer login             |
| `/projects`                | Admin    | Dashboard — list of projects   |
| `/projects/new`            | Admin    | Create project                 |
| `/projects/[id]`           | Admin    | Edit project                   |
| `/g/[slug]`                | Client   | Password-protected gallery     |

---

## Database Schema

Keep it simple. Fewer tables is better.

```sql
-- One table for projects
CREATE TABLE projects (
  id          TEXT PRIMARY KEY,          -- nanoid slug (also URL slug)
  title       TEXT NOT NULL,
  event_date  TEXT,                      -- ISO date string, nullable
  password    TEXT NOT NULL,             -- bcrypt hash
  expires_at  TEXT,                      -- ISO datetime, nullable
  zip_enabled INTEGER NOT NULL DEFAULT 1,
  dl_enabled  INTEGER NOT NULL DEFAULT 1,
  dl_count    INTEGER NOT NULL DEFAULT 0,
  visit_count INTEGER NOT NULL DEFAULT 0,
  last_access TEXT,                      -- ISO datetime, nullable
  created_at  TEXT NOT NULL
);

-- One table for photos
CREATE TABLE photos (
  id          TEXT PRIMARY KEY,          -- nanoid
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,             -- original filename
  width       INTEGER NOT NULL,
  height      INTEGER NOT NULL,
  size        INTEGER NOT NULL,          -- bytes
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);
```

Only metadata lives in the database. Files live on disk.

---

## File Storage

```
uploads/
  [project-id]/
    photos/        originals — served directly or streamed
    thumbs/        generated at upload time by Sharp
    archive/       pre-built ZIP or built on first download
```

Thumbnails are generated **once at upload time**. Originals are never resized per-request.

Thumbnail sizes to generate:

| Name   | Max dimension | Usage              |
|--------|---------------|--------------------|
| `sm`   | 400 px wide   | Grid thumbnail     |
| `lg`   | 1200 px wide  | Lightbox preview   |

---

## Authentication

- Single photographer account: credentials in environment variables
- Session stored as a signed, encrypted cookie via Iron Session
- Admin routes protected by middleware or layout-level auth guard
- Gallery password: per-project bcrypt hash, verified server-side and stored in a short-lived cookie per project

---

## API Design

Route Handlers in `app/api/`. Follow REST conventions. Return JSON.

### Auth

```
POST   /api/auth          { username, password } → set session cookie
DELETE /api/auth          → clear session cookie
```

### Projects (admin, requires session)

```
GET    /api/projects                   → list all projects
POST   /api/projects                   → create project
GET    /api/projects/[id]              → get project + photo list
PUT    /api/projects/[id]              → update project settings
DELETE /api/projects/[id]              → delete project + files
POST   /api/projects/[id]/upload       → upload images or ZIP
GET    /api/projects/[id]/download     → stream ZIP archive
```

### Gallery (client)

```
POST   /api/projects/[id]/auth         → verify gallery password → set gallery cookie
GET    /api/projects/[id]/photos       → list photos (requires gallery cookie or admin session)
GET    /api/projects/[id]/download     → stream ZIP (if zip_enabled)
```

---

## Component Architecture

### Gallery State Machine

```
Gallery (normal)
  └── Toolbar: [Select] [Download ZIP]
  └── ImageTile × N  (tap → open lightbox)

Gallery (selection)
  └── Toolbar: [Cancel] [Download Selected (N)]
  └── ImageTile × N  (tap → toggle selection)

Viewer (mobile)
  └── GestureHandler (swipe left/right/up/down)
  └── ViewerControls (fade in/out on tap)

Viewer (desktop)
  └── ViewerControls (always visible; auto-hide in fullscreen)
  └── KeyboardManager
```

### Key Components

| Component           | Responsibility                                       |
|---------------------|------------------------------------------------------|
| `Gallery`           | Layout grid, manages gallery/selection state         |
| `Toolbar`           | Context-sensitive top bar                            |
| `ImageTile`         | Single photo cell, handles tap/selection             |
| `PhotoViewer`       | Lightbox shell, owns viewer state                    |
| `ViewerControls`    | Prev/Next/Download/Fullscreen/Close buttons          |
| `GestureHandler`    | Pointer-event-based swipe detection (no library)     |
| `SelectionManager`  | Tracks selected image IDs, exposes download action   |
| `KeyboardManager`   | Global keyboard shortcuts via `keydown` listener     |

---

## State Management

Use React `useReducer` with an explicit state type rather than scattered `useState` booleans.

```ts
type GalleryState =
  | { mode: 'gallery' }
  | { mode: 'selection'; selected: Set<string> }
  | { mode: 'viewer'; currentId: string }
  | { mode: 'viewer-fullscreen'; currentId: string }
```

No external state library needed at this scale.

---

## Motion & Animation Rules

1. Always read `prefers-reduced-motion` via `useReducedMotion` hook before applying any transition.
2. CSS transitions only — no JS animation libraries unless absolutely necessary.
3. All durations must have a `0ms` fallback.
4. Animations are `opacity` and `transform` only (GPU-composited, no layout thrash).

```ts
// hooks/useReducedMotion.ts
export function useReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
```

---

## Environment Variables

```
# .env.local
ADMIN_USERNAME=
ADMIN_PASSWORD_HASH=   # bcrypt hash
SESSION_SECRET=        # 32+ random chars for Iron Session
UPLOAD_DIR=./uploads   # absolute path in production
```

---

## Image Upload Flow

1. Client POSTs multipart form to `/api/projects/[id]/upload`
2. Server validates file type (JPEG only, or ZIP)
3. For each JPEG:
   - Save original to `uploads/[id]/photos/`
   - Generate `sm` and `lg` thumbnails with Sharp → `uploads/[id]/thumbs/`
   - Insert row into `photos` table
4. For ZIP:
   - Extract, filter JPEGs, process each as above
   - Delete the uploaded ZIP after extraction

---

## ZIP Download Flow

1. Client requests `/api/projects/[id]/download`
2. Server checks `zip_enabled` flag and gallery cookie
3. Stream a ZIP built on-the-fly from `uploads/[id]/photos/` using the `archiver` package
4. Increment `dl_count`

---

## Security Notes

- Admin session: signed, encrypted cookie — never expose credentials to client
- Gallery password: hashed with bcrypt — never returned to client
- Uploaded files: validate MIME type server-side, not just extension
- No directory traversal: always resolve paths relative to `UPLOAD_DIR`
- Project IDs are nanoid slugs — not guessable but not secret (password protects access)

---

## Decisions Log

| Decision                        | Reason                                              |
|---------------------------------|-----------------------------------------------------|
| SQLite over Postgres            | Single-user app, no need for a separate DB server   |
| Iron Session over NextAuth      | Simple single-user auth, no OAuth needed            |
| Sharp for thumbnails            | Best-in-class Node image processing, well maintained|
| No global state library         | `useReducer` is sufficient at this scale            |
| No Framer Motion (yet)          | CSS transitions satisfy all current animation needs |
| Pointer Events for gestures     | Native browser API, no dependency needed            |
| Files on disk over object store | Simple, human-readable, no external service needed  |
