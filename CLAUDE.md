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
npm run check:boundaries
npm run commit:check
npm run verify:release
```

## Production Build Constraints (READ BEFORE WRITING FRONT-END)

Since commit `68a5a0b`, four things are banned from the production build path because they hung `next build` before any compile output (tests + tsc stayed green — a build cannot be verified by those alone). Full detail: `docs/ENGINEERING_GUARDRAILS.md` §7.

1. No Clerk CLIENT components in bundles (`SignedIn`/`SignedOut`/`SignInButton`/`UserButton`). Server-side auth (`auth()`, `requireScope`, `resolveAuth`) is unchanged and still required.
2. Auth handoff is HOSTED: use envs `NEXT_PUBLIC_CLERK_HOSTED_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_HOSTED_SIGN_UP_URL`; gate signed-out UI with a plain `/sign-in` link (see `app/reviewer-seat/accept/page.tsx`), never `<SignedOut>`.
3. New client pages should be fetch-only against server APIs (e.g. `/reviewer-seat`, `/funnel`, `/pilot/afterlife`).
4. Do not reintroduce Sentry runtime instrumentation, middleware tracing, or force-graph rendering into the build path without confirming `npm run build` still completes. Always verify with a real `npm run build` (or Render CI), not just tests + tsc.
5. Use Node 20 and the root npm workspace only. Treat a nested `apps/mission-control/node_modules/.pnpm`, duplicate route filename, or stale `.next`/`tsconfig.tsbuildinfo` as invalid build state.
6. Run `npm run commit:check` after staging and `npm run verify:release` before pushing. Never bypass a tree-shrink gate without inspecting the staged file count and deletion list.

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

---

# Behavioral Guidelines (Karpathy 4 rules)

Behavioral guidelines to reduce common LLM coding mistakes. These bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
