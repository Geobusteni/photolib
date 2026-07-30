<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Photolib – AI Agent Instructions

Read `ARCHITECTURE.md` next. It describes the full technical structure.

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

---

## Feature Scope

Do not add anything outside this scope unless explicitly requested.

### Admin Features

- Login
- Create / Edit / Delete project
- Upload JPEG images
- Upload ZIP archive
- Set: project title, optional event date, password, expiration
- Toggle: ZIP download, image downloads
- View: download count, gallery visit count, last access

### Client Features

- Password-protected gallery
- Responsive masonry/grid layout
- Lightbox
- Individual image download
- Multiple image selection
- Download selected images as ZIP
- Download full ZIP archive

---

## UI Behaviour

### Gallery — Normal Mode

- Tap/click an image opens the lightbox
- No checkboxes, no selection indicators
- Top bar: **Select** | **Download ZIP**

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
| Z             | Download ZIP                 |

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

## Code Philosophy

- Readable over clever
- Explicit logic over abstraction
- Composition over inheritance
- Maintainability over brevity
- Do not add comments that narrate what the code does — only explain non-obvious intent or constraints
