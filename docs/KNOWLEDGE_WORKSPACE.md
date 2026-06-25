# Nexus Knowledge Workspace

Updated: 2026-06-17
Status: v0.25.0 implemented locally and verified

## Purpose

The Nexus Knowledge Workspace is the Obsidian-like company second brain inside Mission Control. It lets users write markdown notes, link them with `[[wikilinks]]`, attach governed Nexus refs, search the vault, inspect backlinks, view a graph, import/export Markdown, and optionally sync a local folder.

It is not a separate notes app beside Nexus. It is a knowledge layer over the same governed workspace, evidence, entity, workflow, decision, recommendation, auth, and audit model.

## Product Surface

- Route: `/knowledge`
- Navigation: Intelligence -> Knowledge Workspace
- UI model:
  - left pane: vault tree, quick search, recent/inbox-style folders
  - center pane: markdown editor, preview, graph tab
  - right pane: backlinks, Nexus links, import/export, inbox triage, local sync controls

Supported note syntax:

- `[[Some Note]]` for note-to-note links
- `#tag` for searchable tags
- Markdown headings for structured search
- typed Nexus refs:
  - `evidence:ev-001`
  - `entity:<id>`
  - `workflow:<id>`
  - `decision:<id>`
  - `recommendation:<id>`

## Data Model

Migration: `apps/mission-control/db/migrations/0026_knowledge_workspace.sql`

Tables:

- `knowledge_notes`: workspace-scoped markdown notes with path, title, body, tags, sensitivity, status, source kind, frontmatter, typed Nexus refs, timestamps, and optional embedding.
- `knowledge_links`: parsed wikilinks and typed links from notes to notes/evidence/entities/workflows/decisions/recommendations.
- `knowledge_sync_events`: import/export/sync/watch status history.

Contracts live in `apps/mission-control/lib/contracts.ts`.

Repository methods are Postgres-first with in-memory fallback for local/demo mode.

## APIs

All routes are workspace-scoped and require `read:knowledge` or `write:knowledge` for bearer tokens. Clerk session users pass through the normal session path.

- `GET /api/knowledge/notes`
- `POST /api/knowledge/notes`
- `GET /api/knowledge/notes/[id]`
- `PATCH /api/knowledge/notes/[id]`
- `DELETE /api/knowledge/notes/[id]`
- `GET /api/knowledge/search`
- `GET /api/knowledge/graph`
- `POST /api/knowledge/export`
- `POST /api/knowledge/import`
- `POST /api/knowledge/triage`
- `GET /api/knowledge/sync`
- `POST /api/knowledge/sync`

## Markdown Portability

Postgres is canonical for hosted governance and app state. Markdown is the portability layer.

Export:

- `POST /api/knowledge/export`
- returns an Obsidian-compatible ZIP
- writes frontmatter with Nexus metadata and typed refs

Import:

- `POST /api/knowledge/import`
- accepts a Markdown ZIP
- parses frontmatter, tags, headings, wikilinks, and typed refs
- upserts notes by workspace/path

Default vault folders:

- `_Inbox/`
- `Daily/`
- `Projects/`
- `Workflows/`
- `Entities/`
- `Sources/`
- `.nexus/`
- `.conflicts/`

## Live Local Folder Sync

Environment controls:

```bash
NEXUS_VAULT_SYNC=disabled
NEXUS_LOCAL_VAULT_PATH=/absolute/path/to/vault
```

Allowed modes:

- `disabled`: default; hosted-safe; import/export only
- `readonly`: file changes import into Nexus; Nexus does not write Markdown files
- `bidirectional`: file changes import into Nexus and DB saves write Markdown files

Safety rules:

- vault path must be absolute
- only `.md` files are processed
- path traversal is rejected
- hidden system paths are rejected except `.nexus` and `.conflicts`
- symlinks outside the vault are rejected
- files over 1 MB are rejected
- conflicts preserve both versions by writing a copy under `.conflicts/`

Hosted deployments should leave sync disabled. Local, desktop, and self-hosted deployments can opt in.

## Ask Integration

Ask still retrieves governed evidence first. It now also searches active, non-restricted knowledge notes and returns separate citation arrays:

- `evidenceRefs`
- `noteRefs`

If no evidence matches but relevant notes exist, Ask can answer from knowledge notes while making the source trail explicit through `noteRefs`.

## MCP Surface

Script:

```bash
npm run mcp:knowledge -w @nexus/mission-control
```

Environment:

```bash
NEXUS_MCP_BASE_URL=http://localhost:3000
NEXUS_MCP_BEARER_TOKEN=<scoped bearer token with read:knowledge/write:knowledge>
```

Tools:

- `save_memory`
- `search_memory`
- `read_note`
- `write_note`
- `list_recent_notes`
- `vault_status`
- `sync_vault`
- `knowledge_graph`

The MCP wrapper calls the same internal APIs as the web app. It does not maintain a separate store.

## Verification

Verified on 2026-06-17:

```bash
npm exec -w @nexus/mission-control tsc -- --noEmit
npm run test -w @nexus/mission-control
npm run build -w @nexus/mission-control
npm audit --omit=dev --json
```

Results:

- TypeScript clean
- 29 test files / 187 tests passing
- production build passed
- production audit reported 0 vulnerabilities

UI smoke note: `/knowledge` is protected by Clerk, so unauthenticated curl sees auth/not-found behavior. Verify in a logged-in browser session.
