# Listodo — Project Guide

## What is this?

Listodo is a personal, mobile-friendly web app for managing todo lists stored as markdown files in the user's Google Drive. No backend — everything runs in the browser.

## Tech Stack

- **Framework**: SvelteKit (static SPA via `adapter-static`, `ssr = false`)
- **Language**: TypeScript
- **Editor**: Tiptap (WYSIWYG markdown editor with Svelte bindings)
- **Auth**: Google OAuth 2.0 (Google Identity Services, `drive.file` scope)
- **Storage**: Google Drive API v3 (files in user's "Listodo" folder)
- **Styling**: Tailwind CSS
- **Deployment**: Static hosting (Vercel or Netlify)

## Architecture

Pure client-side SPA. No backend server or database.

```
Browser (SvelteKit SPA)
  ├── Google Identity Services (OAuth login)
  ├── Google Drive API v3 (file CRUD)
  ├── Tiptap Editor (WYSIWYG markdown)
  ├── Markdown ↔ Tiptap document converter
  └── Local in-memory cache (reduces Drive API calls)
```

## Project Structure

```
src/
  lib/
    components/    # Svelte UI components
    services/      # auth.ts, drive.ts, cache.ts
    stores/        # Svelte writable stores for state
    utils/         # markdown.ts conversion, helpers
  routes/
    +layout.svelte # App shell with auth guard
    +page.svelte   # Main app page
docs/
  PRD.md                  # Product requirements
  IMPLEMENTATION_PLAN.md  # Phased build plan
```

## Key Conventions

- All data is stored as `.md` files in the user's Google Drive "Listodo" folder
- Nested folders in the app map directly to Drive folder hierarchy
- Auto-save with debounce after editing (1-2 second delay)
- Local in-memory cache to mitigate Drive API latency (~2.5s avg)
- Todo items use standard markdown checkboxes: `- [ ]` and `- [x]`
- The Tiptap editor output must always produce valid markdown
- Mobile-first responsive design with Tailwind CSS

## Commands

```bash
npm run dev       # Start dev server
npm run build     # Build static site
npm run preview   # Preview production build
```

## Documentation

- [docs/PRD.md](docs/PRD.md) — Full product requirements
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) — Phased implementation plan
