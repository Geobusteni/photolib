# Photolib

A private photography delivery application. Clients receive a gallery — gated by a shared
password or by their email address — where they can view and download delivered photographs.

---

## Stack

- **Next.js 16** (App Router, React 19)
- **TypeScript 5**
- **Tailwind CSS 4**
- **PostgreSQL** with **Prisma 7**
- **Iron Session** for cookie-based auth
- **Sharp** for thumbnail generation
- **fflate** for ZIP creation and extraction

---

## Installation

### 1. Prerequisites

- Node.js 20 or newer
- A PostgreSQL 14+ server

### 2. Install PostgreSQL

Pick whichever suits your machine.

**macOS (Homebrew)**

```bash
brew install postgresql@16
brew services start postgresql@16
```

**Docker**

```bash
docker run --name photolib-db \
  -e POSTGRES_USER=photolib \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=photolib \
  -p 5432:5432 \
  -d postgres:16
```

**Ubuntu / Debian**

```bash
sudo apt install postgresql
sudo systemctl start postgresql
```

### 3. Create the database

Skip this if you used the Docker command above, which creates it for you.

```bash
createdb photolib
createuser photolib --pwprompt
psql -c "GRANT ALL PRIVILEGES ON DATABASE photolib TO photolib;"
```

### 4. Install dependencies

```bash
npm install
```

### 5. Configure

Photolib uses **one** configuration file: `.env` in the project root, in the spirit of
WordPress's `wp-config.php`. Copy the template and fill it in:

```bash
cp .env.example .env
```

| Variable         | Description                                                       |
|------------------|-------------------------------------------------------------------|
| `DATABASE_URL`   | PostgreSQL connection string                                      |
| `SESSION_SECRET` | 32+ random characters used to sign session cookies                |
| `UPLOAD_DIR`     | Where photos are stored. Use an absolute path in production        |

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

A finished `.env` looks like this:

```
DATABASE_URL='postgresql://photolib:yourpassword@localhost:5432/photolib'
SESSION_SECRET='3f9a...c21e'
UPLOAD_DIR=./uploads
```

> **Use single quotes.** Values containing `$` — bcrypt hashes, some database passwords — are
> otherwise read as variable references and silently truncated.

### 6. Create the database tables

```bash
npx prisma migrate dev --name init
```

For subsequent deployments, apply existing migrations instead:

```bash
npx prisma migrate deploy
```

### 7. Run

```bash
npm run dev          # development
npm run build && npm start   # production
```

### 8. Create your administrator account

Open <http://localhost:3000>. Because the database has no admin yet, you will be sent to
`/setup` to create the first one. That page stops working the moment an admin exists.

---

## Roles

| Role      | Signs in with           | Can do                                                     |
|-----------|-------------------------|-------------------------------------------------------------|
| **Admin** | Username or email + password | Everything: projects, uploads, users, assignments      |
| **User**  | Username or email + password | Only the projects they are assigned to                 |
| **Guest** | Nothing — email only    | View assigned email-based galleries, read only              |

Admins create every account from **Users** in the top navigation. Guests need only an email
address; admins and users also need a username and a password of at least 8 characters. Any
account may optionally carry a name.

The last remaining administrator cannot be deleted or demoted.

---

## Project access types

Each project is gated one of two ways, chosen when you create it and changeable later.

| Type               | How viewers get in                    | Use when                                       |
|--------------------|----------------------------------------|------------------------------------------------|
| **Password**       | One shared password you give out       | You do not have everyone's email address       |
| **Email based**    | Viewer types their own email address   | You know exactly who should see the gallery    |

For email-based projects, add the guests under **People** on the project page. Only assigned
email addresses are admitted.

Both types are currently **read only** for viewers. Email-based access exists so that per-person
features such as client culling and notes can be added later.

---

## Usage

### Admin

Sign in at `/login`. From **Projects** you can:

- Create a project (title, event date, access type, password, expiration, download toggles)
- Upload JPEG photos or a ZIP archive by dragging them onto the upload area
- Assign users and guests under **People**
- Watch visit count, download count, and last access
- Delete the project and all its files

Share the gallery URL shown on the project page: `/g/[project-id]`.

### Client gallery

- **Normal mode** — tap any photo to open the full-screen viewer
- **Selection mode** — tap "Select", choose photos, download them as a ZIP
- **Lightbox on mobile** — swipe left/right to move, down to close, up for actions
- **Lightbox on desktop** — arrow keys move, `F` toggles fullscreen, `Escape` closes

### Keyboard shortcuts

**Gallery**

| Key      | Action                |
|----------|-----------------------|
| `S`      | Toggle selection mode |
| `Escape` | Cancel selection      |
| `D`      | Download selected     |
| `Z`      | Download ZIP          |

**Lightbox**

| Key       | Action            |
|-----------|-------------------|
| `←` / `→` | Previous / Next   |
| `Escape`  | Close             |
| `F`       | Toggle fullscreen |
| `D`       | Download image    |
| `Home`    | First image       |
| `End`     | Last image        |

---

## File storage

```
uploads/
  [project-id]/
    photos/    originals
    thumbs/    generated thumbnails (400px and 1200px wide)
    archive/   reserved
```

Both `uploads/` and `.env` are gitignored. Back up `uploads/` and your PostgreSQL database
separately in production — deleting a project deletes its files irreversibly.

---

## Common tasks

```bash
npx prisma studio          # browse the database in a GUI
npx prisma migrate dev     # create and apply a migration after editing the schema
npx prisma generate        # regenerate the client after schema changes
npm run lint               # lint
```

---

## Further reading

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — data model, auth flow, API surface, component design
- [`PLAN.md`](./PLAN.md) — phased build plan and progress
- [`AGENTS.md`](./AGENTS.md) — philosophy, roles, and conventions for contributors

---

## Accessibility

Photolib targets WCAG 2.1 AA. It is fully keyboard-navigable and respects
`prefers-reduced-motion`; all animation is CSS-only and collapses to zero duration when motion
is reduced.
