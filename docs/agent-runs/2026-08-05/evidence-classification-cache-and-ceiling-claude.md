# Agent Run: evidence-classification-cache-and-ceiling

- **Started:** 2026-08-05T23:36:05+05:00
- **Agent:** claude
- **Branch:** `main`
- **Starting HEAD:** `94bb9837189f584aca8798a94f06c134aeaa56f0`
- **Status:** `in_progress`

## Objective

Cache document classification at ingest with a self-invalidating version, reach the orphaned review queue from navigation, and enforce the evidence ceiling that /pricing already sells.

## Acceptance Criteria

- [ ] tsc 0; full Vitest suite green; build boundaries clean; 197-page production build; migration 0044 verified against real Postgres; negative control per guard.

## Claimed Files

- `apps/mission-control/lib/domain/document-type-classifier.ts`
- `apps/mission-control/db/migrations/0044_evidence_document_types.sql`
- `apps/mission-control/lib/data/repository.ts`
- `apps/mission-control/lib/services/ingestion.ts`
- `apps/mission-control/components/side-nav.tsx`

## Starting Worktree State

```text
(clean)
```

## Checkpoints

### 2026-08-05T23:36:05+05:00 — slice opened RETROSPECTIVELY

- **Process failure, recorded rather than hidden:** this ledger was created
  after the three commits below had already landed, not before the first edit
  as `nexus-papertrail` requires. The checkpoints that follow are reconstructed
  from commit messages and verification output captured during the work, not
  written at the time. Treat their timestamps as the commit times, not as
  contemporaneous observations. The starting HEAD above (`94bb983`) is
  therefore the END of the slice, not its beginning; the slice actually began
  at `8b87a4a`.
- **Next exact action:** append the real checkpoints, then reconcile TASKS.md
  and HANDOVER.md.

### 2026-08-05 — live-site check before any code (reconstructed)

Prompted by a report that the live page was not working.

- **Findings:** `pinavia.io` serves normally. `/api/health` returns ok across
  database, vector search, R2 originals, and the DeepSeek LLM route.
  `/dashboard/ceo` renders fully with live briefs, 8 recommendations, and a
  real source-coverage map. The deployment is healthy.
- **Two things that could read as broken.** `/meridian` renders its cold-start
  panel (scope must be set before a requirement set can be selected) followed
  by the boundary cards; correct, but on an unpopulated workspace an honest
  empty state is indistinguishable from a dead page. `/evidence/review`
  returned 404 — not a deployment fault: the commits containing it were never
  pushed.
- **Real defect found:** `/evidence/review` had no navigation entry at all, so
  it would have remained unreachable even after deployment.
- **Status:** `operationally verified` for the deployed head. The unpushed work
  is unverified in production by definition.

### 2026-08-05 — `26f77f1` classify at ingest, cache on the row, version the cache

- **Completed:** migration 0044 adds `document_types`, `document_types_source`,
  `document_types_version` to `evidence_records`. Classification computed once
  in `ingestEvidence` via `classifyForStorage`, read back through
  `toEvidenceRecord`, consumed by `resolveDocumentTypes` and
  `matchesEvidenceTags`. `POST /api/evidence/reclassify` refreshes stale rows in
  batches. Review queue linked into navigation under Connect as "Untyped
  Evidence" (`/review` already owns the name "Review Queue").
- **Design decision worth preserving:** `CLASSIFIER_VERSION` is a fingerprint
  computed from the pattern table and thresholds, not a hand-maintained
  constant. A manual version fails silently and permanently — somebody adds a
  document type to a requirement pack, forgets to bump, and every workspace
  answers coverage from retired rules. Any row whose version does not match the
  running code is ignored and reclassified in place, so correctness never
  depends on the backfill having run. The reclassify endpoint only makes being
  correct cheap again.
- **Measured**, 2,000 documents of ~50kB: resolve 1,876ms to 2ms; the four
  native engines via `matchesEvidenceTags` 8,978ms to 10ms; ingest cost
  0.93ms/doc paid once.
- **Verification:** tsc 0; 1021 tests / 127 files; boundaries clean; build 197
  pages. Migration 0044 executed against real Postgres via PGlite — 41/44
  migrations applied, the 3 skips are pgvector-only and expected — with 11
  assertions covering column types, nullability, the partial index predicate,
  idempotent re-run, the 2147483647 fingerprint bound, and legacy rows reading
  as no-cache.
- **Negative control:** removed the version comparison in `cacheIsCurrent`; 3
  tests failed; reverted and confirmed.
- **Incident during staging:** `commit:check` blocked the commit because two
  NUL bytes had entered the classifier where a template literal's separators
  should have been. Replaced with `|`. The gate did its job.

### 2026-08-05 — `94bb983` enforce the evidence ceiling

- **Completed:** `checkEvidenceLimit` is now called. Enforced at
  `ingestEvidence` — the single chokepoint all thirteen ingest paths reach —
  rather than in the routes, for the same reason `matchesEvidenceTags` exists:
  a check copied into thirteen places is a check missing from the fourteenth.
  The upload route checks a second time before the R2 write, deliberately, so a
  refused upload leaves no orphaned object, and answers 402 with counts and the
  next plan up.
- **Two properties pinned by test:** it REFUSES rather than truncating, and
  refuses before the record is built, so nothing half-written survives; and it
  FAILS OPEN, because a billing outage halting a paying pilot is worse than a
  reconcilable overage.
- **Verification:** tsc 0; 1031 tests / 128 files; boundaries clean; build 197
  pages.
- **Negative control:** disabled the guard; 5 tests failed; reverted.
- **Two self-inflicted errors, both caught before reporting.** A test asserted
  the upgrade prompt should not name Growth; `planKey: "pro"` IS the tier sold
  as Starter, so Growth was correct — the code was right and the test was
  wrong. A later revision passed Vitest and failed tsc because
  `.catch(e => e)` types as the union of the error and the resolved record.

### 2026-08-05 — current state

- **Status:** `locally verified` and `committed but unpushed`.
- **Local HEAD:** `94bb983`. **Pushed SHA:** `ca0d964` — four commits behind
  (`48b07f2`, `8b87a4a`, `26f77f1`, `94bb983`).
- **Deployed SHA:** not confirmed; the live smoke above was against whatever
  Render currently serves, which predates all four.
- **Blockers:** push requires credentials this environment does not hold;
  `blocked on user`. Migrations 0043 and 0044 are `migration pending` against
  the production database.
- **Not done, deliberately:** seat enforcement. `maxTeam` cannot use the same
  chokepoint because membership is granted through Clerk, not our code; it
  needs a webhook on `organizationMembership.created`. Counting is already
  correct in the plan summary.
- **Known inconsistency, pre-existing, not introduced here:**
  `matchesEvidenceTags` ignores reviewer overrides, so the four native engines
  disagree with the Meridian coverage API about any document a human has
  retyped.
- **Next exact action:** `git push`, then `npm run db:migrate && npm run
  db:check`, then re-smoke `/evidence/review` and `/meridian` against the new
  deployed SHA.

### 2026-08-05T23:40 — push discovered, deploy not yet serving

- **Correction to the entry above.** `origin/main` advanced to `94bb983` at
  23:34 while this slice was being documented: Ali pushed. The four code
  commits are `pushed`, not `committed but unpushed`. The status recorded
  minutes earlier was already stale when written, which is the ordinary hazard
  of a retrospective ledger.
- **Deployment is NOT yet serving them.** `/evidence/review` still returns 404
  at 23:41 and the sidebar still lacks the "Untyped Evidence" entry, so Render
  is answering from a build older than `26f77f1`. Status is `pushed / CI
  pending` and `deployment pending`. It is not `deployed at 94bb983`.
- **Cold start observed.** The first request at 23:39 hit a spun-down Render
  instance and served the Render "Application loading" splash for roughly 50
  seconds before the app answered. `render.yaml` pins `plan: free`, which
  sleeps on idle. A prospect opening a demo link cold waits out that splash on
  Render branding. Commercially this is the most serious finding of the
  session; it is an infrastructure decision, not a code fix.
- **`render.yaml` runs `npm run db:migrate` in `buildCommand`**, so migrations
  0043 and 0044 apply automatically on the next successful deploy. No manual
  migration step is required in production, though `npm run db:check`
  afterwards is still worth running.

### 2026-08-05T23:42 — `1e13227` deployed-commit reporting

- **Completed:** `/api/health` now returns `build.commit`, `build.commitShort`,
  and `build.branch` from Render's injected variables.
- **Why it was worth interrupting for.** The previous checkpoint could not
  distinguish "not pushed" from "pushed but not built" from "built but broken"
  without inspecting page markup and inferring. Every future status in this
  ledger can now cite a SHA read from the running process rather than assumed
  from a dashboard.
- **Verification:** tsc 0; 1035 tests / 129 files; boundaries clean; build 197
  pages.
- **Status:** `locally verified`, `committed but unpushed` at `1e13227`
  (`857bc13` paperwork and `1e13227` both local).
- **Next exact action:** push `857bc13` and `1e13227`; wait for the Render
  build; then `curl https://pinavia.io/api/health` and confirm
  `build.commitShort` matches, which is the first time this project can state
  `deployed at <sha>` as evidence rather than assertion. Then re-check
  `/evidence/review` and run `npm run db:check`.
