<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Photolib – AI Agent Instructions

Read these files in order before writing any code:

1. `ARCHITECTURE.md` — technical structure, stack, schema, and conventions
2. `PLAN.md` — phased build plan; start at the first incomplete phase

---

## What This Project Is

Photolib is a **private photography delivery application** for a single photographer's business.

It is not a SaaS product. It is not a proofing tool. It is not an image management system.

Its sole purpose: give clients a beautiful, reliable way to view and download delivered photographs.

---

## Non-Negotiable Principles

These take priority over everything else, including new features.

### 1. Simplicity First

Every feature must justify its existence. If a simpler solution satisfies the same requirement, always choose it. Avoid unnecessary abstractions, configuration, and complexity.

### 2. Photography Comes First

Photographs are always the primary content. The interface must recede into the background. Avoid visual clutter, unnecessary UI elements, and distracting animations.

### 3. Mobile First

Design order: mobile → tablet → desktop. Never build desktop-first and adapt later.

### 4. Accessibility First

Target: **WCAG 2.1 AA**. Accessibility is not a future enhancement — it is part of the definition of Done. Every feature must be accessible before considering visual polish.

### 5. Reduced Motion First

`prefers-reduced-motion: reduce` is the baseline. Animations are optional enhancements. The app must work perfectly without any animations.

### 6. Functionality Before Motion

No animation should be required for the app to feel correct. All animations must have `0ms` duration as a safe fallback. Animations must never contain business logic.

### 7. Browser APIs First

Prefer built-in browser capabilities: Pointer Events, Fullscreen API, Keyboard Events, CSS Transitions, CSS Grid/Flexbox, Intersection Observer, native lazy loading.

### 8. Minimal Dependencies

Every dependency requires clear justification. Do not install libraries "just in case."

**Good reasons:** authentication, database ORM, image processing.
**Poor reasons:** simple animations, gesture detection, small utilities already in modern JS.

Framer Motion: only if a UX requirement cannot reasonably be achieved with CSS.

### 9. Database Access Goes Through the ORM

All database access uses Prisma. Never write raw SQL in application code, and never reach for
a second data layer. The ORM exists so the schema can grow without rewrites — respect that by
adding models and relations rather than denormalising into JSON blobs.

Data access is centralised in `lib/`: `lib/projects.ts`, `lib/users.ts`, `lib/prisma.ts`.
Route handlers and pages call those functions; they do not call `prisma` directly unless the
query is a one-off ownership check.

---

## Configuration

There is **exactly one** configuration file: `.env` in the project root, modelled on
WordPress's `wp-config.php`. It holds the database connection, session secret, and storage
path.

Rules:

- Never create `.env.local`, `.env.production`, `.env.development`, or any other env variant.
- `.env` is gitignored. `.env.example` is committed as the documentation template.
- Values containing `$` (bcrypt hashes, some passwords) **must** use single quotes, otherwise
  the loader interpolates them as variable references and silently truncates the value.

---

## Roles and Permissions

Three roles, defined in the `Role` enum:

| Role    | Credentials required   | Permissions                                             |
|---------|------------------------|---------------------------------------------------------|
| `ADMIN` | email, username, password | Full access to everything                             |
| `USER`  | email, username, password | Only the projects they are assigned to; nothing else  |
| `GUEST` | email only — no login  | Read-only, only on projects they are assigned to or land on |

Optional extra fields for any role: name (and further profile detail if a real need appears).

Key rules:

- Guests never authenticate with a password. They are recognised by email at the gallery gate.
- Guests and users must be explicitly assigned to a project via `ProjectAssignment`.
- The last remaining admin can never be deleted or demoted.
- There is no self-service registration. Admins create all accounts.

### First run

When the database contains no admin, every route redirects to `/setup`, which creates the
first administrator. `/api/setup` refuses to run once an admin exists.

---

## Project Access Types

A project is either password-based or email-based. Both are **read-only for all viewers today**.

| Access type | Gate                    | Notes                                                     |
|-------------|-------------------------|-----------------------------------------------------------|
| `PASSWORD`  | One shared password     | Default. Use when you do not have viewers' email addresses |
| `EMAIL`     | Viewer enters their email | Only assigned guests/users are admitted                  |

Email-based access exists so that future work (client culling, notes) can attribute actions to
a person. Do not build those features until asked — but do not design anything that would make
them impossible either.

**Gallery passwords are encrypted, not hashed** (`lib/crypto.ts`, AES-256-GCM keyed off
`SESSION_SECRET`), because the photographer has to read them back to send them to a client. Do not
"fix" this to bcrypt. Account passwords are the ones that stay hashed.

---

## Files and Downloads

Two names per photo, not interchangeable:

| Field          | Value                | Used for                         |
|----------------|----------------------|----------------------------------|
| `filename`     | generated UUID       | the path on disk, nothing else   |
| `originalName` | the name as uploaded | downloads, ZIP entries, admin UI |

Never write a client-supplied name to disk, and never show a UUID to a client. Downloads set
`Content-Disposition` from `originalName`.

Uploading a photo whose `originalName` already exists returns **409** with the conflicting names.
The admin re-sends with `strategy` set to `rename` or `overwrite`. Never resolve a conflict
silently.

**The client-facing ZIP is uploaded, never generated.** `Project.archiveName` is null until an
admin uploads one, and the gallery shows "Download ZIP" only when it is set. The only ZIP Photolib
creates is a client's own selection.

---

## Feature Scope

Do not add anything outside this scope unless explicitly requested.

### Admin Features

- Login (username or email + password)
- First-run admin creation
- Create / Edit / Delete users (admin, user, guest)
- Assign users and guests to projects
- Create / Edit / Delete project
- Upload JPEG images, or a ZIP that is unpacked into photos
- Resolve duplicate filenames on upload (keep both / replace)
- Upload, replace, or remove the client-facing ZIP archive
- Set: project title, optional event date, access type, password, expiration
- View and copy the gallery password
- Toggle: ZIP download, image downloads
- View: download count, gallery visit count, last access

### Client Features

- Password-protected or email-gated gallery
- Responsive masonry/grid layout
- Lightbox
- Individual image download, under the original filename
- Multiple image selection
- Download selected images as ZIP
- Download the archive the photographer uploaded, when there is one

---

## UI Behaviour

### Gallery — Normal Mode

- The grid sits in a centred container roughly 80% of the viewport width, with space above and
  below. It is never flush to the edges.
- Tap/click an image opens the lightbox
- No checkboxes, no selection indicators
- Top bar: **Select** | **Download ZIP** (the latter only when an archive was uploaded)

### Gallery — Selection Mode

- Images become selectable; lightbox is disabled
- Top bar: **Cancel** | **Download Selected**
- Download ZIP disappears
- Cancel exits selection mode

### Mobile Lightbox Gestures

| Gesture    | Action              |
|------------|---------------------|
| Swipe left | Next image          |
| Swipe right| Previous image      |
| Swipe down | Close viewer        |
| Swipe up   | Reveal action panel |
| Tap        | Toggle controls     |

### Desktop Lightbox Controls

Always visible: Previous, Next, Download, Fullscreen, Close.

Fullscreen mode: controls auto-hide after ~3 s of inactivity; mouse movement reveals them.

Two rules the lightbox must keep:

- Opening it focuses the dialog element itself, never a control styled to appear on focus.
- Closing it leaves browser fullscreen. Escape exits fullscreen first and closes on a second
  press; unmounting exits fullscreen unconditionally.

### Keyboard Shortcuts

**Gallery**

| Key           | Action                       |
|---------------|------------------------------|
| Tab           | Move focus                   |
| Shift+Tab     | Previous focus               |
| Enter         | Open image                   |
| Space         | Select image (Selection Mode)|
| S             | Toggle Selection Mode        |
| Escape        | Cancel Selection Mode        |
| D             | Download selected            |
| Z             | Download the archive, if one exists |

**Lightbox**

| Key        | Action           |
|------------|------------------|
| ←          | Previous         |
| →          | Next             |
| Escape     | Close            |
| F          | Toggle Fullscreen|
| Space      | Play/Pause slideshow|
| D          | Download image   |
| Home       | First image      |
| End        | Last image       |

---

## Accessibility Requirements

- Touch targets ≥ 44 × 44 px
- Every icon button must have an accessible label (e.g. "Download image", "Previous image")
- All controls must satisfy WCAG 2.1 AA contrast ratios
- Use overlays where transparency over bright photos is insufficient
- Focus management:
  - Opening lightbox → move focus inside viewer
  - Closing lightbox → return focus to the image that opened it
  - Never lose keyboard position; never trap focus

---

## Component Design Guidance

Keep components small and focused. Examples:

`PhotoViewer`, `Toolbar`, `Gallery`, `ImageTile`, `SelectionManager`, `KeyboardManager`, `GestureHandler`

Avoid giant multi-responsibility components.

---

## State Model

Model with explicit states rather than many boolean flags.

States: `Gallery`, `Selection`, `Viewer`, `ViewerFullscreen`

The current state determines available actions.

---

## Performance

- Generate thumbnails once at upload time — never resize originals per-request
- Use responsive image sizes
- Lazy-load gallery images
- Avoid unnecessary re-renders

---

## Testing Checklist (per feature)

- [ ] Mobile
- [ ] Tablet
- [ ] Desktop
- [ ] Keyboard-only
- [ ] Screen reader
- [ ] `prefers-reduced-motion`
- [ ] WCAG 2.1 AA

Accessibility failures are bugs.

---

## Documentation Maintenance

**Every time the project changes**, check `README.md` and update it if any of the following are
affected:

- Installation steps (database setup, new env vars, new commands)
- Configuration (`.env` keys)
- Roles or permissions
- Project access types
- Usage instructions (new features, changed UI flows)
- Keyboard shortcuts
- File structure
- Stack (new or removed dependencies)

The README is the first thing a new person reads. Keep it accurate.

Also keep these in sync when the relevant thing changes:

| File              | Update when                                                      |
|-------------------|------------------------------------------------------------------|
| `README.md`       | Anything a user or operator would need to know                    |
| `ARCHITECTURE.md` | Schema, routes, auth flow, component structure, or a real decision|
| `CHANGELOG.md`    | Any user-visible change, in `[Unreleased]`                        |
| `PLAN.md`         | A phase is completed, or scope changes                            |
| `AGENTS.md`       | A rule or convention changes                                      |

When you make a non-obvious decision, add a row to the decisions log in `ARCHITECTURE.md`
explaining why — including the ones that came from a bug, so nobody reverts the fix.

---

## Licensing

Photolib is **GPL-3.0-or-later**. The full text is in `LICENSE` and must not be edited.

Every authored source file starts with:

```ts
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita
```

Add it to new files. `node scripts/add-license-headers.mjs` is idempotent and fills in anything
missed; generated code under `lib/generated/` is excluded and must stay that way.

New dependencies must carry a GPL-compatible license. Permissive licenses (MIT, BSD, Apache-2.0,
ISC) are fine. Anything copyleft-incompatible or proprietary is not.

---

## Versioning

Semantic versioning, with `package.json` as the single source of truth. Current release: `0.1.0`.

While the major version is `0`, breaking changes may land in a minor release.

Record every user-visible change under `## [Unreleased]` in `CHANGELOG.md` as you make it — do not
reconstruct it later from the git log. On release, rename that heading to the version and date,
bump `package.json`, and open a fresh `[Unreleased]`.

Use the Keep a Changelog groups: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
Write entries for the person operating the app, not for the person who wrote the diff. Internal
refactors with no visible effect do not belong there; a decisions-log row in `ARCHITECTURE.md`
does.

Anything that requires action after upgrading — a migration to run, a config change, a value that
must be re-entered — must say so explicitly.

---

## Code Philosophy

- Readable over clever
- Explicit logic over abstraction
- Composition over inheritance
- Maintainability over brevity
- Do not add comments that narrate what the code does — only explain non-obvious intent or constraints
