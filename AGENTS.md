# AGENTS.md — Codex Session Instructions for NexusAI

## Start Here

You are working on NexusAI Mission Control, a paid-pilot executive intelligence system. The repository is the memory. Treat every session as a continuation of prior work.

Before editing code, orient yourself:

1. Read `HANDOVER.md` for current state and next task.
2. Read `TASKS.md` for the roadmap.
3. Run `git log --oneline -10`.
4. Run `git status --short`.

Do not assume the working tree is clean. This repo often has unrelated local changes. Never revert or overwrite work you did not make.

## Product Direction

NexusAI V1 is not a generic chatbot. It is an executive intelligence command layer that:

- ingests company documents and communications,
- maps evidence to business context,
- generates role-aware dashboards and recommendations,
- preserves provenance, confidence, sensitivity, and auditability,
- keeps humans in the loop for approvals and consequential actions.

Current commercial target: paid pilot for executive or transformation sponsors.

## Current Stack

- Monorepo root: `nexus-core`
- App: `apps/mission-control`
- Framework: Next.js 15 App Router, React, TypeScript
- Auth: Clerk
- DB: Postgres with Drizzle and pgvector
- Storage: Cloudflare R2 for original evidence files
- Hosting: Render
- LLM routing: provider-configurable, currently DeepSeek/OpenAI-compatible paths plus embeddings
- Tests: Vitest

## Common Commands

From `apps/mission-control`:

```bash
npx tsc --noEmit
npm run test
npm run build
npm run db:migrate
```

## Work Standards

- Prefer small, focused commits.
- Stage only files related to the current task.
- Do not commit secrets, `.env*` files, generated caches, or unrelated local changes.
- Keep UX executive-friendly: avoid internal terms like "Task 22", raw IDs, or implementation jargon in user-facing copy.
- All intelligence outputs should be evidence-backed, workspace-scoped, and sensitivity-aware.
- Browser-test important UI changes against the live or local app when feasible.

## File Map

- `apps/mission-control/app` — routes, layouts, pages, API handlers
- `apps/mission-control/components` — UI components
- `apps/mission-control/lib/contracts.ts` — Zod contracts and shared types
- `apps/mission-control/lib/data` — repository/store/data access
- `apps/mission-control/lib/services` — ingestion, retrieval, LLM, dashboard, storage services
- `apps/mission-control/db` — Drizzle schema and migrations
- `docs/` — implementation notes and operating docs

## Handoff

When completing a logical unit, update the relay state:

```bash
python3 relay.py \
  --from-model codex \
  --done "What was completed" \
  --next "What should happen next" \
  --notes "Warnings, test status, or decisions"
```

By default, `relay.py` updates `HANDOVER.md` without committing. Use `--commit` only when you intentionally want the relay to stage and commit selected files.

