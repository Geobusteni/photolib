# Photolib

**Version 0.1.1** — See [`CHANGELOG.md`](./CHANGELOG.md) for details.

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

Placeholders below are written as `<db-user>`, `<db-name>`, and `<db-password>`. Substitute your
own values throughout.

### 1. Prerequisites

- Node.js 20 or newer
- A PostgreSQL 14+ server

### 2. Install PostgreSQL

**macOS (Homebrew)**

```bash
brew install postgresql@16
brew services start postgresql@16
```

**Docker** — creates the role and database for you, so step 3 can be skipped:

```bash
docker run --name photolib-db \
  -e POSTGRES_USER=<db-user> \
  -e POSTGRES_PASSWORD=<db-password> \
  -e POSTGRES_DB=<db-name> \
  -p 5432:5432 \
  -d postgres:16
```

**Ubuntu / Debian**

```bash
sudo apt install postgresql
sudo systemctl start postgresql
```

### 3. Create the database and its role

Create the role first, then the database **owned by** it:

```bash
createuser <db-user> --pwprompt
createdb -O <db-user> <db-name>
```

Ownership matters. On PostgreSQL 15+, `GRANT ALL PRIVILEGES ON DATABASE` does not cover the
`public` schema, so Prisma still cannot create tables. To repair a database created without `-O`:

```bash
psql -d postgres -c "ALTER DATABASE <db-name> OWNER TO <db-user>;"
psql -d <db-name> -c "ALTER SCHEMA public OWNER TO <db-user>;"
```

### 4. Install dependencies

```bash
npm install
```

### 5. Configure

Photolib uses **one** configuration file: `.env` in the project root, in the spirit of
WordPress's `wp-config.php`.

```bash
cp .env.example .env
```

| Variable         | Description                                                 |
|------------------|-------------------------------------------------------------|
| `DATABASE_URL`   | PostgreSQL connection string                                 |
| `SESSION_SECRET` | 32+ random characters; signs cookies and encrypts gallery passwords |
| `UPLOAD_DIR`     | Where photos are stored. Use an absolute path in production  |

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

A finished `.env`:

```
DATABASE_URL='postgresql://<db-user>:<db-password>@localhost:5432/<db-name>'
SESSION_SECRET='<64-hex-characters>'
UPLOAD_DIR=./uploads
```

> **Use single quotes.** Values containing `$` are otherwise read as variable references and
> silently truncated.

### 6. Create the database tables

```bash
npx prisma migrate dev --name init   # development
npx prisma migrate deploy            # deployments
```

### 7. Run

```bash
npm run dev                  # development
npm run build && npm start   # production
```

### 8. Create your administrator account

Open <http://localhost:3000>. With no admin in the database you are sent to `/setup` to create the
first one. That page stops working once an admin exists.

---

## DATABASE_URL

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

| Variation            | Example                                                              |
|----------------------|----------------------------------------------------------------------|
| Standard             | `postgresql://<db-user>:<db-password>@localhost:5432/<db-name>`       |
| Passwordless superuser | `postgresql://<os-user>@localhost:5432/<db-name>`                   |
| Unix socket          | `postgresql://<db-user>:<db-password>@localhost/<db-name>?host=/tmp`  |
| Hosted provider      | `postgresql://<db-user>:<db-password>@<host>:5432/<db-name>?sslmode=require` |

Passwords sit inside a URL, so `@ / : # ?` must be percent-encoded:

```bash
node -e "console.log(encodeURIComponent('<db-password>'))"
```

Verify the string before running migrations:

```bash
psql "postgresql://<db-user>:<db-password>@localhost:5432/<db-name>" -c "SELECT 1;"
```

| Message                               | Cause                                              |
|---------------------------------------|----------------------------------------------------|
| `database "<os-user>" does not exist` | No database given; add `-d postgres` or a full URL |
| `role "<db-user>" does not exist`     | Run `createuser`                                   |
| `password authentication failed`      | Wrong password, or it needs percent-encoding       |
| `Connection refused`                  | Server not running, or the wrong port              |
| `permission denied for schema public` | The role does not own the database — see step 3    |

To inspect a server: `psql -d postgres -l` lists databases and owners, `psql -d postgres -c "\du"`
lists roles, and `psql -d postgres -c "SHOW port;"` reports the port.

---

## Roles

| Role      | Signs in with                | Can do                                            |
|-----------|------------------------------|---------------------------------------------------|
| **Admin** | Username or email + password | Everything: projects, uploads, users, assignments |
| **User**  | Username or email + password | Only the projects they are assigned to            |
| **Guest** | Nothing — email only         | View assigned email-based galleries, read only    |

Admins create every account from **Users** in the top navigation. Guests need only an email
address; admins and users also need a username and a password of at least 8 characters.

The last remaining administrator cannot be deleted or demoted.

---

## Project access types

| Type            | How viewers get in                   | Use when                                    |
|-----------------|--------------------------------------|---------------------------------------------|
| **Password**    | One shared password you give out     | You do not have everyone's email address    |
| **Email based** | Viewer types their own email address | You know exactly who should see the gallery |

For email-based projects, add the guests under **People** on the project page. Only assigned
email addresses are admitted. Both types are read only for viewers.

### Looking up a gallery password

The project page shows the password under **Gallery password**, with **Show** and **Copy** beside
it, so you can send it to a client without resetting it.

Gallery passwords are encrypted rather than hashed so they can be read back. The key comes from
`SESSION_SECRET` — changing it makes existing gallery passwords unreadable and they must be set
again. Account passwords remain hashed and cannot be read back.

---

## Usage

### Admin

Sign in at `/login`. From **Projects** you can:

- Create a project (title, event date, access type, password, expiration, download toggles)
- Upload JPEG photos, or a ZIP that Photolib unpacks into photos
- Upload the client-facing archive under **Download archive**
- Assign users and guests under **People**
- View and copy the gallery password
- Watch visit count, download count, and last access
- Delete the project and all its files

Share the gallery URL shown on the project page: `https://yourdomain.com/g/[project-id]`.

#### Filenames and duplicates

Photos keep the name you uploaded them under; the generated name used on disk is never shown to
clients.

Uploading a name that already exists in the project prompts for a choice:

- **Keep both** — saved as `beach-042 (2).jpg`
- **Replace existing** — the old photo is overwritten and keeps its name
- **Cancel** — nothing is imported

#### The Download ZIP button

Clients see **Download ZIP** only when you upload an archive under **Download archive**. Photolib
never builds a full archive itself — upload the export from your editing software instead.

Clients can always zip their own selection; that is generated on demand regardless. The **Offer
the uploaded archive for download** toggle hides the button without deleting the archive.

### Client gallery

- **Normal mode** — tap any photo to open the full-screen viewer
- **Selection mode** — tap "Select", choose photos, download them as a ZIP
- **Lightbox on mobile** — swipe left/right to move, down to close, up for actions
- **Lightbox on desktop** — arrow keys move, `F` toggles fullscreen, `Escape` closes

### Keyboard shortcuts

**Gallery**

| Key      | Action                                |
|----------|---------------------------------------|
| `S`      | Toggle selection mode                 |
| `Escape` | Cancel selection                      |
| `D`      | Download selected                     |
| `Z`      | Download the archive, when one exists |

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
    photos/    originals, under generated names
    thumbs/    generated thumbnails (400px and 1200px wide)
    archive/   the ZIP you uploaded for clients, if any
```

Uploaded filenames live in the database, not on disk, and are reattached on download. Both
`uploads/` and `.env` are gitignored — back them up separately in production, since deleting a
project deletes its files irreversibly.

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

- [`CHANGELOG.md`](./CHANGELOG.md) — release history
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — data model, auth flow, API surface, component design
- [`PLAN.md`](./PLAN.md) — phased build plan and progress
- [`AGENTS.md`](./AGENTS.md) — philosophy, roles, and conventions for contributors

---

## Accessibility

Photolib targets WCAG 2.1 AA. It is fully keyboard-navigable and respects
`prefers-reduced-motion`; all animation is CSS-only and collapses to zero duration when motion
is reduced.

---

## License

Copyright (C) 2026 Alexandru Negoita.

Photolib is free software: you can redistribute it and/or modify it under the terms of the
**GNU General Public License, version 3 or later**, as published by the Free Software Foundation.

It is distributed in the hope that it will be useful, but **without any warranty** — without even
the implied warranty of merchantability or fitness for a particular purpose. See
[`LICENSE`](./LICENSE) for the full text, or <https://www.gnu.org/licenses/gpl-3.0.html>.

If you deploy a modified version, the GPL requires you to make your changes available under the
same license to anyone you distribute it to.
