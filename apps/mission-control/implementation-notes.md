# Implementation Notes — 2026-07-07 Demo Week Package (B + A + C)

Unknowns-first session #2. Direction chosen: scorer signal-confidence (A),
canon doc decisions (C), regulated demo runbook (B prep). Delete after review.

## Scope
- `lib/services/workflow-twins.ts`: exported `computeSignalStrength` (pure);
  scorer runs now include `payload.signal`, append "Provisional" to weak/none
  summaries, and persist an informational `signal_strength` entry inside the
  pilotGates JSON (blocked: false).
- `app/workflows/page.tsx`: provisional-signal line under the recommendation.
- `components/dashboard-panel.tsx`: PilotStatusCard shows the persisted signal.
- Docs: `docs/WORKFLOW_TWIN_SCORER.md` §Signal confidence,
  `docs/USER_STRATEGY_AND_PIVOTS.md` §Decisions 2026-07-07 (reviewer seat,
  waitlist->pilots->Stripe, cold-start posture, pilot-afterlife gap),
  `BACKLOG.md` P1/P2 entries, new `docs/DEMO_RUNBOOK_REGULATED.md`.

## Assumptions
1. Signal thresholds (none/weak/moderate/strong) per Ali-approved plan; label
   never blocks confirmation ("Approve as written", not the blocking variant).
2. Persisting signal inside the pilotGates JSON avoids a migration; the run
   payload's `pilotGates` stays pure gates so gating consumers are unaffected.
   Repo evidence: `setPilotReadiness` stores gates as JSON; `pilotReady` is
   computed before the informational entry is appended.
3. Demo dates: regulated demo ~1 week, launch ~4 weeks, pilot signing ~6 weeks
   (interview 2026-07-07).

## Conservative choices / deviations
- Did not extend `pilotGateSchema`; the informational entry conforms to the
  existing {key,label,blocked} shape.
- Dashboard card renders the signal as one small line, not a new cell.

## Verification
- `tests/workflow-twins.test.ts`: +1 test (thresholds, provisional summary,
  payload purity, persisted informational entry never gates). 9/9 pass.
- Full suite: 434/434 tests pass across 61 files.
- Environment noise (pre-existing, NOT from this change):
  `tests/google-oauth-config.test.ts` fails to LOAD with filesystem error -35
  in this sandbox (tsc also reports the file unreadable). Zero test-level
  failures. Re-verify locally where the mount artifact does not apply.

## Open questions (human decision)
- Reviewer-seat build start date (must start within ~2 weeks to land by wk 6).
- Whether the demo includes the live claim email (needs Resend + pinavia.io
  sender auth in Render first).

## Release-gate follow-up — 2026-07-07 regulated demo hardening

- Live verification against the active pilot host (`https://app.pinavia.co`)
  showed `/api/health` green and the served `sentry-release` matching local
  `HEAD` / `origin/main` at
  `53b4d0ac76c2a729f451896b03602270f223260c`.
- Authenticated browser checks proved the readiness -> claim ->
  onboarding-inheritance path live, and confirmed authenticated rendering of
  `/knowledge`, `/settings/connectors`, and `/dashboard/ceo`. The populated
  workspace showed `Decision & Action Twin` selected with `pilot-ready` and all
  bridgeable gates ready.
- Behavioral evidence strongly suggests migrations `0033` and `0034` are live:
  claim URLs exist, onboarding inherits the regulated lane, and
  `strategy_profiles` fields backing pilot status render in Mission Control.
- Remaining blocker on the deployed build: `scripts/smoke-domain.mjs` still
  fails `CORS allows expected origin` for the active host because `OPTIONS`
  requests to protected API routes are being intercepted by Clerk auth before
  the middleware can emit the preflight response.
- Fix implemented in this slice: `middleware.ts` returns API `OPTIONS`
  preflight responses through `withSecurityHeaders(...)` before Clerk auth.
  Regression coverage added in `tests/security-headers.test.ts`.
- Verified after the fix: focused regression suite `36` tests passed; full
  suite `438` tests passed; `npm run build` exited `0`.
- DNS note: `app.pinavia.io` and `nexus.pinavia.io` did not resolve in this
  shell during the gate run. Treat as provider/DNS propagation pending, not an
  app-code issue.

---

# Implementation Notes — Readiness-to-Onboarding Inheritance Pipeline

Temporary working log for the 2026-07-06 change set. Delete after review/merge.

## Scope
Direction B + A + C from the unknowns-first session: readiness assigns a buyer
lane, a single-use claim token carries it through Clerk signup, onboarding
inherits it, lane changes become governed reclassifications, and the
strategy-profile API authz hole is closed.

## Assumptions
1. Bands are the four in app/readiness/page.tsx: Emerging, Developing, Advanced,
   AI-Native. Lane rules treat any band other than Emerging as implementation
   intent.
2. `buyerLane` keeps its column name but is semantically the CURRENT lane;
   `initialLane` (new) is write-once. Avoids a rename migration.
3. Clerk's hosted signup may drop the ?readiness= query param through
   redirects; sessionStorage backup (token only) covers that path. Per Ali:
   URL token primary, sessionStorage carries only the token, email lookup is
   manual recovery, full payload never client-side.
4. Sector keys on the public page align with lib/domain/sector-library.ts plus
   `government_public` and `other`, which have no sector-library entry (fine:
   lane assignment is independent of the sector library).
5. In demo mode without a DB, runDb no-ops: claim codes cannot be redeemed.
   Submit degrades gracefully (claimCode: null) and never blocks the result.

## Deviations from plan
- Reclassification checkpoint implemented as a LaneBanner component above the
  wizard card (visible at steps 2, 3, 7) instead of editing Step3 internals.
  Less invasive; Step3 remains untouched.
- Did not set employeeBand when prefilling from readiness companySize — the
  DetectedProfile band enum did not match the public size buckets; left the
  buildManualProfile default rather than guessing a mapping.
- Migration file numbered 0033 (docs referenced 0028 in planning, but
  0028-0032 already exist in db/migrations/).

## Conservative choices
- Claim consume is a single atomic UPDATE ... RETURNING (no read-then-write
  race window).
- Only the SHA-256 hash of the claim code is stored server-side.
- Lane assignment runs server-side only; the client never picks its own lane.
- Leaving regulated_enterprise requires an explicit extra confirmation and the
  copy restates that human approval and no-autonomous-writeback apply always.
  PATCH /api/strategy-profile also enforces this server-side.
- initialLane is write-once in upsertStrategyProfile (existing wins over input).

## Repo evidence
- Gap confirmed by grep: wizard.tsx had zero references to readiness/buyerLane
  before this change; strategy_profiles.externalRef was written by nothing.
- Old authz behavior: body?.workspaceId ?? auth?.workspaceId (route.ts line 26,
  pre-change).

## Open questions
1. Claim TTL is 72h — long enough for a weekend signup lag? Tunable constant.
2. Should Mission Control surface the lane post-onboarding (Option D)? Not in
   this change set.
3. Expired/consumed readiness_submissions rows have no pruning job yet.
4. The public /readiness result email flow still only writes an audit event; a
   product email with the claim link (Resend) is future work per the email
   boundary in USER_STRATEGY_AND_PIVOTS.

## Verification results
- Full suite: 56 files / 409 tests passed (was 53/393 before this change).
- tests/lane-assignment.test.ts — 8 passed.
- tests/strategy-profile-authz.test.ts — 7 passed (workspaceId override,
  reason-required lane changes, regulated-exit confirmation).
- tests/strategy-profile-repository.test.ts — 1 passed (old/new lane and
  regulated-exit audit payload enrichment).
- End-to-end smoke of readiness -> Clerk signup -> claim -> wizard requires a
  deployed environment with migration 0033 applied; traced in code only here.

## Follow-up slice — API auth-bypass sweep (same day)

- Classified all 135 app/api route handlers by auth mechanism + caller-supplied
  workspaceId handling. Five cross-tenant routes fixed: recommendations,
  pilot/paperwork (+ added the missing read:admin scope gate), settings/workspace
  (read AND write of security settings + read/write settings scopes),
  ingestion/status (bearer only),
  strategy-profile (already fixed earlier).
- Conservative choice: no operator/admin multi-tenant read path was preserved.
  The old `?workspaceId=` "admin override" comments were aspirational, not gated
  by any scope, so keeping them would have been the vulnerability. If real
  cross-workspace tooling is needed, add an explicit operator scope check.
- Client callers (settings page, paperwork page) still send `?workspaceId=` but
  the value is the caller's own session workspace, so pinning server-side is
  behavior-identical for legitimate use. Stale "admin override" comment on the
  paperwork page corrected.
- Verified: tests/api-workspace-authz.test.ts (6), full suite 57 files / 415
  tests, and production build. Standalone tsc was inconclusive in this PTY.
- Open question: `ingestion/status` still accepts a `workspaceId` form field in
  its POST schema even though the write forces ctx.workspaceId. Harmless but
  misleading; left as-is to keep the change surgical.

## Follow-up slice — Workflow scorer as pilot bridge (same day)

- Found `workflow-twins.ts` broken on arrival: an unterminated `/**` comment
  from a half-finished lane-fit edit made the rest of the file a comment and
  failed tsc (TS1010). Fixed by completing the `laneFitBoost` function.
- Design (from Ali): two gate types. Hard gates = workflow unsuitable as a
  FIRST pilot (regulatory-response, agreement-review) — kept in results, marked
  not_first_pilot, never recommended. Bridgeable gates = sponsor/reviewer/
  evidence — reported as pilotGates + pilotReady, recommendation still shown.
- Conservative choices: recommendation is top NON-hard-gated candidate; if all
  are hard-gated there is no recommendation (surface human-scoping path).
  Server enforces the scorer-owned readiness snapshot for selectedWorkflow
  (`pilot_gates_unmet`), which now covers sponsor, reviewer, and evidence gates.
- Gap closed: strategy profiles now have an in-memory store fallback for no-DB
  demos and migration 0034 persists the scorer readiness snapshot in DB-backed
  environments. The fallback is process-local only; production still requires
  migrations 0033 and 0034 before deploy.
- Verified: workflow-twins.test.ts + strategy-profile-authz.test.ts (17),
  full suite 57 files / 420 tests, and production build. Standalone tsc was
  inconclusive in this PTY.
- Current Codex PTY: `npm exec -w @nexus/mission-control tsc -- --noEmit`
  stayed silent for ~90s and was stopped as inconclusive. Previous handoff
  reported tsc clean before this hardening slice; Vitest is the verified gate
  in this session.
