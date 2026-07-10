# Learnings

Corrections, insights, and knowledge gaps captured during development.

**Categories**: correction | insight | knowledge_gap | best_practice

---

## [LRN-20260710-001] best_practice

**Logged**: 2026-07-10T14:15:00+05:00
**Priority**: critical
**Status**: promoted
**Area**: infra

### Summary
Build correctness, dependency layout, and Git tree integrity require separate automated gates.

### Details
TypeScript and tests can pass while Next.js hangs in client bundling or output tracing. Untracked duplicate route files are still compiled. A stale nested pnpm install can shadow the root npm workspace. Stale Git locks and a damaged index can create a commit whose tree unexpectedly deletes most of the repository.

### Suggested Action
Run build-boundary checks, staged-tree preflight, timed typecheck/test/build verification, and clean CI before deployment. Keep large-commit overrides explicit and reviewed.

### Metadata
- Source: conversation
- Related Files: scripts/preflight-commit.mjs, scripts/check-build-boundaries.mjs, scripts/verify-build.mjs
- Tags: nextjs, git, build, ci, dependency-resolution
- Pattern-Key: harden.build_and_commit_pipeline
- Recurrence-Count: 2
- First-Seen: 2026-07-09
- Last-Seen: 2026-07-10
- Promoted: AGENTS.md, CLAUDE.md, CONTRIBUTING.md, docs/ENGINEERING_GUARDRAILS.md

---
