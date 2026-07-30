# Photolib

A private photography delivery application. Clients receive a password-protected gallery where they can view and download delivered photographs.

---

## Stack

- **Next.js 16** (App Router, React 19)
- **TypeScript 5**
- **Tailwind CSS 4**
- **SQLite** via `better-sqlite3`
- **Iron Session** for cookie-based auth
- **Sharp** for server-side thumbnail generation
- **fflate** for ZIP creation and extraction

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

| Variable              | Description                              |
|-----------------------|------------------------------------------|
| `ADMIN_USERNAME`      | Admin login username                     |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of the admin password        |
| `SESSION_SECRET`      | 32+ random characters for session signing|
| `UPLOAD_DIR`          | Path to store uploaded files (default: `./uploads`) |

Generate a password hash:

```bash
node -e "require('bcryptjs').hash('yourpassword', 12).then(console.log)"
```

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Run in development

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
npm start
```

---

## Usage

### Admin

Visit `/login` to sign in with your admin credentials.

From the **Projects** dashboard you can:
- Create a new project (title, event date, gallery password, expiration, download toggles)
- Upload JPEG photos or a ZIP archive
- View visit count, download count, and last access per project
- Edit project settings or delete the project

Each project has a unique URL at `/g/[project-id]` to share with clients.

### Client gallery

Clients visit the gallery URL and enter the password you set.

- **Normal mode** — tap any photo to open the full-screen viewer
- **Selection mode** — tap "Select" to enter; tap photos to select them; download selected as ZIP
- **Lightbox (mobile)** — swipe left/right to navigate, swipe down to close, swipe up for actions
- **Lightbox (desktop)** — arrow keys navigate; `F` toggles fullscreen; `Escape` closes
- Download the full ZIP archive if enabled

### Keyboard shortcuts

**Gallery**

| Key      | Action               |
|----------|----------------------|
| `S`      | Toggle selection mode |
| `Escape` | Cancel selection     |
| `D`      | Download selected    |
| `Z`      | Download ZIP         |

**Lightbox**

| Key       | Action           |
|-----------|------------------|
| `←` / `→` | Previous / Next  |
| `Escape`  | Close            |
| `F`       | Toggle fullscreen|
| `D`       | Download image   |
| `Home`    | First image      |
| `End`     | Last image       |

---

## File structure

```
uploads/
  [project-id]/
    photos/      original JPEGs
    thumbs/      generated thumbnails (sm: 400px, lg: 1200px)
    archive/     (reserved)
photolib.db      SQLite database
```

Both `uploads/` and `photolib.db` are gitignored and must be backed up separately in production.

---

## Architecture

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full technical breakdown including the database schema, API routes, component hierarchy, and state model.

For the build plan and development phases, see [`PLAN.md`](./PLAN.md).

---

## AI agent guidance

See [`AGENTS.md`](./AGENTS.md) for project philosophy, feature scope, and coding conventions that all contributors (human and AI) must follow.

---

## Accessibility

Photolib targets WCAG 2.1 AA. It is fully keyboard-navigable and respects `prefers-reduced-motion`. All animations are CSS-only and degrade gracefully to 0ms when motion is reduced.
