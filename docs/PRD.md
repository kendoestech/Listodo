# Listodo — Product Requirements Document

## Vision

A clean, fast, mobile-friendly todo list app where every list is a markdown file in your Google Drive. Edit with a rich WYSIWYG editor, organize with nested folders, and filter by completion status — all from any browser.

## Problem Statement

Existing todo apps either lock your data into proprietary formats or lack rich text editing. Markdown-based tools exist but aren't mobile-friendly or require technical setup. Listodo bridges the gap: a polished WYSIWYG experience backed by portable markdown files stored in your own Google Drive.

## Target User

Individual users who want a simple, clean todo list app with rich formatting and full ownership of their data. No team features needed.

---

## Core Features

### 1. Authentication

- Google OAuth only (Sign in with Google)
- OAuth scopes: `drive.file` (access files created by the app or opened by the user)
- No passwords, no email signup
- Session persistence via token storage

### 2. File Storage (Google Drive)

- All data stored in a "Listodo" folder in the user's Google Drive
- Markdown (.md) files for todo lists
- Nested subfolder support (maps to Drive folder hierarchy)
- Files are visible and accessible in Google Drive directly
- Local in-memory cache to minimize API calls and mitigate Drive API latency (~2.5s avg)
- Auto-save with debounce (save on pause after editing)

### 3. Todo List Editor

- WYSIWYG markdown editor powered by Tiptap
- Full markdown support: headings, bold/italic, links, images, code blocks, tables
- Interactive checkboxes for todo items (`- [ ]` / `- [x]`)
- The underlying file is always valid markdown
- Formatting toolbar (mobile-friendly)

### 4. Todo Filtering & Views

- Filter by: All items, Incomplete only, Completed only
- Counts displayed (e.g., "3 of 7 complete")
- Filter applies to the currently open list
- Filters are visual only — they don't modify the underlying document

### 5. Folder Organization

- Nested folder hierarchy (mirrors Drive folder structure)
- Create, rename, delete folders from within the app
- Drag-and-drop to move lists between folders (stretch goal)
- Sidebar navigation with collapsible folder tree

### 6. Mobile-Friendly UI

- Responsive design — works on phones, tablets, and desktops
- Touch-friendly controls (tap checkboxes, swipe actions)
- Collapsible sidebar on mobile (hamburger menu)
- Native app wrapper: deferred (PWA or Capacitor decision later)

---

## Non-Goals (v1)

- Collaboration / sharing
- Offline support
- Real-time sync across devices (refresh to sync is acceptable)
- Due dates, priorities, reminders (potential v2 features)
- Full-text search across all lists (potential v2)

---

## User Flows

### First-Time User

1. User visits Listodo in browser
2. Sees login page with "Sign in with Google" button
3. Completes Google OAuth flow (grants `drive.file` scope)
4. App creates "Listodo" folder in user's Google Drive
5. User sees empty state with prompt to create first list
6. User creates a list, starts adding items

### Returning User

1. User visits Listodo (or opens mobile wrapper)
2. Auto-authenticated via stored token (or quick re-auth)
3. Sidebar shows folder tree with existing lists
4. User selects a list to view/edit
5. Changes auto-save back to Google Drive

### Creating & Editing a List

1. User clicks "New List" (in current folder)
2. Names the list (becomes filename: `My List.md`)
3. WYSIWYG editor opens with empty state placeholder
4. User types content — markdown formatting via toolbar or shortcuts
5. Checkboxes are interactive (click to toggle)
6. Content auto-saves after brief pause in typing

### Filtering Todos

1. User opens a list with todo items
2. Filter bar shows: All (7) | Incomplete (4) | Completed (3)
3. User taps "Incomplete" to see only unchecked items
4. Completed items are hidden (not deleted)
5. User taps "All" to restore full view

---

## Technical Constraints

- **Google Drive API latency**: ~2.5s average per call. Mitigated by local caching.
- **Rate limits**: 3 writes/sec per account, 20,000 calls per 100 seconds. Mitigated by debounced saves.
- **Eventual consistency**: Recently created files may not appear immediately in Drive listings.
- **Always online**: No offline functionality in v1.
- **No backend**: All logic runs client-side. No server to maintain.

---

## Success Metrics

- User can create, edit, and manage todo lists entirely from a mobile browser
- Markdown files in Google Drive are valid and human-readable
- App loads and becomes interactive in under 3 seconds
- Auto-save works reliably without data loss
- Todo filtering works correctly across all list sizes
