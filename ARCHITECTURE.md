# Photolib – Architecture

> Read `AGENTS.md` first for project philosophy, roles, and feature scope.

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Framework  | Next.js 16 (App Router)             |
| Language   | TypeScript 5                        |
| UI         | React 19                            |
| Styling    | Tailwind CSS 4                      |
| Database   | PostgreSQL                          |
| ORM        | Prisma 7 (with `@prisma/adapter-pg`)|
| Auth       | Iron Session (signed cookies) + bcryptjs |
| Images     | Sharp (server-side thumbnails)      |
| Archives   | fflate (ZIP create and extract)     |

> Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`.

Prisma 7 requires a **driver adapter**; there is no implicit connection. The client is
constructed once in `lib/prisma.ts` with `PrismaPg`.

---

## Configuration

One file: `.env` (gitignored). `.env.example` documents it.

```
DATABASE_URL='postgresql://user:password@localhost:5432/photolib'
SESSION_SECRET='32+ random characters'
UPLOAD_DIR=./uploads
```

Values containing `$` must be single-quoted or the loader will interpolate and truncate them.

---

## Repository Layout

```
photolib/
├── AGENTS.md                  # AI instructions (read first)
├── ARCHITECTURE.md            # This file
├── PLAN.md                    # Phased build plan
├── .env                       # Single config file (gitignored)
├── .env.example               # Config template (committed)
├── prisma/
│   └── schema.prisma          # Single source of truth for the data model
├── prisma.config.ts           # Prisma 7 config (schema path, datasource URL)
├── app/
│   ├── setup/                 # First-run admin creation
│   │   ├── page.tsx
│   │   └── _components/SetupForm.tsx
│   ├── login/                 # Outside (admin) — must not inherit the auth guard
│   │   ├── page.tsx
│   │   └── _components/LoginForm.tsx
│   ├── (admin)/               # Route group — authenticated area
│   │   ├── layout.tsx         # Auth guard + setup redirect + nav
│   │   ├── projects/
│   │   │   ├── page.tsx               # Admin: all projects. User: assigned only
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── _components/{UploadZone,AdminPhotoGrid,AssignmentManager}.tsx
│   │   └── users/
│   │       ├── page.tsx               # Admin only
│   │       └── _components/UserManager.tsx
│   ├── (gallery)/
│   │   └── g/[slug]/page.tsx  # Client-facing gallery
│   ├── api/
│   │   ├── setup/route.ts
│   │   ├── auth/route.ts
│   │   ├── users/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── projects/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       ├── auth/route.ts        # Gallery gate (password or email)
│   │   │       ├── assignments/route.ts
│   │   │       ├── upload/route.ts
│   │   │       ├── download/route.ts
│   │   │       └── photos/
│   │   │           ├── route.ts
│   │   │           └── [photoId]/route.ts
│   │   └── uploads/[...path]/route.ts   # File serving
│   ├── layout.tsx
│   ├── error.tsx
│   ├── not-found.tsx
│   └── globals.css
├── components/
│   ├── gallery/{Gallery,ImageTile,Toolbar,AccessGate,DownloadOptionsDialog}.tsx
│   ├── lightbox/{PhotoViewer,ViewerControls}.tsx
│   └── ui/{ProjectForm,DeleteProjectButton,LogoutButton,ProgressBar}.tsx
├── hooks/{useKeyboard,useGestures,useImageZoom,useFocusTrap,useReducedMotion}.ts
├── lib/
│   ├── prisma.ts              # Client singleton with the pg adapter
│   ├── auth.ts                # Session, role guards, password hashing
│   ├── users.ts               # User CRUD, setup detection
│   ├── projects.ts            # Project/photo/assignment data access
│   ├── gallery-auth.ts        # Gallery access: password, email, role
│   ├── photo-data.ts          # DB record → client-facing PhotoData
│   ├── images.ts              # Sharp thumbnails
│   ├── storage.ts             # Upload paths, traversal guard
│   ├── rate-limit.ts          # In-memory limiter
│   ├── fullscreen.ts          # Fullscreen API wrapper with legacy WebKit fallback
│   ├── xhr-upload.ts          # XHR wrapper for client-side upload progress
│   └── generated/prisma/      # Generated client (gitignored)
└── uploads/                   # Runtime file storage (gitignored)
    └── [project-id]/{photos,thumbs,archive}/
```

`/login` deliberately lives **outside** `(admin)`. Nesting it inside means the admin layout's
auth guard would redirect the login page to itself — an infinite redirect loop.

---

## Data Model

```mermaid
erDiagram
    User ||--o{ ProjectAssignment : has
    Project ||--o{ ProjectAssignment : has
    Project ||--o{ Photo : contains

    User {
        string id PK
        string email UK
        string username UK "null for guests"
        string password "null for guests"
        string name
        Role role "ADMIN | USER | GUEST"
    }
    Project {
        string id PK "also the gallery URL slug"
        string title
        datetime eventDate
        AccessType accessType "PASSWORD | EMAIL"
        string password "AES-256-GCM, null when EMAIL"
        string archiveName "null until an archive is uploaded"
        int archiveSize
        datetime expiresAt
        boolean zipEnabled
        boolean dlEnabled
        int dlCount
        int visitCount
        datetime lastAccess
    }
    ProjectAssignment {
        string id PK
        string projectId FK
        string userId FK
    }
    Photo {
        string id PK
        string projectId FK
        string filename "generated UUID, on disk"
        string originalName "as uploaded, used for downloads"
        int width
        int height
        int size
        int sortOrder
    }
```

`Photo` has a composite unique constraint on `(projectId, originalName)`. That constraint is what
makes duplicate detection at upload time possible.

`ProjectAssignment` has a composite unique constraint on `(projectId, userId)`, which lets the
code use `upsert` for idempotent assignment.

Only metadata lives in the database. Files live on disk.

---

## Authentication and Authorisation

```mermaid
flowchart TD
    request[Incoming request] --> setupCheck{Any admin<br/>in database?}
    setupCheck -->|No| setupPage["/setup — create first admin"]
    setupCheck -->|Yes| sessionCheck{Valid session<br/>cookie?}
    sessionCheck -->|No| loginPage["/login"]
    sessionCheck -->|Yes| roleCheck{Role?}
    roleCheck -->|ADMIN| full[Full access]
    roleCheck -->|USER| assigned[Assigned projects only]
    roleCheck -->|GUEST| galleryOnly[Gallery read only]
```

Two independent cookie sessions:

| Cookie                        | Purpose                                        |
|-------------------------------|------------------------------------------------|
| `photolib_session`            | Logged-in admin or user: `{ userId, role }`    |
| `photolib_gallery_[projectId]`| Per-project gallery grant, 7 days              |

### Gallery access resolution

`verifyGalleryAccess(projectId)` in `lib/gallery-auth.ts` grants access when any of these hold:

1. The session belongs to an `ADMIN`.
2. The session belongs to a `USER` **and** a `ProjectAssignment` exists for that project.
3. A valid per-project gallery cookie exists (set by password or email at the gate).

### Guarding rules

- All admin routes are `force-dynamic` — they depend on session and live database state.
  Without this, Next.js attempts to prerender them at build time and the build fails on a
  database connection error.
- Admin-only API routes call `requireAdmin()`, which redirects non-admins.
- The `users` page and the project settings/danger sections render only for admins.

---

## API Surface

### Setup and auth

```
POST   /api/setup                       Create the first admin (403 once one exists)
POST   /api/auth                        { identifier, password } → session
DELETE /api/auth                        Clear session
```

### Users (admin only)

```
GET    /api/users                       List users (passwords stripped)
POST   /api/users                       Create user; guests need email only
PUT    /api/users/[id]                  Update; blocks demoting the last admin
DELETE /api/users/[id]                  Blocks self-deletion and the last admin
```

### Projects

```
GET    /api/projects                    List (admin)
POST   /api/projects                    Create (admin)
GET    /api/projects/[id]               Read (admin)
PUT    /api/projects/[id]               Update (admin)
DELETE /api/projects/[id]               Delete project + files (admin)
GET    /api/projects/[id]/assignments   List assigned people (admin)
POST   /api/projects/[id]/assignments   Assign a user/guest (admin)
DELETE /api/projects/[id]/assignments   Unassign (admin)
POST   /api/projects/[id]/upload        JPEG or ZIP of photos (admin)
POST   /api/projects/[id]/archive       Upload the client-facing ZIP (admin)
DELETE /api/projects/[id]/archive       Remove it (admin)
DELETE /api/projects/[id]/photos/[pid]  Delete photo + files (admin)
```

`POST /upload` accepts a `strategy` field alongside the file: `overwrite`, `rename`, or `skip`.
Without one it defaults to `ask` and answers **409** with a `conflicts` array of the original names
that already exist. A 409 here is a question, not a failure.

### Gallery (client)

```
POST   /api/projects/[id]/auth                    { password } or { email } → gallery cookie
GET    /api/projects/[id]/photos                  Photo list (requires access)
GET    /api/projects/[id]/download                The uploaded archive; 404 if none
POST   /api/projects/[id]/download                { photoIds } → ZIP of selection
GET    /api/projects/[id]/photos/[pid]/download   One original, under its original name
                                                    ?variant=share serves the compressed
                                                    ~2048px variant instead
GET    /api/uploads/[...path]                     Thumbnails only
```

---

## File Storage

```
uploads/
  [project-id]/
    photos/    originals, named [uuid].jpg
    thumbs/    [uuid]-sm.jpg (400px), [uuid]-lg.jpg (1200px), [uuid]-share.jpg (2048px)
    archive/   archive.zip — the ZIP the photographer uploaded, if any
```

Thumbnails are generated **once at upload**. Originals are never resized per request.

### Filenames

Disk names and display names are deliberately separate. On disk every photo is a generated UUID,
which keeps path traversal, encoding, and collision problems away from the filesystem.
`Photo.originalName` holds the uploaded name in the database.

Downloads bridge the two: `/api/projects/[id]/photos/[pid]/download` reads the UUID file and sets
`Content-Disposition` from `originalName`. Selection ZIPs name their entries the same way.

`safeResolvePath()` in `lib/storage.ts` rejects any resolved path escaping the project directory.
`/api/uploads/[...path]` serves **thumbnails only**; originals and archives go through routes that
check access and record the download.

---

## Component Architecture

### Gallery state machine

```mermaid
stateDiagram-v2
    [*] --> GalleryMode
    GalleryMode --> SelectionMode: Select / S
    SelectionMode --> GalleryMode: Cancel / Escape
    GalleryMode --> ViewerMode: tap or Enter on a tile
    ViewerMode --> GalleryMode: Escape / swipe down / Close
```

Modelled as a discriminated union in a `useReducer`, not as loose booleans:

```ts
type GalleryMode =
  | { mode: 'gallery' }
  | { mode: 'selection'; selected: Set<string> }
  | { mode: 'viewer'; currentIndex: number }
```

The lightbox cannot open while selecting, because `OPEN_VIEWER` is a no-op in selection mode.
That constraint lives in the reducer rather than in scattered conditionals.

### Lightbox fullscreen and zoom

Fullscreen and zoom are deliberately **not** branches of the Gallery reducer above — they're
orthogonal to gallery/selection/viewer and are owned locally by `PhotoViewer` and its hooks as a
plain `isFullscreen` boolean.

`isFullscreenSupported()` (`lib/fullscreen.ts`) gates whether `ViewerControls` renders the
Fullscreen button at all — platforms with no Fullscreen API for non-`<video>` elements (iOS
Safari — see Decisions Log) never see it. Escape exits fullscreen before closing the viewer, and
unmounting always exits fullscreen.

Zoom/pan state (`hooks/useImageZoom.ts`) is similarly decoupled from gesture *recognition*
(`hooks/useGestures.ts`), which tracks pointers by `pointerId` through an explicit
`idle → tracking → panning | pinching` phase machine rather than a single shared start
position. This is what lets a second finger touching down mid-gesture start a pinch instead of
corrupting the first finger's swipe/tap classification. Swipe-to-navigate only fires at 1×; a
single finger pans instead once zoomed in.

### Key components

| Component               | Responsibility                                      |
|--------------------------|-----------------------------------------------------|
| `Gallery`                | Grid layout, owns gallery/selection/viewer state     |
| `Toolbar`                | Context-sensitive top bar                            |
| `ImageTile`              | One photo cell; tap opens or toggles selection       |
| `AccessGate`             | Password or email gate, chosen by `accessType`       |
| `DownloadOptionsDialog`  | ZIP vs. Save-to-Photos choice for selected photos    |
| `PhotoViewer`            | Lightbox shell, focus management, fullscreen, zoom   |
| `ViewerControls`         | Prev/Next/Download/Fullscreen/Close                  |
| `ProgressBar`            | Determinate/indeterminate progress indicator         |
| `UserManager`            | Admin user CRUD                                      |
| `AssignmentManager`      | Assign users and guests to a project                 |
| `ArchiveManager`         | Upload/replace/remove the client-facing ZIP          |
| `PasswordReveal`         | Show and copy a project's gallery password           |
| `UploadZone`             | Photo upload, including duplicate resolution and progress |

---

## Motion

1. `hooks/useReducedMotion.ts` reports the media query and updates on change.
2. `globals.css` also collapses all durations under `prefers-reduced-motion: reduce`, so the
   baseline holds even for components that forget to check.
3. Only `opacity` and `transform` are animated.

---

## Decisions Log

| Decision                          | Reason                                                        |
|-----------------------------------|---------------------------------------------------------------|
| PostgreSQL over SQLite            | Real user/role relations; room to grow beyond one machine     |
| Prisma over raw SQL               | Typed schema and migrations; the app is expected to extend    |
| Driver adapter (`@prisma/adapter-pg`) | Required by Prisma 7 — no implicit connection             |
| Single `.env`                     | One place to look, like `wp-config.php`                       |
| Iron Session over NextAuth        | No OAuth needed; sessions are two small signed cookies        |
| Guests without passwords          | The photographer often has an email but no account to create  |
| UUID filenames on disk            | Avoids traversal, encoding, and collision issues entirely     |
| `originalName` stored separately  | Clients need the name they recognise; the disk does not       |
| Gallery passwords encrypted, not hashed | The photographer must read them back to send them on. Account passwords stay bcrypt-hashed |
| Archive uploaded, never generated | Zipping thousands of originals per request is slow and memory-hungry, and duplicates an export the photographer already has |
| Blob-download `revokeObjectURL` deferred via `setTimeout` | Revoking immediately after `a.click()` races the browser's (often async) download start and can silently no-op the download on some browsers |
| Lightbox photo prefetched on dialog mount, keyed by photo id | `navigator.share()` needs a fresh user gesture; fetching the photo inside the click handler risked losing that window on slow connections. Scoped to the single-photo case (the lightbox's only usage) so multi-select downloads don't eagerly fetch photos a user may not pick |
| `/api/uploads` serves thumbs only | Originals and archives have routes that check access and count downloads; a second unguarded path defeated both |
| Upload conflicts answer 409       | Silently overwriting a client's photo is worse than asking     |
| Individual download/share sends a compressed ~2048px variant, not the true original | Mobile `navigator.share()` fetching a multi-MB original stalls or fails; ZIP downloads (archive and selection) still fetch true originals server-side, unaffected |
| `sortOrder` counts up from max    | Prisma `Int` is a 32-bit PostgreSQL `INTEGER`; `Date.now()` overflows it |
| Upload deletes files on failure   | A failed insert used to leave orphaned files on disk          |
| Viewer focuses the dialog, not a button | The old focus holder used `focus:not-sr-only` and painted a stray label over the controls |
| Viewer exits fullscreen on unmount | Closing while fullscreen used to leave the browser fullscreen on an empty page |
| fflate over archiver              | Pure ESM, no CJS interop problems; handles both zip and unzip |
| `useReducer` over a state library | One screen of state; a library would be pure overhead         |
| Pointer Events for gestures       | Native browser API, no dependency                             |
| Fullscreen control hidden when unsupported, not simulated | An earlier CSS-only "simulated fullscreen" fallback for iOS Safari never actually changed anything visually (the lightbox is already full-viewport), so the button appeared broken. Hiding it via `isFullscreenSupported()` is simpler and matches reality — Android and desktop browsers that do support the API are unaffected |
| Gestures track pointers by `pointerId` | A single shared start position let a second finger touching down mid-swipe corrupt the gesture; per-pointer tracking is also required for pinch-to-zoom |
| Web Share API for save-to-Photos  | No browser API writes silently into the OS photo gallery; `navigator.share({files})` is the only standards-based way, at the cost of one native confirmation tap. Falls back to per-file Downloads on unsupported browsers |
| XMLHttpRequest for upload progress | `fetch` has no upload-progress event; XHR is the dependency-free way to report real byte-level progress on large uploads |
| Selection ZIP progress is indeterminate | The ZIP is built with one buffered, synchronous `zipSync` call server-side (see "Archive uploaded, never generated" above) — there is no incremental signal to report a real percentage from |
