# BACKLOG.md — NexusAI Operating Backlog

> Source-of-truth backlog view for NexusAI Mission Control. `TASKS.md` remains the detailed execution checklist; this file is the cross-document backlog map for planning, handover, and prioritization.
> Visual finish-line map: `docs/DEVELOPMENT_FINISH_LINE_VISUAL.md`.
> Markdown estate review: `docs/MARKDOWN_ESTATE_REVIEW_2026-06-25.md`.
> Engineering guardrails: `docs/ENGINEERING_GUARDRAILS.md`.
> Architecture review: `TASKS.md` § Architecture Review Action Items.
> Distribution plan: `NexusAI_Distribution_Plan.docx` and `docs/INFRA_DECISION_MEMO.md`.
> UI/UX workplan: `docs/UI_UX_WORKPLAN.md` (MCP-aware design-to-code pipeline).
> Last reviewed: 2026-06-25.

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
| Commit/push/deploy v0.25.0 | production pending | `HANDOVER.md`, `docs/ROADMAP.md` | v0.25.0 and audit fix are pushed to `origin/main`; Render dashboard login is needed to confirm/deploy commit `3530808`. |
| Authenticated Render smoke for `/knowledge`, `/workflows`, `/settings/connectors`, and Ask note citations | open | `TASKS.md`, `HANDOVER.md`, `docs/PRODUCTION_HEALTH_CHECKLIST.md` | Must be done in a logged-in browser session because Clerk blocks unauthenticated curl. |
| Confirm Render deployed intended commit | open | `docs/PRODUCTION_HEALTH_CHECKLIST.md` | Verify service commit SHA and env before customer demo. Current unauthenticated `/knowledge` probe still returns 404, so v0.25 routes are not confirmed live. |
| Add cron job entries to `render.yaml` | done | `TASKS.md`, architecture review | Three cron services added 2026-06-25: dispatch every 2 min, billing daily at midnight, synthesis daily at 1am. All use `NEXUS_CRON_SECRET` auth. Must verify in Render dashboard after deploy. |
| `/api/health` returns `status=ok` in production | done | `docs/PRODUCTION_HEALTH_CHECKLIST.md` | Verified 2026-06-25: DB, vector search, R2 originals, and DeepSeek LLM config are healthy. |

---

## P1 — Paid Pilot Readiness Backlog

These are the minimum trust and operations items before a paid pilot contract should be signed.

| Item | Status | Source | Notes |
|---|---|---|---|
| Tenant isolation test | open | `docs/SECURITY_REVIEW.md`, `docs/PRODUCTION_HEALTH_CHECKLIST.md` | Create two workspaces and verify no cross-workspace evidence leakage. |
| Security headers production scan | open | `TASKS.md`, `docs/SECURITY_REVIEW.md` | Run securityheaders.com against live app; target A rating. |
| Manual API auth-bypass review | open | `docs/SECURITY_REVIEW.md` | Confirm every sensitive API route uses `requireScope()` or a signed internal secret. |
| PII / restricted-evidence red-team pass | open | `docs/SECURITY_REVIEW.md` | Upload fictitious PII/account data and verify safe Ask/dashboard behavior. |
| Sentry or equivalent error tracking | done | `TASKS.md`, architecture review | Task #32 + #37 closed 2026-06-25. Wired via `instrumentation.ts` + `global-error.tsx` + manual-capture helpers. Ships disabled (no-op) until `SENTRY_DSN` is set. |\n| Resend email delivery for synthesis briefs | done | `TASKS.md`, architecture review | `lib/email/resend.ts` pure-fetch client (Resend API), `sendSynthesisEmails()` wired into synthesis cron runner, HTML email template with brief URL and unsubscribe link, `GET /api/email/unsubscribe` public route, `NEXUS_RESEND_API_KEY` + `NEXUS_FROM_EMAIL` added to `render.yaml`. Ships silently (no-op until Resend API key is set). |\n| Wire LLM routing table into execution path | done | `TASKS.md`, architecture review | Task #36 closed 2026-06-25. `callLLM()` now executes `model-routing.ts` 10-surface fallback-chain policy via `callLLMWithRouting()`, wired into all 8 call sites. |
| Workspace provider allow-list UI | done | `TASKS.md`, architecture review | Settings > AI Policy page now shows multi-select of 6 providers with jurisdiction flags, local-only mode toggle, and live save via existing `PATCH /api/settings/workspace`. `isProviderAllowed()` enforcement already existed. GCC buyers can exclude Chinese providers. |
| Mode Indicator React context | done | `TASKS.md`, architecture review, Design Philosophy §3.6 | `lib/mode-context.tsx` with AuthMode discriminated union (clerk_cloud, local_license, offline_local, hybrid_sync_pending), `ModeProvider` wrapping authenticated layout, `ModeIndicator` badge in top bar beside user button. Detects mode from `NEXT_PUBLIC_NEXUS_DEPLOY_MODE` env var. |
| Uptime monitoring | open | `TASKS.md` | Monitor `/api/health`, dashboard, and ingestion route. |
| Automated dependency scanning in CI/deploy | open | `TASKS.md`, `docs/SECURITY_REVIEW.md` | At minimum block critical advisories. |
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
| Richer Knowledge graph filters | open | `TASKS.md`, `docs/KNOWLEDGE_WORKSPACE.md` | Filter by tag, ref type, entity, source, freshness, and workflow. |
| Duplicate / contradiction audit | open | `TASKS.md`, `docs/KNOWLEDGE_WORKSPACE.md` | Identify conflicting notes/evidence and stale claims. |
| Daily/project/workflow brief automation from notes | open | `TASKS.md` | Turns Knowledge Workspace into proactive operating memory. |
| Direct "Create Decision from this brief" action | done | `TASKS.md` | Each synthesis question now has a "+ Create Decision" link that routes to `/decisions?prefill=...` with the question as title and answer as rationale. Decisions page auto-opens the New Decision form pre-filled. |
| Ops Review Twin richer UI | open | `TASKS.md`, `docs/NEXUS_WORKFLOW_TWIN_REALIGNMENT.md` | Weekly execution summary, blockers, overdue owners, KPI signals. |
| Trusted eval scorecards from U3/U4 data | open | `TASKS.md`, `docs/V1_1_UPGRADE_PLAN.md` | Agent quality, groundedness, acceptance/edit rates. |
| Type-safe runtime state and effect boundaries | open | `TASKS.md`, `docs/ENGINEERING_GUARDRAILS.md` | Before autonomous runners or local/on-prem sync, add discriminated state contracts, append-only run events, visible async result contracts, and verifier error taxonomies. |

### Architecture Review Notes (context, not tasks)

These notes from the 2026-06-25 architecture review affect prioritization and sequencing but are not standalone tasks.

- **Rate limiting is already built** (v0.11.0 middleware, 7 rules, 429 with Retry-After). Do not duplicate. Any "rate limiting" task in the distribution plan refers to additional coverage beyond middleware, which should specify which routes and why.
- **Knowledge Workspace local vault sync** is an architectural asset for Tauri Desktop distribution. The sync layer (`NEXUS_VAULT_SYNC`, `NEXUS_LOCAL_VAULT_PATH`) is a production-tested seam between cloud and local storage with path validation, symlink rejection, and conflict preservation. When building Tauri Desktop Phase 2 (local-first), this is the prototype for the broader local-data strategy.
- **Orchestration Dispatcher** (`FOR UPDATE SKIP LOCKED`) provides the concurrency foundation needed for local Tauri SQLite dispatch. The atomic job claiming pattern transfers directly. Highlight this when scoping Tauri local-first architecture.
- **AuthMode contracts** in ENGINEERING_GUARDRAILS.md are designed, not just "watch." The `clerk_cloud | local_license | offline_local | hybrid_sync_pending` discriminated union is the auth transition plan for Tauri. Implementation is deferred to Tauri Desktop Phase 2, not undesigned.
- **LLM routing gap** is the single most impactful wiring task. The policy layer (`model-routing.ts`: 10 surfaces, 5 providers, fallback chains, data class restrictions, confidence floors) and the enforcement layer (`llm.ts`: single env var toggle) are not connected. Wiring them means executive briefs get premium models, ingestion triage gets economy models, and fallback fires automatically when a provider is down.

## P2a — Strategy / Paperwork Backlog

This is the operating plan that keeps the strategy in the paperwork rather than isolated in one markdown file.

| Item | Status | Source | Notes |
|---|---|---|---|
| Keep canonical strategy current | done | `docs/USER_STRATEGY_AND_PIVOTS.md` | Updated 2026-06-25 with paper-trail ownership and current plan. |
| Keep task plan current | done | `TASKS.md` | Current strategy operating plan is now listed near the top of the execution checklist. |
| Keep backlog current | done | `BACKLOG.md` | Backlog now separates release gates, strategy implementation, pilot paperwork generation, and Knowledge Workspace follow-through. |
| Keep handover current | done | `HANDOVER.md` | Updated 2026-06-25 with the strategy paper-trail alignment note; update again after Render commit confirmation and authenticated smoke. |
| Keep changelog current | done | `CHANGELOG.md` | Added the 2026-06-25 strategy paper-trail alignment note. |
| Keep markdown estate review current | done | `docs/MARKDOWN_ESTATE_REVIEW_2026-06-25.md` | Classifies all 63 Markdown files and lists targeted cleanup work. |
| Keep engineering guardrails current | done | `docs/ENGINEERING_GUARDRAILS.md` | Added 2026-06-25 from the FP review: typed states, auth modes, append-only events, visible async effects, and exhaustive failure categories. |
| Translate strategy into product tickets | done | `TASKS.md` | Strategy profile (migration 0027), onboarding workflow routing, pilot paperwork API, backcast dashboard seeding all implemented. |

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
| SharePoint / OneDrive | open | high | Required for Microsoft-heavy enterprise buyers. |
| Microsoft Teams | open | high | Comms equivalent to Slack for enterprise. |
| Gmail / Outlook | open | medium | Useful for proposals, customer context, and exec comms. |
| Jira / Linear | open | medium | Execution and product/engineering status. |
| GitHub | open | medium | Product/technology evidence and delivery signals. |
| Salesforce / HubSpot / CRM | open | medium | Revenue/growth pipeline intelligence. |
| QuickBooks / Xero / finance exports | open | medium | CFO/finance evidence. |
| Social / Meta / LinkedIn signals | open | later | Market, brand, campaign, and digital-native companies. |
| Connector scheduler and sync history | open | high | Needed for non-event-based source freshness and retry visibility. |

---

## P4 — Team, Compliance, and Scale Backlog

| Area | Status | Source | Notes |
|---|---|---|---|
| Workspace invitations and member roles | open | `TASKS.md`, `docs/ROADMAP.md` | Owner/Admin/Executive/Reviewer/Contributor/Viewer. |
| Department and sensitivity access policy per member | open | `TASKS.md` | Needed for multi-person pilot teams. |
| External advisor / viewer access | open | `TASKS.md` | Useful for consultants, auditors, board observers. |
| GCC/Pakistan compliance package | open | `TASKS.md` | PDPL, DPA, SAMA/NCA/UAE notes, retention/deletion, breach response. |
| WhatsApp/SMS/voice channels | deferred | `TASKS.md` | Differentiator for GCC/Pakistan but not current release blocker. |
| Local Edge / on-prem client | deferred | `TASKS.md`, `docs/ROADMAP.md` | Mac Studio/local LLM path for sensitive client files. |

---

## Design / UX Backlog

`UIUX_AUDIT.md` is partly stale because many items have already been implemented. Keep it as a historical audit, but use this shorter active list for planning.

| Item | Status | Source | Notes |
|---|---|---|---|
| Onboarding multi-file aggregate status polish | open | `UIUX_AUDIT.md` | Current wizard still anchors top-level result around `results[0]`; show processed/pending/quarantined counts. |
| Design system lock (Tailwind + Figma variables) | open | `docs/UI_UX_WORKPLAN.md` Phase 1 | Round-trip design tokens between Tailwind config and Figma variables via Plugin API MCP. |
| Governance/admin Figma batch | open | `docs/UI_UX_WORKPLAN.md` Phase 2 | Risk and Audit, Integration Hub, Integration Detail, Governance Settings. Via `use_figma` Plugin API. |
| Onboarding/prototype handoff batch | open | `docs/UI_UX_WORKPLAN.md` Phase 2 | User and Role Management, Company Setup, First Mission Template, Audit Export / Executive Pack. |
| Design-to-code generation | open | `docs/UI_UX_WORKPLAN.md` Phase 4 | Generate React/Next.js components from Figma via `get_design_context` + Code Connect mappings. |
| Convert repeated Figma UI patterns into Code Connect | open | `docs/UI_UX_WORKPLAN.md` Phase 6 | Map Figma nodes to React components via `add_code_connect_map`. |
| Empty/partial/blocked states pass | open | `docs/UI_UX_EXPERT_REVIEW_2026-06-16.md` | Make blocked connectors, insufficient evidence, denied outputs, and loading states first-class. |
| Command palette | open | `docs/UI_UX_EXPERT_REVIEW_2026-06-16.md` | Keyboard-first launcher for open mission, review blockers, Ask, create approval, export audit pack, and pause agent. |
| Trust Drawer | open | `docs/UI_UX_EXPERT_REVIEW_2026-06-16.md` | Reusable drawer from confidence badges/evidence counts with sources, freshness, sensitivity, confidence, review, audit, and export trace. |
| Approval consequence preview | open | `docs/UI_UX_EXPERT_REVIEW_2026-06-16.md` | Before approval, show exactly what unlocks and confirm no external send occurs unless explicitly configured. |
| Now / Next strip | open | `docs/UI_UX_EXPERT_REVIEW_2026-06-16.md` | Persistent mission/workflow status strip showing current step, next gate, owner, and ETA. |
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
