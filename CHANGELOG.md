# Changelog

All notable changes to the GuideHub project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added
- **Error Boundary** — React Error Boundary wraps the entire app, preventing white screens on runtime errors (`components/ErrorBoundary.tsx`)
- **404 Not Found page** — Catch-all route `*` renders a friendly 404 page with navigation (`pages/NotFoundPage.tsx`)
- **Zod validation on all server endpoints** — Auth, guides, payments, AI, and upload endpoints now validate input with Zod schemas (`server/src/validation.ts`)
- **Rate limiting on auth endpoints** — 20 requests per 15-minute window on `/auth/*` to prevent brute-force attacks
- **File upload limits** — 5MB max file size, image MIME type whitelist in upload endpoint
- **Graceful shutdown** — Server handles SIGTERM/SIGINT, disconnects Prisma cleanly before exit
- **Pagination on GET /guides** — `?page` and `?limit` query params, returns `{ guides, pagination }`
- **Purchase unique constraint** — `@@unique([userId, guideId])` prevents duplicate purchases
- **Auth init fix** — Moved `fetchMe()` from module-level fire-and-forget to `useEffect` in `AppLayout`, eliminating race condition

### Changed
- **Vite proxy for API** — Added `/api` proxy in `vite.config.ts` with path rewrite to strip prefix, fixing CORS issues in local dev
- **API_URL default** — Changed from `http://localhost:3001` to `/api` (same-origin, proxied)
- **Structured logging** — Replaced `console.log/error` with `pino` + `pino-http` for JSON logs in production, pretty-printed in dev

### Fixed
- **CORS / "Failed to fetch"** — Vite proxy now forwards `/api/*` to backend, eliminating cross-origin issues
- **Auth race condition** — `initialized` flag no longer causes eternal loading spinner
- **Publish error layout** — Error message moved outside flex button row in CreateGuidePage
- **AI failure silent advance** — CreateGuidePage now shows error and sets defaults when AI generation fails
- **Title validation** — CreateGuidePage validates title before publish
- **Section wipe on update** — `updateGuide` no longer replaces sections with empty array
- **IDOR vulnerability** — Section PATCH/DELETE now verify ownership through parent guide
- **Form error overwrite** — RegisterPage preserves field errors when adding form-level error
- **signOut loading state** — `signOut` now resets `loading` flag
- **JWT secret fallback** — Server throws on startup if `JWT_SECRET` is missing in production
- **Cyrillic slugify** — Unicode-aware regex preserves non-ASCII characters in slugs
- **is_self_employed type** — Now always boolean (was `undefined` cast as boolean)
- **Fetch timeout** — API requests have 30s timeout with user-friendly error messages

---

## [0.6.0] — Editor & AI

### Added
- Notion-like slash commands (`/`) with keyboard navigation (↑↓ Enter Esc)
- Bubble menu on text selection (B/I/U/S, link, lock, AI improve)
- Block insert handle (`+` button) with 10 block types
- Callout blocks (info/warning/success/danger)
- Image with caption extension (editable caption in editor)
- Drag & drop image upload into editor canvas
- AI content generation endpoint (`POST /ai/generate-content`)
- AI improve/shorten/expand/rewrite on selected text
- Paid block extension (block-level paywall)
- Block-level paywall with server-side redaction

### Changed
- Content model v2: `{ version: 2, format: 'tiptap', html, doc }`
- Public page renders rich HTML instead of `JSON.stringify`
- Editor autosave with debounce and change detection

---

## [0.5.0] — Mobile & Docker

### Added
- Mobile-responsive editor (sidebar/right panel as drawers, scrollable toolbar)
- Mobile-responsive public page (adaptive hero, content, buy button)
- Docker Compose for local dev (postgres + server + frontend)
- Production Docker Compose with nginx reverse proxy
- GitHub Actions CI/CD pipeline (ci.yml + deploy.yml)
- Database backup script with rotation (`scripts/backup-db.sh`)

### Changed
- `.env` cleaned up (removed stale Supabase variables)

---

## [0.4.0] — Profiles & Discoverability

### Added
- Author profile page (`/author/:username`)
- Guide catalog with search, sort, pagination (`/catalog`)
- "Catalog" link in navigation
- Author name links to profile on public guide pages

---

## [0.3.0] — Public Page Rendering

### Added
- ~200 lines of CSS for rich content rendering (`.gh-public-content`)
- Styled callout, quote, code, task list, image+caption, paid/locked blocks
- Locked section placeholders with "Buy to unlock" CTA

---

## [0.2.0] — Media Blocks

### Added
- Image with caption Tiptap extension
- Drag & drop images into editor canvas
- Video embed styles (16:9 aspect ratio, YouTube play button)

---

## [0.1.0] — Initial Release

### Added
- Supabase → PostgreSQL + Prisma + JWT migration
- Auth (register/login/logout/profile)
- Guide CRUD with sections
- Tiptap rich text editor
- Public guide pages
- YooKassa payment integration (with mock fallback)
- Analytics tracking
- AI text structuring (multi-provider fallback)