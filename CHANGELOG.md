# Changelog

---

## Unreleased — Reviewer Seat Slice 1 + Pilot-Status Lane + Org-Switch Fix (2026-07-08)

**Reviewer seat, slice 1 (identity-bound reviewer).** Migration 0035 `reviewer_seats`: invite flow with single-use sha256-hashed invite codes (7-day expiry), acceptance binds the seat to the accepting Clerk user id, one accepted seat per workspace (partial unique index), revoke is workspace-scoped and audited. New API: `GET/POST/DELETE /api/reviewer-seat` (invite code returned exactly once; delivery is the caller's responsibility this slice) and `POST /api/reviewer-seat/accept` (also writes reviewerName/reviewerEmail to the strategy profile so the scorer gate reflects the bound identity). Approvals are now identity-bound: the recorded actor is the server-resolved identity (client `actor` only as legacy bearer fallback), and each approval audit records whether the approver IS the bound reviewer (`approvedByBoundReviewer`). Not yet done (next slices): invite email delivery, accept UI, gating `pilotReady` on an accepted seat, restricting approval rights to the bound reviewer. Tests: `tests/reviewer-seat.test.ts` (6). No-DB store fallback included.

**Returning-user pilot-status lane.** `lib/services/pilot-status.ts` derives one of four lane states (start / gated / select / in_motion) from the strategy profile; the Mission Control pilot-status card is now state-driven with exactly one primary action per state and a Now/Next strip. Tests: `tests/pilot-status.test.ts` (7).

**Clerk org-switch session fix.** New `components/org-session-sync.tsx` mounted in the authed layout: on in-session org change it forces `session.touch()` then `router.refresh()`, so backend API routes honor the new org immediately (the 2026-07-08 release-gate nuance, previously only handled in browser automation).

Full suite after changes: 65 files / 451 tests passing.

---

## Unreleased — Scorer Signal Confidence + Demo Week Plan (2026-07-07)

**Scorer signal confidence (cold-start honesty).** The workflow scorer now labels how much workspace signal backs each run: `computeSignalStrength` (none/weak/moderate/strong from evidence count and open decisions/actions) in `lib/services/workflow-twins.ts`, `payload.signal` on scorer runs, "Provisional" appended to weak/none run summaries, a provisional line under the `/workflows` recommendation, and the label on the Mission Control pilot-status card. Persisted as an informational `signal_strength` entry inside the pilotGates JSON (`blocked: false`) — it never gates confirmation and needs no migration. Spec: `docs/WORKFLOW_TWIN_SCORER.md` §Signal confidence. Tests: `tests/workflow-twins.test.ts` (9/9; full suite 434 tests / 61 files).

**Calendar-driven planning.** `docs/USER_STRATEGY_AND_PIVOTS.md` §Decisions 2026-07-07 records the dated decisions (reviewer becomes a real Clerk-org seat before pilot signing; monetization waitlist -> pilots -> Stripe; scorer cold-start labeled not blocked; pilot afterlife named as an open gap). New `docs/DEMO_RUNBOOK_REGULATED.md` sequences the regulated-buyer demo. `TASKS.md` § Demo/Launch/Pilot Calendar Plan and `BACKLOG.md` carry the execution items.

---

## Unreleased — Pre-Pilot Readiness Lifecycle + Mission Control Status (2026-07-07)

Closed three paid-pilot follow-ups from the readiness/scorer work.

**Mission Control pilot-status card.** Role dashboards now load the strategy profile and show a Pilot status card with buyer lane, readiness band, selected workflow, sponsor, reviewer, and scorer gate status. The card appears even in the no-evidence state so a returning readiness/onboarding user can see what is still blocking pilot confirmation before sources are ingested.

**Claim-link product email.** `POST /api/readiness/submit` now sends the single-use claim link through the existing Resend email boundary when an email is supplied and Resend is configured. Submission still succeeds if Resend is absent or blocked; audit events record `readiness.claim_email_sent`, `readiness.claim_email_skipped`, or `readiness.claim_email_failed`.

**Readiness pruning.** Added `repository.pruneReadinessSubmissions()` and protected `POST /api/cron/readiness-prune`, which deletes expired or already-consumed readiness claim rows and audits `readiness.prune_ran`. `docs/RENDER_DEPLOY.md` now lists the daily cron entry.

**Tests.** Added `tests/readiness-submit-email.test.ts` and `tests/readiness-prune-cron.test.ts`; focused verification covers claim email send/skip and cron auth/prune behavior.

---

## Unreleased — Clerk Production Domain Cutover Hygiene (2026-07-06)

Removed legacy `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` from the Render blueprint and env template, and removed global `signInFallbackRedirectUrl` / `signUpFallbackRedirectUrl` props from `ClerkProvider`. Sign-in and sign-up redirects now live on the Clerk auth components themselves, which preserves the post-auth landing behavior without serializing deprecated redirect fields on the live `pinavia.co` sign-in/sign-up pages.

---

## Unreleased — Write-Side Ownership Sweep (2026-07-07)

Second API security sweep, this time on mutating handlers (PATCH/POST/DELETE), following the read-side sweep. Verified every by-id mutation confirms the resource belongs to the caller's workspace before writing — either in the route (evidence, agent-keys, knowledge-note PATCH) or via a repository `WHERE id AND workspaceId` clause (actions, decisions, agent-output rollback, knowledge-note DELETE, workflow-twin runs). All clean.

One integrity gap found and fixed: `POST /api/actions` accepted a body `decisionId` and created the action without checking the parent decision was in the caller's workspace. Not a tenant-isolation breach (the action lands in the caller's own workspace and cannot touch the foreign decision), but it allowed dangling or cross-tenant parent references. Now validated (`decision_not_found`, 404). Regression `tests/actions-decision-fk.test.ts`. Findings recorded in `docs/SECURITY_REVIEW.md` §1.2. Full suite 59 files / 425 tests, tsc clean.

---

## Unreleased — Unified Pilot-Gate Enforcement + Strategy-Profile Store Fallback (2026-07-06)

Closed two follow-ups from the scorer slice: split gate enforcement and the DB-only strategy profile.

**One source of truth for pilot gates.** Previously `PATCH /api/strategy-profile` re-checked sponsor and reviewer while the scorer separately computed evidence readiness — a state where the UI said "blocked" but the API could accept a direct write. Now the scorer owns gate evaluation and persists a single server-owned snapshot (`pilot_ready`, `pilot_gates`, migration 0034) on the strategy profile after each run. The route enforces that one field: committing a `selectedWorkflow` while `pilotReady !== true` is rejected with `pilot_gates_unmet` plus the blocked gates in the response body. `pilotReady`/`pilotGates` are deliberately absent from the client input schema, so they cannot be forged through PATCH.

**Strategy-profile store fallback.** `getStrategyProfile`, `upsertStrategyProfile`, and the new `setPilotReadiness` now fall back to the in-memory store when no database is configured, matching the pattern used by twins and decisions. No-database demos now exercise the full lane-aware scorer and pilot confirmation instead of always reading the profile as null. The fallback is ephemeral and is not production storage.

**Tests.** New `tests/strategy-profile-store.test.ts` (no-DB round-trip, pilot-readiness persistence, minimal-profile creation); `strategy-profile-authz.test.ts` updated to the `pilotReady` enforcement model with `blockedGates`. Full suite 58 files / 423 tests, tsc clean. Requires migrations 0033 and 0034 on database deployments.

---

## Unreleased — Workflow Scorer: Lane Fit + Pilot Gates (2026-07-06)

Turned the workflow scorer from a ranking display into the governed pilot bridge the strategy calls for, closing the funnel from "workspace provisioned" to "first workflow selected".

**Lane-fit weighting.** The scorer now reads the workspace strategy profile and applies a buyer-lane boost (`lib/services/workflow-twins.ts`): each lane favours its first-pilot examples from `docs/LANE_ASSIGNMENT_SPEC.md`. Regulated enterprise favours risk/ops review and never the autonomous regulatory-response workflow.

**Two-tier gating.** Hard gates mark workflows that are unsuitable as a FIRST pilot (autonomous external action, legal commitment, regulatory exposure without sign-off) — they keep their score but can never be the recommendation and render in a separate "not suitable for first pilot" section. Bridgeable gates (named sponsor, named reviewer, evidence available) are reported as `pilotGates` with a `pilotReady` flag; the recommendation still shows so the user sees the path, but pilot start stays blocked until gates clear.

**Confirm-first-pilot.** The `/workflows` scorer card shows the gate checklist and a "Confirm as first pilot" action, enabled only when pilot-ready, that writes `selectedWorkflow` to the strategy profile. Enforced server-side: the scorer persists `pilotReady` / `pilotGates`, and `PATCH /api/strategy-profile` rejects a new `selectedWorkflow` unless that server-owned snapshot is pilot-ready (`pilot_gates_unmet`). This now covers sponsor, reviewer, and evidence gates. The scorer never auto-selects.

**Fixes.** Repaired an unterminated-comment syntax error in `workflow-twins.ts` (a half-finished lane-fit edit) that broke the build. Added a no-DB strategy-profile fallback for demos and migration `0034_strategy_profile_pilot_ready.sql` for durable scorer readiness snapshots in production.

**Tests.** Extended `tests/workflow-twins.test.ts` (hard gates, bridgeable gates, lane-fit boost) and `tests/strategy-profile-authz.test.ts` (selectedWorkflow gate). `docs/WORKFLOW_TWIN_SCORER.md` now documents the implemented engine. Verified with focused scorer/profile tests (17), full suite 57 files / 420 tests, and production build. Standalone `tsc` was inconclusive in this PTY.

---

## Unreleased — API Auth-Bypass Sweep (2026-07-06)

Completed the full manual API auth-bypass review (was BACKLOG "spot-verified only"). Enumerated all 135 route handlers under `app/api/` and classified each by auth mechanism and caller-supplied `workspaceId` handling. Found five routes where an authenticated caller could pass `?workspaceId=` or a body `workspaceId` to reach another workspace's data, and fixed all five:

- `GET /api/recommendations` — cross-tenant read; now pinned to the caller's workspace.
- `GET /api/pilot/paperwork` — cross-tenant read and no scope gate despite a documented `read:admin` requirement; now enforces `requireScope("read:admin")` and pins the workspace.
- `GET/PATCH /api/settings/workspace` — cross-tenant read and write of security-relevant settings (LLM provider, sensitivity ceiling, approval threshold), plus a bearer-token scope gap; now pinned, `workspaceId` removed from the PATCH schema, and `read:settings` / `write:settings` enforced.
- `GET /api/ingestion/status` — bearer tokens could override the workspace (sessions were already pinned); now pinned for all auth types.
- `GET/PATCH /api/strategy-profile` — fixed earlier the same day with the lane inheritance change; included here for completeness.

New regression suite `tests/api-workspace-authz.test.ts` (6 cases). `docs/SECURITY_REVIEW.md` §1.1 records the full findings table; the overstated "all routes use requireScope" claim was corrected. Verified with the focused authz test, full suite (57 files / 415 tests), and production build. Standalone `tsc` was inconclusive in this PTY.

---

## Unreleased — Readiness-to-Onboarding Lane Inheritance (2026-07-06)

Implemented the missing bridge in the canonical user strategy: readiness assessment -> buyer lane -> signup/onboarding -> first workflow pilot. Spec: `docs/LANE_ASSIGNMENT_SPEC.md`.

**Lane assignment.** Added `lib/services/lane-assignment.ts`, a server-side pure function mapping sector, company size, role, and readiness band to a buyer lane with confidence and a human-readable reason. Regulated sectors (financial services, healthcare, government) always route to `regulated_enterprise`.

**Public readiness page.** `/readiness` now captures three optional profile dropdowns (sector, size, role) after scoring, and the result card shows a lane-framed continue path. Submission stores a pending record in the new `readiness_submissions` table (migration 0033) and returns a single-use claim code (SHA-256 hash stored, 72h TTL). The signup CTA carries `?readiness=<code>`; sessionStorage backs up the token only, never the payload.

**Claim endpoint.** `POST /api/readiness/claim` (authenticated) consumes the code atomically and writes the strategy profile: lane, write-once `initialLane`, scores, band, sector, size, role, `laneConfidence`, `externalRef` (previously unused), and `governancePosture: regulated` for regulated enterprise. Audited as `readiness.claim_redeemed` — the "buyer lane assigned" funnel stage is now measurable.

**Onboarding inheritance.** The wizard claims the token on mount, loads the strategy profile, and shows a lane banner: "use this profile" prefill (skips Discover), a governed reclassification checkpoint at profile confirmation (reason required, audited, leaving regulated requires extra confirmation), and lane-fit first-workflow examples at Go Live. Lane-change rules are enforced server-side by `PATCH /api/strategy-profile`; audit payloads include old lane, new lane, reason metadata, and regulated-exit confirmation where relevant. Lane lifecycle fields added to `strategy_profiles`: `initial_lane`, `lane_change_reason`, `lane_confidence`, `lane_changed_by`, `lane_changed_at`. Lane rule: readiness sets the initial lane; onboarding adapts within it; changes are rare, explainable, confirmed, and audited.

**Security fix.** `GET/PATCH /api/strategy-profile` previously honored a caller-supplied `workspaceId` (query or body), letting any authenticated caller read or write another workspace's strategy profile. Both now use the authenticated workspace only. Regression test added.

**Tests.** `tests/lane-assignment.test.ts` (8 cases), `tests/strategy-profile-authz.test.ts` (7 cases), and `tests/strategy-profile-repository.test.ts` (1 case). tsc clean for our code.

---

## Unreleased — Meridian Compliance Review Runtime (2026-07-06)

Promoted `meridian_compliance_review` to an executable runtime, giving the Meridian pivot suite a native skill. Six of seven native skills are now runtime-ready.

**Engine.** Added `lib/agents/meridian-compliance-review.ts`, which maps a regulator license type's requirements (from `lib/domain/regulatory-requirement-library.ts`) to a submission's governed evidence. Outputs requirement coverage (each requirement covered or not, cited via department-tag match with source spans), compliance gaps (uncovered requirements most-severe-first, each with the library's gap indicator), a qualified-reviewer packet (critical/high requirements plus the standing "qualified reviewer required" boundary — Meridian never files or certifies compliance itself), and filing caveats (missing critical/high requirements plus not-legal-advice and jurisdiction-review boundaries). Pure and deterministic; only `processed` evidence is cited.

**Runner + executor.** Added `lib/services/meridian-compliance-review-runner.ts` (passport gate + audit events) and `POST /api/agents/native-skills/meridian-compliance-review` (session tenant, zod-validated license type/status, `read:evidence` scope).

**Settings action.** Settings → Agent Governance now has a "Run compliance review" button rendering filing-ready status, requirement coverage, compliance gaps with indicators, and filing caveats.

**Catalog + tests.** `meridian_compliance_review` is now `runtime_ready` with `externalReferences: []`. Added `tests/meridian-compliance-review.test.ts` (6 cases) and extended `agent-skills.test.ts`. Full suite 53 files / 393 tests, tsc clean.

---

## Unreleased — Quorum Governance Review Runtime (2026-07-06)

Promoted `quorum_governance_review` to an executable runtime, giving the Quorum pivot suite a native skill.

**Engine.** Added `lib/agents/quorum-governance-review.ts`, which reviews a board meeting's governed evidence together with its decisions and actions. It composes a board-pack completeness checklist (notice, agenda, quorum, conflicts, prior minutes, resolutions, financials) cited via department-tag match with the standing Quorum governance boundaries from `lib/board-governance-workflow.ts`. Outputs governance findings (each requirement covered or not, with cited source spans), decision gaps (overdue open decisions, decided decisions with no follow-through action, actions missing an owner or due date, open blocker actions), an approval packet (decided decisions plus the human-approval boundary — Quorum never signs or finalizes automatically), and board-pack caveats (missing requirements plus the no-legal-authority / human-approval / jurisdiction-review boundaries). Pure and deterministic; only `processed` evidence is cited.

**Runner + executor.** Added `lib/services/quorum-governance-review-runner.ts` (loads evidence, decisions, and actions; passport gate; audit events) and `POST /api/agents/native-skills/quorum-governance-review` (session tenant, zod-validated, `read:evidence` scope).

**Settings action.** Settings → Agent Governance now has a "Run governance review" button rendering the record-ready status, board-pack completeness, decision gaps, and the human-approval packet.

**Catalog + tests.** `quorum_governance_review` is now `runtime_ready` with `externalReferences: []`. Added `tests/quorum-governance-review.test.ts` (8 cases) and extended `agent-skills.test.ts`. Full suite 52 files / 386 tests, tsc clean (excluding pre-existing stale `.next/types` duplicate-file noise from a local build).

---

## Unreleased — Vantage Diligence Analysis Runtime (2026-07-06)

Promoted `vantage_diligence_analysis` to the first executable pivot-suite runtime, giving the Vantage product line a real native skill.

**Engine.** Added `lib/agents/vantage-diligence-analysis.ts`, which composes the DD checklist library (`lib/domain/dd-checklist-library.ts`) with the grid engine's citation model. Given a deal's governed evidence pool and a deal type, it produces diligence coverage (every checklist item, covered or not, with cited evidence via department-tag match), red flags (uncovered critical/high items, each carrying the item's specific red-flag indicator), model tie-outs (financial items marked tied-to-source vs. unverifiable based on whether cited evidence carries numbers), and IC memo sections (the template populated deterministically from findings and gaps). It also derives a coverage-signal recommendation: `do_not_proceed` on any critical gap, `proceed_with_conditions` on any gap, else `proceed`. Pure and deterministic; only `processed` evidence is ever cited.

**Runner + executor.** Added `lib/services/vantage-diligence-analysis-runner.ts` (passport gate + audit events) and `POST /api/agents/native-skills/vantage-diligence-analysis` (session tenant, zod-validated deal type and options, `read:evidence` scope).

**Settings action.** Settings → Agent Governance now has a "Run diligence analysis" button rendering the recommendation, red flags with indicators, per-item coverage, and IC memo section statuses. All three pivot-relevant runtimes are UI-runnable.

**Catalog + tests.** `vantage_diligence_analysis` is now `runtime_ready` with `externalReferences: []`. Added `tests/vantage-diligence-analysis.test.ts` (7 cases) and extended `agent-skills.test.ts`. Full suite 51 files / 377 tests, tsc clean.

---

## Unreleased — Document Integrity Executor (2026-07-06)

Closed the runtime/UI gap: `document_integrity_review` was `runtime_ready` but had no way to trigger it outside code.

**Executor endpoint.** Added `POST /api/agents/native-skills/document-integrity-review`, mirroring the grid executor (session tenant never from body, zod-validated options, `read:evidence` scope). It runs the integrity engine and returns per-document findings, parse-quality score, missing source spans, and repair recommendations.

**Settings action.** Settings → Agent Governance now has a "Run document integrity review" button next to the grid button. It renders a per-document table (source path, type, parse-quality badge, findings) plus repair recommendations. Both native runtimes are now runnable from the UI.

---

## Unreleased — Evidence Grid Review Executor + Document Integrity Runtime (2026-07-06)

Made `evidence_grid_review` runnable on demand and promoted `document_integrity_review` to an executable first-party runtime.

**Executor endpoint.** Added `POST /api/agents/native-skills/evidence-grid-review`. It validates a review spec (dimensions with keywords and required flags), derives the tenant from the authenticated session, runs the engine against the workspace's governed evidence, and returns the cited grid, issue flags, missing-evidence notes, and reviewer escalations. Gated on `read:evidence` like Ask; it reads evidence and writes audit events only.

**Settings action.** Settings → Agent Governance now has a "Run evidence grid review" button that executes a starter board-review spec against governed evidence and renders cited rows (source path, confidence, freshness, quoted span), reviewer escalations, and missing-evidence notes inline.

**Document integrity runtime.** Added `lib/agents/document-integrity-review.ts`, a per-document engine that reuses the grid engine's `extractSourceSpan` helper. It scores parse quality per record and flags `empty_text`, `weak_extraction`, `stale_evidence`, `missing_source_span`, `unverified_provenance`, `ungoverned_status`, and `missing_tabular_structure` (for spreadsheet sources), then turns findings into concrete repair recommendations. Its runner (`lib/services/document-integrity-review-runner.ts`) deliberately does not pre-filter to `processed` evidence, since integrity review exists to inspect documents that have not yet cleared governance. `document_integrity_review` is now `runtime_ready` with `externalReferences: []`.

**Tests.** Added `tests/document-integrity-review.test.ts` (7 cases) and extended `tests/agent-skills.test.ts` for the second runtime_ready promotion. Full suite 50 files / 369 tests, tsc clean.

---

## Unreleased — Evidence Grid Review Runtime (2026-07-06)

Promoted `evidence_grid_review` from a designed native skill to a first-party executable runtime.

**Engine.** Added `lib/agents/evidence-grid-review.ts`, a pure, deterministic engine that turns governed evidence records plus a review spec into a cited grid: one row per review dimension, each cited to source spans with provenance, confidence, and freshness. Cells are scored `supported`, `weak`, `unsupported`, or `blocked`. It emits issue flags (`low_confidence`, `stale_evidence`, `unverified_provenance`, `ungoverned_status`, `restricted_sensitivity`), missing-evidence notes, and reviewer escalations, plus started/completed audit events. No I/O, no LLM, no wall-clock reads, so it is fully unit-testable.

**Governance boundary.** Restricted evidence is never cited and is escalated to the data owner. Only `processed` evidence is citable; `pending_approval`/`quarantined` matches are flagged and block the cell. Sensitive regulatory, legal, or data-protection content in cited text is escalated to a qualified reviewer (compliance officer, legal counsel, data protection officer).

**Runner.** Added `lib/services/evidence-grid-review-runner.ts`, which loads the governed evidence pool, applies the agent passport gate exactly like Ask retrieval, runs the engine, and writes the `native_skill.evidence_grid_review.started`/`.completed` audit events with passport-denial counts.

**Catalog.** `evidence_grid_review` is now `runtime_status: "runtime_ready"` with `externalReferences: []`; the tabular-review reference remains recorded in the sourcing review as design provenance only.

**Tests.** Added `tests/evidence-grid-review.test.ts` (9 cases) covering citation with source spans, weak/stale downgrades, missing-evidence notes, restricted and ungoverned blocking, sensitive-content escalation, provenance flags, citation capping, and audit events. Updated `tests/agent-skills.test.ts` for the runtime_ready promotion.

---

## Unreleased — Agent Skill Sourcing Review (2026-07-06)

Added a GitHub/Skills CLI sourcing review for the Nexus agent skill taxonomy.

**Review doc.** Added `docs/AGENT_SKILL_SOURCING_REVIEW.md`, mapping every current Nexus skill across ingest, browse, review, analyze, and act to a build/adopt decision.

**External candidates.** Shortlisted GitHub-sourced references including `github/awesome-copilot@agent-governance`, `anthropics/knowledge-work-plugins` legal/compliance skills, `anthropics/financial-services` diligence workflows, `anthropics/claude-for-legal` tabular review, `anthropics/skills` document skills, `kepano/obsidian-skills`, `adhikasp/mcp-git-ingest`, and `browser-use/browser-use`.

**Boundary.** The review keeps runtime skills Nexus-native when they touch tenant evidence, approvals, audit, legal/regulatory judgment, or source-system writeback. Public GitHub skills are treated as references or operator aids until code/license/security review is complete.

**Fine-tooth review started.** Added the first detailed candidate review for `github/awesome-copilot@agent-governance`: MIT-licensed, single `SKILL.md`, strong governance reference, but reference-only for now because Nexus should adapt the policy, pre-flight intent, tool-gate, and audit patterns into its TypeScript passport/dispatcher architecture.

**Legal workflow candidate reviewed.** Added a fine-tooth review of `anthropics/knowledge-work-plugins` legal skills (`review-contract` and `compliance-check`): Apache-2.0, strong playbook and compliance-packet structure, reference-only until Nexus has jurisdiction packs, evidence IDs, reviewer gates, and connector permission manifests.

**Vantage candidate reviewed.** Added a fine-tooth review of `anthropics/financial-services` private-equity skills (`dd-checklist` and `ic-memo`): Apache-2.0, strong Vantage blueprint for diligence coverage, red-flag escalation, sector overlays, and IC memo packets, but not a runtime dependency because the full repo is broad, connector-heavy, and finance-advice sensitive.

**Evidence-grid candidate reviewed.** Added a fine-tooth review of `anthropics/claude-for-legal@tabular-review`: Apache-2.0 and the strongest reusable runtime pattern so far for one-row-per-document evidence grids with typed columns, source quotes, locations, explicit review states, normalization, and reviewer verification.

**Document skills reviewed.** Added a fine-tooth review of `anthropics/skills` document skills (`pdf`, `docx`, `xlsx`): useful quality-bar references for extraction, exports, workbook integrity, and source-span handling, but source-available/proprietary rather than installable or vendorable.

**Operator/tool candidates reviewed.** Added fine-tooth reviews for `kepano/obsidian-skills`, `adhikasp/mcp-git-ingest`, and `browser-use/browser-use`: Obsidian skills are plausible local operator aids; GitHub ingestion and browser automation are future tool candidates only, requiring sandboxing, allowlists, auth boundaries, and audit trails before any Nexus use.

**Shortlist tests started.** Added `lib/agents/external-skill-candidates.ts` with typed ranking, license, risk, workflow, skill, verdict, and blocker metadata for the reviewed shortlist. Expanded `tests/agent-skills.test.ts` to assert candidate integrity, ranking, no runtime-ready GitHub candidates, proprietary-skill guards, and sandbox gates for tool candidates.

**Nexus-native skill build started.** Added `lib/agents/nexus-native-skills.ts` with first-party skill definitions for evidence-grid review, agent-governance review, Vantage diligence, Quorum governance, Meridian compliance, document integrity, and Knowledge Workspace synthesis. The catalog validates against known Nexus skills, workflows, pivot suites, approval gates, audit events, and external-reference boundaries.

**Native skill API/UI.** Added `GET /api/agents/native-skills` and surfaced the native skill pack in Settings → Agent Governance with runtime status, pivot/workflow coverage, approval gates, audit events, and reference-informed status.

**Native skill tests.** Expanded `tests/agent-skills.test.ts` to pin the first native skill pack, full pivot/workflow coverage, evidence-grid mapping, high-impact approval/audit rules, and the rule that reference-informed native skills are not external runtime installs.

**Next step.** Implement the first executable native skill: `evidence_grid_review`, producing source-backed review grids, issue flags, missing-evidence notes, and reviewer escalations from governed evidence records.

---

## Unreleased — Product Subdomain Detection (2026-07-06)

Added the code layer for Pinavia's endorsed house-of-brands routing across NexusAI, Quorum, Meridian, Vantage, and Nucleus.

**Detection.** New `lib/product-detection.ts` maps request hostnames to product keys: `app.pinavia.io`, `nexus.pinavia.io`, and local dev resolve to NexusAI; `quorum.pinavia.io`, `meridian.pinavia.io`, `vantage.pinavia.io`, and `nucleus.pinavia.io` resolve to their product surfaces. Unknown hosts safely fall back to NexusAI.

**Middleware.** `middleware.ts` now attaches `x-nexus-product` to every request and includes the HTTPS product subdomains in the CORS allow-list. This keeps the current shared Render/Next.js app as the runtime while allowing product-aware branding and routing.

**Public shell.** The public/auth shell in `app/layout.tsx` now renders the product name/Pinavia lockup from hostname metadata. Clerk sign-in fallbacks are route-safe: Quorum redirects to the live `/board` route; Meridian, Vantage, and Nucleus fall back to `/dashboard/ceo` until their dedicated product routes ship.

**Tests.** Added `tests/product-detection.test.ts` covering hostname mapping, product origins, route prefixes, route-safe sign-in redirects, and Pinavia metadata coverage.

**Operational follow-up.** Before custom domains are shown externally, configure Cloudflare DNS records, attach the product domains to the Render service, add all product URLs to Clerk allowed origins/redirects, then smoke each product domain after deploy.

---

## Unreleased — Vertical Input/Action Screen Guidance (2026-07-06)

Built a cross-vertical Figma review board and backed it with code-level screen guidance so the next route work has explicit user inputs, action points, and human-control copy.

**Figma.** Added page `11 Vertical Input Action Screens V0.2` in the Nexus Figma file with board node `87:3`: 33 editable desktop-browser frames across Quorum (17), Meridian (8), and Vantage (8). Each frame shows route candidate, arc, primary user, current gate, user inputs, action points, Ask behavior, and evidence/guardrail copy.

**Guidance registry.** Added `quorumScreenGuidance`, `meridianScreenGuidance`, and `vantageScreenGuidance`, plus lookup helpers for each vertical. Tests now pin that every registered screen has guidance before it can be treated as build-ready.

**Paperwork.** Updated the UI baseline ledger and the Quorum, Meridian, and Vantage workflow docs with the Figma board link and the guidance contract.

**Verification.** Focused vertical workflow tests passed (3 files / 23 tests), full mission-control tests passed (47 files / 330 tests), `tsc --noEmit` passed, and `git diff --check` passed.

---

## Unreleased — Agent Skill Taxonomy and Pivot Catalog (2026-07-06)

Added a typed agent skill system that bridges agent definitions, dispatch compatibility, and pivot-specific rosters.

**Skill taxonomy.** Added `lib/agents/agent-skills.ts` with 34 skills across 5 families (ingest, browse, review, analyze, act). Each skill maps to source types; each family maps to required dispatch job types. `agentSupportsJobType()` and `missingFamiliesForJob()` enforce compatibility at dispatch time.

**Agent library upgraded.** `lib/agents/agent-library.ts` now carries typed `AgentSkill[]` hints on every agent instead of raw strings. Every agent receives baseline skills (`browse sources`, `review evidence`, `analyze evidence`) automatically. 29 agents across 7 rooms, 23 role-to-agent-trio mappings.

**Pivot agent catalog.** Added `lib/agents/pivot-agent-catalog.ts` with 5 suites (Nexus, Quorum, Meridian, Vantage, Nucleus), each with agent rosters, required skills, and explicit product boundaries. `validatePivotAgentCatalog()` checks that every suite references real agents and covers required skills. `buildAgentCatalog()` produces the full discoverable catalog.

**Catalog API.** Added `GET /api/agents/catalog` (gated on `read:settings`) returning skill families, skills, agents with skill families, pivot suites with agent rosters, and catalog integrity status. Route pre-validates catalog integrity and returns 500 with a diagnostic message if any suite is broken.

**UI surface.** Dashboard agent cards now show "Skills" instead of "Future skills" (4 hints shown). Settings → Agent Governance now renders "Pivot Skill Suites" with catalog integrity badge.

**Dispatcher tightened.** `enforceAgentSkillCompatibility()` now logs `missingFamilies` in the audit trail when agent assignment is denied, so operators can see exactly which skill families an agent lacks.

**Tests.** Added `tests/agent-skills.test.ts` (5 tests): skill normalization, job family compatibility, baseline skill enforcement on every library agent, catalog integrity validation, and pivot suite coverage.

---

## Unreleased — Vertical Workflow Boundary Correction (2026-07-06)

Corrected the first pivot-workflow pass so verticals own their own domain workflows instead of being forced through one generic pivot template.

**Removed shared template.** Deleted `lib/pivot-workflows.ts`, `tests/pivot-workflows.test.ts`, and `docs/PIVOT_WORKFLOW_BUILDS.md`. Quorum remains in its dedicated `lib/board-governance-workflow.ts` registry; other verticals should follow that pattern with their own domain files.

**Meridian.** Added `lib/meridian-regulatory-workflow.ts`, `tests/meridian-regulatory-workflow.test.ts`, and `docs/MERIDIAN_REGULATORY_WORKFLOW.md`. Meridian now uses regulatory arcs: scope, evidence, gap, and filing.

**Vantage.** Added `lib/vantage-dd-workflow.ts`, `tests/vantage-dd-workflow.test.ts`, and `docs/VANTAGE_DD_WORKFLOW.md`. Vantage now uses deal arcs: dealroom, coverage, redflags, and memo.

**Design implication.** Figma page `10 Pivot Workflow Builds V0.1` (`82:3`) remains a design exploration, but it is no longer treated as the source of product architecture. Nexus-core is the shared engine for ingestion, governance, evidence, agents, billing, and approvals; verticals own their workflows.

**Global-use hardening.** Formalized Quorum's governance boundaries and added jurisdiction/market-pack requirements for Quorum, Meridian, and Vantage. Added route-safe screen resolvers (`safeScreensForStage`, `safeMeridianScreensForStage`, `safeVantageScreensForStage`) plus strict integrity validators so registries can fail tests while future route code can log and continue during workflow expansion.

---

## Unreleased — Quorum Board Governance Workflow (2026-07-06)

Expanded the Quorum product definition from a board-intelligence screen into a full board-governance workflow.

**Workflow spec.** Added `docs/QUORUM_BOARD_GOVERNANCE_WORKFLOW.md`, a Pakistan-first but jurisdiction-pack-ready model for board setup, director and committee registers, terms of reference, policies, meeting calendar, agenda, board pack, pre-read Q&A, quorum, conflicts, decisions, circular resolutions, minutes, signatures, action register, and governance audit export.

**Code plan.** Added `lib/board-governance-workflow.ts` with a typed Quorum workflow registry: Pakistan source pack, 17 planned screens, 10 workflow stages, three arcs, and helpers for rendering stage/screen mappings. `/board` now shows a compact governance workflow roadmap below the current Board Room intelligence flow. Added `tests/board-governance-workflow.test.ts`.

**Figma.** Added page `09 Quorum Governance Workflow V0.2` in the Nexus Figma file with board node `80:3`: 17 editable desktop-browser screens covering setup wizard, board register, committee register, TOR/policy library, meeting calendar, agenda builder, board pack builder, director pre-read, attendance/quorum, conflict declarations, committee recommendations, decision/vote capture, circular resolutions, minutes drafting, minutes review/sign-off, action register, and governance audit pack.

**Design implication.** The existing six-screen Figma build remains useful for concept review, but the next Quorum desktop pass should add the setup, committee, TOR, agenda, quorum, conflict, decision, minutes, signature, and action-register screens before implementation claims are made.

---

## Unreleased — Quorum UI/UX Figma Build (2026-07-06)

Started the Quorum pivot UI/UX build around the existing `/board` Board Room route and board-delta backend.

**Figma.** Added page `08 Quorum UI UX Build` in the Nexus Figma file with board node `78:3`: six editable desktop-browser screens covering baseline setup, between-meetings delta review, Director Q&A, evidence drilldown, decision handoff, and board export pack.

**Registry.** Updated `docs/UI_BASELINE_VERSIONING.md` with the Quorum Figma link, current repo ref at registry time, live `/board` route, screen-set description, and route mapping.

---

## Unreleased — Quorum Board Room Screen (2026-07-05)

Added the first Quorum-branded board intelligence screen on top of the existing board synthesis and delta APIs.

**UI.** New `/board` route renders `BoardRoomPanel`: a director-facing board delta workspace with a stable board identifier, generate action, current status chips, between-meetings delta output, first-run baseline state, and Director Q&A cards with confidence, evidence refs, source links, and entity links.

**Navigation.** Mission Control side nav now includes `Board Room` under Intelligence, making the board workflow discoverable without going through API-only routes.

**Governance.** The screen explicitly preserves the V1 trust boundary: no board output files, sends, approves, or commits actions automatically. The surface points directors back to evidence, ingestion, and decisions for human-owned follow-through.

**Verification.** `npm exec -w @nexus/mission-control tsc -- --noEmit --pretty false`, `npm test -w @nexus/mission-control`, and `npm run build -w @nexus/mission-control` all passed locally. The production build includes route `/board`.

---

## Unreleased — Selected BuilderOS Workflow Skills (2026-07-05)

Installed only the two BuilderOS skills selected for Nexus workflow support: `.claude/skills/design-better/SKILL.md` and `.claude/skills/build-loop-codex/SKILL.md`, plus the upstream MIT license notice at `.claude/skills/BUILDEROS_LICENSE.txt`.

These are project-local agent workflow aids, not runtime app dependencies. They are intended to support the Figma -> Render UI improvement loop through design-craft review and build/review/test discipline. The full BuilderOS bundle was not installed.

---

## Unreleased — UI Baseline Versioning Clarification (2026-07-05)

Clarified that the original Vercel-built UI is historical design provenance, not an active deployment lane.

**Runbook.** New `docs/UI_BASELINE_VERSIONING.md` defines `UI V0.1 baseline`, `Render production`, `UI V0.2 proposal`, and later UI iterations. It records how to preserve the original Vercel-origin UI through Figma, git tags, Render deploy references, and docs without maintaining duplicate Vercel infrastructure.

**Screen registry.** The baseline ledger now captures V0.1/V0.2 Figma refs, current git ref at registry time, Render comparison route, source formats, screen sets, and route mapping for live Render review.

**Iteration loop.** Added the recursive Figma-to-Render improvement loop: capture current app, update Figma, improve design, implement in React/Next.js, verify, deploy on Render, commit the version record, then repeat from the accepted baseline.

**Paperwork.** `DEPLOY.md`, `docs/PRODUCTION_HEALTH_CHECKLIST.md`, and `docs/INFRA_DECISION_MEMO.md` now say Render is the runtime path and Vercel is only the historical origin of the first UI baseline.

---

## Unreleased — Contextual Help Dialog Pattern (2026-07-05)

Added a reusable contextual help pattern for non-technical explanations across Mission Control.

**Component.** New `components/ui/help-dialog.tsx` exports `HelpDialog` and `HelpLabel`: a small encircled question-mark trigger, accessible dialog title/body, OK close button, Escape close, outside-click close, focus return to trigger, and screen-reader labelling. `KpiHero` now accepts optional help metadata so metric cards can carry the same pattern without one-off markup.

**Coverage.** Added contextual help to high-confusion surfaces: Executive Room metrics and route panels, Ask question/lens/department/result metadata, ingestion confidence/quarantine, executive synthesis badges, evidence approvals, recommendation queue, workflow scorer/backcast/shadow ROI, Settings plan/policy/scheduled synthesis controls, and connector source-policy/IMAP settings.

**Copy registry.** Added `docs/CONTEXTUAL_HELP_COPY.md` so every current help title and explanation is visible in one edit-friendly place for future features.

**Connector setup.** Added `docs/CONNECTOR_SETUP_GUIDE.md` and expanded Settings > Connectors with a full setup guide: every connector, live/future status, provider setup/docs links, environment variables, redirect URI, scopes/access, data scope, and setup notes. Future connectors now point to setup/planning links instead of dead in-app install routes.

**Verification.** Fast TypeScript compiler-API syntax pass over all touched TSX files passed. Targeted `git diff --check` passed. Full project `tsc` and touched-file `tsc` both timed out after 120 seconds in the local shell without returning diagnostics, matching the current local-runner caveat already recorded in `HANDOVER.md`.

---

## Unreleased — Whole-Codebase Re-check and Demo Hardening Fixes (2026-07-04)

Re-checked the NexusAI Mission Control codebase from git state, API route inventory, middleware, auth, LLM routing, DB schema/migrations, storage, ingestion, recommendations, workspace settings, dependency audit, and live public smoke.

**Fixes.** Scoped recommendation approvals to the authenticated workspace by adding `repository.updateRecommendationStatusForWorkspace()` and wiring `/api/approvals/:recommendationId` through `requireScope("write:approvals")`; the route no longer updates by recommendation ID alone. Updated `/api/health` so original-file storage contributes honestly to top-level health only when `NEXUS_R2_ORIGINALS=enabled`. Replaced the stale hardcoded `/settings/workspace` `workspace-demo` view with real Clerk workspace settings. Marked Clerk webhooks and all OAuth connector callbacks as public middleware routes only because each route has its own signature/state verifier.

**Verification.** Route-auth inventory returned no unprotected API routes outside explicit verifier/public paths. `npm audit --omit=dev --json` returned zero known production vulnerabilities. Live domain smoke passed all 8 checks against `https://nexus-mission-control.onrender.com`, and live `/api/health` returned `status=ok` with database, vector search, R2 originals, and DeepSeek configured.

**Local runner caveat.** `tsc`, focused Vitest, `next build`, and `npm ls --workspaces --depth=0` still hang silently in this local shell and were stopped cleanly. Treat those as inconclusive local-runner gates, not passing checks.

---

## Unreleased — Email Boundary and Production Sender Paperwork (2026-07-04)

Aligned the Nexus strategy and deployment paperwork around the auth/product email split for Pinavia demos.

**Decision.** Clerk owns auth email: signup/signin verification, password reset, account lifecycle, and future organization invitation email. Nexus owns product email only: scheduled synthesis briefs, pilot notifications, support/security notifications, and later workflow alerts. No custom auth-confirmation flow or self-hosted mail server for V1 demos.

**Docs.** Updated `docs/USER_STRATEGY_AND_PIVOTS.md`, `docs/INFRA_DECISION_MEMO.md`, `docs/SCHEDULED_SYNTHESIS_SPEC.md`, `docs/ROADMAP.md`, `BACKLOG.md`, `TASKS.md`, `CUTOVER.md`, `DEPLOY.md`, `docs/RENDER_DEPLOY.md`, `.env.example`, and `HANDOVER.md`.

**Operational follow-up.** Authenticate the `pinavia.io` sender domain, set `NEXUS_RESEND_API_KEY` and `NEXUS_FROM_EMAIL` (for example `Nexus <noreply@pinavia.io>`), confirm Clerk email verification/password reset settings in Clerk, and run one scheduled synthesis email delivery test before demos.

**Voice future-proofing.** Recorded that Whisper/local voice should not be a first-iteration demo dependency. Browser microphone access stays disabled for V1. The future seam is transcript-first: local OS dictation or local Whisper on the user's PC produces text, then Nexus handles it as a normal Ask query, note, or evidence transcript. Nexus-owned audio processing is deferred until consent, audit logging, sensitivity gating, and transcript retention rules are designed.

---

## Unreleased — Knowledge Workspace: Richer Graph Filters (2026-06-27)

Closes the `BACKLOG.md` P2 item "Richer Knowledge graph filters" — filter the Knowledge Workspace note list and graph by tag, source kind, entity, workflow, ref type, and freshness window, all from one shared filter state.

**Backend.** New `applyKnowledgeFilters`/`KnowledgeFilterOptions`/`KnowledgeFreshness` exports in `lib/knowledge/markdown.ts` — a single filter implementation shared by both the DB-backed `repository.ts` and the in-memory `store.ts`, so filter semantics never drift between the two backends. `repository.listKnowledgeNotes` widens its DB fetch pool to 500 rows when any structural filter is active (the existing pattern used for full-text search), then filters and slices in TypeScript rather than building JSONB array-containment SQL. `repository.getKnowledgeGraph` now filters notes first, then drops any link whose source note didn't survive the filter, so the graph never shows dangling edges. New `lib/knowledge/filter-params.ts` is the single shared query-param parser used by both `GET /api/knowledge/notes` and `GET /api/knowledge/graph`, so the note list and the graph always agree on what a given filter URL means.

**UI.** `components/knowledge-workspace.tsx` gets a collapsible Filters panel in the vault sidebar: tag chips (multi-select, populated from a one-time unfiltered facet fetch so the tag picker always shows the whole vault's tags, not just the filtered subset), source-kind chips, a ref-type dropdown, a freshness dropdown, a workflow dropdown (from `/api/workflow-twins`), and an entity search-and-select control distinct from the existing note-to-entity linking control. An active-filter count badge and a clear-filters button. Built entirely from existing `.panel`/`.badge`/`.input`/`.btn-subtle` utility classes per the locked design system — no new colors or one-off styles.

**Verification.** Scoped `tsc --noEmit` (excluding the generated `.next/types` glob, which is unrelated to this change) passed clean in-sandbox on the touched files. `npm test` and `npm run build` could not be run in the sandbox itself: `node_modules` is synced from Ali's Mac and carries darwin-arm64 native bindings (e.g. `rolldown`'s binary), while the sandbox runs linux-arm64 — vitest fails at startup with `Cannot find native binding`, unrelated to this change. Ali ran the full 4-gate cycle on his own machine on 2026-06-27 — `npm install` (0 vulnerabilities), `tsc --noEmit`, `npm test`, `npm run build` — all passed clean. Marked `done` in `BACKLOG.md`.

---

## Unreleased — Pilot Build-Out Step 5: Figma Signature-Pattern Parity (2026-06-26)

Closes the Figma side of the locked design system's six signature patterns (Trust Drawer, Approval Consequence Preview, Now/Next strip, Mode Indicator, Nav Health Badges, Passport Drift Warning). All six are already live in the actual product since Step 4 (`d3aa1ce`); this step makes the Figma prototype an honest mirror rather than a partial one.

**Found genuinely present already** on page "06 V0.2 Full Desktop Prototype" (file `NcQ8F5a0hczwGwZua2gfun`, node `44:2`): Trust Drawer (`44:299`), Approval Consequence Preview (`44:304`), Now/Next strip (`44:102`/`44:105`) — each a real, repeated card across the ~30 screens.

**Built from scratch via the Figma Plugin API**, after confirming the other three patterns had no Figma representation at all — not faked, built from the real shipped components: Mode Indicator (`54:2`, sourced from `lib/mode-context.tsx` — all 4 auth-mode states with their actual badge text and tooltip copy), Nav Health Badges (`54:25`, sourced from `components/side-nav.tsx` — the 4 real badge routes with their actual tone mapping), Passport Drift Warning (`54:48`, sourced from `app/settings/page.tsx`'s Agent Governance tab — the real "Passport drift" chip copy and version-mismatch logic). All three render-verified via `get_design_context` against the locked token hex values.

**Code Connect — blocked by Figma plan tier, resolved manually.** `send_code_connect_mappings` requires a Dev/Full seat on a Figma Organization or Enterprise plan; confirmed via `whoami` that both of Ali's teams (pro, starter) sit below that tier. Ali's explicit decision: no upgrade — mappings are documented by hand instead, in `docs/UI_UX_WORKPLAN.md` (new "Code Connect status" section), with a node-to-component table for all 6 patterns and an explicit note that repeated cards on this page are duplicated frames, not true Figma component instances, so each mapping is representative of one instance rather than cascading.

**Verification:** `cc64239` builds on Ali's locally-verified Step 4 commit (`d3aa1ce` — 239 tests passing across 37 files, `npm run build` clean at 135 pages). Both commits pushed to `origin/main` by Ali from his own machine (sandbox has no outbound GitHub access).

---

## Unreleased — Gmail, Outlook Mail, and IMAP Email Connectors (2026-06-26)

Built per Ali's explicit instruction ("both 1 and 2") to build Gmail/Outlook and IMAP in the same pass rather than sequencing IMAP as long-tail per the original `docs/ARCHITECTURE.md` §13 sequencing note. Not yet committed/pushed, build-verified, or `npm install`-ed — see Immediate Next Steps in `HANDOVER.md`.

**Gmail** — OAuth2 reusing the existing Google Drive client (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`), `gmail.readonly` + `userinfo.email` scopes. `lib/connectors/gmail.ts`: `listMessages()`, `getMessage()`, `extractPlainTextBody()` (walks the MIME tree, prefers `text/plain`, falls back to stripped `text/html`), `getHeader()`. Ingest serializes Subject/From/To/Date + body to text, `sourceType: "email_crm"`. Each connector needs its own redirect URI (`/api/connectors/gmail/callback`) added to the same OAuth client used by Google Drive. Scope is message listing + per-message ingest — attachment extraction and thread rollups not yet built.

**Outlook Mail** — OAuth2 via Microsoft Graph reusing the existing SharePoint Azure AD app registration (`MICROSOFT_CLIENT_ID`/`MICROSOFT_CLIENT_SECRET`/`MICROSOFT_TENANT_ID`), `Mail.Read` scope. `lib/connectors/outlook-mail.ts`: `listMessages()` (paged via `@odata.nextLink`), `getMessage()`, `extractPlainTextBody()` (strips HTML — Graph defaults to HTML bodies). Ingest as `sourceType: "email_crm"`. Works identically against Outlook.com and Microsoft 365/Exchange Online since both sit behind Graph. Needs its own redirect URI (`/api/connectors/outlook-mail/callback`) added to the SharePoint app registration alongside the `Mail.Read` scope grant.

**IMAP Email** — the codebase's first non-OAuth, non-`fetch()` connector ("second runtime" per `docs/ARCHITECTURE.md` §13). Protocol-level, not provider-specific: one connector that works against any IMAP-over-TLS server, same approach Thunderbird/Apple Mail take — no "Spacemail connector," no "Hostinger connector." `lib/connectors/imap.ts` uses the new `imapflow` dependency for the stateful TCP/TLS session (`verifyConnection()`, `listMailboxes()`, `listMessages()`, `getMessage()`) and the new `mailparser` dependency for RFC822 MIME parsing. No `install`/`callback` routes — instead `POST /api/connectors/imap/connect` accepts host/port/secure/username/password directly, test-connects before storing, and persists credentials through the same `repository.upsertConnector` AES-256-GCM encryption path every OAuth connector's tokens already go through. Settings page renders an inline form (host/port/TLS toggle/username/password/label) instead of an OAuth "Install" link. Ingest as `sourceType: "email_crm"`. No POP3 by design. Requires `npm install` to fetch the two new dependencies — not yet run.

**Shared plumbing**: `ALLOWED_TYPES` in `app/api/connectors/[type]/route.ts` extended with `gmail`, `outlook-mail`, `imap`. `CONNECTOR_CATALOGUE` in `app/settings/connectors/page.tsx` extended with all three, plus a new `connectKind: "manual"` flag on `ConnectorDef` so the settings page can render IMAP's inline credential form instead of an OAuth install link. `package.json` gained `imapflow`, `mailparser`, `@types/mailparser`.

**Docs accuracy note**: per the convention established 2026-06-25, all three are marked `[~]`/`local verified` (not `[x]`/`done`) in `TASKS.md`/`BACKLOG.md` — code-complete locally, pending real-OAuth-app verification (Gmail/Outlook) or a real-mailbox connection test (IMAP), none yet committed, pushed, or build-verified.

---

## Unreleased — Five New OAuth Connectors: GitHub, Jira, HubSpot, QuickBooks, LinkedIn (2026-06-25)

Built per Ali's explicit instruction to build all five rather than defer LinkedIn/social. All five follow the pure-fetch, no-SDK pattern established by Google Drive/SharePoint: `lib/connectors/{type}.ts` client + 4 API routes (`install`, `callback`, `files`, `ingest`) per connector, each using the shared HMAC-signed OAuth `state` pattern from `lib/security.ts`. Not yet committed/pushed or build-verified — see Immediate Next Steps in `HANDOVER.md`.

**GitHub** — classic OAuth web app flow (tokens don't expire). `lib/connectors/github.ts`: `listRepos()`, `listIssues()`, `getIssue()`. Ingest serializes issue title/state/author/labels/body to text, `sourceType: "github"`. Scope is per-repo issue/PR list + single-issue ingest — not yet the CI-pass-rate/deployment-frequency/label-rollup engineering health signals originally specced in `TASKS.md`.

**Jira** — Atlassian OAuth 2.0 (3LO). `lib/connectors/jira.ts`: resolves `cloudId` via `accessible-resources` after token exchange, `searchIssues()` (JQL), `getIssue()`, `extractAdfText()` to flatten Atlassian Document Format descriptions. Ingest as `sourceType: "jira"`. Scope is per-issue, not yet the aggregate sprint/epic-rollup signals originally specced.

**HubSpot** — standard OAuth2. `lib/connectors/hubspot.ts`: `listDeals()`, `getDeal()`. Ingest serializes dealname/amount/dealstage/pipeline/closedate, `sourceType: "crm"`. Scope is deals only — contact activity and email sequence performance not yet built.

**QuickBooks Online** — Intuit OAuth2 with HTTP Basic token exchange/refresh and `realmId` capture from the callback redirect (every Accounting API call is scoped by company file). `lib/connectors/quickbooks.ts`: `getApiBase()` (sandbox/production switch via new `QUICKBOOKS_ENVIRONMENT` env var), `listInvoices()`, `getInvoice()`. Ingest as `sourceType: "finance_export"`, default sensitivity `confidential`. Scope is invoices only — P&L/cash-flow/AR-AP-aging/balance-sheet report pulls not yet built.

**LinkedIn** — standard OAuth2 with `LinkedIn-Version`/`X-Restli-Protocol-Version` REST headers. `lib/connectors/linkedin.ts`: `listAdministeredOrgs()`, `listOrgPosts()`, `getPost()`. Ingest as `sourceType: "social_export"`, default sensitivity `public`. Install/callback work standalone; `files`/`ingest` additionally require LinkedIn's Community Management API product, which needs separate partner review/approval — will 502 with an underlying 403 until approved.

**Shared plumbing**
- `app/api/connectors/[type]/route.ts` — `ALLOWED_TYPES` expanded with all 5 new types.
- `app/settings/connectors/page.tsx` — 5 new `CONNECTOR_CATALOGUE` entries (lane: `saas`, `available: true`), 12 new OAuth-callback error messages, 5 new "To enable {Connector}" instructional blocks (LinkedIn's explicitly flags the Community Management API gate).
- `render.yaml` — 10 new env vars (`GITHUB_CLIENT_ID/SECRET`, `JIRA_CLIENT_ID/SECRET`, `HUBSPOT_CLIENT_ID/SECRET`, `QUICKBOOKS_CLIENT_ID/SECRET/ENVIRONMENT`, `LINKEDIN_CLIENT_ID/SECRET`), all `sync: false`.
- `CUTOVER.md` — same 10 env vars added to the `.env` template, plus a new explanatory paragraph with registration URLs and the shared redirect URI pattern.
- `TASKS.md` — Jira, HubSpot, GitHub, QuickBooks wishlist lines marked `[~]` (partially closed) with explicit notes on what's built vs. what the original line specced; new LinkedIn line added under "Marketing and Growth bundle" also marked `[~]`.

**Docs accuracy note:** Jira/HubSpot/GitHub/QuickBooks are marked partial (`[~]`), not complete (`[x]`), because the actual built scope (single-record list + ingest) is narrower than what the original `TASKS.md` wishlist lines specified (aggregate/rollup signals only). LinkedIn is additionally gated on a LinkedIn partner-approval step outside this codebase's control.

---

## Unreleased — Engineering Guardrails Implementation, Pilot Paperwork Page, Prompt Registry Migration (2026-06-25)

Closes Task #19 (guardrails contract layer) and adds the rendered version of the existing pilot paperwork API. Committed as `9da3411`, on top of `2ff4c26` (SharePoint/Teams connector).

**Engineering guardrails (Task #19, closed)**
- Added `lib/guardrails.ts` (331 lines) — the typed contract layer called for in `docs/ENGINEERING_GUARDRAILS.md`: `RunnerState` discriminated union, `AuthMode` (clerk_cloud / local_license / offline_local / hybrid_sync_pending), `EffectResult<T>` for disk/network/LLM/storage/source-system effects, `VerifierOutcome` taxonomy (passed, user-fixable failed, system error, timeout, OOM, permission denied, policy denied, provider unavailable, cancelled), `RunnerEvent` append-only event shape, and an `assertNever` exhaustiveness helper.
- Added `tests/guardrails.test.ts` (168 lines) — 16 runtime assertions covering each state/outcome variant and exhaustive-handling behavior.
- This is the contract layer only; no autonomous/local runner has adopted it yet. Runners should import these primitives when built rather than inventing parallel ad hoc state shapes.

**Pilot Paperwork Pack page**
- Added `app/pilot/paperwork/page.tsx` (343 lines) — a print-ready, client-rendered view of the existing `GET /api/pilot/paperwork` response (SOW pre-fill, onboarding checklist, success scorecard, billing trigger checklist, value-proof pack). "Save as PDF" (browser print) and "Copy as Markdown" actions match the consulting send workflow. Linked from `app/export/page.tsx`'s Export Hub as a new "Pilot Paperwork Pack" card.

**Prompt registry migration**
- Migrated the two LLM system prompts in `lib/services/company-detection.ts` (company detection, focus-to-dashboard mapping) into `lib/prompts/registry.ts` as versioned entries `onboarding.company-detect` (1.1.0) and `onboarding.focus-map` (1.0.0), so prompt changes are tracked, owned, and audited via `prompt_rendered` events instead of living as untracked string constants.
- `detectCompanyProfile()` and `mapFocusToDashboard()` now accept an optional `{ workspaceId }` audit context; the two callers in `app/api/workspace/detect-profile/route.ts` and `app/api/workspace/first-focus/route.ts` now pass `ctx.workspaceId` through for attribution.

**Docs**
- Corrected `HANDOVER.md` and `TASKS.md`, which had drifted from actual repo state after the prior session's commit/push was done by Ali outside the sandbox (a stale `.git/index.lock` plus a fuse-mount permission restriction blocked direct sandbox commits both times this session).

---

## Unreleased — Agent Room Knowledge Graph Preview (2026-06-25)

**Added**
- Added `KnowledgeRoomGraph`, a lightweight room-bottom Knowledge Workspace graph preview for role dashboards.
- Reuses the existing workspace knowledge graph data and links users back to `/knowledge` for full editing, backlinks, import/export, and sync.

---

## Unreleased — Queen's Review Fixes: Sentry + DeepSeek Cleanup (2026-06-25)

Follow-up to Task #32, from an external automated review ("Queen's Review"). Four of five findings were confirmed and fixed; one (claimed missing `app/error.tsx`) was a false positive — the file already existed with Sentry wiring from the original Task #32 work.

**Fixed**
- `instrumentation.ts` — `onRequestError` no longer relies solely on the `x-workspace-id` header for the `workspaceId` Sentry tag. That header is absent precisely on the errors that matter most: auth failures, CORS preflight, 429s from the rate limiter, and malformed requests that fail before any route handler resolves workspace context. Added `resolveWorkspaceId()`: header first, then `?workspaceId=` query param (several GET routes pass it this way), then an explicit `"unknown"` tag so Sentry dashboards can distinguish "no workspace could be resolved" from "we forgot to tag this."
- Three stale `deepseek-chat`/`deepseek-reasoner` references that would have configured the soon-to-deprecate model (retires 2026-07-24 15:59 UTC): `CUTOVER.md`'s env var template, the AI Policy dropdown in `app/settings/page.tsx` (a pilot customer could have picked either deprecated model from the UI today), and the `ai-policy.test.ts` fixture. Added an inline deprecation comment at `lib/services/llm.ts`'s `DEFAULT_MODEL` fallback expression (line ~292) and switched its literal fallback from `deepseek-chat` to `deepseek-v4-flash`.
- `sentry.server.config.ts` — `tracesSampleRate` raised from 0.2 to 1.0 in production. At pilot volume (well under 1,000 transactions/day) full tracing costs nothing meaningful and gives complete visibility; the 0.2 figure was sized for consumer-app traffic that doesn't apply yet.
- Added `tests/observability/sentry.test.ts` — vitest coverage for `captureHandledError`/`captureDegradedState` with `@sentry/nextjs` mocked, covering Error-vs-non-Error capture, tag attachment, missing-workspaceId graceful handling, and extra-context attachment. Like the rest of the Sentry work, this can't run in this sandbox (no installed dependency) — run `npm test` on your machine to verify.

**Not fixed (false positive)**
- Queen's review claimed `app/error.tsx` doesn't exist. It does — it was added/updated during the original Task #32 work in this same session and already calls `Sentry.captureException` in a `useEffect`. No action needed.

---

## Unreleased — Sentry Production Error Tracking (2026-06-25)

Closes Task #32 from the production hardening backlog.

**Added**
- `@sentry/nextjs` (^10.0.0) added to `package.json` dependencies. **Not yet installed in this sandbox** — the sandbox's npm registry access returns 403 Forbidden, so this must be installed on your machine (`npm install`) before `tsc --noEmit` or `next build` will succeed.
- `instrumentation.ts` — registers Sentry for both the Node and Edge runtimes at boot, and exports `onRequestError`, which Next.js 15 calls automatically for every uncaught error in route handlers, server components, server actions, and middleware. This is the main coverage mechanism — none of the ~36 API routes needed manual wrapping for this to work.
- `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` — per-runtime `Sentry.init()`. All disabled by default (`enabled: !!process.env.SENTRY_DSN`) so the app runs identically with no Sentry account configured. Server config strips `authorization`/`cookie` headers in `beforeSend` before anything leaves the process. Client config has session replay explicitly off (would otherwise capture DOM content, including evidence text).
- `app/global-error.tsx` (new — root layout previously had no error boundary at all) and `app/error.tsx` (updated) both call `Sentry.captureException`.
- `lib/observability/sentry.ts` — `captureHandledError()` and `captureDegradedState()` helpers for the minority of call sites that catch-and-continue rather than throw (so `onRequestError` never sees them). Tags every report with `route`, `errorType`, and `workspaceId` where available.
- Wired the helper into two of the highest-value swallowed-error paths: the Stripe webhook's event-processing catch (`app/api/billing/webhook/route.ts` — a silently-failed plan upgrade is a billing-correctness issue, not just noise) and `callLLMWithRouting()`'s full-fallback-exhaustion branch in `lib/services/llm.ts` (every provider in a surface's chain failed — previously invisible, now reported as a warning-level message with the surface ID and candidate count).
- `next.config.mjs` wrapped with `withSentryConfig`; source map upload is disabled unless `SENTRY_AUTH_TOKEN` is set, so it's a no-op until you configure it. Added `tunnelRoute: "/monitoring"` so ad-blockers don't strip the browser beacon.
- `middleware.ts` CSP `connect-src` extended to allow Sentry's ingest domains (`*.ingest.sentry.io`, `*.ingest.us.sentry.io`, `*.ingest.de.sentry.io`) — without this the browser SDK's CSP would silently block its own error reports.
- `render.yaml`: added `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (all `sync: false` — set manually in Render dashboard).

**Fixed in passing**
- `render.yaml` still hardcoded `NEXUS_LLM_MODEL: deepseek-chat` — exactly the legacy model name flagged as a 2026-07-24 deprecation risk in the Task #36 changelog entry below. Changed to `deepseek-v4-flash`.

**Deliberately out of scope**
- Per-route manual `captureException` wrapping was not added to all 36 API routes — `onRequestError` already covers every uncaught throw automatically. Manual wiring was reserved for the two paths above where the error is caught and the function returns normally (nothing throws past the route handler for `onRequestError` to see).
- Session replay and performance tracing are configured conservatively (`tracesSampleRate: 0.2` in production, replay off) — revisit once real pilot traffic volume is known.

**Action needed on your machine before this ships**
1. `npm install` (pulls `@sentry/nextjs`).
2. `npx tsc --noEmit 2>&1 | grep -v ".next/"` — could not be verified in this sandbox since the package isn't installed there (npm registry returns 403 in this environment).
3. Create a Sentry project, set `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` (same value, project DSN) in Render. `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` are optional — only needed for source-map upload at build time.
4. Trigger a test error (e.g. visit a broken route) and confirm it shows up in the Sentry dashboard before treating this as live in production.

---

## Unreleased — LLM Routing Policy Wired + DeepSeek V4 Migration (2026-06-25)

Closes Task #36 from the production hardening backlog (architecture review: "routing table declared but never executed — must wire before pilot").

**Fixed — routing**
- `callLLM()` in `lib/services/llm.ts` now honours `lib/config/model-routing.ts`'s declarative per-surface routing policy when callers pass a `surfaceId`. Previously the policy file existed but was never read — every call used a single `NEXUS_LLM_PROVIDER` env toggle regardless of which of the 10 declared surfaces (ask, dashboard, synthesis, decision memo, recommendations, etc.) was calling.
- Added `callLLMWithRouting()`: walks each surface's `fallbackChain` in order, skips candidates that are disabled, not yet runtime-supported (openai/azure_openai/experimental_gateway), workspace-disallowed, or missing an API key, and returns the first successful call with `fromFallback: true` set whenever a non-primary candidate was used.
- `localOnlyMode` remains a hard stop (throws, no fallback attempted); per-provider allow-list checks are a soft skip (falls through to the next candidate).
- Wired `surfaceId` into all 8 real production call sites: `retrieval.ts` (ask_web_quick), `synthesis.ts` and `exports.ts` (daily_executive_brief), `dashboard.ts` (dashboard_cards), `decision-extraction.ts` (decision_memo), `recommendations.ts` (recommendation_draft), and both calls in `company-detection.ts` (ingestion_triage_assist).
- `app/api/eval/run/route.ts` deliberately left unmigrated — no `SurfaceId` exists for internal eval-harness calls; it falls through to the legacy single-provider path by design, not a missed call site.
- Scope boundary: only provider/model selection and fallback execution are wired from policy. `confidenceFloor` and `requiresApprovalBeforeUse` are intentionally left to existing downstream logic (`avgConfidence` checks, `shouldRouteOutputToReview`, output-gate) to avoid duplicating logic that already runs at each call site.

**Fixed — DeepSeek V4 migration (time-sensitive, verify before 2026-07-24)**
- DeepSeek is retiring the `deepseek-chat` / `deepseek-reasoner` model names on 2026-07-24 15:59 UTC (confirmed against `https://api-docs.deepseek.com/quick_start/pricing` on 2026-06-25). `DEFAULT_MODEL`'s deepseek fallback changed from `deepseek-chat` to `deepseek-v4-flash`.
- `estimateCostMicro()`'s deepseek pricing was a flat, stale $0.27/$1.10 per-million rate for all deepseek models. Replaced with confirmed current split pricing (cache-miss, no caching wired yet): `deepseek-v4-pro` $0.435/M in, $0.87/M out; `deepseek-v4-flash` $0.14/M in, $0.28/M out. Legacy `deepseek-chat` priced as flash since it maps to v4-flash non-thinking mode.
- **Action needed before 2026-07-24**: confirm no external config (Render env vars, admin settings) still hardcodes `deepseek-chat`/`deepseek-reasoner` as a literal model string outside this file.

**Tests**
- `tsc --noEmit` clean across the app after routing + call-site changes.
- No new automated test added for `callLLMWithRouting()` fallback behaviour this session — flagged as follow-up.

---

## Unreleased — Repository Transaction Safety (2026-06-25)

Closes Task #35 from the production hardening backlog (Queen's eval, High severity: "No DB transactions for multi-table writes").

**Fixed**
- `repository.createDecision` / `repository.updateDecision`: decision row write and audit event write now run inside a single `db.transaction()`. Previously these were two independent `runDb()` calls each swallowed with `.catch(() => null)` — a failure on the audit insert left the decision committed with no audit trail, and vice versa.
- `repository.createAction` / `repository.updateAction`: same fix — action row and audit event now commit or roll back together.
- `repository.saveAgentOutput`: version lookup, supersede-prior-active update, new row insert, and audit event insert now run inside one transaction instead of four sequential statements on the same connection. A failure partway through (e.g. the audit insert) no longer leaves a new agent output row marked active without an audit record.
- `repository.rollbackAgentOutput`: target lookup, active-row lookup, supersede update, restore update, and audit insert now run inside one transaction.

**Not changed**
- `enqueueDispatchJob` was reviewed and found to be a single-table insert — no fan-out exists in the current implementation, so no transaction wrapping was needed there.
- In-memory fallback paths (`store.*`) are unaffected — they remain single-process synchronous operations and don't need Postgres transactions.

**Tests**
- Added `tests/repository-transactions.test.ts` — mocks `pg`/`drizzle-orm/node-postgres` to verify `createDecision`, `createAction`, and `saveAgentOutput` each issue exactly one `db.transaction()` call covering all their writes, and that a failure on a later write inside the transaction does not produce two separate (partially-committed) transaction calls.

---

## Unreleased — Strategy Paper Trail Alignment (2026-06-25)

This docs-only pass keeps the updated paper trail aligned with the active NexusAI strategy.

**Strategy**
- Updated `docs/USER_STRATEGY_AND_PIVOTS.md` with the current operating paper trail and execution plan.
- Reconfirmed the strategy path: readiness assessment -> buyer lane -> signup/onboarding -> first workflow pilot -> governed value proof.

**Tasks and backlog**
- Updated `TASKS.md` with the active strategy operating plan.
- Updated `BACKLOG.md` with strategy/profile, pilot-paperwork generation, and Knowledge Workspace follow-through items.
- Updated `docs/ROADMAP.md` so deploy/smoke, strategy implementation, paperwork automation, and Knowledge follow-through are sequenced consistently.
- Added `docs/MARKDOWN_ESTATE_REVIEW_2026-06-25.md` to classify all repo Markdown files and capture targeted cleanup work.
- Cleaned up stale spec status headers, clarified deploy/cutover runbook roles, refreshed launch/demo copy, and promoted active UX review ideas into the backlog.

**Engineering guardrails**
- Added `docs/ENGINEERING_GUARDRAILS.md` from the FP review, translating type/state/effect principles into Nexus rules for autonomous runners, local/on-prem auth, connector sync, and verifier loops.
- Added matching backlog/tasks/handover references so typed state machines, append-only events, explicit async effects, and exhaustive failure categories are tracked before future automation work.

**Queen review fixes**
- Confirmed route-level Sentry capture through `app/error.tsx`, installed/resolved `@sentry/nextjs`, and fixed the Sentry test mock so TypeScript and targeted observability tests pass.
- Added an explicit `draftRefineFlow`/intermediate-step contract to the LLM call interface and wired routing policy flow metadata into routed calls.
- Added typed agent skill taxonomy plus dispatcher enforcement for explicit agent assignments; incompatible or unknown agents are denied, audited, and failed rather than silently executed.
- Replaced free-text evidence `sourceType` contracts with a canonical source-type enum and normalized ingestion/demo-reset paths through it.

---

## Unreleased — User Strategy and Paperwork Alignment

This documentation pass aligns NexusAI's paperwork and strategic docs around a readiness-first user strategy.

**User strategy**
- Added `docs/USER_STRATEGY_AND_PIVOTS.md` as the canonical source for buyer lanes and the core pivot from generic signup/dashboard to market-aware pilot conversion.
- Defined the flow: readiness assessment -> buyer lane -> signup/onboarding -> first workflow pilot -> governed value proof.
- Documented four buyer lanes: evaluator/SME, SME self-serve, business/advisory, and regulated enterprise.

**Paperwork and strategy docs**
- Updated roadmap, user flows, readiness, billing, workflow realignment, one-pager, pilot onboarding checklist, SOW template, success scorecard, billing triggers, and governance messaging.
- Pilot paperwork now requires first workflow target, sponsor, reviewer, evidence bundle, governance boundary, and shadow ROI metric.
- Regulated-buyer materials preserve the no-autonomous-writeback and human-approval boundary.

---

## 0.25.0 — Knowledge Workspace and Live Vault Sync (2026-06-17)

This release adds the Nexus Knowledge Workspace: an Obsidian-like company second-brain surface built into Mission Control.

**Knowledge Workspace UI**
- Added `/knowledge` and a side-nav entry under Intelligence.
- Added a three-pane vault workspace with notebook tree, quick search, markdown editor, preview mode, graph mode, backlinks, Nexus object refs, import/export controls, inbox triage, and local sync status/actions.
- Added CodeMirror markdown editing and a lightweight force graph visualization.
- Notes support `[[wikilinks]]`, `#tags`, headings, frontmatter metadata, and typed Nexus refs such as `evidence:ev-001`, `entity:...`, `workflow:...`, `decision:...`, and `recommendation:...`.

**Knowledge storage and APIs**
- Added migration `0026_knowledge_workspace.sql`.
- Added `knowledge_notes`, `knowledge_links`, and `knowledge_sync_events`.
- Added contracts for knowledge notes, links, graph, search results, sync events, source kind, link type, and sync mode.
- Added Postgres-first repository methods with in-memory fallback for local/demo mode.
- Added authenticated APIs under `/api/knowledge/*`: notes CRUD, search, graph, import, export, triage, and sync status/run.
- Added `read:knowledge` and `write:knowledge` bearer scopes, and added `/api/knowledge/*` to middleware bearer-token bypass for MCP/API clients.

**Markdown portability and local sync**
- Added Markdown frontmatter parse/write helpers, wikilink/tag/ref extraction, lexical search ranking, and graph projection.
- Added Obsidian-compatible ZIP export/import using existing `jszip`.
- Added optional local vault sync through:
  - `NEXUS_VAULT_SYNC=disabled|readonly|bidirectional`
  - `NEXUS_LOCAL_VAULT_PATH=/absolute/path/to/vault`
- Sync is disabled by default for hosted deployments. Local/dev/desktop/self-hosted users can opt in.
- Sync safety rejects traversal, unsupported extensions, hidden system paths, oversize files, and symlinks outside the vault.
- Bidirectional writes create `.conflicts/` copies when preserving local file versions.

**Ask and MCP**
- Ask retrieval now searches knowledge notes alongside governed evidence and returns `noteRefs` separately from `evidenceRefs`.
- Added `scripts/knowledge-mcp.mjs` and `npm run mcp:knowledge -w @nexus/mission-control`.
- MCP tools wrap the same internal APIs: `save_memory`, `search_memory`, `read_note`, `write_note`, `list_recent_notes`, `vault_status`, `sync_vault`, and `knowledge_graph`.

**Verification**
- TypeScript: 0 errors.
- Tests: 29 files / 187 tests passing.
- Production build: passed.
- Audit: `npm audit --omit=dev --json` reported 0 production vulnerabilities.
- Browser/API smoke note: unauthenticated local curl to protected `/knowledge` and `/api/knowledge/*` is Clerk-gated as expected; verify the UI in a logged-in browser session.

---

## 0.24.0 — Workflow Pilot Productization (2026-06-15)

This release turns the workflow-twin roadmap into a visible pilot-selection and ROI workflow.

**Connector Settings policy UX**
- Added active connector policy controls to Settings → Connectors.
- Slack connector settings now show install status, team name, last sync state, max sensitivity, and channel policy summary.
- Added editable Slack channel allowlist, ingest-all-public toggle, default sensitivity, max sensitivity, source policy, and admin notes.
- Added `PATCH /api/connectors/[type]` for connector policy updates with audit events.
- Slack event ingestion now honors connector policy before environment defaults, including disabled source policy and sensitivity ceiling.

**Workflow Twin Scorer**
- Added `/workflows` product page for creating starter twins, running the scorer, and reviewing recommended workflow pilots.
- Enriched workflow scoring across Decision & Action, Ops Review, Proposal/SOW, Regulatory Response, Agreement Review, and Risk Review candidates.
- Scoring now considers frequency, pain, data readiness, inverse risk, senior judgment, reusability, monetization, and speed benefit.
- Workflow scorer output includes a recommended first pilot, scoring weights, metrics, and shadow ROI plan.

**U6 Backcasting**
- Added `POST /api/workflow-twins/[id]/backcast`.
- Backcasting stores target state, time horizon, pilot scope, milestones, required evidence, success metrics, and approval boundaries on the workflow twin config.

**U7 Shadow ROI**
- Added `POST /api/workflow-twins/[id]/shadow-roi`.
- Captures manual minutes, Nexus minutes, rework counts, runs per month, saved minutes per run, monthly hours saved, speed gain, and rework delta.

**Verification**
- TypeScript: 0 errors.
- Tests: 28 files / 183 tests passing.
- Production build: passed.
- Browser note: local in-app browser authenticated `/workflows` smoke redirects to Clerk sign-in and could not authenticate in that browser session; verify in logged-in Chrome/Render after deploy.

---

## 0.23.1 — Production Hardening (2026-06-15)

Security and reliability fixes identified in the post-v0.23.0 audit. No new features.

**Stripe webhook idempotency (critical)**
- Added `stripe_processed_events` table (migration 0025) with a primary key on `event_id`.
- Added `repository.markStripeEventProcessed()` using `INSERT ... ON CONFLICT DO NOTHING` — returns `true` for new events, `false` for duplicates.
- Webhook handler now calls the guard before processing any event. Redelivered events are skipped with a console log; no double-activations or double-suspensions possible.
- Added in-memory fallback (`stripeProcessedEventCache` Set) for dev/no-DB environments.

**CSP Clerk domain (high)**
- Removed hardcoded `https://clerk.nexusai.io` from `script-src` and `connect-src` in `middleware.ts`.
- Replaced with `NEXT_PUBLIC_CLERK_DOMAIN` env var (defaults to `clerk.accounts.dev`).
- Added env var documentation to `docs/RENDER_DEPLOY.md`.

**Demo navigation and auth shell**
- `/start-pilot` now redirects directly to Clerk sign-up with `/onboarding` as the post-sign-up target.
- `/workspace` now redirects directly to Clerk sign-in with `/dashboard/ceo` as the post-sign-in target.
- Public/auth routes bypass DB health and authenticated workspace layout work so Clerk pages render cleanly before sign-in.
- Clerk redirect props were updated to the current fallback redirect API, and SignIn/SignUp components now carry explicit fallback targets.

**Cron and webhook rate limiting (high)**
- Added `/api/cron/*` rate limit rule (2 req/min per IP) as secondary defense if `NEXUS_CRON_SECRET` leaks.
- Added `/api/billing/webhook` rate limit rule (10 req/min per IP) matching Stripe's redelivery pattern.
- Added `/api/cron/billing` and `/api/cron/dispatch` to the public route bypass list (they were missing; handlers already validated `NEXUS_CRON_SECRET` internally but Clerk would have redirected them on cold start).

**DeepSeek cost estimates (medium)**
- Updated `estimateCostMicro()` in `lib/services/llm.ts`: DeepSeek pricing corrected from `$0.14/$0.28` to `$0.27/$1.10` per million tokens (input/output), matching current `deepseek-chat` pricing as of 2026-06.

**TypeScript contracts**
- Exported `DispatchJobRawInput` (`z.input<>`) alongside `DispatchJobInput` (`z.infer<>`) so callers can pass unparsed input (without `priority`/`maxAttempts`) and let the schema fill defaults.
- `enqueueJob()` in `lib/services/dispatcher.ts` now accepts `DispatchJobRawInput` and calls `dispatchJobInputSchema.parse()` internally.
- Fixed `makeJob` self-referential type error in `tests/dispatcher.test.ts`.

**Tests:** 28 test files / 179 tests passing. TypeScript: 0 errors.

---

## 0.23.0 — Company Memory and Slack Ingestion (2026-06-13)

This release turns the entity extraction substrate into visible Company Memory and adds the first real connector data flow.

**Company Memory UI**
- Added `/entities` Company Memory index with type/search filters and entity confidence/evidence counts.
- Added `/entities/[id]` detail pages with linked evidence, decisions, recommendations, actions, and a timeline.
- Added `GET /api/entities/[id]` for workspace-scoped entity memory retrieval.
- Added Company Memory to the side navigation.

**Slack connector ingestion**
- Slack app mentions stay on the Ask path.
- Allowlisted Slack channel messages can now ingest as governed evidence through the same `ingestEvidence()` pipeline used by uploads.
- Slack evidence receives source path/URI, timestamp, hash, connector instance, sensitivity, confidence, department hint, and audit events.
- DMs, multi-person DMs, bot/system subtypes, unsupported events, and non-allowlisted channels are skipped and audited.
- Added `SLACK_INGEST_CHANNELS` and `NEXUS_SLACK_INGEST_ALL` environment controls.

**Dispatcher hardening**
- Fixed strict TypeScript issues in dispatch API validation and DB-only queue methods.
- Decision extraction dispatch jobs now generate proposals and audit them without automatically creating canonical decisions.
- Synthesis dispatch handler now calls `synthesiseForRole()` with the correct argument shape.

**Production**
- Applied migrations `0021_synthesis_schedules.sql` through `0024_dispatch_jobs.sql` to the production database.
- Verified live Render health after push: database, vector search, R2 originals, and DeepSeek LLM all healthy.

**Tests**
- Added `tests/entity-memory.test.ts`.
- Added `tests/slack-connector.test.ts`.
- `npm run build --workspace @nexus/mission-control` passed.
- `npm test --workspace @nexus/mission-control` passed: 28 test files / 179 tests.

---

## 0.22.0 — Orchestration Dispatcher (2026-06-10)

Background job queue that decouples job submission from execution. Enables multi-agent fan-out, retry with backoff, priority queuing, job chaining, and a full audit trail of every agent invocation.

**DB migration**
- `db/migrations/0024_dispatch_jobs.sql`: `dispatch_jobs` table with partial index for efficient claim queries (`status='pending'`), workspace index, parent chain index.

**Drizzle schema**
- `db/schema.ts`: `dispatchJobs` pgTable with all columns.

**Contracts**
- `lib/contracts.ts`: `dispatchJobTypeSchema` (4 types), `dispatchJobStatusSchema` (5 statuses), `dispatchJobSchema`, `dispatchJobInputSchema`, `dispatchFanOutInputSchema`, and payload schemas for each job type.

**Repository methods (`lib/data/repository.ts`)**
- `enqueueDispatchJob()`: insert pending job (Postgres + in-memory fallback).
- `claimPendingJob()`: atomic `UPDATE...RETURNING` with `FOR UPDATE SKIP LOCKED` — prevents double-execution in concurrent cron.
- `markJobDone()`, `markJobFailed()` (with exponential backoff retry: 30s / 5m / 30m).
- `listDispatchJobs()`: paginated, filterable by status and jobType.
- `getDispatchJob()`: single job by ID.
- `cancelJob()`: sets status to cancelled.
- `countPendingJobs()`: counts pending jobs, optionally scoped to a workspace.

**Dispatcher service (`lib/services/dispatcher.ts`)**
- `enqueueJob()`: single-job enqueue wrapper.
- `enqueueFanOut()`: one job per role/value with merged payload.
- `claimNextJob()`: delegates to repository atomic claim.
- `executeJob()`: routes to handler by `job_type`, calls `markJobDone` / `markJobFailed`.
- `runDispatchCycle(batchSize)`: claims and executes up to N jobs sequentially — safe for token budget.
- Handlers: `handleAgentBriefJob` → `cardsForRole()`, `handleSynthesisJob` → `synthesiseForRole()`, `handleWorkflowRunJob` → `buildWorkflowTwinRunInput()` + `createWorkflowTwinRun()`, `handleDecisionExtractJob` → `proposeDecisionsFromAgentOutputs()` + `createDecision()`.

**API routes**
- `POST /api/dispatch`: enqueue single job or fan-out; returns `{ jobId }` or `{ jobs: [...] }` with 202.
- `GET /api/dispatch`: list workspace jobs (filterable by status, jobType; paginated).
- `GET /api/dispatch/[jobId]`: get single job with full payload and error.
- `DELETE /api/dispatch/[jobId]`: cancel a pending job.

**Cron runner**
- `POST /api/cron/dispatch`: claims and executes up to `NEXUS_DISPATCH_BATCH_SIZE` (default 5) jobs per tick. Returns `{ processed, succeeded, failed }`. Recommended Render schedule: every 2 minutes.

**Tests**
- `tests/dispatcher.test.ts`: ~25 tests covering enqueue, fan-out, claim priority ordering, executeJob success/failure, retry lifecycle, runDispatchCycle batch processing, cancel, countPendingJobs, workflow_run and decision_extract handlers.

**TypeScript check:** clean.

---

## 0.21.0 — Billing Tiers Session 2: Stripe Integration (2026-06-10)

Stripe Checkout, subscription lifecycle webhooks, Billing Portal, and trial-to-free conversion.

**Stripe module (no SDK — pure fetch)**
- `lib/billing/stripe.ts`: singleton Stripe HTTP client, `createCheckoutSession()`, `createBillingPortalSession()`, `verifyWebhookSignature()` (Web Crypto HMAC-SHA256), `getSubscription()`, `findOrCreateCustomer()`, `priceIdForPlan()`, `planFromPriceId()`, `PLAN_TOKEN_LIMITS`.

**API routes**
- `POST /api/billing/checkout`: creates Stripe Checkout Session for `pro`/`business` upgrade, returns `{ url }`. Rejects `free`/`enterprise`. Writes audit event.
- `POST /api/billing/portal`: creates Stripe Billing Portal session for subscription management, returns `{ url }`.
- `POST /api/billing/webhook`: handles `checkout.session.completed` (activate plan), `customer.subscription.updated` (plan change), `customer.subscription.deleted` (revert to free), `invoice.payment_failed` (suspend), `invoice.paid` (unsuspend). Signature verified with HMAC-SHA256 + replay protection (5-min window). Returns 200 for all valid events including unhandled types.

**Repository additions**
- `getStripeCustomerId()`, `setStripeIds()`, `activatePlan()`, `handleSubscriptionChange()`, `suspendWorkspace()`, `unsuspendWorkspace()`, `convertExpiredTrials()`, `getWorkspaceByStripeCustomer()`.

**Cron update**
- `POST /api/cron/billing`: now also runs `convertExpiredTrials()` (trial → free on expiry) alongside monthly token reset. Returns `{ workspacesReset, trialsConverted }`.

**Settings UI (Plan & Usage tab)**
- Upgrade to Pro / Upgrade to Business buttons that POST to `/api/billing/checkout` and redirect to Stripe.
- Manage Plan button (paid plans only) that POSTs to `/api/billing/portal`.
- Enterprise contact CTA for Business plan users.
- Success/cancelled banners after Stripe redirect (reads `?billing=success|cancelled`, then cleans URL).

**Env vars added to `.env.example`**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`, `NEXT_PUBLIC_APP_URL`.

**Tests**
- `tests/billing-stripe.test.ts`: 20 tests covering Stripe config, price ID resolution, token limits, webhook signature (valid/invalid/stale), trial conversion, customer lookup, checkout validation, portal validation, all 4 webhook event types.

**TypeScript check:** clean.

---

## 0.20.0 — Billing Tiers Session 1 (2026-06-10)

Plan-gated token budgets, feature flags, resource limits, and a Plan & Usage settings tab.

**Data layer**
- Migration `0023_billing_tiers.sql`: five new columns on `workspaces` (plan, monthly_token_limit, monthly_token_used, token_reset_at, plan_changed_at) and a `plan_definitions` table seeded with Free/Pro/Business/Enterprise rows.
- `db/schema.ts`: `planEnum`, `planDefinitions` table, and billing columns on workspaces.

**Budget enforcement**
- `lib/billing/budget.ts`: `checkTokenBudget()` with 5-minute in-process TTL cache; `canUseFeature()` for 8 feature flags; `checkEvidenceLimit()`; `getWorkspacePlanSummary()`; `invalidateBudgetCache()`.
- `lib/services/llm.ts`: `ask()` now gates on plan token budget before calling the LLM. Returns a structured budget-exceeded message on exhaustion; no change to callers.
- `lib/data/repository.ts`: `recordLLMUsage()` fires async `monthly_token_used` increment after each LLM call. New methods: `getWorkspaceBillingState`, `getPlanDefinition`, `updateWorkspacePlan`, `resetMonthlyTokens`, `resetAllDueMonthlyTokens`.

**API**
- `GET /api/billing/plan` (scope: `read:workspace`): workspace plan summary for Settings UI.
- `POST /api/cron/billing` (cron-secret): resets monthly token counters for all workspaces past reset date.

**Settings UI**
- New "Plan & Usage" tab added as the first tab in Settings, covering budget bar, limit rows (roles, evidence, team, API keys), and feature flag table.

**Tests**
- `tests/billing.test.ts`: 11 tests covering budget allow/block/unlimited/DB-error, feature gating, `ask()` budget gate, and cache TTL/invalidation.

**TypeScript check:** clean.

---

## 0.18.2 — Manual Synthesis Refresh and History (2026-06-10)

This release completes the practical synthesis polish loop: users can manually regenerate an executive brief and preserve the refreshed output in the existing U3 output history.

**Refresh**
- Added `POST /api/synthesis/[role]` to regenerate a role synthesis.
- The POST path persists refreshed synthesis into `agent_outputs` as `synthesis_<role>`.
- The dashboard synthesis panel now includes a `Refresh brief` button that calls the POST route and refreshes the page.

**History**
- Synthesis history reuses existing `agent_outputs` versioning, active-output switching, rollback plumbing, and audit events.
- No new DB table or migration required.

**Verification**
- `npm run test` passed: 21 files / 104 tests.
- `npm run build` passed.

---

## 0.18.1 — Executive Synthesis Traceability (2026-06-10)

This release makes the new Executive Synthesis brief more inspectable for demos and pilot users.

**Traceability**
- Added `sources` and `entities` to each `ExecutiveSynthesisQuestion`.
- Synthesis now maps evidence refs to readable source labels and evidence links.
- Synthesis now attaches extracted company-memory entities whose evidence refs overlap with the brief.
- The dashboard synthesis UI renders clickable source pills and entity chips under each answer.

**Implementation**
- `synthesiseForRole()` can still reuse dashboard-generated cards to avoid duplicate card generation.
- No database migration required.
- Older synthesis payloads remain valid because traceability arrays default to empty.

**Verification**
- `npm run test` passed: 21 files / 103 tests.
- `npm run build` passed.

---

## 0.18.0 — Executive Synthesis Layer (2026-06-10)

This release reframes the dashboard from a set of agent cards into a leadership brief that
answers the questions executives actually ask at the start of their day.

**Architecture**
- No new database tables. Synthesis is computed on demand from existing `agent_outputs` and evidence.
- Dispatcher calls `cardsForRole()` to collect all specialist agent outputs for a role, then the
  synthesis engine answers role-specific questions grounded in those briefs.
- Red-team checks applied per question answer before returning to the user.
- `synthesis.executive` added to the prompt registry.

**New service: `lib/services/synthesis.ts`**
- `synthesiseForRole(role, workspaceId, options)` — dispatcher + synthesis engine.
- `questionsForRole(role)` — returns role-specific question set:
  CEO gets 7 cross-functional questions; COO, CFO, CTO, CBO, CHRO get 5 role-tuned questions;
  all other roles get 5 generic leadership questions.
- Archetype language (bank CEO vs coffee shop owner) carried through via existing
  `buildCompanyContext()` and `briefLanguageInstruction()`.
- Each question answered independently in parallel for speed.

**New API: `GET /api/synthesis/:role`**
- Scope: `read:dashboard`. Returns `ExecutiveSynthesis` with answered questions, confidence,
  evidence refs, and agent card count.
- Department filter via `?department=` query param.

**New component: `components/synthesis-brief.tsx`**
- `ExecutiveSynthesisBrief` — primary hero panel. Numbered questions with evidence-backed answers,
  confidence badge, evidence source count, and answered/total indicator.
- `AgentDetailSection` — collapsible wrapper for specialist agent cards below the brief.
- `SynthesisBriefSkeleton` — loading skeleton matching question count.

**Dashboard reframe: `components/dashboard-panel.tsx`**
- Dashboard generation calls `cardsForRole()` once, then synthesis reuses those governed cards.
- Synthesis brief renders as primary panel above agent cards.
- Agent cards move into a collapsible `AgentDetailSection` (still fully accessible, one click).
- Single-agent filter view (`?agent=`) bypasses synthesis and shows cards directly.
- `AgentCards` extracted as internal component to avoid duplication.

**New contracts: `lib/contracts.ts`**
- `executiveSynthesisQuestionSchema` / `ExecutiveSynthesisQuestion`
- `executiveSynthesisSchema` / `ExecutiveSynthesis`

**Spec: `docs/EXECUTIVE_SYNTHESIS_SPEC.md`**
- Full design spec committed with role question sets, architecture, UI layout before/after,
  success criteria, and what this is not.

**Verification**
- 13 tests in `tests/synthesis.test.ts` covering question set correctness per role,
  contract validation, boundary cases.
- `npm run test` passed: 21 files / 102 tests.
- `npm run build` passed.

---

## 0.17.0 — Phase 2 AI Trust Layer (2026-06-10)

This release completes the P2 trust and operating-model blockers needed for regulated-buyer
conversations: eval harness, red-team checks, prompt registry, and workspace AI policy controls.

**Schema — migration 0020**
- Added workspace AI policy fields: `allowed_providers`, `local_only_mode`,
  `sensitivity_ceiling`, and `approval_required_threshold`.
- Added `prompt_registry` for durable prompt manifest/version metadata.
- Added `eval_runs` for persisted evaluation summaries and per-case results.

**Evaluation harness**
- Added `lib/eval/golden-set.ts` with 30 golden cases across six categories:
  risk detection, decision framing, recommendation quality, sector classification,
  source grounding, and restricted-data refusal.
- Added `lib/eval/harness.ts` for deterministic scoring, confidence checks, latency tracking,
  and aggregate run summaries.
- Added `POST /api/eval/run` and `GET /api/eval/results`.
- Added Settings → Eval tab.

**Prompt registry**
- Added `lib/prompts/registry.ts` with versioned prompt entries, owner, description,
  changelog, interpolation, missing-variable errors, and optional audit.
- Moved Ask and dashboard system prompts onto registry-backed `getPrompt()` calls.
- Added `GET /api/prompts` and Settings → Prompts tab.

**Red-team checks**
- Added `lib/security/red-team.ts` with PII, overconfidence, unsafe action, sensitivity ceiling,
  and hard-stop leakage checks.
- Wired red-team blocking into Ask and dashboard synthesis before user-visible output.
- Writes `red_team_violation` audit events when checks fail.

**Workspace AI policy**
- Added `lib/security/ai-policy.ts`.
- LLM calls now enforce workspace provider allow-list and local-only mode server-side.
- Ask and dashboard outputs below the workspace confidence threshold are routed to review.
- Added Settings → AI Policy tab for provider controls, local-only mode, sensitivity ceiling,
  and human-review threshold.

**Verification**
- Added tests for eval harness, prompt registry, red-team checks, and AI policy.
- `npm run test` passed: 20 files / 88 tests.
- `npm run build` passed.

---

## 0.16.3 — Entity Extraction Pipeline (2026-06-10)

This release turns the previously dormant `entities` table into the first working substrate for
Company Memory.

**Schema — migration 0019**
- Added `evidence_entity_links` to connect extracted entities to source evidence.
- Added uniqueness on evidence/entity pairs and indexes for workspace, evidence, entity, type,
  and name lookup.

**Contracts**
- Added `entityTypeSchema`, `entitySchema`, and `entityInputSchema`.
- Entity types now cover people, organizations, projects, risks, KPIs, amounts, dates, systems,
  processes, locations, products, and unknowns.

**Ingestion**
- Processed evidence now triggers deterministic entity extraction after the evidence record is saved.
- Extracted entities carry source path/type, department context, confidence, and evidence linkage.
- Pending/quarantined records remain excluded from entity extraction until reviewed.

**Repository and API**
- Added Postgres-first entity upsert/list methods with in-memory fallback.
- Added `GET /api/entities` with workspace scoping, type filter, search filter, limit, and by-type summary.
- Added `/api/entities` to the scoped agent/API route matcher.

**Verification**
- Added entity extraction tests for risks, systems, processes, amounts, dates, organizations, and evidence links.
- `npm run test` passed: 16 files / 74 tests.
- `npm run build` passed.

---

## 0.16.0 — Phase 8A Decision & Action Twin (2026-06-01)

This release pulls Phase 8A forward into the active build track, making NexusAI a daily-use tool
by linking decisions and action items directly to agent briefs.

**Schema — migration 0017**
- Extended `decisions` table: added `source_output_id` (FK to agent_outputs), `deadline`, `priority`
  (low/medium/high/critical), `created_at`, `updated_at`.
- New `actions` table: `decision_id` (FK cascade), `action_text`, `owner`, `due_date`,
  `is_blocker`, `status` (open/done/deferred/cancelled), `completed_at`.
- Indexes on workspace_id, status, and decision_id for fast filtered queries.

**Contracts**
- Extended `decisionSchema` with `sourceOutputId`, `deadline`, `priority`, `createdAt`, `updatedAt`.
- Added `decisionInputSchema`, `decisionPrioritySchema`.
- Added `actionSchema`, `actionInputSchema`, `actionStatusSchema`.

**Repository**
- `listDecisions(workspaceId, status?)` — Postgres-first with in-memory fallback.
- `createDecision(workspaceId, input, actor)` — creates decision, writes `decision_created` audit event.
- `updateDecision(id, workspaceId, patch, actor)` — patches any field, auto-sets `decidedAt` on status change to decided.
- `listActions(workspaceId, decisionId?, status?)` — sorted blockers-first, then by due date.
- `createAction(workspaceId, input, actor)` — creates action, writes `action_created` audit event.
- `updateAction(id, workspaceId, patch, actor)` — patches status/owner/dueDate/isBlocker, auto-sets `completedAt`.

**Store (in-memory fallback)**
- Added `saveDecision`, `listActions`, `saveAction` with blocker-first sort.

**API routes**
- `GET  /api/decisions` — list with optional status filter.
- `POST /api/decisions` — create decision.
- `PATCH /api/decisions/[id]` — update any field.
- `GET  /api/actions` — list with optional decisionId and status filters.
- `POST /api/actions` — create action under a decision.
- `PATCH /api/actions/[id]` — mark done, change owner, set due date, toggle blocker.

**Decisions page — full interactive rewrite**
- Priority badge (critical/high/medium/low) with colour coding.
- Status tabs (all / open / decided / superseded).
- Summary strip: open decisions, decided, open actions, blockers (red if >0).
- Mark Decided button per open decision.
- Inline action list per decision: checkbox to complete, blocker badge, overdue date in red.
- Add Action inline form: text, owner, due date, blocker toggle.
- New Decision form: title, owner, priority, status, deadline, rationale.
- All mutations via API — no page reload required.

**Verification**
- `npx tsc --noEmit` passed (excluding stale .next/ build artefacts).

---

## 0.15.1 — Demo Sector Pack Audit and Rewrite (2026-06-01)

This release sharpens all 3 demo sector packs for sales readiness and adds pre-tuned Ask questions.

**Sector pack rewrites**
- All 3 packs rewritten to the CEO sales test: every evidence item now contains named metrics,
  named risks, named deadlines, and named people where appropriate.
- Financial Services (Gulf Capital Partners): CBUAE findings now include specific deadlines,
  compliance consequences, and exact AML threshold gaps. Duration mismatch quantified at USD 18M
  mark-to-market risk. USD 120M redemption event given specific expiry date and impact on fee run-rate.
  Digital payments acquisition given board decision framing with AED 85M price.
- Professional Services (Meridian Advisory Group): Bench cost quantified as AED 420K/month with
  Q2 EBITDA impact of 5 points. At-risk pipeline broken into 3 named clients with reasons.
  Saudi expansion given explicit Saudisation constraint and board decision deadline of 30 June.
  Project at-risk revenue recognition amounts specified per engagement.
- Technology SaaS (Vanta Systems): 5 Red accounts now have names, ARR amounts, renewal dates,
  and specific recommended actions per account. SAP connector risk quantified at $620K renewal ACV.
  Series C readiness milestones listed explicitly. Pakistan macro risk named and sized at $220K ACV.

**Pre-tuned Ask questions**
- Added `suggestedQuestions: string[]` field to `DemoPack` type — 3 CEO-level questions per pack,
  pre-written to surface the sharpest risks and decisions in each sector's evidence set.
- These replace reliance on LLM-generated questions at demo runtime (removing variability risk).
- `POST /api/workspace/demo-reset` now returns `suggestedQuestions` and `demoSummary` in the response.
- Settings → Demo tab now shows a post-reset panel: workspace name, one-line demo summary,
  and numbered suggested questions ready to paste into the Ask panel.

**Added `demoSummary` field** — one sentence per pack that frames what the demo shows,
displayed in the Settings UI and usable in sales prep materials.

**Verification**
- `npx tsc --noEmit` passed.

---

## 0.15.0 — U4 Learning Signal Capture (2026-06-01)

This release adds user feedback capture on agent outputs, completing the V1.1 Tier 1 governance loop.

**Learning signals**
- Added migration `0016_learning_signals.sql` — `learning_signals` table with workspace, agent, output FK, signal type, optional edited content, actor, and timestamp.
- Added `learningSignals` Drizzle table to `db/schema.ts` with FK cascade on `agent_outputs.id`.
- Added `learningSignalTypeSchema`, `learningSignalSchema`, `learningSignalInputSchema`, and `learningSignalSummarySchema` to `lib/contracts.ts`.
- Added `saveLearnningSignal`, `listLearningSignals`, and `getLearningSignalSummary` to `lib/data/repository.ts`.
- Added `saveLearningSignal` and `listLearningSignals` in-memory fallback to `lib/data/store.ts`.
- Every signal write creates an `agent_learning_signal` audit event with agent ID, output ID, signal type, and edit flag.

**API routes**
- `POST /api/learning-signals` — submit approve / edit / reject / thumbs_up / thumbs_down against an agent output.
- `GET  /api/learning-signals` — list signals for a workspace with agentId / outputId / signalType / date filters.
- `GET  /api/learning-signals/summary` — per-agent quality metrics: approval rate, rejection rate, edit rate, total signals.

**UI**
- Agent Output Log now shows Approve / Edit / Reject / 👍 / 👎 buttons on each output card.
- Edit signal prompts reviewer for a corrected brief before submitting.
- Signal confirmation replaces buttons with a "Signal recorded: {type}" confirmation inline.

**Tests**
- Added `tests/learning-signals.test.ts` — 12 test cases covering: save/retrieve, agentId filter, signalType filter, editedContent, workspace isolation, since filter, sort order, limit, and all 5 signal types.

**Verification**
- `npx tsc --noEmit` passed.

**Still open**
- Classifier-assisted output gate enrichment using signal data.
- U9 learning loop and improvement reporting (Tier 3).

---

## 0.14.1 — U3 Per-Agent Output Log and Rollback (2026-06-01)

This release adds rollback-ready agent output history for dashboard-generated briefs.

**Agent output history**
- Added migration `0015_agent_outputs.sql`.
- Added `agent_outputs` schema and contracts for full content, input summary, evidence refs, confidence, agent version, output version, active state, and replaced-by linkage.
- Dashboard agent brief generation now writes an output row every time a brief is generated.
- Agent output audit events include agent id, agent version, input summary, evidence IDs used, output id, output version, confidence, and processing time.

**Rollback**
- Added repository and in-memory rollback methods that restore a prior output version, deactivate the current one, preserve all history, and write an `agent_output_rolled_back` audit event.
- Added `GET /api/agent-outputs` and `POST /api/agent-outputs/[id]/rollback`.

**UI**
- Extended Settings → Agent Governance with a searchable Agent Output Log.
- Added filters for agent and date range, plus rollback controls for historical outputs.

**Tests**
- Added coverage for output version history, active output switching, rollback, and rollback audit visibility.

**Verification**
- `npx tsc --noEmit` passed.
- `npm run test` passed: 14 test files, 59 tests.
- `npm run build` passed.

**Still open**
- U4 learning-signal capture from approve/edit/reject decisions.

---

## 0.14.0 — U2 Agent Control Profiles Complete (2026-06-01)

This release completes the Phase 7D U2 governance blocker for the current V1.1 product surfaces.

**Agent Governance UI**
- Added Settings → Agent Governance with profile list, reviewer-friendly passport details, default seeding, edit-as-new-version, suspend, and resume controls.
- Added regulated-buyer demo passports for Regulatory Response Agent, Legal Redline Agent, and Proposal Partner Agent.

**Retrieval enforcement**
- Ask now accepts an `agentKey` governance lens and applies Agent Control Profile filters before vector and keyword ranking.
- pgvector retrieval now receives a passport-allowed candidate ID set so forbidden evidence cannot enter vector ranking results.
- Dashboard and Ask deny events are audited with agent key, evidence id, sensitivity, and reason.

**Output and tool controls**
- Added deterministic output gate for Ask and dashboard agent briefs.
- Legal/regulatory/pricing/data-residency/data-protection/external-communication triggers route to human review.
- Hard-stop outputs such as send email, submit filing, make payment, modify contract, contact regulator, external post, source-system writeback, HR action, legal commitment, or financial commitment are blocked and audited.
- Hard-stop output blocks suspend a persisted offending Agent Control Profile as the first watcher/suspend pathway. Rich watcher agents and notification routing remain U3 work.
- Added `guardToolInvocation()` so denied tool calls write `agent_tool_denied` audit events.

**Tests**
- Added coverage for Ask passport filtering, suspended agent refusal, regulatory escalation, hard-stop output blocking, denied tool-call audit events, and passport version retention.

**Verification**
- `npx tsc --noEmit` passed.
- `npm run test` passed: 13 test files, 57 tests.
- `npm run build` passed.

**Still open**
- U3 searchable per-agent log and rollback.
- U4 learning-signal capture.
- Classifier-assisted output gate enrichment after persistent agent output records exist.

---

## 0.13.4 — Dependency Security Cleanup (2026-05-31)

This release clears the open GitHub Dependabot alert for PostCSS.

**Security**
- Fixed Dependabot alert #5: PostCSS XSS via unescaped `</style>` in CSS stringify output.
- Corrected the npm override so Next.js resolves to the patched root `postcss@8.5.15`.
- Removed the duplicate workspace-level override and regenerated `package-lock.json` from a clean install.
- Confirmed the vulnerable nested `next/node_modules/postcss@8.4.31` copy is gone.

**Verification**
- `npm audit --json` reports 0 vulnerabilities.
- `npx tsc --noEmit` passed.
- `npm run test` passed: 13 test files, 51 tests.
- `npm run build` passed.

---

## 0.13.3 — Nexus Reassessment and Workflow Twin Realignment (2026-05-31)

This is a planning and roadmap realignment release. It does not ship new runtime product code.

**Product frame**
- Reframed NexusAI as a governed intelligence operating layer for high-stakes professional workflows.
- Locked the language shift away from generic autonomous-company / ExO rhetoric.
- Added a client-facing vocabulary preference: Strategic Mandate, Operating Doctrine, Policy Guardrails, Human Approval Layer, Parallel Workflow Pilot, and Decision Workflow Engine.
- Explicitly rejected broad "100x", workforce-replacement, and fully autonomous-company claims in client-facing copy.

**Roadmap sequence**
- Kept Phase 7D as the near-term engineering blocker track: finish U2 Agent Control Profiles, then U3 per-agent logs/rollback, then U4 learning-signal capture.
- Reworked Phase 8A so the first workflow twin is the broad, cross-industry Decision & Action Twin.
- Moved workflow scoring/client selection into Phase 8B.
- Added Phase 8C for the Ops Review Twin as the repeatable weekly operating cadence layer.
- Kept Proposal/SOW, Regulatory Response, and Agreement Review as later workflow templates, not the first universal product surface.

**Docs and tasks**
- Added `docs/NEXUS_WORKFLOW_TWIN_REALIGNMENT.md`.
- Updated `TASKS.md` with Phase 8A/8B/8C task structure and acceptance checks.

---

## 0.13.2 — U2 Agent Passport Foundation (2026-05-31)

This release starts the engineering implementation of U2 Agent Control Profiles. It does not complete the full U2 surface yet: Settings UI, output gates, Ask/vector passport filtering, and full tool-runtime audit wiring remain open.

**Agent passport contracts**
- Added Agent Control Profile enums and Zod contracts for status, action rights, risk rating, approval level, review cadence, log level, policy-controlled APIs, and full passport input/output shapes.
- Defined the V1 action-right ladder: `retrieve → summarize → draft → recommend → prepare_for_approval`.
- Added default hard stops and escalation triggers in code so high-risk actions remain outside prompt-only control.

**Persistence and APIs**
- Added migration `0014_agent_control_profiles.sql`.
- Added `agent_control_profiles` schema with versioned rows, unique `(workspace_id, agent_key, version)`, and `(workspace_id, agent_key, status)` index.
- Added repository and in-memory fallback methods to list, fetch history, fetch active profile, create a new version, seed defaults, and suspend an agent.
- Added admin API endpoints:
  - `GET /api/agent-control-profiles`
  - `GET /api/agent-control-profiles?agentKey=...`
  - `POST /api/agent-control-profiles?seed=1`
  - `POST /api/agent-control-profiles`
  - `POST /api/agent-control-profiles/[agentKey]/suspend`

**Server-side enforcement**
- Added default passport builder for all current specialist agents in `agent-library.ts`.
- Added `canReadEvidence()`, `filterEvidenceByPassport()`, and `canUseTool()` as server-side policy helpers.
- Dashboard generation now loads the active/default passport for each agent and filters evidence before any source text reaches LLM prompt context.
- Dashboard evidence-deny events now write to audit with agent key, evidence id, sensitivity, and deny reason.

**Tests**
- Added contract coverage for Agent Control Profiles.
- Added passport policy tests for sensitivity ceiling, forbidden scopes, missing sensitivity defaulting to restricted, hard-stop tool actions, action-right ceilings, and filtering denied evidence before model context.

**Verification**
- `npx tsc --noEmit` passed.
- `npm run test` passed: 13 test files, 51 tests.
- `npm run build` passed.

**Still open**
- Agent Governance Settings UI.
- Explicit demo passports for Regulatory Response Agent, Legal Redline Agent, and Proposal Partner Agent.
- Ask/vector/keyword retrieval passport filtering.
- Tool runtime audit events for denied calls.
- Output gate and deterministic escalation routing.
- U3 searchable per-agent log and rollback.
- U4 learning-signal capture.

---

## 0.13.1 — Readiness On-Ramp and Governance Documentation (2026-05-31)

This release starts Phase 7D / V1.1 governance hardening while preserving an honest boundary: U1 is shipped, while U2/U3/U4 remain the next implementation work.

**Commit**
- Pushed `ba078f1` to `main`: `feat: ship v1 pilot hardening and readiness on-ramp`

**Readiness on-ramp**
- Added public `POST /api/readiness/submit` to capture AI-Native Readiness Assessment submissions as lead/audit events.
- Marked `/readiness` and `/api/readiness/submit` as public routes in middleware.
- Added rate limiting for readiness submissions.

**Governance and pilot-proof documents**
- Added `docs/AI_NATIVE_READINESS_ASSESSMENT.md`
- Added `docs/WORKFLOW_TWIN_SCORER.md`
- Added `docs/SHADOW_MODE_ROI_PLAYBOOK.md`
- Added `docs/GOVERN_ASSURE_MESSAGING.md`
- Added `docs/U2_AGENT_PASSPORT_SPEC.md`

**Product positioning**
- Updated `docs/ONE_PAGER.md` with Govern and Assure positioning: evidence provenance, sensitivity controls, human approval, agent passports, audit logs, and rollback-ready output history.
- Updated `TASKS.md` so U1 is marked complete and U2/U3/U4 remain the next Phase 7D blockers.

**Build hardening**
- Split client-safe filename classification into `lib/services/company-classification.ts`.
- Kept server-only LLM/company detection in `lib/services/company-detection.ts`.
- Fixed the production build issue where the onboarding wizard was pulling `pg` and Node-only modules into the browser bundle.

**Verification**
- `npx tsc --noEmit` passed.
- `npm run test` passed: 12 test files, 44 tests.
- `npm run build` passed.
- Secret scan found placeholders/test strings only, not real API keys.

**Still open**
- U2 Agent Control Profile/passport implementation.
- U3 searchable per-agent logs and rollback.
- U4 learning-signal capture.
- Render build should be confirmed in the Render dashboard after GitHub receives `ba078f1`.

---

## 0.13.0 — Phase 9D: Go-to-Market Execution + Production DB Migration (2026-05-31)

This release delivers the full commercial toolkit and applies all pending migrations to production.

**Production database**
- Migrations 0012 (workspace_status enum, trial_ends_at, llm_usage table) and 0013 (demo_mode column) applied to Neon production DB via `run-migrations.command`.
- Migrations 0009–0011 were also pending and applied in the same run (evidence_department, connector_instance, role_archetype).

**Product brief — `/product-brief` (public web page)**
- Full one-page product brief: problem, solution, how it works, 4-step flow, agent rooms, evidence source types, pilot outputs, sector fit, pricing tiers, competitor comparison table, 3-step pilot start.
- No authentication required — shareable link to send after a first call.
- Print → PDF via browser. Added to public routes in middleware.

**Pilot SOW templates (3 Word documents)**
- `NexusAI_SOW_Fintech.docx` — Regulated financial services variant. Gulf Capital Partners context.
- `NexusAI_SOW_ProfessionalServices.docx` — Management consulting / professional services variant.
- `NexusAI_SOW_DigitalNative.docx` — SaaS / D2C / digital-native variant.
- All three share the same 12-section structure: cover page, context, objectives, scope, deliverables table, client responsibilities, timeline table, commercial terms, assumptions, AI responsibility, governance, signatures.
- Built with docx-js. Professional typography, dual-width tables, page footers, signature blocks.

**Demo scripts + competitor comparison (1 Word document)**
- `NexusAI_DemoScripts_CompetitorComparison.docx`
- Script 1: Fintech CEO — Executive Command Room, Risk Room, Ask panel, weekly brief export. 15 minutes.
- Script 2: Consulting Managing Partner — BD pipeline, delivery intelligence, people signals, one-pager export. 15 minutes.
- Script 3: D2C/SaaS Founder — MRR, customer health, engineering health, board export. 15 minutes.
- Each script has timed sections, SAY/ASK callout boxes, and a closing question to determine pilot scope.
- Competitor comparison: NexusAI vs ChatGPT Enterprise vs Glean vs BI tools. 13-row feature matrix. Objection handling for 5 common objections (ChatGPT, Glean, BI, data privacy, integration).

**ROI calculator + pilot review templates (1 Excel file)**
- `NexusAI_PilotROI_ReviewTemplates.xlsx` — 3 sheets, zero formula errors.
- Sheet 1 — ROI Calculator: editable inputs (hours saved/week per role, exec cost/hr, pilot fee). Auto-calculates value recovered, net value, ROI multiple, payback period. Industry-standard color coding (blue = input, black = formula).
- Sheet 2 — Pilot Review Template: Day 30/60/90 columns for usage metrics, scorecard status, qualitative feedback, and renewal discussion.
- Sheet 3 — Kickoff Agenda: 60-minute structured agenda with timed slots, topic, and actions/owner. Complete with meeting details header.

**Verification**
- `npx tsc --noEmit` passed (clean)
- Excel validated with recalc.py — 0 formula errors

---

## 0.12.0 — Phase 8: Paid Pilot Packaging (2026-05-30)

This release delivers the complete commercial layer — everything needed to convert a demo into
a signed pilot and deliver value to a sponsor within 24 hours.

**Export artifact layer**
- `lib/services/exports.ts` (pre-existing data layer) now has four API routes:
  `GET /api/export/weekly-brief`, `/api/export/risk-radar`, `/api/export/reco-register`,
  `/api/export/one-pager`
- Risk radar and recommendation register support `?format=csv` — returns a download-ready CSV
  with filename including workspace name and date
- `/export` hub page — links to all four artifacts with format badges (PDF vs CSV)
- `/export/weekly-brief` — client-rendered print page. AI brief per active role, risk table,
  recommendation summary. "Save as PDF" triggers browser print.
- `/export/one-pager` — single-page executive summary: metrics, active roles, findings, risks,
  open recommendations. Board/exec share in 2 minutes.
- Exports section added to side nav

**Demo mode**
- `demo_mode` boolean column added to `workspace_settings` schema + migration 0013
- `WorkspaceSettings` contract and store updated to include `demoMode`
- PURPLE "DEMO" badge in layout top bar when demo mode is on
- Ingestion (`POST /api/ingestion/status`) returns 403 when demo mode is active
- Settings → Demo Tools tab: toggle demo mode, reset workspace to sector pack
- `PATCH /api/settings/workspace` now accepts `demoMode`

**Demo workspace reset**
- `lib/demo/sector-packs.ts` — three realistic sector demo packs (each 5 documents):
  - `financial_services`: Gulf Capital Partners — board pack, CBUAE findings, payments report, portfolio risk review, digital roadmap
  - `professional_services`: Meridian Advisory Group — BD pipeline, utilisation, Saudi expansion, project status, people review
  - `technology_saas`: Vanta Systems — MRR dashboard, product roadmap, customer health, sprint report, Series B investor update
- `POST /api/workspace/demo-reset?sector=<sector>` — requires demo mode ON. Clears existing
  evidence and recommendations, updates workspace profile to match sector, seeds 5 documents
  at 88% confidence (auto-processed), fires recommendation generation. Writes audit event.

**Pilot sponsor kit**
- `/pilot-kit` — print-ready page with two sections:
  - Sponsor Onboarding Checklist: 5-step guide (before login, Day 1, first week, first month, success criteria). Print → PDF and share at kickoff.
  - Pilot Success Scorecard: 7-outcome table with Day 30/60/90 columns and sponsor sign-off blocks.
- Pilot Kit link added to side nav Exports section
- `docs/PILOT_BILLING_TRIGGERS.md` — documents conditions for trial → pilot → active status changes,
  suspension logic, manual override SQL, pricing tiers, and automation specification for Phase 7C Stripe wiring

**Verification**
- `npx tsc --noEmit` passed (clean, no application code errors)

---

## 0.11.0 — Phase 7C: Production Operations (2026-05-30)

This release completes the code layer of Phase 7C. No user-facing features — this is the
foundation that makes the product safe to charge for.

**Security hardening**
- Added full `Content-Security-Policy` header to all responses. Strict-dynamic in production,
  unsafe-inline in dev. Previous header set was missing CSP entirely.
- Added CORS policy: production domain only (`NEXT_PUBLIC_APP_URL`), never wildcard.
  Preflight (OPTIONS) handled correctly. All API routes enforce origin check in production.
- Added in-process sliding-window rate limiting in middleware:
  Auth routes 10/min, ingestion 20/min, ask 30/min, dashboard 60/min — all per IP.
  Exceeding the limit returns 429 with `Retry-After` and `X-RateLimit-*` headers.

**Workspace status and trial mode**
- Added `workspace_status` enum: `trial | pilot | active | suspended | cancelled`
- Added `trial_ends_at`, `suspended_at`, `stripe_customer_id`, `stripe_subscription_id` to workspaces
- Migration `0012_workspace_status.sql` — existing workspaces defaulted to `active`
- `repository.getWorkspaceStatus()` returns current status + trial expiry. Falls back to `active`
  when DB is unavailable so dev mode is never incorrectly blocked.
- Trial banner shown in layout for `trial` status workspaces — shows days remaining, dismissable
- Suspension banner shown for `suspended` workspaces with support contact link

**LLM cost tracking**
- New `llm_usage` table in schema and migration 0012: workspace, day, model, route,
  input/output tokens, cost in micro-USD
- `repository.recordLLMUsage()` writes a record after every LLM call — fire-and-forget,
  never blocks the response
- `persistUsage()` in `llm.ts` calls the repository after both Anthropic and DeepSeek paths.
  `estimateCostMicro()` computes cost by model family (Opus, Sonnet, Haiku, DeepSeek).
- `route` field added to `LLMOptions` for per-call-site cost attribution

**In-app feedback button**
- `components/feedback-button.tsx` — floating persistent button on all dashboard pages
- Opens a modal (subject + message, both validated). POSTs to `POST /api/feedback`.
- `app/api/feedback/route.ts` — writes to audit log via `repository.pushAudit()`.
  Logs support email intent when `NEXUS_SUPPORT_EMAIL` is set.

**Documentation**
- `docs/DR_RUNBOOK.md` — disaster recovery runbook: DB loss, R2 unavailable, Clerk failure,
  LLM provider down, full outage, migration rollback SQL reference, contact directory,
  post-incident checklist
- `docs/SECURITY_REVIEW.md` — pre-pilot security checklist with REQUIRED vs RECOMMENDED items,
  sign-off table, and deferred Phase 2 items flagged for regulated-sector scale

**Verification**
- `npx tsc --noEmit` passed (clean)

---

## Planning — V1.1 ExO Upgrade Plan + Naming Fix (2026-05-30)

Strategic planning session based on ExO 3.0 / Organizational Singularity framework
(Moonshots EP #258, Salim Ismail, May 2026).

**Added to docs:**
- `docs/V1_1_UPGRADE_PLAN.md` — full upgrade backlog with Tier 1/2/3 sequencing,
  build cards for U1–U9, acceptance tests, phase mappings, and explicit rejection list
  for claims that are credibility poison in regulated/GCC institutional settings

**Added to TASKS.md:**
- Phase 7D (Governance Hardening) with four Tier 1 items:
  U1 (AI-Native Readiness Assessment), U2 (Agent Control Profile/passport),
  U3 (searchable per-agent log + granular rollback), U4 (learning-signal capture)

**Naming fix — OpenClaw removed from all client-facing documents:**
- `README.md` System Shape section rewritten — no third-party tool references
- `docs/INSTALL.md` rewritten as a clean NexusAI installation guide
- `docs/PRODUCTION_READINESS.md` reference updated
- Internal TASKS.md references to OpenClaw as a study subject retained (correct context)
- AGENT_ROOMS.md references retained (research context, not product claims)

**n8n decision:** Not needed for V1.1. Flag as a Phase 14 architecture option for
the Orchestration Layer workflow runner. Document below.

---

## Planning — Full Roadmap Tighten (2026-05-30)

No code shipped. TASKS.md, HANDOVER.md, and ROADMAP.md updated to reflect the full product
vision and correct the gap between planning documents and actual codebase state.

**Added to TASKS.md:**
- Phase 7C — Production Operations: billing/Stripe, operational monitoring (Sentry, LLM cost
  tracking, uptime), security hardening (headers, rate limits, vulnerability scanning), backup
  and disaster recovery, customer support infrastructure
- Phase 9C — Data Residency and Compliance: PDPL (Pakistan), Saudi NCA Cloud Policy,
  CBUAE/UAE TDRA, DIFC/ADGM, GDPR, data processing register, breach response plan
- Phase 9D — Go-to-Market Execution: pilot proposal template, demo scripts (3 archetypes),
  competitor comparison, ROI calculator, pilot review decks, case study template,
  partnership model
- Phase 10 expanded from 22 generic bundle bullets to 72 individual connector tasks, each
  specifying system, data objects, auth method, ingestion frequency, and consuming agent.
  Renamed to "Core Enterprise SaaS Connectors" to clarify distinction from Phase 10B.
- Phase 11 expanded from 5 thin tasks to 15 individual social connector tasks plus competitor
  intelligence, Google Alerts, news monitoring, and social listening specifications
- Phase 11B — Language Support: Arabic and Urdu across three phases (RTL detection/formatting,
  UI translation, native-language brief generation)
- Phase 14 reconciled with Phase 7A — explicit note that Phase 7A is read-only brief
  generation and Phase 14 is autonomous task execution with approval checkpoints
- Pre-Phase 7A, Phase 7A, Phase 7B headers updated to mark as complete with version references
- Strategic build priority and current status sections updated to reflect v0.10.3 reality

**Roadmap coherence issues resolved:**
- Phase 9 (Team Members) tasks were missing — restored with full 10-task spec
- Phase 8 (Pilot Packaging) expanded from 7 thin tasks to 12 detailed tasks with
  demo mode flag, sector demo packs, billing triggers, and pilot management templates
- Phase 2 open items flagged with context: 4 tasks deferred, needed before regulated-sector scale
- Phase 7B outstanding UI items corrected — now marked complete per v0.10.3 CHANGELOG

---

## 0.10.3 — Phase 7 Completion: Brief Language, Agent Rooms, and Archetype Controls (2026-05-30)

This release closes Phase 7A/7B for the V1 pilot scope. NexusAI now adapts not only which roles and agents it shows, but also how those agents speak and which evidence they expect for different company archetypes.

**Brief-language modes**
- Added archetype evidence expectations for corporate, startup/scale-up, SME physical, digital-native, and professional-practice companies
- Added formal vs plain brief-language instructions to company context
- SME / owner-operated businesses now get explicit plain-language rules: 2-3 short sentences, one clear action, and no board-pack/IRR/WACC/covenant-style wording
- Dashboard agent prompts now receive the brief-language rule directly, so agent briefs adapt at generation time

**Agent Room completion**
- Dashboard page titles and side nav now use Agent Room labels, including Finance, Risk, and People rooms
- Dashboard pages support agent-level filtering with `?agent=...`, so users can isolate a single specialist brief inside a room
- SME physical workspaces adapt dashboard page titles to Owner/Ops/Accounts-style briefs
- SME owner briefs now use local business, cash/runway, and execution agents rather than generic executive-only briefs

**Settings and taxonomy**
- Company Profile settings now include company archetype, brief language, location count, profile timestamp, evidence expectations, and stored role states
- Added `docs/SECTOR_GAPS.md` to document sector gaps and archetype-first handling for companies outside the initial taxonomy
- File classification now detects local ad performance and location labels in filenames for owner-operated and multi-location businesses

**Verification**
- Added brief-language tests
- Expanded role-suggestion and file-classification tests
- `npx tsc --noEmit` passed
- `npm run test` passed: 12 files, 44 tests

---

## 0.10.2 — Phase 7A Agent Briefs and Digital Evidence Classification (2026-05-30)

This release deepens the specialist-agent model and teaches ingestion to recognize digital-native, social, WhatsApp, creator, local-business, and email/CRM evidence instead of treating those files as generic uploads.

**Expanded specialist agents**
- Added finance agents for finance signals, cash/runway, and margin variance
- Added risk/compliance agents for regulatory obligations and audit findings
- Added marketing agents for performance marketing, brand/community, and creator performance
- Added product, customer success, people, clinical risk, supply chain, project control, legal exposure, and local business agents
- Updated expanded role mappings so CFO, CRO, CCO, CMO, Growth, Performance Marketing, Brand/Community, CPO, CHRO, Customer Success, Chief of Staff, Managing Partner, Chief Medical, Supply Chain, Project Director, Practice Lead, General Counsel, and Franchise Manager receive sharper agent brief sets

**Digital/social evidence classifier**
- `classifyFilename()` now recognizes `ad_performance`, `social_export`, `whatsapp_business`, `local_business`, `creator_performance`, and `email_crm`
- Paid ads exports now carry extraction hints for ROAS, impressions, CPM, CPC, CTR, conversions, spend, creative, audience, frequency, reach, and campaign status
- WhatsApp Business and creator/influencer evidence are elevated to confidential by default
- Ad delivery health signals such as learning phase, budget constrained, creative fatigue, audience overlap, and frequency now produce evidence warnings
- Ingestion now preserves classifier-selected `sourceType` when the uploader does not explicitly provide one, and returns classification hints/warnings in the upload response

**Verification**
- Added `file-classification.test.ts` coverage for paid ads, WhatsApp Business, Google Business Profile, email CRM, and regulated-sector sensitivity elevation
- `npx tsc --noEmit` passed
- `npm run test` passed: 11 files, 38 tests
- `npm run build` passed: 44 routes

---

## 0.10.1 — Phase 7A Wizard Role Selection (2026-05-30)

This release makes the Phase 7A role engine visible in onboarding. Step 4 is no longer a static four-role selector — it is now driven by the archetype-aware role suggestion engine.

**Role-selection UI**
- Step 4 now takes the full detected company profile instead of a string list of suggested roles
- Roles are generated from `suggestRolesForProfile()` and rendered with adaptive labels, badges, reasons, relevance scores, and evidence-scope descriptions
- CEO/Owner/Managing Partner is locked and always selected
- Staged roles render in a separate "Roles to stage for later" section with activation conditions
- Users can activate staged roles early; activated staged roles become selected and are persisted

**Dual-hat handling**
- Small-company and early-stage roles expose a "covered by another person / dual-hat" toggle
- Dual-hat roles persist into `roleStates` with `state: "dual_hat"` and `dualHatOf: "ceo"`
- Selected roles persist back to `/api/workspace/profile` before the wizard moves to upload

**Ambiguous-company fallback**
- When `requiresRoleConfirmation` is true, Step 4 asks how the company makes money and what leaders worry about
- Answers apply deterministic role signals for finance, risk/compliance, customer, people, technology, and performance marketing
- This avoids forcing unusual businesses into generic corporate defaults

**Verification**
- `npx tsc --noEmit` passed
- `npm run test` passed: 10 files, 33 tests
- `npm run build` passed: 44 routes

---

## 0.10.0 — Phase 7A Foundation: Roles and Archetypes (2026-05-30)

This release starts Phase 7A by adding the domain model that lets NexusAI adapt to different company types instead of forcing every customer into four corporate dashboards.

**Business archetypes**
- Added `companyArchetype` to detected and persisted workspace profiles
- Supported archetypes: `corporate`, `startup_scaleup`, `sme_physical`, `digital_native`, and `professional_practice`
- Added `briefLanguageMode`, `archetypeVersion`, `locationCount`, and `roleStates` to workspace profiles
- Added migration `0011_role_archetype.sql` for the new workspace profile fields
- `buildCompanyContext()` now includes archetype and brief-language mode for downstream LLM prompts

**Role registry**
- Added `lib/domain/role-registry.ts` as the first source of truth for role definitions
- Defined universal, regulatory, growth, technology/product, people, sector-specific, and future-stage roles
- Added archetype-aware labels, including Owner for `sme_physical` and Managing Partner for `professional_practice`
- Added finance, risk, and people room paths as first-class dashboard paths: `/dashboard/cfo`, `/dashboard/cro`, `/dashboard/chro`
- Added `ROLE_AGENT_BRIEFS` mappings for the expanded role set using the existing specialist agents

**Deterministic role suggestion engine**
- Added `lib/services/role-suggestion.ts`
- `suggestRolesForProfile()` scores roles by archetype, sector, stage, size, regulatory trigger, business model signal, and free-text keywords
- CEO is always first, locked, and label-adaptive
- Staged roles include activation conditions
- Early-stage/small-company roles can be marked as dual-hat candidates
- Added unit tests for owner labeling, regulated financial services risk/compliance, and digital-native performance marketing

**Company detection integration**
- `detectCompanyProfile()` now asks the LLM for `companyArchetype`
- Role suggestions now come from the deterministic role engine, not directly from the LLM
- Detection output includes `suggestedRoleReasons`, `stagedRoles`, `roleStates`, and `requiresRoleConfirmation`
- Manual sector fallback profiles now include archetype defaults and role-state defaults

**Verification**
- `npx tsc --noEmit` passed
- `npm run test` passed: 10 files, 33 tests
- `npm run build` passed: 44 routes

---

## 0.9.1 — Phase 7A Technical Prep (2026-05-30)

This release clears the two technical blockers needed before the full role system and business archetype expansion can begin.

**Open-ended role routing**
- `roleSchema` now accepts safe string role keys instead of only `ceo`, `coo`, `cbo`, and `cto`
- Added `KNOWN_ROLES` for current built-in roles while allowing future/custom roles like `cfo`, `cro`, `cmo`, `owner`, `managing_partner`, and `vp_performance_mktg`
- Dashboard API now returns `knownRole` so UI/API clients can distinguish built-in roles from newly introduced roles
- Dynamic dashboard pages no longer 404 for valid new role keys; unknown roles receive generic room metadata and fallback specialist-agent briefs
- Agent library now uses `Partial<Record<string, string[]>>` plus `agentBriefIdsForRole()` fallback instead of a closed `Record<Role, string[]>`
- Repository and in-memory role summaries now accept any role key and fall back to "Specialist evidence brief and next-best action"

**Connector provenance on evidence**
- Added optional `connectorInstanceId` to evidence contracts and ingestion input
- Added nullable `connector_instance_id` to `evidence_records` via migration `0010_connector_instance.sql`
- Added `(workspace_id, connector_instance_id)` index for future connector sync/filtering
- Repository maps connector instance IDs to and from Postgres; manual uploads remain null by default
- `POST /api/ingestion/status` accepts `connectorInstanceId`, includes it in audit payloads, and returns it in upload responses

**Verification**
- `npx tsc --noEmit` passed
- `npm run test` passed: 9 files, 30 tests
- `npm run build` passed: 44 routes

---

## 0.9.0 — AI Onboarding Strategist (2026-05-30)

The onboarding wizard now acts as a senior business analyst, not a form wizard. Every step is sector-aware and AI-assisted.

**Focus mapping — `mapFocusToDashboard`**
- New LLM function in `lib/services/company-detection.ts`
- User types a plain-English priority ("What's blocking growth and what risks need my attention?")
- AI returns: recommended dashboards to start on, 3 specific first questions, and a one-sentence focus summary
- Exported as `FocusMapping` type
- Falls back to null gracefully when LLM is unavailable

**New API: `POST /api/workspace/first-focus`**
- Accepts intent text, fetches workspace profile, builds company context, calls `mapFocusToDashboard`
- Returns `FocusMapping` or 422 when LLM unavailable
- Scope: admin

**Ingestion — sector-aware file classification everywhere**
- `POST /api/ingestion/status` now calls `classifyFilename` on every uploaded file
- Fetches workspace profile to get sector before classifying — fintech files get confidential by default, tech files get internal
- Caller-supplied department/sensitivity still takes precedence; auto-classify is a smart fallback
- Previously, sector-aware classification only happened inside the onboarding wizard

**Wizard — Step 3 (Profile Confirmation)**
- New "Governance and Policy Defaults" panel showing auto-approved threshold (75%+), pending review band (35–75%), quarantine floor (<35%), and sensitivity default
- Regulated-sector callout for financial_services and healthcare explains elevated confidentiality defaults
- Users now understand what will be applied before they upload anything

**Wizard — Step 5 (Upload)**
- `classifyFilename` now receives `profile.sector` instead of an empty string
- Department and sensitivity suggestions are sector-aware from the first file selection

**Wizard — Step 7 (Go Live)**
- Transformed from static role cards into an AI focus experience
- User types their priority; "Map my focus with AI" calls the first-focus API
- Role cards update: AI-recommended dashboards get a "Start here" badge and preview the first suggested question
- Clicking a recommended card passes the first question as `?q=` URL param so the Ask panel pre-populates
- Falls back to the standard role-card grid when LLM unavailable

---

## 0.8.0 — AI-Assisted Onboarding: Company Detection (2026-05-29)

**Company detection service — `lib/services/company-detection.ts`**
- `detectCompanyProfile(description)` — LLM infers sector, subsector, business model, stage, region, goals, risk profile, priority roles, 5 suggested documents, KPIs, and risks from a free-text description
- `classifyFilename(filename, sector)` — deterministic keyword classifier for department and sensitivity, sector-aware sensitivity elevation for financial_services and healthcare
- Default document packs per sector when LLM is unavailable
- `DetectedProfile` and `SuggestedDocument` types exported

**New API: `POST /api/workspace/detect-profile`**
- Accepts company description (10–2000 chars), calls `detectCompanyProfile`, returns `DetectedProfile`
- Falls back with 422 when LLM unavailable so wizard can show manual fallback

**7-step onboarding wizard**
- Step 1: Workspace provision
- Step 2: AI Discovery — free-text description (Describe tab) or Browse-by-sector grid
- Step 3: Profile Confirmation — sector, subsector, business model, stage, region, goals, documents, KPIs, risks; editable before saving
- Step 4: Role Selection — AI pre-selects roles from detected profile; Add Role feature for custom roles (CFO, CRO, Risk/Compliance, etc.)
- Step 5: Upload — sector-aware suggested document pack shown; drag-drop multi-file; AI-suggested department and sensitivity per file
- Step 6: Evidence Preview — ingestion status, confidence bar, pending/quarantine callouts
- Step 7: Go Live — role card grid

---

## 0.7.0 — Company Context and Sector-Aware Intelligence (2026-05-28)

**Sector library — `lib/domain/sector-library.ts`**
- 8-sector taxonomy: Financial Services, Professional Services, Technology/SaaS, Manufacturing, Retail/Commerce, Healthcare, Real Estate/Construction, Education/Training
- Each sector defines: defaultRoles, commonKPIs, commonRisks, documentTypes, recommendedDashboards, commonRecommendations, sensitivityDefault
- `getAllSectors()`, `getSector()`, `buildCompanyContext()` helpers
- `buildCompanyContext()` produces a compact <300-token block injected into every LLM prompt

**Workspace profile — `db/schema.ts` + migration `0008_workspace_profile.sql`**
- New `workspaceProfiles` table: sector, subsector, businessModel, companyStage, employeeBand, region, primaryGoals, riskProfile, priorityRoles
- `getWorkspaceProfile()` and `saveWorkspaceProfile()` in repository with in-memory fallback in store

**Profile API — `GET|POST /api/workspace/profile`**
- GET returns current profile (read:dashboard scope)
- POST upserts profile (admin scope), Zod-validated

**Company context injected into all LLM calls**
- `lib/services/dashboard.ts` — `buildCompanyContext(profile)` prefixed on every dashboard card prompt
- `lib/services/recommendations.ts` — profile context prefixed on recommendation generation prompt
- `lib/services/retrieval.ts` — profile context prefixed on Ask synthesis prompt

---

## 0.6.0 — UI/UX Hardening: Waves 1 and 2 (2026-05-26)

**Wave 1 fixes**
- Active side-nav highlighting for all routes
- Suspense loading skeletons on all four dashboards
- Ingestion UX: action links, confidence label, quarantine refresh path
- Recommendations: actor handling, empty state, history truncation
- Multi-file upload in wizard (batch up to 10)

**Wave 2 fixes**
- Consolidated 4 duplicate dashboard pages into one dynamic `/dashboard/[role]` route
- Added disabled states in globals.css for locked controls
- Evidence refs shown in recommendations instead of raw IDs
- Full UI/UX audit document created at `UIUX_AUDIT.md`

---

## 0.5.0 — Recommendations, Charts, and Dashboard Intelligence (2026-05-24)

**Recommendation generation — `lib/services/recommendations.ts`**
- `generateRecommendations(workspaceId)` — LLM synthesizes actionable recommendations from top processed evidence
- Fire-and-forget call after every successful ingestion
- Approval workflow: recommend → pending → approved/rejected with audit trail

**Dashboard charts — `components/dashboard-charts.tsx`**
- Pure SVG chart primitives (bar, line, sparkline, gauge) in `components/charts.tsx`
- Role-specific data cards for CEO, COO, CBO, CTO
- Skeleton loader while data loads

**CTO/CDO dashboard**
- Technology health, data quality, security posture, infrastructure signals

**OAuth2 and API key management**
- `POST /api/oauth/token` — client_credentials flow for LLM agent access
- `GET|POST|DELETE /api/agent-keys` — manage API keys per workspace
- Bearer scope validation across dashboard, ask, and recommendation routes

---

## 0.4.0 — Clerk Auth, Tenant Isolation, and Cloud Deploy (2026-05-22)

**Clerk integration**
- Replaced custom session auth with Clerk identity in all API routes
- Clerk orgId used as `workspaceId` throughout for multi-tenant isolation
- `/sign-in` and `/sign-up` Clerk-hosted pages
- Middleware protecting all `/dashboard`, `/ask`, `/ingestion`, and `/api` routes

**Cloud deploy**
- Neon Postgres + pgvector provisioned
- 8 deployment env vars confirmed
- Migrations 0006 (embeddings), 0007 (vector index), 0008 (workspace profiles) run against production

**Slack OAuth**
- Full OAuth install flow: `/api/connectors/slack/install` and `/api/connectors/slack/callback`
- Connector registry in Settings with status, health, last sync

---

## 0.3.0 — Vector Search, Evidence Approval, and Settings (2026-05-20)

**pgvector retrieval — `lib/services/retrieval.ts`**
- Two-tier: Tier 1 vector (HNSW cosine similarity via `text-embedding-3-small`), Tier 2 keyword ranking fallback
- `NEXUS_VECTOR_SEARCH=enabled` flag; silent fallback when disabled
- Migration `0007` adds `embedding vector(1536)` to evidence_records and HNSW index

**Evidence approval screen**
- `/approvals` page with pending-approval queue
- `POST /api/approvals/:recommendationId` — approve or reject
- `POST /api/evidence/:id/review` — sign off individual evidence before dashboard use

**Settings page**
- Workspace settings: org name, sensitivity defaults, quarantine threshold
- Policy settings: LLM provider, approval modes, data retention
- Connector registry

**Ingestion hardening**
- File size guard: 50 MB hard cap
- Slack signature verification on webhook events
- Freshness computed dynamically on read (not just at ingest)

---

## 0.2.1 - DB Required Mode + Migration/Seed Hardening
- Added DB-required policy (`NEXUS_DB_REQUIRED`) with production-safe defaults.
- Added startup DB health check path in Mission Control layout.
- Added DB-backed auth path with salted password hashing and workspace membership verification.
- Added users auth migration (`0002_auth_users.sql`) and seed bootstrap for admin credentials in DB.
- Added migration tooling and scripts:
  - `db/migrations/0001_init.sql`
  - `npm run db:migrate`
  - `npm run db:seed`
  - `npm run db:check`
  - `npm run db:generate` (Drizzle)
- Added seeded demo records for tenant/workspace/evidence/recommendations/decisions.
- Updated schema IDs to text keys to stay compatible with existing demo and pipeline IDs.
- Added DB policy tests.

## 0.2.0 - Mission Control V1 Stack (Pilot Build)
- Added monorepo workspace foundation and `apps/mission-control` Next.js app.
- Added Mission Control route scaffolding:
  - `/dashboard/ceo`, `/dashboard/coo`, `/dashboard/cbo`
  - `/ask`, `/sources`, `/ingestion`, `/review`, `/recommendations`, `/decisions`, `/evidence/[id]`
  - `/settings/workspace`, `/settings/policies`
- Added API routes:
  - `GET /api/dashboard/:role`
  - `GET /api/recommendations`
  - `GET /api/evidence/:id`
  - `POST /api/approvals/:recommendationId`
  - `GET|POST /api/ingestion/status`
  - `POST /api/ask`
  - `POST /api/slack/events`
- Added core contracts and in-memory pilot store with append-only audit events.
- Added deterministic ingestion extraction path (PDF/DOCX/PPTX/XLSX/text) with confidence scoring and quarantine gating.
- Added retrieval service with evidence refs, confidence/freshness, refusal path, and restricted-evidence filtering.
- Added recommendation approval workflow and review/audit visibility.
- Added Drizzle Postgres schema scaffold for tenant/workspace/evidence/recommendation/decision/approval/audit models.
- Added pilot documentation pack:
  - onboarding checklist
  - security and data-handling one-pager
  - pilot success scorecard
  - executive pack template
- Added test coverage for contracts, ingestion policy, retrieval behavior, and approvals.
- Added login layer:
  - session cookie auth middleware
  - `POST /api/auth/login` and `POST /api/auth/logout`
  - `/login` UI and sign-out control in Mission Control shell
- Updated default login credentials to `admin / admin` (configurable via env).

## 0.1.1 - Launch Kit
- Added launch landing-page copy
- Added launch post template
- Added reusable visual assets for release and social posts
- Added contributor guide and launch kit folder

## 0.1.0 - Public Launch
- Open-sourced Nexus Core under MIT
- Added one-command install
- Added `nexus` shell wrapper with `doctor`, `status`, `setup`, `help`, and `init`
- Added JSON health checks
- Added workspace scaffolding
- Added buyer one-pager, pilot SOW template, contribution guide, and demo examples
