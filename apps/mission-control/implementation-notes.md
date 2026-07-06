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
- Current Codex PTY: `npm exec -w @nexus/mission-control tsc -- --noEmit`
  stayed silent for ~90s and was stopped as inconclusive. Previous handoff
  reported tsc clean before this hardening slice; Vitest is the verified gate
  in this session.
