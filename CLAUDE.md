# CLAUDE.md — Claude Code Session Instructions for NexusAI

## Start Here

You are part of the NexusAI relay team. Another agent may have worked before you. Your first job is to recover context, then build, then hand off cleanly.

Before editing code:

1. Read `HANDOVER.md`.
2. Read `TASKS.md`.
3. Run `git log --oneline -10`.
4. Run `git status --short`.

The working tree may contain unrelated local changes. Do not revert anything unless the user explicitly asks.

## Product Summary

NexusAI Mission Control is an executive intelligence pilot. It helps companies ingest documents and communications, map them into business context, and produce evidence-backed dashboards, recommendations, decisions, and briefs.

V1 principle: narrow, trustworthy, provenance-first executive intelligence. No autonomous writeback. Human approval remains required for consequential actions.

## Technical Summary

- App path: `apps/mission-control`
- Next.js 15 App Router + TypeScript
- Clerk auth with org/workspace scoping
- Postgres + Drizzle + pgvector
- R2 for original file retention
- Render hosting
- Vitest tests

Useful commands:

```bash
cd apps/mission-control
npx tsc --noEmit
npm run test
npm run build
```

## Development Standards

- Keep UI copy clear for executives.
- Keep evidence provenance visible but do not expose noisy raw IDs unless needed for debugging.
- Keep all workspace data scoped to authenticated Clerk org/user.
- Prefer explicit, typed contracts at API boundaries.
- If touching ingestion, test both UI and API behavior.
- If touching dashboard/Ask behavior, verify evidence refs and refusal paths still make sense.

## Handoff

At the end of a logical unit:

```bash
python3 relay.py \
  --from-model claude \
  --done "What was completed" \
  --next "What should happen next" \
  --notes "Warnings, test status, or decisions"
```

Use `--commit` only if you intentionally want the relay script to stage and commit selected files. Do not blindly commit the whole repo.

