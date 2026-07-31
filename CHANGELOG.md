# Changelog

All notable changes to Photolib are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). While the major version is
`0`, breaking changes may land in any minor release.

---

## [Unreleased]

### Changed

- Renamed the "Save to Photos" download option to "Share photos" — it opens the OS share sheet,
  which offers saving among several other actions, rather than saving directly
- Lightbox photo download now offers the same "Download as ZIP" / "Share photos" choice as the
  gallery's selection download, instead of saving the single image directly with no options
- Individual photo download and sharing now send a compressed ~2048px version of the photo
  instead of the full-resolution original, so mobile sharing of multi-megabyte photos doesn't
  stall or fail. Downloading a project's ZIP archive or a selection as a ZIP still delivers
  full-resolution originals, unchanged. **Action required:** run
  `node scripts/backfill-share-thumbs.mjs` once after upgrading so already-uploaded photos get
  this new variant

### Fixed

- An extra native "save this file?" browser prompt appearing after choosing a download option or
  downloading a single photo from the lightbox, caused by a redundant direct download alongside
  the intended one
- Downloading a photo or ZIP on desktop sometimes doing nothing even though the file had already
  been fetched, because the browser download was never reliably triggered
- Sharing a single photo from the lightbox on mobile intermittently failing with "Could not share
  the photos," especially on slower connections, because fetching the photo before opening the
  share sheet could run out the window browsers allow after a tap before requiring a fresh one
- Sharing large (multi-megabyte) photos from the lightbox on mobile still failing even after the
  above fix, because the true original was still being fetched over the network before sharing

## [1.2.0] - 2026-07-31

### Fixed

- Compatibility with older GitHub CLI versions in `update-from-github.sh` (fixes `--status` flag error)
- Lightbox fullscreen button doing nothing on iOS Safari, which has no Fullscreen API for
  non-video elements — falls back to a CSS-only simulated fullscreen mode
- Mobile lightbox gestures (tap-to-toggle-controls, swipe up/down) breaking when a second
  finger touched the screen mid-gesture, since only one pointer's position was ever tracked

### Added

- Pinch-to-zoom and double-tap-to-zoom for photos in the lightbox on mobile; panning with one
  finger while zoomed in
- Choice of "Download as ZIP" or "Save to Photos" when downloading selected photos — the latter
  uses the Web Share API to save images directly into the phone's photo gallery, where supported
- Upload progress percentage in the admin photo uploader
- A "Preparing your download…" indicator while a selection ZIP is being built
- GitHub Actions workflow for automated production builds and packaging
- `scripts/sync-server.sh` for pushing builds from local to remote
- `scripts/update-from-github.sh` for pulling latest artifacts directly on production
- Production-only deployment model (no Git clone required on server)
- `curl` command for easy script retrieval in `DEPLOYMENT.md`
- systemd service configuration instructions in `DEPLOYMENT.md`

### Changed

- Gallery `D` keyboard shortcut now opens the download options dialog instead of immediately
  downloading a ZIP

---

## [1.1.1] — 2026-07-30

**Breaking Changes:** This release changes the database from PostgreSQL to MySQL and removes Docker deployment.

### Changed

**Database**
- Switched from PostgreSQL to MySQL/MariaDB for simpler deployment
- Removed `@prisma/adapter-pg` dependency
- Updated Prisma schema to use MySQL provider
- Simplified `lib/prisma.ts` to use standard Prisma client

**Deployment**
- Removed Docker and Docker Compose configurations
- Removed Docker deployment scripts (`docker-deploy.sh`, `docker-update.sh`)
- Created standard deployment scripts for production servers
- New WordPress-style configuration (create MySQL DB in hosting panel, configure `.env`, deploy)

**Documentation**
- Completely rewrote `DEPLOYMENT.md` for MySQL + standard deployment
- Updated `README.md` with MySQL installation and configuration
- Removed `README-DOCKER.md`
- Updated `.env.example` with MySQL connection format

### Added

**Deployment Scripts**
- `scripts/build-production.sh` - Build for production deployment
- `scripts/deploy-server.sh` - Deploy to server (like WordPress)
- `scripts/update-production.sh` - Update production server

### Removed

- All Docker-related files and configurations
- PostgreSQL-specific dependencies
- Docker deployment documentation

### Migration Guide

If you're upgrading from 0.1.1 (PostgreSQL + Docker):

1. Export your data: `docker compose exec db pg_dump -U photolib photolib > backup.sql`
2. Remove Docker: See "Removing Docker" section in `DEPLOYMENT.md`
3. Create MySQL database in your hosting panel
4. Pull latest code: `git pull`
5. Run `npm install` to update dependencies
6. Configure `.env` with MySQL connection
7. Import data manually or start fresh with `/setup`

---

## [0.1.1] — 2026-07-30

### Added

**Deployment**

- Docker support with multi-stage Dockerfile for optimized production builds
- Docker Compose configuration with PostgreSQL 16 and automatic health checks
- Automated deployment scripts: `docker-deploy.sh` for initial setup, `docker-update.sh` for updates
- Build scripts for traditional deployments: `build-for-deploy.sh` and `update-server.sh`
- Health check endpoint at `/api/health` for container monitoring
- Comprehensive deployment documentation covering Docker, standard VPS, and local build options
- RunCloud-specific integration guide with reverse proxy configuration
- Docker-specific quick reference guide (`README-DOCKER.md`)

**Configuration**

- `.env.docker` template for Docker deployments
- `.dockerignore` for optimized Docker image builds

### Changed

- Documentation now clarifies production access via domain (not port) for reverse proxy setups
- Updated all deployment docs to support multiple deployment strategies

---

## [0.1.0] — 2026-07-30

First beta. A complete, self-hosted photography delivery application.

### Added

**Galleries**

- Client galleries at `/g/[project-id]`, gated by a shared password or by email address
- Responsive masonry grid in a centred container, mobile first
- Full-screen lightbox with keyboard, pointer, and swipe navigation
- Selection mode: pick photos and download them as a ZIP generated on demand
- Per-project expiry date, after which the gallery closes itself
- Visit count, download count, and last-access tracking

**Admin**

- Project CRUD with title, event date, access type, expiry, and download toggles
- Drag-and-drop upload of JPEG photos, or a ZIP that is unpacked into photos
- Duplicate filenames prompt for **Keep both** or **Replace existing** rather than resolving
  silently
- Separate upload slot for the client-facing ZIP archive
- Gallery passwords are viewable and copyable from the project page
- Thumbnails generated once at upload, at 400px and 1200px

**Accounts**

- First-run setup at `/setup` creates the initial administrator
- Three roles: **Admin** (everything), **User** (assigned projects only), **Guest** (read-only,
  identified by email, no password)
- Per-project assignment of users and guests
- The last remaining administrator cannot be deleted or demoted

**Platform**

- Released under the GNU General Public License v3.0 or later
- Next.js 16 App Router on React 19, TypeScript, Tailwind CSS 4
- PostgreSQL via Prisma 7 with the `@prisma/adapter-pg` driver adapter
- Iron Session cookie auth; bcrypt for account passwords
- Single `.env` configuration file, in the spirit of `wp-config.php`
- WCAG 2.1 AA target: full keyboard navigation, focus management, and
  `prefers-reduced-motion` support throughout

### Security

- Photos are stored on disk under generated UUIDs; no client-supplied name ever reaches the
  filesystem, and the uploaded name is reattached on download
- Gallery passwords are encrypted with AES-256-GCM keyed off `SESSION_SECRET`, so a database dump
  alone does not reveal them. Account passwords remain hashed and unreadable
- Uploads are validated by magic bytes rather than by declared MIME type
- Path traversal is rejected before any file read
- Rate limiting on gallery password attempts
- `/api/uploads` serves thumbnails only; originals and archives go through routes that verify
  access and record the download

### Notes

- The full gallery ZIP is uploaded by the photographer, never generated. Without an uploaded
  archive there is no **Download ZIP** button — only a client's own selection is zipped on demand.
- Changing `SESSION_SECRET` invalidates sessions and makes existing gallery passwords unreadable;
  they must be set again.
