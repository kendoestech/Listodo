# Listodo — Implementation Plan

## Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | SvelteKit | Lightweight, fast, excellent DX. `adapter-static` for pure client-side SPA. |
| **Editor** | Tiptap (via svelte-tiptap / Tipex) | Most extensible WYSIWYG editor. Official Svelte support. TaskList extension for checkboxes. |
| **Auth** | Google OAuth 2.0 | Direct browser-based OAuth flow using Google Identity Services. |
| **Storage** | Google Drive API v3 | Files stored in user's Drive. `drive.file` scope. No backend DB needed. |
| **Styling** | Tailwind CSS | Utility-first, great for responsive/mobile design. |
| **Deployment** | Vercel or Netlify | Free tier, automatic deploys from git, perfect for static SPAs. |
| **Language** | TypeScript | Type safety across the app. |

## Architecture

```
Browser (SvelteKit SPA)
  ├── Google Identity Services (OAuth login)
  ├── Google Drive API v3 (file CRUD via gapi client)
  ├── Tiptap Editor (WYSIWYG markdown editing)
  ├── Markdown ↔ Tiptap document converter
  └── Local cache layer (in-memory, reduces API calls)
```

No backend server. Everything runs in the browser. Google handles auth and storage.

---

## Phases

### Phase 1: Project Scaffolding

- Initialize SvelteKit project with TypeScript
- Configure `adapter-static` with `ssr = false`
- Set up Tailwind CSS
- Set up project structure:
  ```
  src/
    lib/
      components/    # UI components
      services/      # Google Drive, Auth services
      stores/        # Svelte stores for state
      utils/         # Markdown conversion, helpers
    routes/
      +layout.svelte
      +page.svelte
  ```
- Configure Google Cloud project (OAuth client ID, Drive API enabled)

### Phase 2: Authentication

- Implement Google OAuth flow using Google Identity Services (GSI)
- Create `auth.ts` service: login, logout, token management
- Create auth store (Svelte writable store) for user state
- Build login page with "Sign in with Google" button
- Route guard: redirect unauthenticated users to login

### Phase 3: Google Drive Integration

- Create `drive.ts` service with these operations:
  - `ensureListodoFolder()` — find or create the root "Listodo" folder
  - `listFiles(folderId)` — list files and subfolders
  - `getFileContent(fileId)` — read a markdown file
  - `createFile(name, content, parentFolderId)` — create new .md file
  - `updateFileContent(fileId, content)` — save changes
  - `createFolder(name, parentFolderId)` — create subfolder
  - `deleteFile(fileId)` — move to trash
  - `renameFile(fileId, newName)` — rename file or folder
  - `moveFile(fileId, newParentId)` — move between folders
- Implement local cache layer with cache invalidation
- Debounced auto-save (1-2 second delay after last keystroke)

### Phase 4: Core UI — Sidebar & Navigation

- Sidebar component with collapsible folder tree
- Recursive folder rendering (nested folders)
- File list within selected folder
- Create new list / new folder actions
- Rename and delete (with confirmation) via context menu
- Responsive: hamburger menu on mobile, persistent sidebar on desktop
- Files/folders store: reactive state for the folder tree

### Phase 5: Tiptap Editor Integration

- Install and configure Tiptap with Svelte bindings
- Extensions to include:
  - StarterKit (basic formatting)
  - TaskList + TaskItem (interactive checkboxes)
  - Link, Image, Table, CodeBlock
  - Placeholder (empty state text)
- Build markdown ↔ Tiptap document serialization:
  - On file open: parse markdown → Tiptap JSON document
  - On save: serialize Tiptap document → markdown string
  - Use `tiptap-markdown` extension or `marked`/`turndown` for conversion
- Editor toolbar: formatting buttons, mobile-friendly
- Auto-save: trigger Drive update on content change (debounced)

### Phase 6: Todo Filtering

- Extract task items from Tiptap document tree
- Filter controls: "All" / "Incomplete" / "Completed" toggle
- Completion counter display ("3 of 7 done")
- Filter implementation: toggle visibility of TaskItem nodes based on checked state
- Ensure filters don't modify the underlying document

### Phase 7: Polish & Mobile UX

- Touch-optimized controls (larger tap targets, swipe gestures)
- Loading states and skeleton screens during Drive API calls
- Error handling: network errors, Drive API errors, auth expiry
- Empty states (no lists yet, empty folder)
- Keyboard shortcuts for desktop
- Test across devices and browsers

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/services/auth.ts` | Google OAuth service |
| `src/lib/services/drive.ts` | Google Drive API service |
| `src/lib/services/cache.ts` | Local caching layer |
| `src/lib/stores/auth.ts` | Auth state store |
| `src/lib/stores/files.ts` | File tree state store |
| `src/lib/stores/editor.ts` | Editor state store |
| `src/lib/components/Sidebar.svelte` | Folder tree navigation |
| `src/lib/components/FolderTree.svelte` | Recursive folder component |
| `src/lib/components/Editor.svelte` | Tiptap editor wrapper |
| `src/lib/components/Toolbar.svelte` | Editor formatting toolbar |
| `src/lib/components/FilterBar.svelte` | Todo filter controls |
| `src/lib/components/LoginPage.svelte` | Auth landing page |
| `src/lib/utils/markdown.ts` | Markdown ↔ Tiptap conversion |
| `src/routes/+layout.svelte` | App shell with auth guard |
| `src/routes/+page.svelte` | Main app page |

---

## Verification Plan

1. **Auth**: Sign in with Google, verify token stored, refresh works, logout clears state
2. **Drive CRUD**: Create a list, verify .md file appears in Google Drive "Listodo" folder. Edit content, verify changes persist. Create nested folders, verify hierarchy in Drive.
3. **Editor**: Open a list, verify markdown renders as WYSIWYG. Toggle checkboxes, verify markdown output updates. Test all formatting (bold, links, code, tables).
4. **Filtering**: Create a list with mixed complete/incomplete items. Toggle filters, verify correct items shown/hidden. Verify counts are accurate.
5. **Mobile**: Test on phone-sized viewport. Verify sidebar collapses, touch targets are adequate, editor is usable.
6. **Edge cases**: Empty Drive (first-time user), large files, rapid edits (debounce), expired auth token.
