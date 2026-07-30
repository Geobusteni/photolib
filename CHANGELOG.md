# Changelog

All notable changes to Photolib are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). While the major version is
`0`, breaking changes may land in any minor release.

---

## [Unreleased]

Nothing yet.

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
