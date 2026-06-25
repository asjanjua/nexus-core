# BACKLOG.md — NexusAI Operating Backlog

> Source-of-truth backlog view for NexusAI Mission Control. `TASKS.md` remains the detailed execution checklist; this file is the cross-document backlog map for planning, handover, and prioritization.
> Last reviewed: 2026-06-25.

---

## Backlog Principles

1. **Separate shipped code from production readiness.** A feature can be locally verified but still blocked from paid-pilot production until migrations, deploy, smoke, monitoring, security, and support are complete.
2. **Prioritize proof over breadth.** Nexus should prove one governed workflow with strong evidence, then expand connectors, roles, and automation.
3. **Keep human approval as the trust boundary.** No autonomous writeback, external send, payment, HR action, legal commitment, filing, or source-system update in V1.
4. **Use docs as operating controls.** `TASKS.md`, `HANDOVER.md`, `docs/ROADMAP.md`, `docs/PRODUCTION_HEALTH_CHECKLIST.md`, and `docs/SECURITY_REVIEW.md` should agree before release work is considered done.

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
| Confirm/apply migrations `0025-0026` in production database | open | `TASKS.md`, `HANDOVER.md`, `docs/PRODUCTION_HEALTH_CHECKLIST.md` | Required before v0.25.0 deploy. |
| Commit/push/deploy v0.25.0 | open | `HANDOVER.md`, `docs/ROADMAP.md` | v0.24.0 is on `origin/main`; v0.25.0 is locally verified but uncommitted. |
| Authenticated Render smoke for `/knowledge`, `/workflows`, `/settings/connectors`, and Ask note citations | open | `TASKS.md`, `HANDOVER.md`, `docs/PRODUCTION_HEALTH_CHECKLIST.md` | Must be done in a logged-in browser session because Clerk blocks unauthenticated curl. |
| Confirm Render deployed intended commit | open | `docs/PRODUCTION_HEALTH_CHECKLIST.md` | Verify service commit SHA and env before customer demo. |
| `/api/health` returns `status=ok` in production | open | `docs/PRODUCTION_HEALTH_CHECKLIST.md` | Covers DB, vector search, originals storage, and LLM key health. |

---

## P1 — Paid Pilot Readiness Backlog

These are the minimum trust and operations items before a paid pilot contract should be signed.

| Item | Status | Source | Notes |
|---|---|---|---|
| Tenant isolation test | open | `docs/SECURITY_REVIEW.md`, `docs/PRODUCTION_HEALTH_CHECKLIST.md` | Create two workspaces and verify no cross-workspace evidence leakage. |
| Security headers production scan | open | `TASKS.md`, `docs/SECURITY_REVIEW.md` | Run securityheaders.com against live app; target A rating. |
| Manual API auth-bypass review | open | `docs/SECURITY_REVIEW.md` | Confirm every sensitive API route uses `requireScope()` or a signed internal secret. |
| PII / restricted-evidence red-team pass | open | `docs/SECURITY_REVIEW.md` | Upload fictitious PII/account data and verify safe Ask/dashboard behavior. |
| Sentry or equivalent error tracking | open | `TASKS.md` | Tag errors by workspace, route, and error type. |
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
| Persist user strategy in product | open | `TASKS.md`, `docs/USER_STRATEGY_AND_PIVOTS.md` | Readiness lead, buyer lane, workspace profile context, and first workflow routing. |
| Route onboarding into first workflow selection | open | `TASKS.md`, `docs/USER_STRATEGY_AND_PIVOTS.md` | Tie backcasting/workflow scorer into the first workspace journey. |
| Seed dashboards and suggested questions from backcast result | open | `TASKS.md` | Current backcast persists scope but does not fully seed first-value surfaces. |
| Knowledge Workspace note embeddings | open | `TASKS.md`, `docs/KNOWLEDGE_WORKSPACE.md` | Enables semantic note search beyond text matching. |
| Note-to-entity linking UI | open | `TASKS.md`, `docs/KNOWLEDGE_WORKSPACE.md` | Bridge markdown notes into Company Memory entities. |
| Richer Knowledge graph filters | open | `TASKS.md`, `docs/KNOWLEDGE_WORKSPACE.md` | Filter by tag, ref type, entity, source, freshness, and workflow. |
| Duplicate / contradiction audit | open | `TASKS.md`, `docs/KNOWLEDGE_WORKSPACE.md` | Identify conflicting notes/evidence and stale claims. |
| Daily/project/workflow brief automation from notes | open | `TASKS.md` | Turns Knowledge Workspace into proactive operating memory. |
| Direct “Create Decision from this brief” action | open | `TASKS.md` | Prefill decision/action draft from dashboard or synthesis card. |
| Ops Review Twin richer UI | open | `TASKS.md`, `docs/NEXUS_WORKFLOW_TWIN_REALIGNMENT.md` | Weekly execution summary, blockers, overdue owners, KPI signals. |
| Trusted eval scorecards from U3/U4 data | open | `TASKS.md`, `docs/V1_1_UPGRADE_PLAN.md` | Agent quality, groundedness, acceptance/edit rates. |

---

## P3 — Connector Backlog

Slack has the first inbound channel-message ingestion path and Connector Settings policy UX. The rest of the connector roadmap remains open.

| Connector / Area | Status | Priority | Notes |
|---|---|---|---|
| Google Drive | open | highest | Best next connector for docs-first pilots. |
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
| Governance/admin Figma batch | open | `TASKS.md`, `docs/UI_UX_FLOW_PLAN.md` | Risk and Audit, Integration Hub, Integration Detail, Governance Settings. |
| Onboarding/prototype handoff batch | open | `TASKS.md`, `docs/UI_UX_FLOW_PLAN.md` | User and Role Management, Company Setup, First Mission Template, Audit Export / Executive Pack. |
| Convert repeated Figma UI patterns into implementation tickets | open | `TASKS.md`, `docs/UI_UX_FLOW_PLAN.md` | Needed before a larger UI build wave. |
| Empty/partial/blocked states pass | open | `docs/UI_UX_EXPERT_REVIEW_2026-06-16.md` | Make blocked connectors, insufficient evidence, denied outputs, and loading states first-class. |

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
