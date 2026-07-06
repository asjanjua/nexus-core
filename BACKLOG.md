# BACKLOG.md — NexusAI Operating Backlog

> Source-of-truth backlog view for NexusAI Mission Control. `TASKS.md` remains the detailed execution checklist; this file is the cross-document backlog map for planning, handover, and prioritization.
> Visual finish-line map: `docs/DEVELOPMENT_FINISH_LINE_VISUAL.md`.
> Markdown estate review: `docs/MARKDOWN_ESTATE_REVIEW_2026-06-25.md`.
> Engineering guardrails: `docs/ENGINEERING_GUARDRAILS.md`.
> Architecture review: `TASKS.md` § Architecture Review Action Items.
> Distribution plan: `NexusAI_Distribution_Plan.docx` and `docs/INFRA_DECISION_MEMO.md`.
> UI/UX workplan: `docs/UI_UX_WORKPLAN.md` (MCP-aware design-to-code pipeline).
> Last reviewed: 2026-07-06.

---

## Backlog Principles

1. **Separate shipped code from production readiness.** A feature can be locally verified but still blocked from paid-pilot production until migrations, deploy, smoke, monitoring, security, and support are complete.
2. **Prioritize proof over breadth.** Nexus should prove one governed workflow with strong evidence, then expand connectors, roles, and automation.
3. **Keep human approval as the trust boundary.** No autonomous writeback, external send, payment, HR action, legal commitment, filing, or source-system update in V1.
4. **Use docs as operating controls.** `TASKS.md`, `HANDOVER.md`, `docs/ROADMAP.md`, `docs/PRODUCTION_HEALTH_CHECKLIST.md`, and `docs/SECURITY_REVIEW.md` should agree before release work is considered done.
5. **Keep strategy in the paperwork.** Readiness, buyer lane, first workflow, sponsor/reviewer, evidence bundle, governance boundary, and shadow ROI should appear in the backlog, tasks, and pilot docs before a pilot is sold.
6. **Make runtime state explicit.** Workflow runners, sync jobs, local/on-prem auth, and verifier loops should use typed state machines, append-only events, visible async results, and exhaustive error taxonomies.

---

## Status Definitions

| Status | Meaning |
|---|---|
| `open` | Not started or materially incomplete. |
| `in progress` | Started but not ready for verification. |
| `local verified` | Code/docs pass local gates but are not deployed or smoke-tested in production. |
| `production pending` | Built but waiting on migrations, env vars, deploy, external service config, or authenticated smoke. |
| `done` | Implemented, verified, and paper trail updated. |
| `deferred` | Valid, but intentionally outside the current pilot path. |

---

## P0 — Release / Cutover Backlog

These are the highest-priority operational items because they determine whether the current build can be safely shown or piloted.

| Item | Status | Source | Notes |
|---|---|---|---|
| Confirm/apply migrations `0025-0026` in production database | done | `TASKS.md`, `HANDOVER.md`, `docs/PRODUCTION_HEALTH_CHECKLIST.md` | Applied successfully on 2026-06-25; `db:check` returned `ok=true` against `neondb`. |
| Commit/push/deploy | production pending | `HANDOVER.md`, `docs/ROADMAP.md` | `origin/main` is now at commit `c55417e` (`feat: add product subdomain detection`). Render dashboard login is needed to confirm the service has deployed this SHA before demoing product-specific domains. |
| Preserve original UI baseline before choosing newer UI direction | done (refs captured) | `docs/UI_BASELINE_VERSIONING.md`, `DEPLOY.md`, `docs/PRODUCTION_HEALTH_CHECKLIST.md` | Vercel is historical origin only. Ledger now captures V0.1/V0.2 Figma refs, current git ref at registry time, Render comparison route, source formats, screen sets, and route mapping. Exact Render deploy ID remains part of the separate deploy-confirmation item. |
| Authenticated Render smoke for `/knowledge`, `/workflows`, `/settings/connectors`, and Ask note citations | open | `TASKS.md`, `HANDOVER.md`, `docs/PRODUCTION_HEALTH_CHECKLIST.md` | Must be done in a logged-in browser session because Clerk blocks unauthenticated curl. |
| Confirm Render deployed intended commit | open | `docs/PRODUCTION_HEALTH_CHECKLIST.md` | Verify service commit SHA and env before customer demo. Current unauthenticated `/knowledge` probe still returns 404, so v0.25 routes are not confirmed live. |
| Product subdomain infrastructure | production pending | `TASKS.md`, `docs/RENDER_DEPLOY.md`, `docs/INFRA_DECISION_MEMO.md` | Code layer shipped in `c55417e`, but Cloudflare DNS, Render custom domains, Clerk allowed origins/redirect URLs, and per-domain smoke remain external setup work. Use one shared Render service unless a product later needs isolated infrastructure. |
| Add cron job entries to `render.yaml` | done | `TASKS.md`, architecture review | Three cron services added 2026-06-25: dispatch every 2 min, billing daily at midnight, synthesis daily at 1am. All use `NEXUS_CRON_SECRET` auth. Must verify in Render dashboard after deploy. |
| `/api/health` returns `status=ok` in production | done | `docs/PRODUCTION_HEALTH_CHECKLIST.md` | Verified 2026-06-25: DB, vector search, R2 originals, and DeepSeek LLM config are healthy. |

---

## P1 — Paid Pilot Readiness Backlog

These are the minimum trust and operations items before a paid pilot contract should be signed.

| Item | Status | Source | Notes |
|---|---|---|---|
| Tenant isolation test | done (automated) | `tests/tenant-isolation.test.ts` | Closed 2026-06-25. Automated test creates two workspaces and proves no cross-workspace leakage across evidence, entities, and knowledge notes/search; pins the by-id ownership contract used by `/api/evidence/[id]`. 8 assertions verified via tsx; tsc clean. |
| Security headers production scan | done (code) / open (live scan) | `middleware.ts`, `tests/security-headers.test.ts` | Header set is already A-grade (HSTS preload, nosniff, frame DENY, Referrer/Permissions-Policy, strict CSP). Added `Cross-Origin-Opener-Policy: same-origin-allow-popups` + a regression test pinning the set. Still run securityheaders.com against the live app to confirm the A rating. |
| Manual API auth-bypass review | open (spot-verified) | `docs/SECURITY_REVIEW.md` | Confirm every sensitive API route uses `requireScope()` or a signed internal secret. Spot-verified 2026-06-25: `/api/evidence/[id]` GET/DELETE enforce `requireScope` + `record.workspaceId === ctx.workspaceId` (403 otherwise). Full sweep still pending. |
| PII / restricted-evidence red-team pass | done (automated) | `tests/pii-red-team.test.ts` | Closed 2026-06-25. Adversarial test on `canReadEvidence`/`filterEvidenceByPassport`: restricted/PII denied (ceiling), missing-sensitivity fail-closed, suspended passport denies, forbidden-scope denies, in-ceiling control allowed. 7 assertions verified via tsx; tsc clean. Live upload-through-Ask check still worth one manual pass. |
| Sentry or equivalent error tracking | done | `TASKS.md`, architecture review | Task #32 + #37 closed 2026-06-25. Wired via `instrumentation.ts` + `global-error.tsx` + manual-capture helpers. Ships disabled (no-op) until `SENTRY_DSN` is set. |
| Resend email delivery for synthesis briefs | done | `TASKS.md`, architecture review | `lib/email/resend.ts` pure-fetch client (Resend API), `sendSynthesisEmails()` wired into synthesis cron runner, HTML email template with brief URL and unsubscribe link, `GET /api/email/unsubscribe` public route, `NEXUS_RESEND_API_KEY` + `NEXUS_FROM_EMAIL` added to `render.yaml`. Ships silently (no-op until Resend API key is set). |
| Production email boundary and sender config | open | `docs/USER_STRATEGY_AND_PIVOTS.md`, `render.yaml`, Clerk dashboard | Clerk owns signup/signin verification, password reset, and future org invitation email. Nexus product/cron email uses a managed provider such as Resend or Cloudflare Email Sending. Configure `pinavia.io` sender authentication, `NEXUS_RESEND_API_KEY`, `NEXUS_FROM_EMAIL`, and run one scheduled synthesis email test. No custom mail server for V1. |
| Wire LLM routing table into execution path | done | `TASKS.md`, architecture review | Task #36 closed 2026-06-25. `callLLM()` now executes `model-routing.ts` 10-surface fallback-chain policy via `callLLMWithRouting()`, wired into all 8 call sites. |
| Workspace provider allow-list UI | done | `TASKS.md`, architecture review | Settings > AI Policy page now shows multi-select of 6 providers with jurisdiction flags, local-only mode toggle, and live save via existing `PATCH /api/settings/workspace`. `isProviderAllowed()` enforcement already existed. GCC buyers can exclude Chinese providers. |
| Mode Indicator React context | done | `TASKS.md`, architecture review, Design Philosophy §3.6 | `lib/mode-context.tsx` with AuthMode discriminated union (clerk_cloud, local_license, offline_local, hybrid_sync_pending), `ModeProvider` wrapping authenticated layout, `ModeIndicator` badge in top bar beside user button. Detects mode from `NEXT_PUBLIC_NEXUS_DEPLOY_MODE` env var. |
| Uptime monitoring | open | `TASKS.md` | Monitor `/api/health`, dashboard, and ingestion route. |
| Automated dependency scanning in CI/deploy | done | `.github/workflows/ci.yml` | Closed 2026-06-25. CI workflow runs typecheck + test + build on push/PR, and an `audit` job that hard-fails on critical advisories (`npm audit --audit-level=critical`) plus a non-blocking high/moderate report. Weekly Monday 06:00 UTC scheduled audit catches newly disclosed advisories. YAML validated. |
| Neon daily backups and restore test | open | `TASKS.md`, `docs/PRODUCTION_HEALTH_CHECKLIST.md` | 30-day retention target. |
| R2 bucket versioning if originals storage is promised | open | `TASKS.md`, `docs/PRODUCTION_HEALTH_CHECKLIST.md` | Required for original-file recovery commitments. |
| Support/security mailbox monitored | open | `TASKS.md`, `docs/SECURITY_REVIEW.md` | `support@...` and `security@...` or equivalent before paid pilot. |
| Pilot SLA documented and linked in paperwork | open | `TASKS.md` | 4-hour response, 1-hour critical target in current task text. |

---

## P2 — Product Backlog

These are the next product moves after release/cutover and paid-pilot safety gates.

| Item | Status | Source | Notes |
|---|---|---|---|
| Persist user strategy in product | done | `TASKS.md`, `docs/USER_STRATEGY_AND_PIVOTS.md` | Migration 0027 `strategy_profiles`, Drizzle schema, Zod contracts (buyer lane, governance posture, full profile), repository (`getStrategyProfile`, `upsertStrategyProfile`), API (`GET/PATCH /api/strategy-profile`). Ready for readiness page integration and onboarding routing. |
| Route onboarding into first workflow selection | done | `TASKS.md`, `docs/USER_STRATEGY_AND_PIVOTS.md` | Onboarding Step 7 now shows "Start with a Workflow Pilot" card (Recommended badge, col-span-2) that routes to `/workflows` for Workflow Twin Scorer. Users can still pick a role dashboard directly. |
| Strategy profile data model | done | `TASKS.md`, `docs/USER_STRATEGY_AND_PIVOTS.md` | Built as part of P2.1 — migration 0027, schema, contracts, repository, API. Readiness result, buyer lane, role, sector, company size, priority, sponsor, reviewer, governance posture, and selected workflow all stored. |
| Pilot paperwork generation from strategy profile | done | `TASKS.md`, pilot paperwork docs | `GET /api/pilot/paperwork` — pre-fills SOW (sponsor, reviewer, workflow, governance), onboarding checklist (5 steps with done status), success scorecard (7 outcomes, buyer-lane weighting), billing trigger checklist (5 triggers), and value proof pack from strategy profile data. |
| Seed dashboards and suggested questions from backcast result | done | `TASKS.md` | `GET /api/dashboard/[role]/suggested` reads selected workflow from strategy profile, extracts backcast milestones/success metrics, and returns role-tuned suggested questions for the Ask panel. |
| Knowledge Workspace note embeddings | done | `TASKS.md`, `docs/KNOWLEDGE_WORKSPACE.md` | Migration 0028 adds vector(1536) column to `knowledge_notes`. `storeKnowledgeEmbedding()` and `searchKnowledgeVector()` in repository. Embedding generated fire-and-forget on note save. Search API tries vector first, falls back to text. |
| Note-to-entity linking UI | done | `TASKS.md`, `docs/KNOWLEDGE_WORKSPACE.md` | Entity search picker in Knowledge sidebar: live search from `/api/entities`, click to link entity to note, × to unlink. `entityRefs` already supported in PATCH API. |
| Richer Knowledge graph filters | done | `TASKS.md`, `docs/KNOWLEDGE_WORKSPACE.md` | Filter by tag, ref type, entity, source, freshness, and workflow. Built across `lib/knowledge/markdown.ts`, `lib/data/repository.ts`, `lib/data/store.ts`, `lib/knowledge/filter-params.ts`, both knowledge API routes, and the `knowledge-workspace.tsx` filter bar. Verified by Ali on his own machine 2026-06-27: `npm install` (0 vulnerabilities), `tsc --noEmit`, `npm test`, `npm run build` all passed clean (sandbox couldn't run test/build itself — darwin-arm64 vs linux-arm64 native binding mismatch). |
| Duplicate / contradiction audit | open | `TASKS.md`, `docs/KNOWLEDGE_WORKSPACE.md` | Identify conflicting notes/evidence and stale claims. |
| Daily/project/workflow brief automation from notes | open | `TASKS.md` | Turns Knowledge Workspace into proactive operating memory. |
| Direct "Create Decision from this brief" action | done | `TASKS.md` | Each synthesis question now has a "+ Create Decision" link that routes to `/decisions?prefill=...` with the question as title and answer as rationale. Decisions page auto-opens the New Decision form pre-filled. |
| Ops Review Twin richer UI | open | `TASKS.md`, `docs/NEXUS_WORKFLOW_TWIN_REALIGNMENT.md` | Weekly execution summary, blockers, overdue owners, KPI signals. |
| Trusted eval scorecards from U3/U4 data | open | `TASKS.md`, `docs/V1_1_UPGRADE_PLAN.md` | Agent quality, groundedness, acceptance/edit rates. |
| Type-safe runtime state and effect boundaries | done | `TASKS.md` #19, `lib/guardrails.ts`, `docs/ENGINEERING_GUARDRAILS.md` | Closed 2026-06-25 — `RunnerState`, `AuthMode`, `EffectResult<T>`, `VerifierOutcome`, `RunnerEvent`, `assertNever` contracts landed with `tests/guardrails.test.ts` (16 assertions). This is the contract layer only; no runner has adopted it yet — apply when building the first autonomous/local runner. |
| Nexus-native skill catalog/API/UI | done | `apps/mission-control/lib/agents/nexus-native-skills.ts`, `apps/mission-control/app/api/agents/native-skills/route.ts`, `TASKS.md` | First-party native skill pack is typed, tested, and visible in Settings → Agent Governance with workflow/pivot coverage, approval gates, audit events, runtime status, and external-reference boundaries. |
| Executable `evidence_grid_review` native skill | done | `apps/mission-control/lib/agents/evidence-grid-review.ts`, `apps/mission-control/lib/services/evidence-grid-review-runner.ts`, `apps/mission-control/tests/evidence-grid-review.test.ts` | First native runtime slice shipped: deterministic engine produces cited grids, issue flags, missing-evidence notes, and reviewer escalations from governed evidence; runner adds passport gating and started/completed audit events. Skill is `runtime_ready`. |
| Evidence grid review — executor endpoint + UI | done | `apps/mission-control/app/api/agents/native-skills/evidence-grid-review/route.ts`, `apps/mission-control/app/settings/page.tsx` | `POST /api/agents/native-skills/evidence-grid-review` runs the engine against governed evidence; Settings → Agent Governance runs a starter board-review spec and renders cited rows, escalations, and missing evidence. |
| Executable `document_integrity_review` native skill | done | `apps/mission-control/lib/agents/document-integrity-review.ts`, `apps/mission-control/lib/services/document-integrity-review-runner.ts`, `apps/mission-control/tests/document-integrity-review.test.ts` | Per-document parse-quality engine (reuses `extractSourceSpan`) flags parse/provenance/governance/tabular issues and emits repair recommendations. Runner inspects ungoverned docs on purpose. Skill is `runtime_ready`. |
| Document integrity review — executor endpoint + UI | done | `apps/mission-control/app/api/agents/native-skills/document-integrity-review/route.ts`, `apps/mission-control/app/settings/page.tsx` | `POST /api/agents/native-skills/document-integrity-review` runs the engine; Settings → Agent Governance has a "Run document integrity review" button rendering per-document findings, parse-quality score, and repair recommendations. |
| External agent skill candidate UI/API surface | deferred | `apps/mission-control/lib/agents/external-skill-candidates.ts`, `docs/AGENT_SKILL_SOURCING_REVIEW.md`, `TASKS.md` | Typed registry and tests exist, but product direction is Nexus-native first. Surface reference candidates only if useful for reviewers, and never as install/runtime access. |
| Fine-tooth external skill reviews | done | `docs/AGENT_SKILL_SOURCING_REVIEW.md`, `TASKS.md` | Candidate-by-candidate review now covers governance, legal/compliance, private-equity, evidence-grid, document-skill, Obsidian, GitHub-ingest, and browser-automation references. Runtime verdict is reference-only/tool-candidate until registry, sandbox, license, evidence, and approval gates exist. |

### Architecture Review Notes (context, not tasks)

These notes from the 2026-06-25 architecture review affect prioritization and sequencing but are not standalone tasks.

- **Rate limiting is already built** (v0.11.0 middleware, 7 rules, 429 with Retry-After). Do not duplicate. Any "rate limiting" task in the distribution plan refers to additional coverage beyond middleware, which should specify which routes and why.
- **Knowledge Workspace local vault sync** is an architectural asset for Tauri Desktop distribution. The sync layer (`NEXUS_VAULT_SYNC`, `NEXUS_LOCAL_VAULT_PATH`) is a production-tested seam between cloud and local storage with path validation, symlink rejection, and conflict preservation. When building Tauri Desktop Phase 2 (local-first), this is the prototype for the broader local-data strategy.
- **Orchestration Dispatcher** (`FOR UPDATE SKIP LOCKED`) provides the concurrency foundation needed for local Tauri SQLite dispatch. The atomic job claiming pattern transfers directly. Highlight this when scoping Tauri local-first architecture.
- **AuthMode contracts** in ENGINEERING_GUARDRAILS.md are designed, not just "watch." The `clerk_cloud | local_license | offline_local | hybrid_sync_pending` discriminated union is the auth transition plan for Tauri. Implementation is deferred to Tauri Desktop Phase 2, not undesigned.
- **LLM routing gap** is the single most impactful wiring task. The policy layer (`model-routing.ts`: 10 surfaces, 5 providers, fallback chains, data class restrictions, confidence floors) and the enforcement layer (`llm.ts`: single env var toggle) are not connected. Wiring them means executive briefs get premium models, ingestion triage gets economy models, and fallback fires automatically when a provider is down.
- **Connector architecture has two runtimes** (2026-06-26). All 8 existing connectors use OAuth + REST (stateless HTTP, `fetch()` only). IMAP email (Spacemail, Fastmail, cPanel, self-hosted) requires TCP sockets, TLS, MIME parsing, and `imapflow` library. This is a second connector runtime, not a variation. Build one "IMAP Email" connector (protocol-level, not provider-specific). No POP3. Credential encryption is already solved (`lib/crypto.ts`, AES-256-GCM). Sequence: Google Drive e2e -> Gmail/Outlook (OAuth, fits pattern) -> IMAP (new runtime, long tail). See `ARCHITECTURE.md` §13.

## P2a — Strategy / Paperwork Backlog

This is the operating plan that keeps the strategy in the paperwork rather than isolated in one markdown file.

| Item | Status | Source | Notes |
|---|---|---|---|
| Keep canonical strategy current | done | `docs/USER_STRATEGY_AND_PIVOTS.md` | Updated 2026-07-06 with the product-domain boundary and house-of-brands routing guardrails. |
| Keep task plan current | done | `TASKS.md` | Current strategy operating plan and product-subdomain tasks are listed near the top of the execution checklist. |
| Keep backlog current | done | `BACKLOG.md` | Backlog separates release gates, strategy implementation, pivot products, and product-subdomain infrastructure. |
| Keep handover current | done | `HANDOVER.md` | Updated 2026-07-06 with `c55417e`, product-subdomain operational follow-up, and the corrected continuation prompt. |
| Keep changelog current | done | `CHANGELOG.md` | Added the 2026-07-06 product-subdomain detection note. |
| Keep markdown estate review current | done | `docs/MARKDOWN_ESTATE_REVIEW_2026-06-25.md` | Classifies all 63 Markdown files and lists targeted cleanup work. |
| Keep engineering guardrails current | done | `docs/ENGINEERING_GUARDRAILS.md` | Added 2026-06-25 from the FP review: typed states, auth modes, append-only events, visible async effects, and exhaustive failure categories. |
| Translate strategy into product tickets | done | `TASKS.md` | Strategy profile (migration 0027), onboarding workflow routing, pilot paperwork API, backcast dashboard seeding all implemented. |

## P2c — Pivot Product Queue

These are the current pivot/product surfaces that sit above the core Nexus operating layer. The queue keeps Quorum, Meridian, Vantage, Nucleus, and connector breadth visible without scattering them across old strategy notes.

| Item | Status | Source | Notes |
|---|---|---|---|
| Quorum Board Room UI | local verified | `TASKS.md`, board synthesis/delta backend | Built 2026-07-05. `/board` renders a director-facing board intelligence screen over `POST /api/board/delta`: stable board identifier, first-run baseline state, later between-meetings delta, Director Q&A, confidence/evidence chips, source links, entity links, and governance boundary copy. Side nav includes Board Room. `tsc`, full mission-control tests, and production build passed locally; Render deploy/auth smoke still pending. |
| Quorum UI/UX Figma build | done (Figma V0.1) | `docs/UI_BASELINE_VERSIONING.md`, Figma node `78:3` | Built 2026-07-06 as `08 Quorum UI UX Build`: six editable desktop screens for baseline setup, delta review, Director Q&A, evidence drilldown, decision handoff, and board export pack. Next Quorum step is choosing which candidate screens to implement beyond the live `/board` route. |
| Quorum board governance workflow | in progress | `docs/QUORUM_BOARD_GOVERNANCE_WORKFLOW.md`, `lib/board-governance-workflow.ts`, Figma nodes `80:3` and `87:3` | Workflow spec, typed code registry, `/board` roadmap section, tests, and 17-screen Figma V0.2 board added 2026-07-06. Global-use hardening now formalizes governance boundaries, jurisdiction-pack requirements, route-safe screen resolution, and `quorumScreenGuidance` for user inputs/action points. Next implementation step is choosing the first data-model slice: board profile/registers, meeting/agenda, or minutes/action register. |
| Product subdomain code layer | done | `lib/product-detection.ts`, `middleware.ts`, `app/layout.tsx` | Closed 2026-07-06 in `c55417e`. `app.pinavia.io`, `nexus.pinavia.io`, and unknown hosts resolve to NexusAI; `quorum`, `meridian`, `vantage`, and `nucleus` product subdomains select product-aware branding/redirect defaults inside the shared Render app. Infrastructure setup remains tracked in P0. |
| Meridian regulatory workflow | planned | `docs/MERIDIAN_REGULATORY_WORKFLOW.md`, `lib/meridian-regulatory-workflow.ts`, Figma node `87:3` | Meridian now owns its domain lifecycle: scope, evidence, gap, and filing. Global-use hardening adds jurisdiction-pack requirements so SECP/NBFC terms do not leak into other markets. `meridianScreenGuidance` now pins the input/action copy for all 8 planned screens. First runtime slice should wire regulator/license/status selection to the existing regulatory requirement library and evidence coverage. Regulatory content still needs domain review. |
| Vantage DD Copilot workflow | planned | `docs/VANTAGE_DD_WORKFLOW.md`, `lib/vantage-dd-workflow.ts`, Figma node `87:3` | Vantage now owns its domain lifecycle: dealroom, coverage, redflags, and memo. Global-use hardening adds market/sector-pack requirements for cross-border and non-fintech diligence. `vantageScreenGuidance` now pins the input/action copy for all 8 planned screens. First implementation slice should create a Vantage deal workspace route that calls `coverageForDeal()`, shows gaps/red flags, and drafts IC memo sections. |
| Connector Ops / connectors beyond skeletons | open | connector backlog, `docs/CONNECTOR_SETUP_GUIDE.md` | Connector Ops is shared infrastructure that powers verticals, not a product workflow template. Drive and Gmail have real OAuth + ingestion; Slack has delivery plus inbound channel-message ingestion but needs broader sync/ingestion UX; Teams is still thin beyond SharePoint/Graph. |
| Nucleus methodology-pack authoring tool | open | `lib/branding/white-label.ts`, user queue | Partner-facing authoring workflow for consulting firms to encode proprietary frameworks into governed methodology packs without engineering. Needs its own domain registry when implementation begins; do not force it into Meridian/Vantage/Quorum arcs. |

## P2b — Documentation Cleanup Backlog

This backlog comes from `docs/MARKDOWN_ESTATE_REVIEW_2026-06-25.md`.

| Item | Status | Source | Notes |
|---|---|---|---|
| Fix stale status headers in shipped specs | done | markdown estate review | Billing tiers, scheduled synthesis, U2 passport, agent rooms, and older runtime diagram now have current status stamps. |
| Refresh launch/demo copy | done | markdown estate review | Launch and demo docs now reflect readiness-first buyer lanes, governed workflow pilots, and v0.25.0 Knowledge Workspace. |
| Consolidate production runbook roles | done | markdown estate review | `DEPLOY.md`, `CUTOVER.md`, and `docs/RENDER_DEPLOY.md` now say when to use each runbook. |
| Convert valid UX review items into tickets | done | markdown estate review | Active UX review items have been added to the Design / UX backlog. |

---

## P3 — Connector Backlog

Slack has the first inbound channel-message ingestion path and Connector Settings policy UX. The rest of the connector roadmap remains open.

| Connector / Area | Status | Priority | Notes |
|---|---|---|---|
| Google Drive | done | highest | OAuth 2.0 web server flow: `lib/connectors/google-drive.ts` (pure fetch), install/token exchange/refresh, file listing, download+ingest pipeline. 4 API routes in `api/connectors/google-drive/`. Settings UI updated. Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. |
| SharePoint / Teams | done | high | Task #40, closed 2026-06-25 — Microsoft identity platform OAuth 2.0 + Graph API: `lib/connectors/sharepoint.ts` (pure fetch), install/callback/files/ingest routes, Settings UI. Env vars: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`. Code-complete; pending real Azure AD app registration and an end-to-end OAuth round-trip test. |
| Gmail | local verified | medium | Built 2026-06-26. OAuth2 reusing the Google Drive client, `gmail.readonly` scope: `lib/connectors/gmail.ts` + install/callback/files/ingest routes. Current scope is message listing + per-message plain-text ingest as `sourceType: "email_crm"`; attachment extraction and thread rollups not yet built. Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (same as Google Drive — needs the Gmail redirect URI added to the OAuth client). Pending real-OAuth-app verification. |
| Outlook Mail | local verified | medium | Built 2026-06-26. OAuth2 via Microsoft Graph reusing the SharePoint Azure AD app, `Mail.Read` scope: `lib/connectors/outlook-mail.ts` + install/callback/files/ingest routes. Works against Outlook.com and Microsoft 365/Exchange Online. Same scope gaps as Gmail. Env vars: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID` (same as SharePoint — needs the Outlook Mail redirect URI added to the registration). Pending real-OAuth-app verification. |
| IMAP Email | local verified | medium | Built 2026-06-26 — second connector runtime per `docs/ARCHITECTURE.md` §13 (no OAuth, no `fetch()`; stateful IMAP-over-TLS via `imapflow` + MIME parsing via `mailparser`). `lib/connectors/imap.ts` + `connect`/`files`/`ingest` routes; settings-page inline form collects host/port/username/password directly, encrypted at rest via the standard `repository.upsertConnector` path. Covers any IMAP server (Spacemail, Hostinger, Zoho, self-hosted). No POP3 by design. No env vars required — fully user-configured per workspace. Pending `npm install` (new dependency) and a real-mailbox connection test. |
| Jira | local verified | medium | Closed 2026-06-25 (partial). Atlassian OAuth 2.0 (3LO) + cloudId resolution: `lib/connectors/jira.ts` + install/callback/files/ingest routes. Current scope is per-issue (JQL search + single-issue ingest), not yet the aggregate sprint/epic-rollup signals originally specced. Env vars: `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`. Pending real-OAuth-app verification. |
| GitHub | local verified | medium | Closed 2026-06-25 (partial). Classic OAuth web app flow: `lib/connectors/github.ts` + install/callback/files/ingest routes. Current scope is repo listing + per-issue/PR ingest, not yet CI-pass-rate/deployment-frequency rollups. Env vars: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`. Pending real-OAuth-app verification. |
| Salesforce / HubSpot / CRM | local verified | medium | Closed 2026-06-25 (partial, HubSpot only). Standard OAuth2: `lib/connectors/hubspot.ts` + install/callback/files/ingest routes. Current scope is deals only (list + single-deal ingest as `sourceType: "crm"`); contact activity and email sequence signals are not yet built. Salesforce remains unbuilt. Env vars: `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`. Pending real-OAuth-app verification. |
| QuickBooks / Xero / finance exports | local verified | medium | Closed 2026-06-25 (partial, QuickBooks only). Intuit OAuth2 with Basic-auth token exchange + realmId capture: `lib/connectors/quickbooks.ts` + install/callback/files/ingest routes. Current scope is invoices only (list + single-invoice ingest as `sourceType: "finance_export"`); P&L/cash-flow/AR/AP-aging/balance-sheet report pulls are not yet built. Xero remains unbuilt. Env vars: `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `QUICKBOOKS_ENVIRONMENT`. Pending real-OAuth-app verification. |
| Social / Meta / LinkedIn signals | local verified | later | Closed 2026-06-25 (partial, LinkedIn only). `lib/connectors/linkedin.ts` + install/callback/files/ingest routes built, code-complete. OAuth install/callback works without further approval; `files`/`ingest` additionally require LinkedIn's Community Management API product (separate partner review) and will 502 with a 403 until approved. Meta remains unbuilt. Env vars: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`. |
| Connector scheduler and sync history | open | high | Needed for non-event-based source freshness and retry visibility. |

---

## P4 — Team, Compliance, and Scale Backlog

| Area | Status | Source | Notes |
|---|---|---|---|
| Workspace invitations and member roles | open | `TASKS.md`, `docs/ROADMAP.md` | Owner/Admin/Executive/Reviewer/Contributor/Viewer. |
| Department and sensitivity access policy per member | open | `TASKS.md` | Needed for multi-person pilot teams. |
| External advisor / viewer access | open | `TASKS.md` | Useful for consultants, auditors, board observers. |
| GCC/Pakistan compliance package | open | `TASKS.md` | PDPL, DPA, SAMA/NCA/UAE notes, retention/deletion, breach response. |
| WhatsApp/SMS/voice channels | deferred | `TASKS.md`, `docs/USER_STRATEGY_AND_PIVOTS.md` | Differentiator for GCC/Pakistan but not current release blocker. First iteration should not require Whisper, browser microphone permissions, Twilio Voice, or audio storage. Future-proof the seam as local dictation/Whisper -> transcript -> Ask/evidence ingestion, then WhatsApp voice notes and outbound voice later. |
| Local Edge / on-prem client | deferred | `TASKS.md`, `docs/ROADMAP.md` | Mac Studio/local LLM path for sensitive client files. |

---

## Design / UX Backlog

`UIUX_AUDIT.md` is partly stale because many items have already been implemented. Keep it as a historical audit, but use this shorter active list for planning.

| Item | Status | Source | Notes |
|---|---|---|---|
| Expert review P1 pass across existing Figma screens | done | `docs/UI_UX_EXPERT_REVIEW_2026-06-16.md` | Live-product portion done 2026-06-26: primary actions, Trust Drawer, Approval Consequence Preview, Now / Next strip, nav health badges, and passport drift warning are all built in the actual app. Figma screen parity closed 2026-06-26 (Step 5): Trust Drawer, Approval Consequence Preview, and Now/Next strip already existed on page `06 V0.2 Full Desktop Prototype`; Mode Indicator, Nav Health Badges, and Passport Drift Warning were built there this session from the real shipped code. |
| V0.2 full desktop prototype | done | Figma page `06 V0.2 Full Desktop Prototype`, `docs/UI_UX_SURFACE_INVENTORY_2026-06-26.md` | Built on 2026-06-26 as a 30-screen proposed desktop-browser board matching the V0.1 surface arc, but with guided next action, owner, trust drawer, approval consequence, source coverage, and audit-readiness cues visible across the journey. |
| V0.1 full desktop prototype | done | Figma page `05 V0.1 Full Desktop Prototype`, `docs/UI_UX_SURFACE_INVENTORY_2026-06-26.md` | Built on 2026-06-26 as a 30-screen desktop-browser board covering public entry, product brief, readiness, onboarding, executive room, Ask, ingestion, sources, review, approvals, evidence, recommendations, decisions, workflows, memory, entity detail, knowledge, exports, connectors, settings, AI policy, weekly brief, one-pager, and pilot paperwork. |
| End-to-end V0.1/V0.2 surface story | done | `docs/UI_UX_SURFACE_INVENTORY_2026-06-26.md`, Figma page `04 V0.1 V0.2 Desktop Buildout` | Read the current app surfaces and extended Figma beyond dashboard rooms: public entry, readiness, onboarding, connectors, ingestion, sources, review, approvals, evidence, Ask, rooms, recommendations, decisions, workflows, company memory, knowledge, settings, AI policy, exports, and pilot paperwork. |
| Desktop option comparison: Render rooms vs proposed command center | done | Figma page `03 Desktop Options - Render vs Proposed` | Created on 2026-06-26 as two 1440x900 browser frames: Option A preserves the pushed room-based Render structure; Option B keeps rooms but adds the command-center layer for executive triage. |
| Primary action hierarchy across the 7 Figma screens | done | `docs/UI_UX_EXPERT_REVIEW_2026-06-16.md` | Completed in Figma on 2026-06-26. Added one dominant top-bar action per existing screen: Review blockers, Review passport, Run forecast, Launch guarded run, Review open gates, Approve evidence, Review now. Visual render checked after removing a cluttered secondary hint treatment. |
| Live CEO dashboard command-center bridge | local verified | live `/dashboard/ceo`, `dashboard-panel.tsx` | Added a Figma-aligned command-center layer above the existing executive synthesis: evidence confidence, open decisions, blockers, estimated hours returned, mission-flow state, and primary next action. TypeScript clean on 2026-06-26. Authenticated browser smoke still needed in logged-in Render session. |
| Onboarding multi-file aggregate status polish | open | `UIUX_AUDIT.md` | Current wizard still anchors top-level result around `results[0]`; show processed/pending/quarantined counts. |
| Design system lock (Tailwind + Figma variables) | open | `docs/UI_UX_WORKPLAN.md` Phase 1 | Round-trip design tokens between Tailwind config and Figma variables via Plugin API MCP. |
| Governance/admin Figma batch | open | `docs/UI_UX_WORKPLAN.md` Phase 2 | Risk and Audit, Integration Hub, Integration Detail, Governance Settings. Via `use_figma` Plugin API. |
| Onboarding/prototype handoff batch | open | `docs/UI_UX_WORKPLAN.md` Phase 2 | User and Role Management, Company Setup, First Mission Template, Audit Export / Executive Pack. |
| Design-to-code generation | in progress | `docs/UI_UX_WORKPLAN.md` Phase 4 | Bidirectional loop (write via `use_figma`, read back via `get_design_context`) proven for all 6 signature patterns 2026-06-26. Full screen-by-screen generation across the remaining batches still open. |
| Convert repeated Figma UI patterns into Code Connect | done (manual) | `docs/UI_UX_WORKPLAN.md` §1a | All 6 locked signature patterns mapped node-to-component 2026-06-26. Live `send_code_connect_mappings`/`add_code_connect_map` API is blocked: requires a Dev/Full seat on a Figma Organization/Enterprise plan; Ali's teams are pro/starter and he has declined to upgrade. Mappings recorded manually in `docs/UI_UX_WORKPLAN.md` instead — audit-equivalent, just not live in Figma's UI. Repeated cards on the page are duplicated frames, not true component instances, so each mapping is representative, not cascading. |
| Empty/partial/blocked states pass | open | `docs/UI_UX_EXPERT_REVIEW_2026-06-16.md` | Make blocked connectors, insufficient evidence, denied outputs, and loading states first-class. |
| Command palette | open | `docs/UI_UX_EXPERT_REVIEW_2026-06-16.md` | Keyboard-first launcher for open mission, review blockers, Ask, create approval, export audit pack, and pause agent. |
| Trust Drawer | done (2026-06-26) | `docs/UI_UX_EXPERT_REVIEW_2026-06-16.md` | Built: `lib/trust-drawer-context.tsx`, `components/trust-drawer.tsx`, `components/ui/trust-drawer-trigger.tsx`. Live on Executive Room, synthesis brief, Ask, Approvals, Recommendations, Decisions, Sources, and Export Hub. Review status derived from real `ingestionStatus`; confidence is `null` (not faked) on Decisions and the Export Hub evidence summary, surfaced via `EvidenceCountLink`. Step 3 of the pilot build-out plan complete. |
| Approval consequence preview | done (2026-06-26) | `docs/UI_UX_EXPERT_REVIEW_2026-06-16.md` | Built: `components/ui/consequence-preview.tsx` + `useConsequencePreview` hook. Live on Approvals and Recommendations, gating single-item decisions. Copy verified against the real review/approval API routes; `loopsBack` omitted on Recommendations since the backend has no reversibility path there. Step 4 of the pilot build-out plan. |
| Now / Next strip | done (2026-06-26) | `docs/UI_UX_EXPERT_REVIEW_2026-06-16.md` | Built: `components/ui/now-next-strip.tsx`. Live on open Decisions, ranking real `Action` records (blockers first, then earliest due date). No invented "Mission" step type — Decision/Action is the real running-workflow data. Step 4 of the pilot build-out plan. |
| Nav health badges | done (2026-06-26) | `docs/UI_UX_EXPERT_REVIEW_2026-06-16.md` | Built: `app/api/nav/health/route.ts` + `components/side-nav.tsx`. Four real counts: approvals pending, risks open, evidence below threshold, workflows blocked. Step 4 of the pilot build-out plan. |
| Passport drift warning | done (2026-06-26) | `docs/UI_UX_EXPERT_REVIEW_2026-06-16.md` | Built into `app/settings/page.tsx` Agent Governance tab — Agent Output Log now flags when `AgentOutput.agentVersion` no longer matches the agent's current Agent Control Profile version. Step 4 of the pilot build-out plan. |
| Contextual help icons and dialogs | done (2026-07-05) | user request, `components/ui/help-dialog.tsx`, `docs/CONTEXTUAL_HELP_COPY.md` | Added reusable `HelpDialog`/`HelpLabel` primitives and wired them into dashboard metrics, Ask, ingestion, synthesis, approvals, recommendations, workflows, settings, and connectors. Dialogs include title/body/OK, Escape close, outside-click close, focus return, and screen-reader labelling. Copy registry now lives in `docs/CONTEXTUAL_HELP_COPY.md`. |
| Connector setup instructions and real CTAs | done (2026-07-05) | user request, `app/settings/connectors/page.tsx`, `docs/CONNECTOR_SETUP_GUIDE.md` | Connector catalogue now carries setup/docs links, env vars, redirect URI, scopes/access, data scope, and setup notes. Settings > Connectors renders a full setup guide and row-level provider setup/docs CTAs; future connectors no longer show dead install actions. |
| Source coverage map | open | `docs/UI_UX_EXPERT_REVIEW_2026-06-16.md` | Show required source types found/missing before weak-evidence outputs happen. |
| Accessibility/state icon pass | open | `docs/UI_UX_EXPERT_REVIEW_2026-06-16.md` | Validate focus states, contrast, labels, icons, loading/empty/error/blocked states before implementation. |

---

## Stale Backlog Notes

The following older audit claims should not be treated as active backlog without re-verification:

- `UIUX_AUDIT.md` claims active nav, mobile nav, dashboard skeletons, Ask history truncation/clear, ingestion action links, confidence labels, upload reset, and quarantine filename cleanup are missing. Current code shows these are mostly implemented.
- Older discrepancy notes claiming `/api/evidence/[id]/review` is missing are stale. The route exists and requires admin scope.
- Older ROADMAP references saying Slack admin UX remains to build are stale. Slack has inbound ingestion plus Connector Settings policy UX; broader scheduled sync remains open.

---

## Source Documents

- `TASKS.md` — detailed execution checklist.
- `HANDOVER.md` — current relay state and next-agent context.
- `docs/ROADMAP.md` — roadmap narrative and sequencing.
- `docs/PRODUCTION_HEALTH_CHECKLIST.md` — production cutover checklist.
- `docs/SECURITY_REVIEW.md` — pre-pilot security checklist.
- `docs/USER_STRATEGY_AND_PIVOTS.md` — buyer-lane and readiness strategy.
- `docs/KNOWLEDGE_WORKSPACE.md` — Knowledge Workspace details.
- `docs/UI_UX_FLOW_PLAN.md` — design flow plan.
- `UIUX_AUDIT.md` — historical UI/UX audit; re-check items before implementation.
