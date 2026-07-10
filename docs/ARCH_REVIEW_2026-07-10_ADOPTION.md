# Architecture Review 2026-07-10 — Verified Adoption Plan

Status: Accepted adoption sequence for the external architecture review dated 2026-07-10.
Rule applied: every review finding was verified against the repo before adoption (external reviews are useful but not infallible — see HANDOVER session #33 lesson).
Calendar anchor: regulated demo ~2026-07-13, public launch ~2026-08-04, pilot signing ~2026-08-18.

## 1. Corrections — review findings that are wrong or already done

| Review claim | Reality |
| --- | --- |
| "Model-routing policy not enforced; execution uses a single provider env var" (§7, Phase 1.2) | Substantially closed 2026-06-25 (Task #36): `callLLMWithRouting()` in `lib/services/llm.ts` executes the 10-surface policy. A second verification pass on 2026-07-10 found the eval route was the sole application caller without a `surfaceId`; it now uses `audit_refusal`. The legacy fallback remains intentionally available only for direct low-level callers/tests. |
| "Add application rate limiting" (implied §6) | Exists since v0.11.0: 7 middleware rules (auth, readiness, ingestion, ask, dashboard, cron, billing webhook). |
| "Add request idempotency for webhook processing" | Stripe webhook idempotency shipped v0.23.1. Other consequential writes: adopted below. |
| "Establish deployment status vocabulary" (Phase 1.4) | Exists: BACKLOG status definitions (open / local verified / production pending / done). |
| "Reintroduce error capture manually and minimally" | Already the implemented posture: manual capture helpers + `onRequestError`, ships no-op without DSN, runtime instrumentation excluded per ENGINEERING_GUARDRAILS §7. |
| "Deployed-SHA verification, release gates, synthetic smoke" | Release-gate runbook + smoke-domain script exist and were executed 2026-07-08. Uptime/synthetic monitoring is the genuinely open part. |
| Security tests "to add" | Tenant-isolation, PII red-team, security-headers, and authz regression suites exist; CI runs typecheck/test/build + weekly `npm audit` hard-failing on critical. |

## 1a. Second verification pass — 2026-07-10

The adoption plan was checked again against executable code, migrations, and configuration rather than documentation labels.

Verified and corrected in this pass:

- All application `ask()` call sites now declare a routing `surfaceId`; the eval harness was corrected to `audit_refusal`, and the `ask()` TypeScript contract now requires a policy surface so this gap cannot silently recur.
- The dispatcher has atomic claim, priority, retry/backoff, chaining, and a terminal `failed` state. It does **not** yet have worker heartbeats, leases, abandoned-job recovery, `dead_letter`, `claimed_by`, job idempotency keys, or trace IDs.
- The upload route enforces a 50 MB cap and server-generated workspace-prefixed R2 keys. It still extracts inside the web request, passes the browser-declared content type to R2, and has no content-based MIME sniff, malware scan, decompression guard, or scan-driven quarantine decision.
- No migration currently enables PostgreSQL RLS or creates `operator_assignments`; the environment operator allowlist remains active.
- The existing `check:boundaries` script protects client/server imports, excluded build dependencies, install layout, tracing, and Sentry gates. It does **not** enforce the full UI -> route -> service -> domain -> repository dependency direction or transitive imports.
- Sentry code paths exist but are operationally inactive until a DSN is configured. OTEL export, dashboards, alerting, and managed synthetic monitoring remain open.

Verification vocabulary for this plan:

- **Implemented:** code or migration exists.
- **Locally verified:** relevant automated checks passed in the current tree.
- **Production pending:** code is ready but deploy, migration, environment, or vendor-console work is outstanding.
- **Operationally verified:** the deployed behavior or external control was directly exercised and evidenced.

Current-tree evidence from this pass:

- `npm run check:boundaries` — passed.
- `npx tsc --noEmit -p apps/mission-control/tsconfig.json` — passed.
- `npm run test` — 69 files / 475 tests passed.
- `npm run build` — passed after externalizing the optional local-vault watcher packages (`chokidar`, `fsevents`) from the Next.js server bundle.
- No production deploy, Neon console control, managed uptime check, restore drill, or authenticated live flow was performed in this pass; those remain production-pending or operationally unverified as listed below.

## 2. Verdicts accepted without change

Keep Render, Neon+pgvector, Clerk, selective Cloudflare, Postgres dispatcher, modular monolith. Do not add: Kubernetes, Kafka/RabbitMQ, microservices, separate vector DB, Temporal (yet), Vault (yet), D1, custom auth/email. This matches `docs/INFRA_DECISION_MEMO.md` and `docs/API_SERVICE_BOUNDARY_DECISION.md`.

## 3. Adoption sequence (re-cut to the real calendar)

The review's 90-day phases collide with demo/launch dates (RLS and DB-role separation are invasive). Re-sequenced:

### Now -> demo (by ~2026-07-13) — freeze-adjacent, low-risk only
1. Non-sleeping instances: paid Render web service; Neon not scale-to-zero (reverses the INFRA memo's "sleeping acceptable for demos" for regulated audiences — memo updated).
2. Protect the Neon production branch; enable snapshots; set restore window. (Console config, no code.)
3. Uptime/synthetic monitoring on `/api/health`, sign-in redirect, readiness flow (Better Stack or Checkly — already an open P1 row; this closes it).
4. No schema or authz refactors before the demo.

### Demo -> launch (2026-07-13 -> 2026-08-04) — worker + ops trust
5. Dedicated Render background worker for `dispatch_jobs` (poll/claim/heartbeat/graceful-stop). Reuse the existing cron seam (`docs/API_SERVICE_BOUNDARY_DECISION.md` §Existing Seams); this is the review's #1 investment and unblocks safe ingestion hardening.
6. Dispatch job hardening: heartbeat_at, abandoned-job lease recovery, dead_letter state + operator visibility, idempotency_key, trace_id.
7. Ingestion security hardening in the worker path: content-based MIME sniffing, size/decompression limits, ClamAV-backed private scan worker, quarantine state (exists) wired to scan outcome, extracted-text-as-untrusted + prompt-injection trust metadata on evidence.
8. Monthly Neon restore drill #1 + recovery runbook with measured (not claimed) RPO/RTO. Extends `docs/DR_RUNBOOK.md`.
9. Minimal OTEL: trace_id/request_id/workspace_id on requests, jobs, and LLM calls; one backend (Grafana Cloud preferred); dashboards for web/DB/worker/AI/ingestion. Feature-flagged, real `npm run build` verification per §7.
10. Idempotency keys on consequential writes: reviewer invite, approval, pilot confirmation, LLM-producing jobs (input-hash based).

### Launch -> pilot signing (2026-08-04 -> 2026-08-18) — isolation + authorization depth
11. Database roles: separate app_runtime / migration_runner / worker / read_only_support credentials. Pooled URL for web, direct for migrations; statement/lock/idle-in-transaction timeouts.
12. RLS as defense-in-depth on the most sensitive tenant tables (evidence, knowledge_notes, recommendations, decisions, actions, agent_outputs, workflow_twin_runs, reviewer_seats, pilot_outcomes, connectors), driven by `SET LOCAL app.workspace_id`. Application authz remains primary; RLS is the backstop. Requires its own migration + full regression pass — schedule in a quiet window, never demo week.
13. Operator model v2: replace `NEXUS_OPERATOR_USER_IDS` with `operator_assignments` table (role, granted_by, expires_at, revoked_at, reason, audit events). The env allowlist was explicitly temporary.
14. Audit hash chaining (`previous_hash`/`event_hash`) + daily signed manifest to R2. Sell-able to regulated buyers at pilot signing.
15. Connector credential key separation: `NEXUS_CREDENTIAL_ENCRYPTION_KEY` with key_version + re-encryption support (decouple from AUTH_SECRET).
16. Email deliverability: SPF/DKIM/DMARC on a dedicated subdomain, bounce/complaint/suppression handling, notice-plus-link (never evidence content in email).

### Post-pilot (triggers, not dates)
17. Hybrid retrieval (RRF) + embedding version metadata + retrieval eval metrics.
18. Product analytics (PostHog EU) — separate from audit events and telemetry (three-category rule adopted).
19. Typed feature-flag/config registry; secrets manager (Doppler/Infisical); status page; support tool.
20. Policy engine (OpenFGA/Cerbos/Oso) only past ~8-10 meaningful roles or cross-workspace advisory access. Until then: typed in-code policy functions (`canApproveRecommendation(...)` pattern — partially exists in the approvals route).
21. Temporal only when workflows have multi-day human pauses and compensation logic. Dedicated per-customer infra only on contractual/residency triggers.
22. Full dependency-direction enforcement (dependency-cruiser, eslint-plugin-boundaries, or an expanded custom graph check) formalizing the boundary rules in `docs/API_SERVICE_BOUNDARY_DECISION.md`; adopt with the worker split when import graphs are already being touched. This is additional to the narrower build-boundary checker that already runs.

## 4. Finalized way forward

The architecture review does not justify a vendor migration or broad pre-demo refactor. Execute in this order:

1. **Before the regulated demo:** finish only the external reliability controls—paid non-sleeping Render, Neon compute kept warm, production-branch protection/snapshots/restore window, managed uptime checks—and run the existing release/authenticated smoke gate. Record each as operationally verified; do not infer it from code or a successful build.
2. **First post-demo engineering slice:** create the dedicated worker and harden `dispatch_jobs` in one schema-compatible slice: worker identity, heartbeat, lease recovery, `dead_letter`, idempotency key, trace ID, graceful termination, and operator visibility. Keep the current cron endpoint as an emergency/manual seam until worker behavior is proven.
3. **Second post-demo slice:** move document parsing behind the worker, then add content-based MIME detection, decompression/page limits, private malware scanning, quarantine outcomes, and untrusted-evidence/prompt-injection metadata. Do not promise immutable or malware-screened evidence before this is operationally verified.
4. **Observability slice:** add request/job/LLM correlation IDs first, then a minimal feature-flagged OTEL exporter and the five review dashboards. Preserve the current build guardrails and verify a production build after every instrumentation change.
5. **Quiet-window isolation slice:** add separate DB roles and timeout policies before RLS; then introduce RLS table-by-table with transaction-local tenant context and tenant-isolation regression tests. Replace the operator environment allowlist only after `operator_assignments` and its audit/admin path are ready.
6. **Pilot-signing controls:** run and measure a Neon restore drill, add audit hash chaining/manifests, separate and version connector encryption keys, finish email deliverability controls, and update customer claims only from verified evidence.

## 5. Explicit rejections / deferrals

- No Cloudflare AI Gateway as policy source of truth (observability/cost only, if adopted).
- No session-replay or auto-instrumented Sentry (build-hang history, §7).
- No new security-scanning stack beyond: GitHub secret scanning + Dependabot/Renovate + CodeQL or Semgrep + Gitleaks (review's own "don't buy four overlapping products" advice, accepted).
- No immutable-evidence promises to customers until R2 retention/legal-hold controls are implemented AND verified (review's caution, adopted verbatim).
