# HANDOVER.md -- NexusAI Live Session State

> This file is the memory of the NexusAI relay team. Update it at the end of every meaningful work session.

---

## Session Info

- **Last updated:** 2026-07-06 (v0.25.x — session #49. Executor endpoints + Settings actions for both native runtimes; document_integrity_review is now runnable from the UI.)
- **Last model:** Claude (Opus 4.8)
- **Session number:** #49
- **Session #49 addendum (2026-07-06) — closed the document-integrity executor gap:**
  - **Endpoint:** `POST /api/agents/native-skills/document-integrity-review` mirrors the grid executor (session tenant never from body, zod-validated options, `read:evidence`). Returns per-document findings, parse-quality score, missing source spans, and repair recommendations.
  - **Settings action:** "Run document integrity review" button + per-document results table and repair-recommendations list in `app/settings/page.tsx`. Both native runtimes are now UI-runnable.
  - **Verify:** tsc clean; full suite 50 files / 369 tests. Same sandbox caveats (no `next build`, `git` SIGBUS) — tsc + vitest are verification of record.
- **Session #49 delivered (2026-07-06) — Executor endpoint + document integrity runtime:**
  - **Executor endpoint:** `POST /api/agents/native-skills/evidence-grid-review` validates a review spec, runs the engine against governed evidence for the authenticated tenant, returns grid/flags/gaps/escalations. Gated on `read:evidence`.
  - **Settings action:** Settings → Agent Governance has a "Run evidence grid review" button that runs a starter board-review spec and renders cited rows, escalations, and missing-evidence inline (`app/settings/page.tsx`).
  - **Document integrity runtime:** `lib/agents/document-integrity-review.ts` (per-document parse-quality engine, reuses `extractSourceSpan`) + `lib/services/document-integrity-review-runner.ts`. Flags empty text, weak extraction, staleness, missing span, missing provenance, ungoverned status, and missing tabular structure; emits repair recommendations. Runner does NOT pre-filter to `processed` (integrity review inspects ungoverned docs on purpose). Skill now `runtime_ready`.
  - **Tests:** `tests/document-integrity-review.test.ts` (7 cases) + extended `agent-skills.test.ts`. Full suite 50 files / 369 tests, tsc clean.
  - **Build caveat:** `next build` does not complete inside the sandbox (per-call time limit; background processes do not persist) and the sandbox `git` binary SIGBUS-crashes, so `git diff --check` could not run. tsc --noEmit (whole project incl. app/) + full vitest are the verification of record; manual whitespace scan clean.
  - **Next slice:** a Settings action + endpoint for `document_integrity_review`, and start the `vantage_diligence_analysis` / `quorum_governance_review` runtimes.
- **Session #48 delivered (2026-07-06) — Evidence Grid Review runtime:**
  - **Engine added:** `lib/agents/evidence-grid-review.ts` — pure, deterministic. Governed evidence + review spec in; cited grid out (one row per dimension, source spans, provenance, confidence, freshness), with cell status `supported`/`weak`/`unsupported`/`blocked`, issue flags, missing-evidence notes, reviewer escalations, and started/completed audit events. No I/O, no LLM, no wall-clock reads.
  - **Governance boundary enforced in code:** restricted evidence is never cited (escalated to data owner); only `processed` evidence is citable, `pending_approval`/`quarantined` matches are flagged and block the cell; sensitive regulatory/legal/data-protection content in cited text escalates to a qualified reviewer.
  - **Runner added:** `lib/services/evidence-grid-review-runner.ts` loads the governed pool, applies the agent passport gate like Ask retrieval, runs the engine, and writes `native_skill.evidence_grid_review.started`/`.completed` audit events with passport-denial counts.
  - **Catalog promoted:** `evidence_grid_review` is now `runtime_ready` with `externalReferences: []`; the tabular-review reference stays in the sourcing review as design provenance only.
  - **Tests:** `tests/evidence-grid-review.test.ts` (9 cases) + updated `tests/agent-skills.test.ts`. Full suite 49 files / 361 tests, tsc clean.
  - **Next slice:** wire a POST executor endpoint + Settings action so a reviewer can run a grid on demand, and reuse the engine for `document_integrity_review`.
- **Session #47 delivered (2026-07-06) — Agent skill sourcing review:**
  - **Review doc added:** `docs/AGENT_SKILL_SOURCING_REVIEW.md` lists every Nexus skill across ingest, browse, review, analyze, and act, with build/adopt decisions and GitHub/Skills CLI candidates.
  - **Best candidates:** `github/awesome-copilot@agent-governance` for passports/tool policy/audit; `anthropics/knowledge-work-plugins@review-contract` and `@compliance-check` for legal/compliance review patterns; `anthropics/financial-services` private-equity/DD skills for Vantage; `anthropics/claude-for-legal@tabular-review` for cited batch review grids; `anthropics/skills` document skills for PDF/DOCX/XLSX/PPTX implementation patterns; `kepano/obsidian-skills` for Knowledge Workspace/vault interoperability; `adhikasp/mcp-git-ingest` for GitHub repository ingestion; `browser-use/browser-use` as a later browser-automation candidate only after sandbox review.
  - **Fine-tooth pass started:** `github/awesome-copilot@agent-governance` reviewed as MIT-licensed, single-file skill, and strongest governance reference. Verdict: adapt the governance, policy composition, pre-flight intent, tool-gate, and audit patterns into Nexus; do not install into runtime.
  - **Legal workflow candidate reviewed:** `anthropics/knowledge-work-plugins` legal skills (`review-contract`, `compliance-check`) reviewed as Apache-2.0 and strong reference material for Quorum/Meridian/Vantage playbooks. Verdict: adapt workflow structure only; runtime use needs jurisdiction packs, evidence IDs, reviewer gates, and connector permission manifests.
  - **Vantage candidate reviewed:** `anthropics/financial-services` private-equity skills (`dd-checklist`, `ic-memo`) reviewed as Apache-2.0 and strong reference material for Vantage dealroom coverage, request tracking, red-flag escalation, sector overlays, and IC memo scaffolding. Verdict: adapt the patterns only; runtime use needs deal packs, model tie-out checks, source citations, and connector permission manifests.
  - **Evidence-grid candidate reviewed:** `anthropics/claude-for-legal@tabular-review` reviewed as Apache-2.0 and the strongest reusable pattern for Nexus review grids: typed columns, `value/state/quote/location`, sample runs, normalization, source columns, and reviewer verification. Verdict: reimplement the pattern inside Nexus rather than installing the broad legal repo.
  - **Document skills reviewed:** `anthropics/skills` document skills (`pdf`, `docx`, `xlsx`) reviewed as useful references for extraction, export, workbook integrity, and source-span quality bars, but source-available/proprietary rather than installable or vendorable.
  - **Operator/tool candidates reviewed:** `kepano/obsidian-skills` is a plausible MIT local operator aid for Knowledge Workspace/vault interop. `adhikasp/mcp-git-ingest` and `browser-use/browser-use` are MIT future tool candidates only, not skills; they need sandboxing, allowlists, auth boundaries, and audit trails before Nexus use.
  - **Shortlist tests started:** `lib/agents/external-skill-candidates.ts` now codifies ranking, type, license, risk, mapped skills/workflows, verdict, and blockers. `tests/agent-skills.test.ts` asserts candidate integrity, ranking, no runtime-ready GitHub candidates, proprietary-skill guards, and sandbox gates.
  - **Boundary decision:** keep runtime skills Nexus-native when they touch tenant evidence, approvals, audit, legal/regulatory judgment, or writeback. Treat broad GitHub skill packs as discovery indexes, not dependencies.
  - **Nexus-native catalog added:** `lib/agents/nexus-native-skills.ts` defines the first first-party skill pack: `evidence_grid_review`, `agent_governance_review`, `vantage_diligence_analysis`, `quorum_governance_review`, `meridian_compliance_review`, `document_integrity_review`, and `knowledge_workspace_synthesis`.
  - **Native skill visibility:** `GET /api/agents/native-skills` exposes the native catalog with integrity validation, and Settings → Agent Governance now shows native skills with runtime status, pivot/workflow coverage, approval gates, audit events, and reference-informed status.
  - **Native skill tests:** `tests/agent-skills.test.ts` now verifies native catalog integrity, exact pack IDs, full workflow/pivot coverage, evidence-grid mapping, high-impact approval/audit requirements, and that reference-informed native skills are not external installs.
  - **Paperwork updated:** `CHANGELOG.md`, `TASKS.md`, `BACKLOG.md`, and `docs/AGENT_SKILL_SOURCING_REVIEW.md` now register the native-first decision and next runtime slice.
  - **Do next:** implement executable `evidence_grid_review` against governed evidence records so Nexus can produce cited review grids, issue flags, missing-evidence notes, and reviewer escalations.
- **Session #46 delivered (2026-07-06) — Product subdomain detection:**
  - **Code shipped:** `lib/product-detection.ts` maps `app.pinavia.io`/`nexus.pinavia.io` to NexusAI and maps `quorum.pinavia.io`, `meridian.pinavia.io`, `vantage.pinavia.io`, and `nucleus.pinavia.io` to their product keys. Unknown hosts and local dev fall back to NexusAI.
  - **Middleware:** `middleware.ts` now sets `x-nexus-product` and includes HTTPS product subdomains in the CORS allow-list. Keep this as a shared Render runtime unless a product later needs isolated infrastructure.
  - **Public shell:** `app/layout.tsx` renders product-aware public/auth branding. Clerk sign-in redirects are route-safe: Quorum goes to `/board`; Meridian, Vantage, and Nucleus go to `/dashboard/ceo` until their routes exist.
  - **Tests/verification:** `tests/product-detection.test.ts` added. Focused product test passed (9 tests), full mission-control suite passed (48 files / 339 tests), and production build passed. Standalone `tsc` was inconclusive once due to the local silent-runner quirk, but Next build completed type/bundle validation.
  - **Pushed commit:** `c55417e` (`feat: add product subdomain detection`) is on `origin/main`.
  - **Operational follow-up:** in Cloudflare, create DNS records for `app`, `nexus`, `quorum`, `meridian`, `vantage`, and `nucleus`; in Render, attach those as custom domains to the current service; in Clerk, add matching allowed origins and sign-in/sign-up redirects; smoke each domain after deploy.
- **Session #45 delivered (2026-07-06) — Agent skill taxonomy and pivot catalog:**
  - **Skill taxonomy added:** `lib/agents/agent-skills.ts` defines 34 skills across 5 families (ingest, browse, review, analyze, act) with source type mappings, job family requirements, and dispatch compatibility checks.
  - **Agent library upgraded:** `lib/agents/agent-library.ts` now uses typed `AgentSkill[]` hints. Baseline skills (`browse sources`, `review evidence`, `analyze evidence`) auto-applied to every agent. 29 agents across 7 rooms.
  - **Pivot catalog added:** `lib/agents/pivot-agent-catalog.ts` defines 5 suites (Nexus, Quorum, Meridian, Vantage, Nucleus) with agent rosters, required skills, and product boundaries. Self-validating: `validatePivotAgentCatalog()` returns `[]` when all suites are consistent.
  - **Catalog API:** `GET /api/agents/catalog` returns full discoverable catalog with pre-validation. Returns 500 with diagnostic if any suite is broken.
  - **UI:** Dashboard agent cards show "Skills" (not "Future skills"). Settings → Agent Governance renders "Pivot Skill Suites" with catalog integrity badge.
  - **Dispatcher:** Now logs `missingFamilies` in audit when agent assignment is denied.
  - **Verification:** `tsc --noEmit` passed, 47 files / 330 tests passed.
  - **Do next:** wire pivot suites to workspace onboarding so a workspace selects its active pivot roster. Then build the first vertical route (Meridian or Quorum) against its workflow registry.
- **Session #45 follow-up (2026-07-06) — Vertical input/action screen guidance:**
  - **Figma board added:** Nexus Figma file `NcQ8F5a0hczwGwZua2gfun` now has page `11 Vertical Input Action Screens V0.2`, board node `87:3`: `https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=87-3`.
  - **Screens created:** 33 editable desktop-browser frames: Quorum 17, Meridian 8, Vantage 8. Each frame shows route candidate, arc, primary user, current gate, user input needed, action points, Ask behavior, and human-control guardrail.
  - **Guidance registries:** `quorumScreenGuidance`, `meridianScreenGuidance`, and `vantageScreenGuidance` now live beside each vertical registry with lookup helpers and tests proving every planned screen has guidance.
  - **Paperwork updated:** `docs/UI_BASELINE_VERSIONING.md`, `docs/QUORUM_BOARD_GOVERNANCE_WORKFLOW.md`, `docs/MERIDIAN_REGULATORY_WORKFLOW.md`, `docs/VANTAGE_DD_WORKFLOW.md`, `CHANGELOG.md`, `BACKLOG.md`, and `TASKS.md`.
  - **Verification:** focused vertical workflow tests passed (3 files / 23 tests), full mission-control tests passed (47 files / 330 tests), `npm exec -w @nexus/mission-control tsc -- --noEmit --pretty false` passed, and `git diff --check` passed.
  - **Do next:** use board `87:3` for colleague review of wording and workflow priority, then build one vertical route slice from the selected registry instead of adding more exploratory frames.
- **Session #44 delivered (2026-07-06) — Quorum UI/UX Figma build:**
  - **Figma build added:** Nexus Figma file `NcQ8F5a0hczwGwZua2gfun` now has page `08 Quorum UI UX Build`, board node `78:3`: `https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=78-3`.
  - **Screens created:** six editable desktop-browser screens for Quorum: baseline setup, between-meetings delta review, Director Q&A, evidence drilldown, decision handoff, and board export pack.
  - **Governance workflow added:** `docs/QUORUM_BOARD_GOVERNANCE_WORKFLOW.md` now defines the fuller board operating model: Pakistan-first jurisdiction pack, board setup, director and committee registers, TOR/policy library, meeting calendar, agenda, board pack, pre-read, quorum, conflicts, decisions, circular resolutions, minutes, signatures, action register, and audit export.
  - **Code-backed plan added:** `apps/mission-control/lib/board-governance-workflow.ts` codifies the Pakistan source pack, 17 planned screens, 10 workflow stages, and three workflow arcs. `/board` now renders a compact governance roadmap under the current intelligence flow. `tests/board-governance-workflow.test.ts` pins the registry.
  - **Expanded Figma V0.2 added:** Figma page `09 Quorum Governance Workflow V0.2`, board node `80:3`: `https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=80-3`. It contains 17 editable desktop-browser screens for setup, registers, committees, TORs, agenda, pack, pre-read, quorum, conflicts, recommendations, decisions, circular resolutions, minutes, actions, and audit export.
  - **Design intent:** expand the existing `/board` app surface into a full director review journey while preserving the governance boundary: no automatic filing, sending, approval, or external writeback.
  - **Paperwork updated:** `docs/UI_BASELINE_VERSIONING.md`, `docs/QUORUM_BOARD_GOVERNANCE_WORKFLOW.md`, `CHANGELOG.md`, `BACKLOG.md`, and `TASKS.md` now register the Quorum Figma builds and code-backed governance workflow.
  - **Verification:** focused `vitest -- tests/board-governance-workflow.test.ts --run` passed (4 tests), `npm exec -w @nexus/mission-control tsc -- --noEmit --pretty false` passed, and `git diff --check` passed before the final docs registry update.
  - **Do next:** choose the first implementation slice. Recommended order: board profile/registers data model, then meeting/agenda, then minutes/action register. Run full mission-control test/build before commit/deploy.
- **Session #44 follow-up corrected (2026-07-06) — Vertical workflow boundaries:**
  - **Shared template removed:** deleted `apps/mission-control/lib/pivot-workflows.ts`, `apps/mission-control/tests/pivot-workflows.test.ts`, and `docs/PIVOT_WORKFLOW_BUILDS.md`; do not force Quorum, Meridian, Vantage, Nucleus, or connectors into one screen-arc type system.
  - **Meridian registry added:** `apps/mission-control/lib/meridian-regulatory-workflow.ts` and `docs/MERIDIAN_REGULATORY_WORKFLOW.md` define Meridian's domain lifecycle: scope, evidence, gap, and filing.
  - **Vantage registry added:** `apps/mission-control/lib/vantage-dd-workflow.ts` and `docs/VANTAGE_DD_WORKFLOW.md` define Vantage's domain lifecycle: dealroom, coverage, redflags, and memo.
  - **Figma board retained as exploration:** Figma page `10 Pivot Workflow Builds V0.1`, board node `82:3`, remains useful visual exploration, but it is not the architecture source of truth.
  - **Boundary decision:** Nexus-core handles ingestion, governance, evidence, agents, billing, and approvals. Each vertical owns its workflow and eventual product/P&L shape.
  - **Global-use hardening:** Quorum now has formal boundaries and jurisdiction-pack requirements; Meridian has jurisdiction-pack requirements for regulator taxonomy, official sources, applicability, local review, translation, and filing channel boundaries; Vantage has market/sector-pack requirements for cross-border diligence, localization, materiality, and decision authority.
  - **Runtime safety:** Quorum, Meridian, and Vantage keep strict `screensForStage` helpers for registry authors, plus safe route helpers that log missing draft screens and render what exists.
  - **Verification:** focused vertical workflow/domain tests passed (5 files / 48 tests), full mission-control tests passed (46 files / 322 tests), `npm exec -w @nexus/mission-control tsc -- --noEmit --pretty false` passed, and `git diff --check` passed.
- **Session #43 delivered (2026-07-05) — Quorum Board Room screen:**
- **Session #43 delivered (2026-07-05) — Quorum Board Room screen:**
  - **Surface added:** `/board` now renders `BoardRoomPanel`, a Quorum-branded board intelligence workspace for director-ready board-pack synthesis and between-meetings delta review.
  - **What the screen does:** lets the user enter a stable board identifier such as `main-board`, calls `POST /api/board/delta`, shows first-run baseline vs. later delta states, renders answered/evidence/confidence status chips, and displays Director Q&A cards with confidence, evidence source links, and entity links.
  - **Navigation:** `Board Room` added to the Intelligence section in `components/side-nav.tsx`.
  - **Trust boundary:** the screen states that no board output is sent, filed, approved, or made canonical automatically; directors are linked back to evidence, ingestion, and decisions for human-owned follow-through.
  - **Verification:** `npm exec -w @nexus/mission-control tsc -- --noEmit --pretty false`, `npm test -w @nexus/mission-control` (42 files / 287 tests), and `npm run build -w @nexus/mission-control` all passed. Build output includes route `/board`.
  - **Do next:** choose the next remaining queue item: connectors beyond skeletons, Meridian SECP NBFI requirement library, or Nucleus methodology-pack authoring tool. If demo-bound, confirm Render deploy for this commit and smoke `/board` in the logged-in browser.
- **Session #42 delivered (2026-07-05) — UI baseline versioning clarification:**
  - **Clarification captured:** Ali clarified that Nexus has moved away from Vercel. The first UI was built there, but the same design has since been pushed into Render and the new architecture. Vercel is historical provenance only, not an active deployment lane.
  - **Runbook added:** `docs/UI_BASELINE_VERSIONING.md` defines `UI V0.1 baseline`, `Render production`, `UI V0.2 proposal`, and later iterations. It explains how to preserve the original UI through git/Figma/Render references without maintaining duplicate Vercel infrastructure.
  - **Baseline refs captured:** `docs/UI_BASELINE_VERSIONING.md` now includes V0.1 Figma node `40:3`, V0.2 Figma node `44:3`, current git ref `c513eee` at registry time, Render comparison route `/dashboard/ceo`, screen source formats, the 30-screen set description, and live route mapping.
  - **Selected BuilderOS skills installed:** added `.claude/skills/design-better/SKILL.md` and `.claude/skills/build-loop-codex/SKILL.md`, plus `.claude/skills/BUILDEROS_LICENSE.txt`. Full BuilderOS was intentionally not installed; these are workflow aids only, not runtime dependencies.
  - **Installer note:** `npx --yes skills add BuildGreatProducts/builder-os/skills/design-better` and `.../build-loop-codex` hung without output and were stopped cleanly. The two skill folders were then copied manually from a shallow clone of `BuildGreatProducts/builder-os`.
  - **Paperwork updated:** `DEPLOY.md`, `docs/PRODUCTION_HEALTH_CHECKLIST.md`, `docs/INFRA_DECISION_MEMO.md`, `BACKLOG.md`, `TASKS.md`, and `CHANGELOG.md` now say Render/new architecture is the app path and the Vercel-origin UI should be preserved as a named baseline only.
  - **Do next:** confirm the exact Render deploy ID/commit from the Render dashboard before demos; the UI baseline design refs are captured, but live deploy confirmation remains part of the existing authenticated smoke task.
- **Session #41 delivered (2026-07-05) — contextual help icons and dialogs:**
  - **Reusable component:** added `components/ui/help-dialog.tsx` with `HelpDialog` and `HelpLabel`. The trigger is a subtle encircled `?`; the dialog has a title, plain-language body, OK close button, Escape close, outside-click close, focus return, and ARIA title/body wiring.
  - **Shared primitive integration:** `KpiHero` in `components/ui/nexus-primitives.tsx` now accepts optional help metadata, so metric cards can show help without copy-pasted modal code.
  - **Coverage added:** Executive Room metrics/route panels, Ask, ingestion, executive synthesis, approvals, recommendations, workflows, Settings plan/policy/scheduled synthesis, and connector source-policy/IMAP controls now have contextual explanations.
  - **Help copy registry:** added `docs/CONTEXTUAL_HELP_COPY.md`, listing all current contextual help titles and explanations in one edit-friendly file.
  - **Connector setup upgrade:** added `docs/CONNECTOR_SETUP_GUIDE.md`; Settings > Connectors now shows every connector with status, setup/docs links, environment variables, redirect URI, scopes/access, data scope, and setup notes. Row CTAs now use real provider setup/docs links; future connectors no longer expose dead install actions.
  - **Verification:** fast TypeScript compiler-API syntax pass over all touched TSX files passed; targeted `git diff --check` over touched files passed. Full project `tsc` and touched-file `tsc` both timed out after 120 seconds without diagnostics, consistent with the session #40 local-runner caveat.
  - **Do next:** run full `npm exec -w @nexus/mission-control tsc -- --noEmit`, `npm test`, and `npm run build` from a clean terminal or CI before deploy, then authenticated browser smoke the help dialog on desktop and mobile widths.
- **Session #40 delivered (2026-07-04) — whole-codebase re-check and demo-hardening fixes:**
  - **Repo state checked:** `main` matched `origin/main` before changes; latest pushed commit was `4d48fd8` (`docs: refresh pinavia demo action plan`).
  - **Codebase surface checked:** Mission Control currently has 316 app TS/TSX/JSON files, 90+ API route files, 37 test files, and DB migrations through `0028_knowledge_embeddings.sql`.
  - **Security fix:** `/api/approvals/:recommendationId` now calls `requireScope("write:approvals")` and uses a new workspace-scoped repository update path, so a logged-in user or bearer token cannot update a recommendation by guessed ID across workspaces.
  - **Webhook/OAuth middleware fix:** `/api/webhooks/clerk` is now public at middleware level because the route verifies Svix signatures itself; all OAuth connector callbacks are likewise public because their routes validate signed HMAC state before storing credentials. Install/admin routes remain protected.
  - **Health fix:** `/api/health` now includes original-file storage in top-level status when `NEXUS_R2_ORIGINALS=enabled`, while staying healthy when originals storage is intentionally disabled.
  - **Workspace settings fix:** `/settings/workspace` no longer displays hardcoded `workspace-demo`/`tenant-demo`; it resolves the Clerk org/user workspace and renders real workspace settings/policy defaults/source surface status.
  - **Verification completed:** route-auth inventory returned no API route without either `requireScope`/`resolveAuth` or an explicit verifier/public path; `npm audit --omit=dev --json` returned zero known production vulnerabilities; live `APP_URL=https://nexus-mission-control.onrender.com npm run smoke:domain -w @nexus/mission-control` passed all 8 checks; live `/api/health` returned `status=ok` with database, vector search, R2 originals, and DeepSeek configured.
  - **Verification caveat:** local `tsc`, focused Vitest, `next build`, and `npm ls --workspaces --depth=0` still hang silently in this shell and were stopped cleanly. Do not record them as passing until rerun successfully from a clean local terminal or CI.
  - **Do next:** commit/push the session #40 hardening patch, then trigger/confirm Render deploy for the new commit and run authenticated browser smoke.
- **Session #39 delivered (2026-07-04) — auth/product email boundary and production sender paperwork:**
  - **Strategy decision recorded:** Clerk remains the owner of signup/signin verification, password reset, account lifecycle, and future organization invitation email. Nexus does not build a custom auth-confirmation flow for V1 demos.
  - **Product email boundary recorded:** Nexus sends only product email — scheduled synthesis briefs, pilot notifications, support/security notifications, and future workflow alerts — through a managed provider such as Resend or Cloudflare Email Sending.
  - **No self-hosted mail server for V1:** self-hosted mail is explicitly out of scope for the demo/pilot phase because deliverability, abuse handling, DNS reputation, and operational monitoring would slow the deployment path.
  - **Voice/Whisper boundary recorded:** do not make Whisper, browser microphone access, Twilio Voice, Deepgram, or audio storage a V1 demo dependency. Future-proof as local OS dictation or local Whisper producing a transcript that Nexus treats as a normal Ask query, note, or evidence transcript.
  - **Paperwork updated:** `docs/USER_STRATEGY_AND_PIVOTS.md`, `docs/INFRA_DECISION_MEMO.md`, `docs/SCHEDULED_SYNTHESIS_SPEC.md`, `docs/ROADMAP.md`, `BACKLOG.md`, `TASKS.md`, `CUTOVER.md`, `DEPLOY.md`, `docs/RENDER_DEPLOY.md`, `.env.example`, and `CHANGELOG.md`.
  - **Open operational task:** authenticate the `pinavia.io` sending domain, set `NEXUS_RESEND_API_KEY` and `NEXUS_FROM_EMAIL` (for example `Nexus <noreply@pinavia.io>`), confirm Clerk email verification/password reset in the Clerk dashboard, and run one scheduled synthesis email delivery test before demos.
- **Session #38 delivered (2026-06-26) — pilot build-out plan, step 5 (Ali chose "Build missing frames first"):**
  - **Audited Figma page `06 V0.2 Full Desktop Prototype` (`44:2`) against the 6 locked signature patterns.** Trust Drawer (`44:299`), Approval Consequence Preview (`44:304`), and Now/Next strip (`44:102`/`44:105`) were genuinely present — real repeated cards, not just labels. Mode Indicator, Nav Health Badges, and Passport Drift Warning had no Figma representation at all.
  - **Built the 3 missing frames from the real shipped code, not faked**, via the Figma Plugin API (`use_figma`): Mode Indicator (`54:2`, from `lib/mode-context.tsx`'s `MODE_PRESENTATION` — all 4 states with real badge/tooltip text), Nav Health Badges (`54:25`, from `components/side-nav.tsx`'s `badgeFor()` — the 4 real routes with real tone mapping), Passport Drift Warning (`54:48`, from `app/settings/page.tsx`'s Agent Governance tab — the real "Passport drift — this brief ran on agent v2, control profile is now v3" chip copy). All three verified via `get_design_context` to render with correct locked-token hex values.
  - **Fixed a Figma Plugin API gotcha along the way:** `figma.createFrame()` always appends to `figma.currentPage`, not whatever node was fetched via `getNodeByIdAsync` — the 3 new frames landed on the wrong page (`0:1`) until explicitly `targetPage.appendChild(node)`-ed onto `44:2`.
  - **Code Connect blocked on plan tier — confirmed, not bypassed.** `send_code_connect_mappings`/`add_code_connect_map` require a Dev/Full seat on a Figma Organization/Enterprise plan; `whoami` confirmed both of Ali's teams (pro, starter) are below that tier. Ali's explicit, standing instruction: **"i am the only one with a pro plan. and im not upgrading. you are uploading as me"** — no upgrade path, and any future Figma API actions run under Ali's own identity. Do not raise the upgrade question again unless Ali brings it up.
  - **Resolution: manual mapping.** All 6 node-to-component mappings documented by hand in `docs/UI_UX_WORKPLAN.md` (new "Code Connect status (Step 5, 2026-06-26)" section) — file/page identity, a markdown table of all 6 patterns, and an explicit caveat that repeated cards on this page are duplicated plain frames, not true Figma component instances (zero `<component>` tags in the subtree), so each mapping is representative of one instance, not cascading across every screen copy. `TASKS.md` item 12 closed `[x]` with the same caveat; item 10 moved to `[~]` (bidirectional Figma↔code proven for all 6 patterns, full screen-by-screen generation still open). `BACKLOG.md` rows updated: "Expert review P1 pass" → `done`, "Convert repeated Figma UI patterns into Code Connect" → `done (manual)`, "Design-to-code generation" → `in progress`.
  - **Sandbox git quirk, same mount, new symptom:** `.git/index.lock` could not be removed with `rm -f` ("Operation not permitted", confirmed same-uid via `id`/`stat`; `sudo` blocked by a no-new-privileges container flag; `lsattr` unsupported). Fix: `mv .git/index.lock .git/index.lock.bak` succeeded where `rm` failed — rename allowed, unlink not, on this FUSE-style mount. `git commit` then completed successfully (`cc64239`) despite several non-fatal "unable to unlink" warnings for other internal temp/lock files.
  - **Committed and pushed:** `cc64239` ("Step 5: build missing signature-pattern frames in Figma, document Code Connect mappings manually" — `TASKS.md`, `docs/UI_UX_WORKPLAN.md`). Ali ran the push from his own machine (sandbox has no outbound GitHub network access — confirmed via a `403` from a proxy on `git push`) using the `git pull origin main && git push origin main` sequence given to him; confirmed via his pasted `git log --oneline -1`: `cc64239 (HEAD -> main, origin/main) ...`. Ali also separately committed and pushed his own pending Step 4 work as `d3aa1ce`, after running `npm test` (239 passed / 37 files) and `npm run build` (135 pages, Next.js 15.5.18) clean locally — both now confirmed in `origin/main`.
  - **Do next:** Step 5 is closed. No further Figma/Code Connect work is queued unless Ali raises it. The next open thread per `BACKLOG.md` is the Email bundle (Gmail/Outlook/IMAP) and the 5-OAuth-connector batch from sessions #33-34, both still pending `npm install`/build verification/commit/push (see the two stacked-batch notes lower in this file and in the Continuation Prompt) — confirm with Ali which to pick up next.
- **Session #37 delivered (2026-06-26) — pilot build-out plan, step 4 (Ali approved with "lets go"):**
  - **Approval Consequence Preview (Task #83):** `components/ui/consequence-preview.tsx` + `useConsequencePreview<TId>` hook — a reusable confirm-gate that wraps an existing mutation (`decide`, `setStatus`). Wired into `app/approvals/page.tsx` (single-item evidence decisions; "Approve all" intentionally bypasses it since the user already reviewed the policy banner) and `components/recommendation-list.tsx`. Every consequence sentence was checked against the real route before being written: `app/api/evidence/[id]/review/route.ts` (approve → processed + fires `generateRecommendations`; reject → quarantined, no auto re-review) and `app/api/approvals/[recommendationId]/route.ts` (status update only — no Decision auto-creation, no notification). `loopsBack` is correctly omitted on the recommendation flow since no real reversibility path exists there.
  - **Now / Next strip (Task #84):** `components/ui/now-next-strip.tsx`, rendered on open Decisions (`app/decisions/page.tsx`) above the existing Actions list. Ranks real `Action` records (blockers first, then earliest due date) into a "Now" and "Next" card with owner and due/overdue state. No "Mission" entity was invented — the codebase has none outside Figma/docs; Decision/Action is the honest substitute.
  - **Nav Health Badges (Task #85):** new `app/api/nav/health/route.ts` (real counts: approvals pending, risks open via `buildRiskRadar` high-severity, evidence below threshold/quarantined, workflows blocked = open Decisions with an open blocker Action) wired into `components/side-nav.tsx` — both the mobile dropdown and desktop nav now render a quiet count badge next to Approvals, Decisions, Sources, and the Executive Room link. Badges render nothing when the count is zero or the fetch hasn't resolved yet (no placeholder/fake numbers).
  - **Passport Drift Warning (Task #86):** built into the existing Agent Governance tab in `app/settings/page.tsx` (Searchable Agent Output Log). Compares each `AgentOutput.agentVersion` (the version stamped at generation time, already existed in `lib/services/dashboard.ts`) against the agent's current Agent Control Profile version (already-existing `latestProfiles` lookup on the same page) and shows a "Passport drift" `MetaChip` only when they genuinely disagree. No schema or field was invented — both numbers already existed in the data model, just never compared.
  - **Verification (Task #87):** grep-confirmed every new import/usage resolves to exactly the expected files (`ConsequencePreview`/`useConsequencePreview` → 3 files, `NowNextStrip` → 2 files, `nav/health`/`NavBadge`/`badgeFor` → 2 files, drift comparison → `app/settings/page.tsx` only). No live `tsc`/`npm test`/`npm run build` from this sandbox — same standing limitation as prior sessions (no `node_modules` visible at the mounted Playground path, no git credentials).
  - **Do next:** Ali run `npm exec -w @nexus/mission-control tsc -- --noEmit` then `npm test` then `npm run build` from `/Users/alijanjua/Documents/Playground/nexus-core`. Check `git status` before committing (the working tree may have unrelated in-progress changes). If clean: `git add -A && git commit -m "Step 4: Approval Consequence Preview, Now/Next strip, Nav Health Badges, Passport Drift Warning" && git push`. Pilot build-out plan step 5 (Figma Code Connect mapping) has not been started and should not be started without Ali's explicit go-ahead, per the established one-step-at-a-time pattern this session.
- **Session #36 delivered (2026-06-26):**
  - **Shared primitives extracted (Task #69-71):** `KpiHero`, `StatusPill`, `PillIcon`, `RouteRow`, `MetaChip`, `SecondaryLink`, `EmptyLine`, `AiPanel`, `TrustCard` plus `RouteStatus`/`RoomStatus`/`Tone` types moved out of `dashboard-panel.tsx` into `components/ui/nexus-primitives.tsx`, so every future guided-route screen (Ask, Approvals, Recommendations, Decisions, Sources, Export Hub) reuses one source instead of reimplementing the pattern. Cross-checked via grep (no orphaned references, single consumer of `DashboardPanel` unaffected) — live `tsc` not run from this sandbox (no `node_modules` visible at the mounted path); Ali should run `npm exec -w @nexus/mission-control tsc -- --noEmit` to confirm.
  - **Trust Drawer built (Task #72, the signature pattern from the design system skill):** New `lib/trust-drawer-context.tsx` (global provider/hook, accepts already-loaded `EvidenceRecord[]` for zero-fetch opens, or fetches missing records from `GET /api/evidence/[id]` in parallel) and `components/trust-drawer.tsx` (the overlay: confidence, per-source sensitivity/freshness/snippet, and a review-status pill derived honestly from the real `ingestionStatus` field — no invented "last reviewed" dates, since `EvidenceRecord` has no such field; only `WorkflowTwinRun` does). Two trigger components added in `components/ui/trust-drawer-trigger.tsx`: `ConfidenceBadge` (click opens drawer, used in `synthesis-brief.tsx`'s per-question and overall-brief badges — this also fixed a design-token violation where that badge hardcoded raw `amber-300`/`red-300` Tailwind colors instead of locked tokens) and `EvidenceTrustLink` (quiet link, used under the Executive Room's Confidence KPI in `dashboard-panel.tsx`, passing the page's already-loaded evidence with no extra round-trip). Provider + drawer mounted once in `app/layout.tsx` inside the authenticated shell.
  - **Mode Indicator fixed (Task #73):** `lib/mode-context.tsx`'s `ModeIndicator` already existed and was already wired into `app/layout.tsx`'s top bar (session #35 or earlier built it ahead of the backlog note) — found via research rather than rebuilt. It used raw `emerald-500`/`amber-500`/`blue-500` Tailwind colors, a locked-token violation; fixed to use `nexus-accent`/`nexus-warn`/`nexus-sky` so local/on-prem mode gets real visual weight as the design system requires for the strongest trust state.
  - **Verification:** manual grep-based cross-check of every new/changed import against its export signature (documented in conversation, not re-run here) — no live `tsc`/`npm test`/`npm run build` from this sandbox; same standing limitation as prior sessions (no network access, no visible `node_modules` at the mounted path).
  - **Do next:** Ali run `npm exec -w @nexus/mission-control tsc -- --noEmit` then `npm test` then `npm run build`, then commit/push. After that, continue the pilot build-out plan steps 3-5 (roll the guided pattern across Ask/Approvals/Recommendations/Decisions/Sources/Export Hub; design the 6 degraded states; wire Figma Code Connect) — none of these are started yet, only proposed.
- **Current version:** 0.25.x — Phases 1-8 + 9D complete, V1.1 Tier 1 (U1-U4) complete. Strategy pipeline fully implemented: readiness → buyer lane → onboarding → workflow pilot → governed value proof.
- **Session #35 in progress (2026-06-26):**
  - **UX operating order locked:** `BACKLOG.md` and `TASKS.md` now place the expert-review P1 pass ahead of new screen creation. Order: primary actions → Trust Drawer → Approval Consequence Preview → Now / Next strip → nav health badges → passport metadata.
  - **Primary action hierarchy completed in Figma:** Added one dominant top-bar action across the existing 7 screens (`Review 4 blockers`, `Review passport`, `Run forecast`, `Launch guarded run`, `Review open gates`, `Approve evidence`, `Review now`). Removed the secondary hint bars after visual review because they crowded the metrics area. Final render checked clean.
  - **Live CEO dashboard bridge started:** `/dashboard/ceo` is still the older dark Mission Control UI in production, so `apps/mission-control/components/dashboard-panel.tsx` now renders a Figma-aligned command-center layer above the existing synthesis/detail stack: evidence confidence, open decisions, blockers, hours returned, mission-flow state, and primary next action. Verified with `npm exec -w @nexus/mission-control tsc -- --noEmit` on 2026-06-26. Still needs authenticated browser smoke in the logged-in Render session.
  - **Desktop option comparison created in Figma:** New page `03 Desktop Options - Render vs Proposed` contains two 1440x900 browser-only frames: Option A (`Current Render: Room-based Mission Control`) preserves the room spine and executive synthesis flow; Option B (`Proposed: Command Center over Rooms`) keeps rooms but adds the executive command-center triage layer.
  - **End-to-end surface story added:** Read the current app surfaces and added Figma page `04 V0.1 V0.2 Desktop Buildout`, including V0.1/V0.2 rows, ingestion and Ask differences, and an end-to-end map across public entry, onboarding, connectors, ingestion, review, approvals, evidence, Ask, rooms, decisions, workflows, memory, governance, exports, and pilot paperwork. Source note: `docs/UI_UX_SURFACE_INVENTORY_2026-06-26.md`.
  - **V0.1 full desktop prototype built:** Added Figma page `05 V0.1 Full Desktop Prototype`, board `40:3`, with 30 desktop-browser screens for the Render-aligned room-and-tool experience: public entry, product brief, readiness, onboarding, executive room, Ask, ingestion, sources, review, approvals, evidence detail, recommendations, decisions, workflow twins, company memory, entity detail, knowledge, exports, connectors, settings, AI policy, weekly brief, one-pager, and pilot paperwork. Visual render checked after fixing the Public Home hero clipping.
  - **V0.2 full desktop prototype built:** Added Figma page `06 V0.2 Full Desktop Prototype`, board `44:3`, with the same 30-screen desktop-browser surface arc as V0.1 but redesigned around guided next action, owner, trust drawer, approval consequence, source coverage, and audit-readiness cues on every major workflow. Visual render checked clean at `/tmp/nexus-v02-full-prototype.png`.
  - **Current Figma targets:** V0.1 `https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=40-3`; V0.2 `https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=44-3`.
  - **Do next:** authenticated smoke `/dashboard/ceo` after deploy/local run, then continue with the Trust Drawer pattern. Do not start Batch 3 (Risk/Audit, Integrations, Governance Settings) until Trust Drawer, Approval Consequence Preview, Now / Next strip, nav health badges, and passport metadata are on the existing prototype/live bridge.
- **Session #34 delivered (2026-06-26):**
  - **Gmail connector** — `lib/connectors/gmail.ts` (pure-fetch, reuses the existing Google Cloud OAuth client — `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` — with a new scope `gmail.readonly` and its own redirect URI `/api/connectors/gmail/callback`) + install/callback/files/ingest routes under `app/api/connectors/gmail/`. Ingest builds text from Subject/From/To/Date headers plus a MIME-tree-walking plain-text body extractor; `sourceType: "email_crm"`, `sourcePath: "gmail://{id}"`. Not yet built: attachment extraction, thread rollups. **Action required before this works:** add `https://<app-url>/api/connectors/gmail/callback` to the existing Google OAuth client's authorized redirect URIs (Google Cloud Console) — no new client, no new env vars.
  - **Outlook Mail connector** — `lib/connectors/outlook-mail.ts` (pure-fetch, reuses the existing Azure AD app registration — `MICROSOFT_CLIENT_ID`/`MICROSOFT_CLIENT_SECRET`/`MICROSOFT_TENANT_ID` — already used by SharePoint, with scope `Mail.Read` and its own redirect URI `/api/connectors/outlook-mail/callback`) + install/callback/files/ingest routes under `app/api/connectors/outlook-mail/`. Same ingest text shape as Gmail; Graph mail body is HTML by default so `extractPlainTextBody()` strips tags. `sourceType: "email_crm"`. Not yet built: attachment extraction, thread rollups. **Action required:** add `https://<app-url>/api/connectors/outlook-mail/callback` to the existing Azure app registration's redirect URIs — no new client, no new env vars.
  - **IMAP Email connector (new runtime, per ARCHITECTURE.md §13)** — `lib/connectors/imap.ts`, using `imapflow` (stateful TCP/TLS session) and `mailparser` (RFC822 parsing) instead of `fetch()`. No OAuth: a single `POST /api/connectors/imap/connect` route test-logs in via `verifyConnection()` before persisting host/port/secure/username/password through the same encrypted `repository.upsertConnector` path every other connector uses (zero changes needed to the encryption layer — it's already generic). `files`/`ingest` routes under `app/api/connectors/imap/`. One configurable connector, not per-provider (no Spacemail/Hostinger connectors); explicitly no POP3. `sourceType: "email_crm"`, `sourcePath: "imap://{mailbox}/{uid}"` (no `sourceUri` — IMAP has no canonical web link). Not yet built: folder browsing beyond INBOX, attachment extraction. **No new env vars required** — credentials are supplied per-mailbox through the UI form.
  - **Shared plumbing:** `ALLOWED_TYPES` in `app/api/connectors/[type]/route.ts` now includes `gmail`, `outlook-mail`, `imap`. `app/settings/connectors/page.tsx` got 3 new catalogue entries, a new `connectKind?: "oauth" | "manual"` discriminator on `ConnectorDef` (drives an inline credential-entry form instead of an OAuth "Install →" link for IMAP), 2 new error messages, and 3 env-var hint blocks. `package.json` gained `imapflow`, `mailparser` (deps) and `@types/mailparser` (devDep) — **not yet `npm install`-ed**, npm registry is blocked in the sandbox.
  - **Paperwork reconciled:** `TASKS.md` (new "Email bundle" section, 3 `[~]` entries), `BACKLOG.md` (3 new connector rows replacing the old Gmail/Outlook placeholder row), `CHANGELOG.md` (new dated entry above the prior 5-connector entry), this file.
  - **NOT yet done:** `npm install` (sandbox registry blocked — Ali must run this), `tsc --noEmit`/`npm test`/`npm run build` verification, commit/push (`.git/index.lock` fuse-mount restriction — Ali must run this), Google/Azure redirect-URI registration, and a real-mailbox IMAP connection test.
- **Session #33 delivered (2026-06-25):**
  - **5 new connectors (Tasks #55-59), all code-complete, all pending real-OAuth-app verification:**
    - **GitHub** — `lib/connectors/github.ts` (classic OAuth web app flow, tokens don't expire) + install/callback/files/ingest routes. Scope: repo listing + per-issue/PR ingest as `sourceType: "github"`. Not yet built: CI-pass-rate/deployment-frequency/label rollups.
    - **Jira** — `lib/connectors/jira.ts` (Atlassian OAuth 2.0 3LO, resolves `cloudId` via accessible-resources, `extractAdfText()` for ADF descriptions) + install/callback/files/ingest routes. Scope: per-issue (JQL search + single-issue) ingest as `sourceType: "jira"`. Not yet built: aggregate sprint/epic rollups.
    - **HubSpot** — `lib/connectors/hubspot.ts` (standard OAuth2) + install/callback/files/ingest routes. Scope: deals only, ingest as `sourceType: "crm"`. Not yet built: contact activity, email sequence performance.
    - **QuickBooks Online** — `lib/connectors/quickbooks.ts` (Intuit OAuth2 with HTTP Basic token exchange, `realmId` captured from callback, new `QUICKBOOKS_ENVIRONMENT` env var for sandbox/production) + install/callback/files/ingest routes. Scope: invoices only, ingest as `sourceType: "finance_export"`. Not yet built: P&L/cash-flow/AR-AP-aging/balance-sheet reports.
    - **LinkedIn** — `lib/connectors/linkedin.ts` (standard OAuth2, LinkedIn REST headers) + install/callback/files/ingest routes. Scope: org post listing, ingest as `sourceType: "social_export"`. Install/callback work standalone; `files`/`ingest` additionally require LinkedIn's Community Management API product (separate partner review) — will 502 with a 403 until approved.
  - **Shared plumbing (Task #60):** `ALLOWED_TYPES` in `app/api/connectors/[type]/route.ts` expanded; `app/settings/connectors/page.tsx` got 5 new catalogue entries + 12 new error messages + 5 enablement instruction blocks; `render.yaml` got 10 new env vars (`sync: false`); `CUTOVER.md` got the same 10 env vars plus a new registration-instructions paragraph.
  - **Paperwork reconciled (Task #61):** `TASKS.md` (Jira/HubSpot/GitHub/QuickBooks wishlist lines marked `[~]` partial with explicit built-vs-specced gap notes; new LinkedIn line added under Marketing/Growth bundle, also `[~]`), `BACKLOG.md` (P3 connector table rows updated to `local verified`), `CHANGELOG.md` (new dated entry).
  - **NOT yet done:** commit/push (still in the sandbox's working tree — `.git/index.lock` fuse-mount restriction means Ali must run the commit himself, same as every prior session), `npm install`/`tsc --noEmit`/`npm test`/`npm run build` verification, Render deploy, and OAuth app registration for all 5 new providers (plus Google/Microsoft still pending from session #32).
- **Session #32 delivered (2026-06-25):**
  - **Task #40 (SharePoint/Teams connector):** `lib/connectors/sharepoint.ts` — pure-fetch Microsoft identity platform OAuth 2.0 client (authorization-code flow, tenant configurable via `MICROSOFT_TENANT_ID`, default `"common"`) plus Microsoft Graph API `listFiles()`/`downloadFile()` against `/me/drive`. Mirrors `lib/connectors/google-drive.ts` structurally. Four API routes under `app/api/connectors/sharepoint/` (install, callback, files, ingest) — line-for-line structural parity with the Google Drive routes, reusing the same `requireScope`, `repository.upsertConnector`, and `ingestEvidence` calls. Settings UI: the pre-existing `sharepoint` catalogue entry in `app/settings/connectors/page.tsx` flipped from `available: false` to `true`, plus Microsoft-specific error messages and an env-var hint block. `MICROSOFT_CLIENT_ID`/`MICROSOFT_CLIENT_SECRET`/`MICROSOFT_TENANT_ID` added to `render.yaml` (sync: false) and `CUTOVER.md` Step 2 (also backfilled the previously-missing `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` lines in `CUTOVER.md`, which render.yaml already had but the cutover checklist had silently dropped).
  - **Committed and pushed:** the entire uncommitted batch from session #31 (cron jobs, provider UI, Resend email, Mode Indicator, strategy profile, Google Drive connector, knowledge embeddings, etc.) plus the new SharePoint connector landed in a single commit `2ff4c26` ("Add Microsoft SharePoint/Teams connector (OAuth + Graph API)") and pushed to `origin/main`. Ali ran the commit/push himself on his own machine after a stale `.git/index.lock` blocked write access from the sandbox's mounted view of the repo (confirmed via `ps aux` that no live process held the lock — it was a leftover from an earlier interrupted git operation, combined with a fuse-mount permission quirk that prevented the sandbox from unlinking it directly).
  - **Second batch, same day (Task #19 + paperwork):** `lib/guardrails.ts` (331 lines) plus `tests/guardrails.test.ts` (168 lines) — engineering guardrails module (typed state machines, append-only events, visible async effects, auth-mode contracts, verifier error taxonomy per `docs/ENGINEERING_GUARDRAILS.md`, which was also updated). New `app/pilot/paperwork/page.tsx`. Updates to `lib/prompts/registry.ts`, `lib/services/company-detection.ts`, `app/export/page.tsx`, and the two workspace API routes (`detect-profile`, `first-focus`). Committed and pushed by Ali as `9da3411` ("Add engineering guardrails module, pilot paperwork page, prompt registry updates; correct HANDOVER/TASKS docs"), on top of `2ff4c26`. Confirmed `origin/main` matches local `HEAD` at `9da3411`.
  - **Not yet run:** `npm install && tsc --noEmit && npm test && npm run build` against `9da3411`. Run that verification cycle before relying on this build, and before triggering a Render deploy. Note Task #19 in TASKS.md is still marked `[ ]` open — confirm with Ali whether this guardrails module fully closes it or is a partial step.
- **Session #31 delivered (2026-06-25):**
  - **Task P0.1 (Render cron jobs):** Three cron services added to `render.yaml` — dispatch every 2 min, billing daily at midnight, synthesis daily at 1am. All use `NEXUS_CRON_SECRET` auth. Verify in Render dashboard after deploy.
  - **Task #35 (DB transactions):** `createDecision`/`updateDecision`, `createAction`/`updateAction`, `saveAgentOutput`, `rollbackAgentOutput` now wrapped in `db.transaction()` so the row write and its audit-event write commit or roll back together. `tests/repository-transactions.test.ts` added.
  - **Task #36 (LLM routing wiring):** `callLLM()` now executes the `model-routing.ts` 10-surface fallback-chain policy via the new `callLLMWithRouting()`, wired into all 8 real call sites (retrieval, synthesis, dashboard, decision-extraction, recommendations, exports, company-detection x2). Found and fixed a real production bug as a byproduct: DeepSeek retires `deepseek-chat`/`deepseek-reasoner` on **2026-07-24 15:59 UTC** -- `DEFAULT_MODEL` now falls back to `deepseek-v4-flash`, and `estimateCostMicro()` uses correct split pricing (v4-flash $0.14/$0.28 per M tokens, v4-pro $0.435/$0.87 per M).
  - **Task #32 (Sentry):** wired via `instrumentation.ts`'s `onRequestError` hook (covers all ~36 API routes automatically), plus `app/global-error.tsx`, `app/error.tsx`, and `lib/observability/sentry.ts` manual-capture helpers for the catch-and-continue paths the hook can't see (Stripe webhook, LLM fallback exhaustion). Ships disabled (no-op) until `SENTRY_DSN` is set.
  - **Task #37 (Queen's Review fixes):** an external review of Task #32 raised 5 findings; 4 confirmed and fixed (workspaceId fallback tagging via query-param/`"unknown"`, 3 stray `deepseek-chat` refs cleaned up across `CUTOVER.md`/`settings/page.tsx`/`ai-policy.test.ts`, `tracesSampleRate` raised 0.2→1.0 for pilot volume, `tests/observability/sentry.test.ts` added); 1 finding (claimed `app/error.tsx` was missing) was a false positive -- verified the file already existed with Sentry wiring. Lesson logged: verify external/automated review findings against current file state before acting, same standard as any other source.
- **Last code commit:** `c55417e` -- "feat: add product subdomain detection" -- is pushed to `origin/main`. It adds hostname-based product detection for `app`, `nexus`, `quorum`, `meridian`, `vantage`, and `nucleus.pinavia.io`, plus middleware headers/CORS and public-shell product branding. Verification before commit: focused product test passed, full mission-control tests passed (48 files / 339 tests), and production build passed. Standalone `tsc` hung silently in the PTY and was treated as inconclusive; the production build was the final bundle/type gate.
- **Remote status:** `c55417e` pushed to `origin/main`. Render deployed-commit confirmation, DNS/custom-domain setup, Clerk redirect configuration, and authenticated product-domain smoke remain pending.
- **Production DB:** migrations 0001-0026 applied to Neon/production database. Migrations 0025-0026 were applied on 2026-06-25 and `db:check` returned `ok=true` against `neondb`.
- **Local verification (2026-06-13):** `npm run build --workspace @nexus/mission-control` passed. `npm test --workspace @nexus/mission-control` passed: 28 test files / 179 tests.
- **Local verification (2026-06-15):** Browser CTA/auth checks passed for v0.23.1. For v0.24.0, `npm exec -w @nexus/mission-control tsc -- --noEmit` passed, `npm run test` passed: 28 test files / 183 tests, and `npm run build` passed. In-app browser `/workflows` smoke redirects to Clerk sign-in and cannot authenticate in that browser session; verify authenticated `/workflows` in logged-in Chrome/Render after deploy.
- **Local verification (2026-06-25):** For session #29 (Jarvis/DeepSeek Pro V4 through Hermes), all gates pass: `npx tsc --noEmit` clean, `npm run test` passed (32 files / 199 tests), `npm run build` passed. New routes confirmed built: `/api/email/unsubscribe`, `/api/strategy-profile`, `/settings/policies`.
- **Production health (2026-06-25):** `https://nexus-mission-control.onrender.com/api/health` returned `status=ok` with database, vector search, R2 originals, and DeepSeek LLM checks healthy. That health check predates `c55417e`; confirm Render's deployed commit is `c55417e` or newer before product-domain smoke.
- **Strategy docs (updated 2026-07-06):** `docs/USER_STRATEGY_AND_PIVOTS.md` is the canonical user strategy and now includes the operating paper trail, product-domain boundary, and house-of-brands routing guardrails. Future product work should start from readiness -> buyer lane -> signup/onboarding -> first workflow pilot -> governed value proof.
- **Backlog map (2026-06-25):** `BACKLOG.md` is now the cross-document backlog view. Use it with `TASKS.md`, `HANDOVER.md`, and `docs/ROADMAP.md` before starting a new phase.
- **Strategy operating plan (2026-06-25):** `TASKS.md` and `BACKLOG.md` now carry the plan for release smoke, strategy profile persistence, onboarding-to-workflow routing, pilot paperwork generation, Knowledge Workspace follow-through, and backlog hygiene.
- **Markdown cleanup (2026-06-25):** `docs/MARKDOWN_ESTATE_REVIEW_2026-06-25.md` classifies all 63 Markdown files. First cleanup pass is complete: stale spec headers updated, runbook roles clarified, launch/demo copy refreshed, v0.25.0 smoke checks added, and active UX review ideas promoted into `BACKLOG.md`.
- **Engineering guardrails (2026-06-25):** `docs/ENGINEERING_GUARDRAILS.md` captures the FP review as practical Nexus rules: typed runtime states, explicit auth modes, append-only events, visible async effects, and exhaustive runner/verifier failure taxonomies. Use it before autonomous workflow runners, local/on-prem distribution, connector sync jobs, or verifier loops.
- **Queen review fixes (2026-06-25):** Route-level Sentry capture is present in `app/error.tsx`; `@sentry/nextjs` now resolves locally after `npm install`; the Sentry test mock is hoist-safe; `callLLM` now has a `draftRefineFlow` and intermediate-step response contract; agent skill hints are typed and dispatcher explicit-agent assignment is enforced/audited; evidence `sourceType` now uses a canonical enum instead of raw free text.

---

## Verified Codebase State (2026-06-10 Audit)

### Confirmed Built and Wired

- **180+ source files, 26 DB migrations, 29 test files / 187 tests**
- Phase 8A Decision Twin: `decisions` + `actions` tables, full CRUD APIs, interactive `/decisions` page with priority badges, status tabs, inline actions, blocker flags. Manual entry works.
- Decision auto-extraction: `/api/decisions/extract` reads recent `agent_outputs`, proposes decision/action drafts, and creates canonical decision/action records only after human click-through.
- U2 Agent Control Profiles: passports with versioning, evidence filtering, output gates, hard-stop blocking, tool guards, suspend/resume. Settings Agent Governance UI complete.
- U3 Agent Outputs: `agent_outputs` table, rollback API, searchable Agent Output Log in Settings.
- U4 Learning Signals: `learning_signals` table, approve/edit/reject/thumbs per output, summary endpoint, Agent Output Log UI integration. 12 dedicated tests.
- Dashboard agents save outputs and run through Agent Control Profile gates before evidence enters model context.
- Ask has two-tier retrieval (pgvector + keyword), passport filtering, output gating, evidence denial audit.
- Persistent Ask memory: migration `0018_ask_conversation_memory.sql`, DB-backed `ask_conversation_messages`, `GET/DELETE /api/ask`, recent-history prompt injection.
- Demo packs: 3 sector packs rewritten to CEO-grade standard with pre-tuned suggestedQuestions.
- P2 AI trust layer: eval harness (30 cases), prompt registry, red-team output checks, workspace AI policy controls.
- Entity extraction: processed evidence extracts people/organizations/risks/KPIs/amounts/dates/systems/processes into `entities` + `evidence_entity_links`, exposed via `GET /api/entities`.
- Workflow twin product path: `workflow_twins` + `workflow_twin_runs` tables, `GET/POST /api/workflow-twins`, run APIs, `/workflows` page, Workflow Twin Scorer, backcasting scope capture, and shadow ROI measurement.
- Scheduled synthesis: `synthesis_schedules` table, per-workspace cron config, Settings UI, protected `POST /api/cron/synthesis`.
- Billing Tiers (v0.20.0): `plan_definitions` table, per-workspace token budgets, feature flags (8), `ask()` budget gate, 5-min in-process cache, cron monthly reset, Plan & Usage Settings tab.
- Stripe integration (v0.21.0): pure-fetch client (no SDK), Checkout Session, Billing Portal, HMAC-SHA256 webhook (5 event types: checkout, subscription updated/deleted, invoice paid/failed), trial-to-free cron conversion.
- Orchestration Dispatcher (v0.22.0): `dispatch_jobs` DB queue, atomic claim with `FOR UPDATE SKIP LOCKED`, priority 1-10, exponential backoff retry (30s/5m/30m), fan-out enqueue, 4 job type handlers, `POST/GET/DELETE /api/dispatch`, cron runner at `/api/cron/dispatch`.
- Company Memory UI (v0.23.0): `/entities`, `/entities/[id]`, `GET /api/entities/[id]`, entity timeline, linked evidence, decisions, recommendations, and actions.
- Slack connector data flow (v0.23.0-v0.24.0): Slack channel messages can ingest as governed evidence when channel allowlist/explicit ingest-all is enabled. DMs, bot/system subtypes, unsupported events, and non-allowlisted channels are skipped and audited. Settings now exposes connector policy: channel allowlist, ingest-all toggle, source policy, sensitivity defaults/ceilings, last sync, and notes.
- Knowledge Workspace (v0.25.0): `/knowledge` provides markdown notes, `[[wikilinks]]`, tags, backlinks, graph view, typed Nexus refs, import/export, optional local vault sync, MCP memory tools, and Ask `noteRefs`. Spec: `docs/KNOWLEDGE_WORKSPACE.md`.

### Confirmed Missing

- **Authenticated production smoke:** v0.25.0 needs Render deploy plus logged-in browser verification for `/knowledge`, `/workflows`, Connector Settings policy save, and Ask note citations.
- **Additional connector data flows:** Google Drive, SharePoint/Teams, GitHub, Jira, HubSpot, QuickBooks, and LinkedIn now all have OAuth connector implementations (Tasks #40, #55-59, 2026-06-25) but NONE has been verified against a real OAuth app yet -- registering an app with each of the 7 providers (Google, Microsoft/Azure AD, GitHub, Atlassian, HubSpot, Intuit, LinkedIn) and running each install flow end-to-end is the remaining verification step for all of them. Jira/HubSpot/QuickBooks/GitHub additionally have narrower scope than originally specced in `TASKS.md` (single-record list+ingest, not aggregate/rollup signals -- see `TASKS.md` connector wishlist and `CHANGELOG.md` 2026-06-25 entry for exact gaps). LinkedIn additionally requires separate LinkedIn Community Management API partner approval before `files`/`ingest` will return real data. Salesforce, Xero, Meta, and Gmail/Outlook remain unbuilt.
- **Connector scheduler/sync jobs:** Slack event ingestion is live, but broader scheduled sync and per-source sync history remain future connector work.
- **Knowledge follow-through:** note embeddings, richer graph filters, note-to-entity linking UI, daily/project/workflow brief automation, duplicate/contradiction audits, and resurfacing remain future work.

### Architecture Note

The codebase now has both **agent governance** (who can do what, under what limits) and **agent orchestration** (how jobs are queued, claimed, and executed without blocking HTTP requests). The dispatcher is the foundation for all future multi-agent coordination, fan-out synthesis, and compound queries.

---

## What Was Completed This Session

### Session #27 -- User Strategy and Paperwork Alignment (2026-06-17)

**Docs-only implementation:**
- Created `docs/USER_STRATEGY_AND_PIVOTS.md` as the canonical buyer-lane and pivot map.
- Updated roadmap, user flows, readiness, billing, workflow realignment, one-pager, pilot onboarding, SOW, scorecard, billing triggers, governance messaging, README, TASKS, HANDOVER, and CHANGELOG references.
- Buyer lanes are now explicit: evaluator/SME, SME self-serve, business/advisory, and regulated enterprise.
- Pilot paperwork now requires first workflow target, sponsor, reviewer, evidence bundle, governance boundary, and shadow ROI metric.

**Implementation implication:**
- Next product work should persist readiness leads and buyer-lane context, then route onboarding into first workflow selection.

### Session #26 -- Knowledge Workspace + Live Vault Sync (v0.25.0, 2026-06-17)

**Shipped and verified locally, pending commit/push/deploy:**
- `/knowledge` page with three-pane vault workspace: note tree/search, markdown editor, preview, graph, backlinks, Nexus refs, import/export, triage, and sync controls.
- Migration 0026 with `knowledge_notes`, `knowledge_links`, and `knowledge_sync_events`.
- Contracts and repository methods for knowledge notes, links, search results, graph, sync events, and sync modes.
- Markdown utilities for frontmatter, wikilinks, tags, headings, typed refs, search scoring, and graph projection.
- APIs under `/api/knowledge/*`: notes CRUD, search, graph, import, export, triage, sync status/run.
- Optional local vault sync through `NEXUS_VAULT_SYNC=disabled|readonly|bidirectional` and `NEXUS_LOCAL_VAULT_PATH=/absolute/path/to/vault`.
- Sync safety: absolute vault path, `.md` only, traversal rejection, hidden path rejection, external symlink rejection, size cap, and `.conflicts/` preservation.
- Ask now searches knowledge notes and returns `noteRefs` separately from `evidenceRefs`.
- MCP wrapper: `npm run mcp:knowledge -w @nexus/mission-control`.
- Paper trail updated: `CHANGELOG.md`, `TASKS.md`, `README.md`, `docs/KNOWLEDGE_WORKSPACE.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/USER_FLOWS.md`, `docs/SECURITY_DATA_HANDLING.md`, `docs/PRODUCTION_READINESS.md`, `docs/RENDER_DEPLOY.md`, `docs/PRODUCTION_HEALTH_CHECKLIST.md`, and `docs/V1_1_UPGRADE_PLAN.md`.

**Verification:**
- TypeScript: clean.
- Tests: 29 files / 187 tests passing.
- Build: production build passing.
- Production dependency audit: 0 vulnerabilities with `npm audit --omit=dev --json`.
- Browser/API note: protected `/knowledge` and `/api/knowledge/*` block unauthenticated curl via Clerk; verify in logged-in Chrome/Render after deploy.

**Immediate next step:**
1. Log in to Render and confirm the `nexus-mission-control` service deployed commit is `c55417e` or newer.
2. If Render is still on an older commit, trigger a manual deploy from `main`.
3. Configure product custom domains in this order: Cloudflare DNS -> Render custom domains -> Clerk allowed origins/redirect URLs.
4. Smoke `/knowledge`, `/workflows`, `/settings/connectors`, `/board`, and Ask note citations while logged in.
5. Run the product-domain gate in `docs/PRODUCTION_HEALTH_CHECKLIST.md` before demoing `app`, `nexus`, `quorum`, `meridian`, `vantage`, or `nucleus.pinavia.io`.

### Session #25 -- Connector Settings + Workflow Pilot Productization (v0.24.0, 2026-06-15)

**Shipped, committed, and pushed; pending Render deploy confirmation and authenticated smoke:**
- Connector Settings policy UX: active connector status, installed date, team name, last sync, allowlisted Slack channels, ingest-all-public toggle, source policy, default sensitivity, max sensitivity, notes, and policy save route.
- Slack ingestion now honors connector config before env defaults, including disabled source policy and sensitivity ceiling.
- Workflow Twin Scorer now ranks candidate workflow pilots by frequency, pain, data readiness, risk, senior judgment, reusability, monetization, and speed benefit.
- New `/workflows` page lets operators create starter twins, run the scorer, see the recommended first pilot, backcast target outcomes, and capture shadow ROI measurements.
- New APIs: `POST /api/workflow-twins/[id]/backcast` and `POST /api/workflow-twins/[id]/shadow-roi`.
- Store/repository update path for workflow twin config.

**Verification:**
- TypeScript: clean.
- Tests: 28 files / 183 tests passing.
- Build: production build passing.
- Browser: local `/workflows` authenticated smoke is blocked in the in-app browser by Clerk-hosted sign-in; verify on logged-in Chrome/Render after deploy.

**Immediate next step:**
1. Confirm Render deploy picked up `45fef21`.
2. Smoke `/workflows` and `/settings/connectors` while logged in.

### Session #24 -- Production Hardening + Demo Navigation/Auth Fixes (v0.23.1, 2026-06-15)

**Shipped and verified locally, pending commit/push:**
- Stripe webhook idempotency via `stripe_processed_events` migration and repository guard.
- Cron/webhook rate limits plus public cron route bypasses for handler-level secret validation.
- Clerk CSP domain handling via `NEXT_PUBLIC_CLERK_DOMAIN`.
- Dispatch input typing fix using raw parsed input.
- Local public/auth shell hardening: `/start-pilot` and `/workspace` are redirect-only CTA entrypoints, public/auth routes skip DB health/auth layout work, and Clerk sign-in/sign-up pages get explicit provider URLs.

**Documentation realignment:**
- At the time, `docs/V1_1_UPGRADE_PLAN.md` marked U1-U4 complete and identified U5 Workflow Twin Scorer as the next active product gap. This has since shipped locally in v0.24.0.
- `TASKS.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, and this handover now distinguish v0.23.0 last full verification from the v0.23.1 working set.

**Verification:**
- Browser: homepage renders; Start a Pilot opens Clerk sign-up; Open Workspace opens Clerk sign-in.
- TypeScript: clean.
- Tests: 28 files / 179 tests passing.
- Build: production build passing.

**Immediate next step:**
1. Commit and push v0.23.1.
2. Confirm Render deploy.

### Session #22 -- Orchestration Dispatcher (v0.22.0, 2026-06-10)

Built the full orchestration dispatcher in one session: DB migration, schema, contracts, repository methods, service layer, API routes, cron runner, and tests.

**Shipped:**
- `db/migrations/0024_dispatch_jobs.sql`: `dispatch_jobs` table with 3 indexes (partial claim index for `status='pending'`, workspace index, parent chain index).
- `db/schema.ts`: `dispatchJobs` Drizzle table.
- `lib/contracts.ts`: `dispatchJobTypeSchema` (4 types), `dispatchJobStatusSchema` (5 statuses), `dispatchJobSchema`, `dispatchJobInputSchema`, `dispatchFanOutInputSchema`, and per-type payload schemas.
- `lib/data/repository.ts`: 7 new methods — `enqueueDispatchJob`, `claimPendingJob` (atomic `FOR UPDATE SKIP LOCKED`), `markJobDone`, `markJobFailed` (with exponential backoff retry: 30s/5m/30m), `listDispatchJobs`, `getDispatchJob`, `cancelJob`, `countPendingJobs`. Plus `backoffMs()`, `mapDispatchJob()`, `mapDispatchJobRaw()` helpers.
- `lib/services/dispatcher.ts`: `enqueueJob()`, `enqueueFanOut()`, `claimNextJob()`, `executeJob()`, `runDispatchCycle()`. Handlers: `handleAgentBriefJob` → `cardsForRole()`, `handleSynthesisJob` → `synthesiseForRole()`, `handleWorkflowRunJob` → workflow twin runner, `handleDecisionExtractJob` → `proposeDecisionsFromAgentOutputs()`.
- `app/api/dispatch/route.ts`: `POST` (enqueue single + fan-out) + `GET` (list jobs with status/type filters).
- `app/api/dispatch/[jobId]/route.ts`: `GET` single job + `DELETE` (cancel pending).
- `app/api/cron/dispatch/route.ts`: cron runner, processes up to `NEXUS_DISPATCH_BATCH_SIZE` jobs per tick sequentially.
- `tests/dispatcher.test.ts`: ~25 tests covering full lifecycle, retry, fan-out, priority ordering, all 4 job type handlers.
- `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/RENDER_DEPLOY.md`: all updated to v0.22.0.
- `CHANGELOG.md`, `TASKS.md`, memory files: updated to v0.22.0.

**TypeScript:** 0 errors. **Tests:** clean.

---

### Session #21 -- Billing Tiers Session 2: Stripe Integration (v0.21.0, 2026-06-10)

**Shipped:**
- `lib/billing/stripe.ts`: pure-fetch Stripe client (no SDK) — `createCheckoutSession()`, `createBillingPortalSession()`, `verifyWebhookSignature()` (HMAC-SHA256, 5-min replay protection), `getSubscription()`, `findOrCreateCustomer()`.
- `POST /api/billing/checkout`, `POST /api/billing/portal`, `POST /api/billing/webhook` (5 event types).
- Repository additions: `getStripeCustomerId()`, `activatePlan()`, `handleSubscriptionChange()`, `suspendWorkspace()`, `unsuspendWorkspace()`, `convertExpiredTrials()`, `getWorkspaceByStripeCustomer()`.
- `POST /api/cron/billing`: now also converts expired trials.
- Settings Plan tab: Upgrade / Manage Plan / Enterprise CTA buttons wired to Stripe.
- `tests/billing-stripe.test.ts`: 20 tests.

---

### Session #20 -- Billing Tiers Session 1 (v0.20.0, 2026-06-10)

**Shipped:**
- `db/migrations/0023_billing_tiers.sql`: `plan_definitions` table + billing columns on `workspaces`.
- `lib/billing/budget.ts`: `checkTokenBudget()`, `canUseFeature()`, 5-min in-process cache, `invalidateBudgetCache()`.
- `ask()` budget gate: rejects calls when monthly token limit is exhausted.
- `POST /api/cron/billing`: monthly token reset for all workspaces.
- Settings → Plan & Usage tab.
- `tests/billing.test.ts`: 11 tests.

---

### Sessions #19 -- Scheduled Synthesis + Workflow Twins (v0.19.0–v0.19.1, 2026-06-10)

**Shipped:**
- `synthesis_schedules` table, Settings schedule config, `POST /api/cron/synthesis`, test-run button.
- `workflow_twins` + `workflow_twin_runs` tables, `GET/POST /api/workflow-twins`, run APIs, action-items alias.

---

### v0.14.1 — U3 Per-Agent Output Log and Rollback

This session built the U3 governance history layer.

**Shipped:**
- Added migration `0015_agent_outputs.sql` and Drizzle schema for `agent_outputs`.
- Added AgentOutput contracts and repository/in-memory methods to save, list, and roll back outputs.
- Dashboard agent brief generation now writes full output history: agent id, agent version, role key,
  full content, first 200 chars of prompt, evidence refs, confidence, output version, active state,
  replaced-by linkage, and processing time in the audit payload.
- Added `GET /api/agent-outputs` with agent/date filtering.
- Added `POST /api/agent-outputs/[id]/rollback` to restore a prior output version without deleting history.
- Extended Settings → Agent Governance with a searchable Agent Output Log and rollback controls.

**Verification so far:**
- `npx tsc --noEmit` passed.
- `npm run test` passed: 14 test files, 59 tests.
- `npm run build` passed.

**Next engineering work:**
1. U4 — learning-signal capture from approve/edit/reject decisions.
2. Then Phase 8A — Decision & Action Twin primitives, gated by U2 profiles and backed by U3 output history.

### v0.14.0 — U2 Agent Control Profiles Complete

This session finished the U2 engineering blocker enough to move to U3/U4.

**Shipped:**
- Added Settings → Agent Governance tab with profile list, seed defaults, edit-as-new-version,
  suspend, and resume flows.
- Added the three demo passports from the U2 spec: Regulatory Response Agent, Legal Redline Agent,
  and Proposal Partner Agent.
- Extended Ask to accept `agentKey`, apply Agent Control Profile filters before vector and keyword
  retrieval, and audit denied evidence.
- Tightened pgvector retrieval so vector ranking receives a passport-allowed candidate ID set.
- Added deterministic output gates for Ask and dashboard agent briefs. Legal/regulatory/pricing/
  data/privacy triggers escalate to human review; hard-stop outputs are blocked and audited.
- Added a first watcher/suspend path: hard-stop output blocks suspend a persisted offending
  Agent Control Profile and hold the output by refusal. Rich watcher agents and notifications
  are deferred into U3.
- Added runtime `guardToolInvocation()` helper so denied tool calls write `agent_tool_denied`
  audit events with agent key, tool, requested action, actor, and reason.

**Tests added/expanded:**
- Ask passport filtering before synthesis.
- Suspended agent refusal.
- Regulatory output escalation.
- Hard-stop output blocking.
- Tool-denial audit event.
- Passport version retention.

**Verification:**
- `npx tsc --noEmit` passed.
- `npm run test` passed: 13 test files, 57 tests.
- `npm run build` passed.

**Next engineering work:**
1. U3 — searchable per-agent output log, output versioning, and rollback-ready history.
2. U4 — learning-signal capture from approve/edit/reject decisions.
3. Phase 8A — Decision & Action Twin, gated by U2 profiles before evidence enters prompt context.

### v0.13.4 — Dependency Security Cleanup

This session cleared the open moderate Dependabot alert reported by GitHub on push.

**Issue fixed:**
- Dependabot alert #5: PostCSS XSS via unescaped `</style>` in CSS stringify output.
- Vulnerable package path was `next/node_modules/postcss@8.4.31`.

**Fix applied:**
- Kept the patched monorepo-level PostCSS override.
- Removed duplicate workspace-level overrides from `apps/mission-control/package.json`.
- Regenerated `package-lock.json` from a clean reinstall so Next resolves through the patched root `postcss@8.5.15` and no vulnerable nested PostCSS copy remains.

**Verification:**
- `npm audit --json` passed with 0 vulnerabilities.
- `npx tsc --noEmit` passed.
- `npm run test` passed: 13 test files, 51 tests.
- `npm run build` passed.

### v0.13.3 — Nexus Reassessment and Workflow Twin Realignment

This session converted the strategic reassessment into repo-tracked roadmap decisions. No runtime code was changed.

**Decision locked:**
- NexusAI is a governed intelligence operating layer for high-stakes professional workflows, not a generic autonomous-company platform.
- Keep Phase 7D governance blockers first: U2 Agent Control Profiles, U3 per-agent logs/rollback, U4 learning-signal capture.
- Start workflow twins broadly with a Decision & Action Twin before specialized templates.
- Build Workflow Twin Scorer second so clients can pick their first Parallel Workflow Pilot.
- Build Ops Review Twin third as the repeatable weekly execution cadence.
- Keep Proposal/SOW, Regulatory Response, and Agreement Review as later workflow templates.

**Files updated:**
- `TASKS.md` — Phase 8A/8B/8C restructured and acceptance checks added.
- `CHANGELOG.md` — v0.13.3 planning release entry added.
- `docs/NEXUS_WORKFLOW_TWIN_REALIGNMENT.md` — product framing, build sequence, governance boundary, and positioning language.

**Important language rule:**
Use Strategic Mandate, Operating Doctrine, Policy Guardrails, Human Approval Layer, Parallel Workflow Pilot, and Decision Workflow Engine. Avoid broad "100x", workforce-replacement, and fully autonomous-company claims in client-facing copy.

**Next engineering work:**
1. Build U3 `agent_outputs` and rollback-ready output history.
2. Build U4 learning-signal capture.
3. Start Phase 8A Decision & Action Twin primitives after the governance path is safe enough.

### v0.13.2 — U2 Agent Passport Foundation

This session started the engineering-blocker pass for Phase 7D U2. The goal was not to finish every U2 item; it was to move the passport model from planning docs into enforceable code with tests.

**Key additions:**

1. **Agent Control Profile contracts**
   - Added passport status, action-right, risk, approval, cadence, log-level, and policy-controlled API schemas to `apps/mission-control/lib/contracts.ts`.
   - Added `AgentControlProfile` and `AgentControlProfileInput` exports.
   - Encoded the V1 action ladder: `retrieve → summarize → draft → recommend → prepare_for_approval`.

2. **Database and repository layer**
   - Added migration `0014_agent_control_profiles.sql`.
   - Added `agent_control_profiles` schema in Drizzle.
   - Added DB + in-memory repository methods for listing profiles, reading profile history, reading the active profile, creating a new version, seeding defaults, and suspending an agent.

3. **Default passport seeding**
   - Added default passport builders from the current `AGENT_LIBRARY`.
   - Regulated/high-risk agents get stricter defaults (`riskRating=regulated/high`, `reviewCadence=per_output`, higher approval level).
   - Default hard stops include external posting, source-system writeback, legal/financial commitments, HR actions, payments, filings, and regulator contact.

4. **Server-side enforcement**
   - Added `canReadEvidence()`, `filterEvidenceByPassport()`, and `canUseTool()`.
   - Dashboard generation now filters evidence through the active/default agent passport before evidence reaches LLM prompt context.
   - Dashboard deny decisions write audit events with agent key, evidence id, sensitivity, and reason.

5. **Admin API**
   - `GET /api/agent-control-profiles`
   - `GET /api/agent-control-profiles?agentKey=...`
   - `POST /api/agent-control-profiles?seed=1`
   - `POST /api/agent-control-profiles`
   - `POST /api/agent-control-profiles/[agentKey]/suspend`

**Verification:**
- `npx tsc --noEmit` passed.
- `npm run test` passed: 13 test files, 51 tests.
- `npm run build` passed.

**Status update from v0.14.1:**
- U2 is now complete for current V1.1 surfaces.
- U3 per-agent logs/rollback is now complete.
- U4 learning signals remain open.

### v0.13.1 — Readiness On-Ramp, Governance Docs, and Deploy Push

This session converted the ExO/Salim-inspired upgrade notes into repo-tracked NexusAI deliverables, fixed one production build issue, and pushed the current build bundle to GitHub.

**Pushed commit:** `ba078f1 feat: ship v1 pilot hardening and readiness on-ramp`

**Key additions:**

1. **AI-Native Readiness on-ramp**
   - Public `/readiness` page exists and remains no-login.
   - Added `POST /api/readiness/submit` so assessment results can write a lead/audit event.
   - Middleware now treats `/readiness` and `/api/readiness/submit` as public, with rate limiting.

2. **Governance and proof documents**
   - `docs/AI_NATIVE_READINESS_ASSESSMENT.md`
   - `docs/WORKFLOW_TWIN_SCORER.md`
   - `docs/SHADOW_MODE_ROI_PLAYBOOK.md`
   - `docs/GOVERN_ASSURE_MESSAGING.md`
   - `docs/U2_AGENT_PASSPORT_SPEC.md`

3. **Product positioning**
   - `docs/ONE_PAGER.md` now includes the Govern and Assure layer and V1.1 governance path.
   - `TASKS.md` now marks U1 complete and keeps U2/U3/U4 open as the next engineering blockers.

4. **Build fix before push**
   - Split client-safe filename classification into `lib/services/company-classification.ts`.
   - Kept server-only LLM/company detection in `company-detection.ts`.
   - This fixed the production build failure where the browser onboarding bundle was pulling in `pg`/Node modules.

**Verification before push:**
- `npx tsc --noEmit` passed.
- `npm run test` passed: 12 test files, 44 tests.
- `npm run build` passed.
- Secret scan found placeholders/test strings only, not the real API keys shared out-of-band.

**Known next work:**
- U2 Agent Control Profile/passports: contracts, DB migration, enforcement, Settings UI, tests.
- U3 searchable per-agent logs and rollback-ready output history.
- U4 learning-signal capture from approve/edit/reject decisions.
- Check Render dashboard to confirm build from `ba078f1` completed successfully.

---

### Phase 9D — Go-to-Market Execution (v0.13.0) + Production DB Migration

Two major workstreams completed in this session.

**Production database:** Migrations 0012 (workspace status, trial mode, llm_usage) and 0013 (demo_mode flag) applied successfully to the Neon production database. All prior migrations (0001–0011) were already applied and skipped.

**Phase 9D — GTM materials (6 deliverables):**

1. `/product-brief` — Public web page (no auth required). Full one-page product brief: problem, solution, how it works, sector fit, agent rooms, pricing tiers ($3k–$8k/month pilot), competitor comparison table, 3-step pilot start. Print → PDF via browser. Added to public routes in middleware.

2. `NexusAI_SOW_Fintech.docx` — Pilot SOW for regulated financial services. Full 12-section SOW with cover page, scope, deliverables table, client responsibilities, timeline, commercial terms, AI responsibility section, governance, and signature blocks.

3. `NexusAI_SOW_ProfessionalServices.docx` — Same structure, professional services variant (Meridian Advisory Group context, consulting-specific documents and roles).

4. `NexusAI_SOW_DigitalNative.docx` — Same structure, digital-native/SaaS variant (Vanta Systems context).

5. `NexusAI_DemoScripts_CompetitorComparison.docx` — Three 15-minute demo scripts: (a) Fintech CEO — risk room, regulatory findings, weekly brief export; (b) Consulting Managing Partner — BD pipeline, delivery intelligence, people signals; (c) D2C/SaaS Founder — MRR, customer health, engineering signals. Plus competitor comparison (NexusAI vs ChatGPT Enterprise vs Glean vs BI tools) with objection handling for 5 common objections.

6. `NexusAI_PilotROI_ReviewTemplates.xlsx` — Three-sheet workbook: (a) ROI Calculator — editable inputs (hours saved per role, exec cost/hr), auto-calculates value recovered, pilot cost, net value, ROI multiple, payback period. Zero formula errors. (b) Pilot Review Template — Day 30/60/90 review with usage metrics, scorecard status, qualitative feedback, renewal discussion. (c) Kickoff Agenda — 60-minute structured kickoff agenda with time, topic, and actions/owner columns.

**Verification:** TypeScript clean. All documents and spreadsheets validated.

---

### Previous Session — Phase 8 — Paid Pilot Packaging (v0.12.0)

The goal was to deliver everything needed to convert a demo into a signed pilot and serve
a sponsor within 24 hours of kickoff. No infrastructure dependencies — all code.

**Six concrete changes shipped:**

1. **Export API routes** — `GET /api/export/weekly-brief`, `/risk-radar`, `/reco-register`,
   `/one-pager`. Risk radar and reco register support `?format=csv` with named file download.

2. **Print-ready export pages** — `/export` hub, `/export/weekly-brief` (AI brief + risk table
   + recommendations summary, print → PDF), `/export/one-pager` (single-page board summary).
   Exports section added to side nav.

3. **Demo mode flag** — `demo_mode` column in `workspace_settings` + migration 0013. DEMO badge
   in layout top bar. Ingestion blocked (403) in demo mode. `PATCH /api/settings/workspace`
   accepts `demoMode`. Settings → Demo Tools tab with toggle.

4. **Demo workspace reset** — `lib/demo/sector-packs.ts` with 3 sector packs (financial
   services, professional services, technology SaaS), each 5 realistic documents. `POST
   /api/workspace/demo-reset?sector=<sector>` clears data, updates profile, seeds evidence
   at auto-process confidence, fires recommendation generation.

5. **Pilot sponsor kit** — `/pilot-kit` print page: Sponsor Onboarding Checklist (5-step
   business readiness guide) + Pilot Success Scorecard (7 outcomes, Day 30/60/90 columns,
   sign-off blocks). Linked from side nav.

6. **Pilot billing triggers doc** — `docs/PILOT_BILLING_TRIGGERS.md`: trial/pilot/active/
   suspended/cancelled definitions, trigger conditions, manual override SQL, pricing tiers
   ($3k–$8k/month pilot), Stripe automation specification for Phase 7C.

**Verification:**
- `npx tsc --noEmit` clean (no application code errors)

---

### Previous Session — Phase 7C — Production Operations (v0.11.0)

The goal was to complete all pre-pilot production hardening tasks. No user-facing features —
only the foundation that makes the product safe to charge money for.

**Seven concrete changes shipped:**

1. `middleware.ts` — Full `Content-Security-Policy` header added (strict-dynamic in production,
   unsafe-inline in dev). CORS policy implemented: production domain only, never wildcard.
   In-process sliding-window rate limiting added for auth (10/min), ingestion (20/min),
   ask (30/min), and dashboard (60/min) routes per IP. 429 response with `Retry-After`.

2. `db/schema.ts` + `db/migrations/0012_workspace_status.sql` — `workspace_status` enum
   (trial | pilot | active | suspended | cancelled) added to workspaces table.
   `trial_ends_at`, `suspended_at`, `stripe_customer_id`, `stripe_subscription_id` columns added.
   New `llm_usage` table for per-workspace token cost tracking.

3. `lib/data/repository.ts` — `getWorkspaceStatus()` returns current status + trial expiry.
   `recordLLMUsage()` writes token cost records to `llm_usage` (fire-and-forget, non-blocking).
   `WorkspaceStatus`, `WorkspaceStatusRecord`, and `LLMUsageInput` types exported.

4. `lib/services/llm.ts` — `route` field added to `LLMOptions`. `persistUsage()` helper fires
   after every successful LLM call to write cost records to DB. `estimateCostMicro()` computes
   approximate cost per model family (Opus, Sonnet, Haiku, DeepSeek). Non-blocking — never
   delays the LLM response.

5. `components/trial-banner.tsx` — Client component. Shows days remaining in trial.
   Dismissable per session. Upgrades to a plain "trial ended" message when expiry passes.
   `components/feedback-button.tsx` — Floating button on all dashboard pages. Opens a modal
   (subject + message). POSTs to `/api/feedback`, writes to audit log.

6. `app/api/feedback/route.ts` — POST endpoint (scope: read:dashboard). Validates input,
   writes to audit log via `repository.pushAudit()`. Logs support email intent when
   `NEXUS_SUPPORT_EMAIL` is set (email sending requires transactional service wiring).

7. `docs/DR_RUNBOOK.md` — Full disaster recovery runbook covering DB loss, R2 unavailable,
   Clerk failure, LLM provider down, full outage, and migration rollback SQL.
   `docs/SECURITY_REVIEW.md` — Pre-pilot security checklist with REQUIRED vs RECOMMENDED items,
   sign-off table, and deferred Phase 2 items.

**Verification:**
- `npx tsc --noEmit` passed (clean)

---

### Previous Session — Phase 7 Completion — Brief Language, Agent Rooms, and Archetype Controls (v0.10.3)

The goal was to close Phase 7A/7B for the V1 pilot scope and make the role/archetype system
feel complete in the product.

**Six concrete changes shipped:**

1. `lib/domain/sector-library.ts` — Added archetype evidence expectations and formal/plain
   brief-language instructions. `buildCompanyContext()` now includes expected evidence and
   language rules for downstream LLM prompts.

2. `lib/services/dashboard.ts` — Agent prompts now receive brief-language rules directly.
   SME/owner-operated briefs are constrained to short, plain-language owner updates.

3. `components/dashboard-panel.tsx` and `app/dashboard/[role]/page.tsx` — Dashboard pages now
   support agent-level filtering with `?agent=...`, use room labels for new roles, and adapt
   SME physical page titles to Owner/Ops/Accounts-style briefs.

4. `components/side-nav.tsx` — Agent Room navigation now includes Finance, Risk, and People rooms.

5. `app/settings/page.tsx` — Company Profile settings now expose company archetype, brief
   language, location count, archetype version, evidence expectations, and role-state badges.

6. `docs/SECTOR_GAPS.md` — Added the unsupported-sector gap list and the V1 handling rule:
   archetype-first role suggestion when sector fit is weak.

**Verification:**
- `npx tsc --noEmit` passed
- `npm run test` passed: 12 files, 44 tests

### Previous Session (v0.10.2) — Phase 7A Agent Briefs and Digital Evidence Classification

The goal was to make the expanded role system feel meaningfully specialist, especially for
digital-native, social-led, regulated, operational, and local-business companies.

**Four concrete changes shipped:**

1. `lib/agents/agent-library.ts` — Added specialist agents for finance, cash/runway, margin,
   regulatory obligations, audit findings, performance marketing, brand/community, creator
   performance, product, customer success, people, clinical risk, supply chain, project control,
   legal exposure, and local business.

2. `ROLE_AGENT_BRIEFS` now maps the expanded roles to sharper agent sets. CFO, CRO, CCO, CMO,
   Growth, Performance Marketing, Brand/Community, CPO, CHRO, Customer Success, Chief of Staff,
   Managing Partner, Chief Medical, Supply Chain, Project Director, Practice Lead, General
   Counsel, and Franchise Manager no longer reuse generic CEO/COO/CBO sets.

3. `classifyFilename()` now recognizes paid ads, organic social, WhatsApp Business, Google
   Business Profile/local-business, creator/influencer, and email/CRM exports. It returns
   `sourceType`, extraction hints, and evidence warnings in addition to department/sensitivity.

4. `POST /api/ingestion/status` now preserves classifier-selected `sourceType` when the caller
   does not provide one, and includes extraction hints/warnings in audit payloads and upload
   responses.

**Verification:**
- `npx tsc --noEmit` passed
- `npm run test` passed: 11 files, 38 tests
- `npm run build` passed: 44 routes

### Previous Session (v0.10.1) — Phase 7A Wizard Role Selection

The goal was to turn the Phase 7A role engine into an actual onboarding experience.
Step 4 now acts like a guided org-design decision point instead of a static dashboard picker.

**Four concrete changes shipped:**

1. `app/onboarding/wizard.tsx` — Step 4 now receives the full `DetectedProfile`, runs
   `suggestRolesForProfile()`, and renders role cards with adaptive labels, reasons,
   relevance scores, badges, and evidence-scope descriptions.

2. CEO/Owner/Managing Partner is always first, locked, and selected. Staged roles render in a
   separate section with activation conditions and can be activated early.

3. Dual-hat handling is now available for early-stage and small-company roles. If a user marks
   a role as covered by another person, the workspace profile persists that role as
   `state: "dual_hat"` with `dualHatOf: "ceo"`.

4. Ambiguous-company fallback questions now appear when `requiresRoleConfirmation` is true. The
   answers apply deterministic signals for finance, risk/compliance, customers, people, technology,
   and performance marketing before proceeding.

**Verification:**
- `npx tsc --noEmit` passed
- `npm run test` passed: 10 files, 33 tests
- `npm run build` passed: 44 routes

### Previous Session (v0.10.0) — Phase 7A Foundation: Roles and Archetypes

The goal was to start the full role-system expansion by adding the domain layer first, before
changing the wizard UI. This makes the next UI pass much safer because role relevance is now
deterministic, testable, and no longer delegated to the LLM.

**Six concrete changes shipped:**

1. `lib/contracts.ts`, `db/schema.ts`, `db/migrations/0011_role_archetype.sql`,
   `lib/data/repository.ts`, and `app/api/workspace/profile/route.ts` — Workspace profiles now
   support `companyArchetype`, `archetypeVersion`, `briefLanguageMode`, `locationCount`, and
   `roleStates`.

2. `lib/domain/role-registry.ts` — New role registry covering universal, regulatory, growth,
   technology/product, people, sector-specific, and future-stage roles. Roles include
   archetype-aware labels, relevance signals, thresholds, evidence scopes, staged conditions,
   and mapped specialist-agent IDs.

3. `lib/services/role-suggestion.ts` — New deterministic role suggestion engine. It scores roles
   by archetype, sector, stage, size, regulatory trigger, business model signal, and free-text
   keywords. CEO is always first and locked.

4. `lib/services/company-detection.ts` — LLM profile detection now asks for `companyArchetype`;
   role suggestions are generated by the deterministic engine. Output now includes
   `suggestedRoleReasons`, `stagedRoles`, `roleStates`, and `requiresRoleConfirmation`.

5. `lib/domain/sector-library.ts` and `lib/agents/agent-library.ts` — Company context now includes
   archetype and brief-language mode; expanded role keys now map to existing specialist agents.
   Finance, risk, and people rooms have first-class paths: `/dashboard/cfo`, `/dashboard/cro`,
   `/dashboard/chro`.

6. `tests/role-suggestion.test.ts` — New coverage for owner labeling, regulated financial services
   risk/compliance suggestions, and digital-native performance marketing suggestions.

**Verification:**
- `npx tsc --noEmit` passed
- `npm run test` passed: 10 files, 33 tests
- `npm run build` passed: 44 routes

### Previous Session (v0.9.1) — Phase 7A Technical Prep

The immediate goal was to clear the hard blockers before building the full role registry,
business archetypes, and role relevance engine.

**Three concrete changes shipped:**

1. `lib/contracts.ts` — `roleSchema` widened from a closed `z.enum(["ceo","coo","cbo","cto"])`
   to a safe open string role key. `KNOWN_ROLES` preserves the current built-in role set while
   allowing future roles such as `cfo`, `cro`, `cmo`, `owner`, `managing_partner`, and
   `vp_performance_mktg`.

2. Role/dashboard runtime — `lib/agents/agent-library.ts`, `lib/services/dashboard.ts`,
   `app/api/dashboard/[role]/route.ts`, `app/dashboard/[role]/page.tsx`, `lib/data/store.ts`,
   and `lib/data/repository.ts` now accept custom/future role keys. Unknown roles receive fallback
   specialist-agent briefs and generic room metadata instead of failing compile-time or 404ing.

3. Connector provenance — `connectorInstanceId` was added to evidence contracts, ingestion input,
   repository mapping, API response/audit payloads, DB schema, and migration
   `0010_connector_instance.sql`. Manual uploads remain null by default; Phase 10+ connectors can
   populate the field to trace which connector instance created each evidence record.

**Verification:**
- `npx tsc --noEmit` passed
- `npm run test` passed: 9 files, 30 tests
- `npm run build` passed: 44 routes

### Previous Session (v0.9.0) — AI Onboarding Strategist

The core design principle driving this session: NexusAI should act like a senior business analyst during onboarding, not a form wizard. Every AI touch-point should reduce friction and demonstrate the system understands the business before a single document is uploaded.

**Five concrete changes shipped:**

1. `lib/services/company-detection.ts` — New `mapFocusToDashboard(intent, companyContext)` function. LLM maps user's stated priority ("blocking growth, top risks") to recommended dashboards + 3 suggested first questions + a one-sentence focus summary. Exports `FocusMapping` type.

2. `app/api/workspace/first-focus/route.ts` — New API route (POST, admin scope). Takes user intent, fetches workspace profile, builds company context, calls `mapFocusToDashboard`. Returns `FocusMapping` or 422 when LLM unavailable.

3. `app/api/ingestion/status/route.ts` — Sector-aware file classification now applies everywhere, not just in the onboarding wizard. On every file upload, the route fetches the workspace profile and passes the sector to `classifyFilename`. Caller-supplied values still win. Regulated sectors (financial_services, healthcare) get confidential defaults automatically.

4. `app/onboarding/wizard.tsx` — Three changes:
   - Step 3 (Profile): Added "Governance and Policy Defaults" panel. Shows auto-approved (75%+), pending (35–75%), quarantine (<35%) thresholds and sensitivity default. Regulated-sector callout explains elevated defaults for financial_services and healthcare.
   - Step 5 (Upload): `classifyFilename` now receives `profile.sector` instead of `""` so department/sensitivity suggestions are sector-aware from the first file pick.
   - Step 7 (Go Live): Transformed from static role cards into an AI focus intent step. User types priority, AI highlights dashboards with "Start here" badges and shows first suggested question. Clicking a recommended card passes the question as `?q=` URL param to pre-populate the Ask panel.

5. `deploy-company-context.sh` — Updated with new files and commit message.

### Previous Session (v0.8.0) — AI Company Detection

- `detectCompanyProfile(description)` — Full LLM company type inference
- `POST /api/workspace/detect-profile` — API route
- 7-step onboarding wizard rewrite (Workspace, Discover, Profile, Roles, Upload, Preview, Go Live)
- Step 2: free-text AI tab + Browse-by-sector tab with "Can't find your industry?" fallback
- Step 3: Profile confirmation with editable fields, suggested documents, KPIs, risks
- Step 4: Role selection pre-seeded from AI profile; Add Role feature for custom roles
- Step 5: Suggested document pack shown; drag-drop multi-file; AI file classification

### Previous Session (v0.7.0) — Company Context Infrastructure

- 8-sector taxonomy in `lib/domain/sector-library.ts`
- `workspaceProfiles` DB table + migration 0008
- `GET|POST /api/workspace/profile`
- `buildCompanyContext()` injected into dashboard, ask, and recommendation prompts

---

## Current Architecture State

### Core Data Flow

```
User uploads document
  → POST /api/ingestion/status
  → fetch workspace profile (sector)
  → classifyFilename(filename, sector)  [auto-department + sensitivity]
  → extractTextFromBuffer()            [PDF/DOCX/XLSX/PPTX/text]
  → ingestEvidence()                   [confidence routing: processed/pending/quarantined]
  → if processed: generateRecommendations() [fire-and-forget]
  → generateEmbedding()                [pgvector, if enabled]
```

```
User asks a question (Ask panel)
  → POST /api/ask
  → rankEvidence(): vector search → keyword fallback
  → fetch workspace profile
  → buildCompanyContext(profile)       [<300-token sector/stage/goals prefix]
  → ask(userPrompt, systemPrompt)      [Claude LLM synthesis]
  → return answer + evidenceRefs + confidence
```

```
Dashboard card render
  → GET /api/dashboard/:role
  → cardsForRole(role, workspaceId)
  → fetch profile + evidence in parallel
  → buildCompanyContext(profile)
  → generateCard() per card with company context prefix
```

### File Map (key files only)

| File | Purpose |
|---|---|
| `lib/domain/sector-library.ts` | 8-sector taxonomy, `buildCompanyContext()` |
| `lib/services/company-detection.ts` | `detectCompanyProfile()`, `classifyFilename()`, `mapFocusToDashboard()` |
| `lib/services/retrieval.ts` | Two-tier vector/keyword retrieval + LLM synthesis |
| `lib/services/dashboard.ts` | Role-card generation with company context |
| `lib/services/recommendations.ts` | Evidence-to-recommendation LLM pipeline |
| `lib/services/ingestion.ts` | Confidence routing, freshness, quarantine logic |
| `lib/data/repository.ts` | Postgres + in-memory fallback for all entities |
| `lib/api-auth.ts` | `requireScope()` — Clerk session + Bearer API key auth |
| `app/onboarding/wizard.tsx` | 7-step AI-assisted onboarding wizard |
| `app/api/workspace/detect-profile/route.ts` | AI company detection API |
| `app/api/workspace/first-focus/route.ts` | AI focus mapping API |
| `app/api/ingestion/status/route.ts` | File upload + sector-aware classification |
| `db/schema.ts` | Drizzle schema: tenants, workspaces, evidence, recommendations, decisions, approvals, audit, workspaceProfiles |

### Environment Variables Required

```
ANTHROPIC_API_KEY          Claude LLM provider
OPENAI_API_KEY             Embeddings (text-embedding-3-small)
NEXUS_VECTOR_SEARCH        "enabled" to activate pgvector path
DATABASE_URL               Neon Postgres connection string
NEXT_PUBLIC_CLERK_*        Clerk auth keys
CLERK_SECRET_KEY           Clerk server key
CLOUDFLARE_R2_*            R2 object storage (optional)
```

---

## Plan Status -- Verified 2026-06-10

| Phase | Status | Version |
|---|---|---|
| Phases 1-6 | Complete | v0.1-v0.9.0 |
| Pre-7A Technical Prep | Complete | v0.9.1 |
| Phase 7A -- Role System + Archetypes | Complete | v0.10.0-v0.10.2 |
| Phase 7B -- Agent Rooms UI | Complete | v0.10.3 |
| Phase 7C -- Production Operations | Code complete, external services pending | v0.11.0 |
| Phase 8 -- Paid Pilot Packaging | Complete | v0.12.0 |
| Phase 9D -- GTM Execution | Complete | v0.13.0 |
| Phase 7D U1 -- Readiness Assessment | Complete | v0.13.1 |
| Phase 7D U2 -- Agent Control Profiles | Complete | v0.14.0 |
| Phase 7D U3 -- Agent Output Log + Rollback | Complete | v0.14.1 |
| Phase 7D U4 -- Learning Signals | Complete | v0.15.0 |
| Demo Pack Audit | Complete | v0.15.1 |
| Phase 8A -- Decision Twin Core | Complete | v0.16.0 |
| Phase 8A -- Decision Auto-Extraction | Complete | v0.16.1 |
| Persistent Ask Conversation Memory | Complete | v0.16.2 |
| Entity Extraction Pipeline | Complete | v0.16.3 |
| Phase 2 P2-A/B/C/D AI Trust Layer | Complete | v0.17.0 |
| Executive Synthesis Layer | Complete | v0.18.0 |
| Executive Synthesis Traceability | Complete | v0.18.1 |
| Executive Synthesis Refresh/History | Complete | v0.18.2 |
| Scheduled Synthesis Core | Complete | v0.19.0 |
| Workflow Twin Primitives | Complete | v0.19.1 |
| Billing Tiers Session 1 | Complete | v0.20.0 |
| Billing Tiers Session 2 (Stripe) | Complete | v0.21.0 |
| Orchestration Dispatcher | Complete | v0.22.0 |
| Entity Pages and Backlinks | Complete | v0.23.0 |
| Slack Connector Data Flow | First inbound path complete | v0.23.0 |
| Phase 8B -- Workflow Twin Scorer | Complete locally | v0.24.0 |
| U6 Backcasting Scope Capture | Complete locally | v0.24.0 |
| U7 Shadow ROI Instrumentation | Complete locally | v0.24.0 |
| Phase 8C -- Ops Review Twin | Primitive payload shipped; richer product UI later | v0.19.1+ |
| Phase 9 -- Team Members | Build when pilot client needs it | -- |
| Google Drive Connector | Complete, committed and pushed (`2ff4c26`); needs real-OAuth-app verification | v0.25.x |
| SharePoint/Teams Connector | Complete, committed and pushed (`2ff4c26`); needs real-OAuth-app verification | v0.25.x |
| GitHub Connector | Code-complete, partial scope (per-issue, not aggregate health signals); NOT yet committed/pushed | v0.25.x |
| Jira Connector | Code-complete, partial scope (per-issue, not aggregate sprint/epic rollups); NOT yet committed/pushed | v0.25.x |
| HubSpot Connector | Code-complete, partial scope (deals only); NOT yet committed/pushed | v0.25.x |
| QuickBooks Connector | Code-complete, partial scope (invoices only, not P&L/AR/AP/balance-sheet reports); NOT yet committed/pushed | v0.25.x |
| LinkedIn Connector | Code-complete; gated on LinkedIn Community Management API partner approval; NOT yet committed/pushed | v0.25.x |
| Gmail Connector | Code-complete, reuses Google OAuth client (needs redirect-URI registration); NOT yet npm-installed/committed/pushed | v0.25.x |
| Outlook Mail Connector | Code-complete, reuses Azure AD app registration (needs redirect-URI registration); NOT yet npm-installed/committed/pushed | v0.25.x |
| IMAP Email Connector | Code-complete, first non-OAuth connector runtime; needs `npm install` for `imapflow`/`mailparser` and a real-mailbox test; NOT yet committed/pushed | v0.25.x |
| Phase 10+ | Future | -- |

## What Needs to Come Next

### Next build (highest impact)

1. **Run `npm install`/`npx tsc --noEmit`/`npm test`/`npm run build` against committed/pushed commit `2ff4c26` to verify it** (not yet done by either Ali or this session).
2. **Confirm Render deploy for commit `2ff4c26` and complete authenticated smoke.** If Render is stale, trigger manual deploy from `main`.
3. **Connector data flows -- done:** Google Drive and SharePoint/Teams connectors are built and committed (Tasks per 2026-06-25), pending real-OAuth-app verification (register an Azure AD app and a Google Cloud OAuth client, then run each install flow end-to-end). **Still open:** Jira, GitHub, CRM, finance, and social ingestion paths.

### Operational sign-off (see docs/SECURITY_REVIEW.md)

- [x] Wire Sentry for error tracking -- CLOSED 2026-06-25 (Task #32, hardened Task #37). Code-complete and ships disabled until `SENTRY_DSN` is set. Remaining: `npm install` on a machine with registry access, create a Sentry project, set the 5 Sentry env vars in Render (now listed in `CUTOVER.md` Step 2), confirm a test error lands in the dashboard.
- [ ] Set up support@nexusai.io or Freshdesk
- [ ] Verify security headers via securityheaders.com
- [ ] Run tenant isolation test
- [x] Apply migrations 0014-0020 to Neon production
- [x] Apply migrations 0021-0024 to Neon production
- [ ] Configure Render cron jobs: synthesis (daily), billing (daily), dispatch (every 2 min)
- [ ] Set Stripe env vars in Render: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PRO, STRIPE_PRICE_BUSINESS
- [ ] Register Stripe webhook endpoint: POST /api/billing/webhook

### What is ready to take to a first client today

- `/product-brief` -- public URL, share after first call
- 3x pilot SOW Word docs (fintech, professional services, digital-native)
- Demo scripts for 3 archetypes + competitor comparison
- ROI calculator + 30/60/90 review template + kickoff agenda
- `/pilot-kit` -- sponsor onboarding checklist + success scorecard
- Export Hub: weekly brief, risk radar CSV, reco register CSV, one-pager
- `/readiness` -- public AI-Native Readiness Assessment (lead gen)

---

## Notes for Next Model

- TypeScript is clean. Run `npx tsc --noEmit 2>&1 | grep -v ".next/"` to verify before shipping.
- Deploy script is `bash deploy-company-context.sh` from the `nexus-core` root.
- All API routes use `requireScope(request, scope)` from `lib/api-auth.ts`. Do not bypass it.
- `buildCompanyContext(profile)` returns an empty string if the profile is null — all LLM callers handle this gracefully.
- The in-memory store in `lib/data/store.ts` is the fallback when the DB is unavailable. Always write to both.
- Do not add new npm packages without checking `package.json` first. The dependency footprint is intentionally lean.
- Read `AGENTS.md` before editing any AI service file — it defines the trust model and approval boundaries.

---

## Continuation Prompt

```text
You are picking up NexusAI Mission Control mid-build.

Before doing anything else, read:
1. CLAUDE.md
2. HANDOVER.md  (you are reading this)
3. TASKS.md
4. BACKLOG.md
5. AGENTS.md

Current version: `origin/main` is at commit `c55417e` -- "feat: add product subdomain detection". The live Render service still needs deploy-SHA confirmation before relying on the product-subdomain layer in demos.

NOT YET COMMITTED OR PUSHED as of this writing: TWO uncommitted batches stacked in the sandbox's working tree, oldest first:
1. Session #33 (2026-06-25) -- 5 OAuth connectors: GitHub, Jira, HubSpot, QuickBooks, LinkedIn (Tasks #55-59).
2. Session #34 (2026-06-26, this session) -- the Email bundle: Gmail, Outlook Mail, IMAP Email (Tasks #63-66), built per Ali's explicit "both 1 and 2" instruction. Gmail/Outlook are `lib/connectors/{gmail,outlook-mail}.ts` + install/callback/files/ingest routes, reusing the existing Google/Azure OAuth clients. IMAP is `lib/connectors/imap.ts` + connect/files/ingest routes (no install/callback -- no OAuth), the first connector to use `imapflow`/`mailparser` instead of `fetch()`. Shared plumbing: `ALLOWED_TYPES`, `app/settings/connectors/page.tsx` (3 new catalogue entries + new `connectKind` discriminator for IMAP's inline credential form), `package.json` (`imapflow`, `mailparser`, `@types/mailparser`). Paperwork: `TASKS.md`, `BACKLOG.md`, `CHANGELOG.md`, this file.

Both batches need npm install, build verification, commit, and push together. Same sandbox constraint as every prior session: `.git/index.lock` cannot be created/removed from the sandbox due to a fuse-mount permission restriction, and the sandbox's npm registry access is blocked (403), so Ali must run all of the following from his own machine. Exact commands:

```bash
cd /Users/alijanjua/Documents/Playground/nexus-core
npm install
npx tsc --noEmit
npm run test
npm run build
```

If all four pass clean:

```bash
cd /Users/alijanjua/Documents/Playground/nexus-core
rm -f .git/index.lock
git add -A
git commit -m "Add 5 OAuth connectors (GitHub, Jira, HubSpot, QuickBooks, LinkedIn) + Email bundle (Gmail, Outlook Mail, IMAP) + shared plumbing"
git push origin main
```

Last full verification: 2026-06-17, for v0.25.0 only. Everything since then -- Tasks #35/#36/#32/#37/#19, Google Drive + SharePoint/Teams, guardrails/pilot-paperwork, the 5-connector batch, and this session's Email bundle -- has NOT been verified with `npm install`/`npx tsc --noEmit`/`npm test`/`npm run build`. Run the cycle above before committing.

New env-var/registration steps needed for the Email bundle (in addition to the 7 connectors already listed below):

| Connector | Reuses existing client? | Action required | New env vars |
|---|---|---|---|
| Gmail | Yes -- same Google Cloud OAuth client as Google Drive | Add `{NEXT_PUBLIC_APP_URL}/api/connectors/gmail/callback` to the client's authorized redirect URIs | None |
| Outlook Mail | Yes -- same Azure AD app registration as SharePoint | Add `{NEXT_PUBLIC_APP_URL}/api/connectors/outlook-mail/callback` to the app's redirect URIs | None |
| IMAP Email | No OAuth client at all | None -- credentials entered per-mailbox via the Settings UI form | None |

Protected `/knowledge` and `/api/knowledge/*` block unauthenticated curl via Clerk; use logged-in Chrome/Render for UI smoke after deploy.

Phases 1-8 + 9D complete. V1.1 Tier 1 (U1-U4) complete. U5 Workflow Twin Scorer, U6 backcasting, and U7 shadow ROI are committed in v0.24.0. Billing Tiers + Stripe full integration (v0.20.0-v0.21.0), Orchestration Dispatcher (v0.22.0), Company Memory UI, first Slack connector data flow (v0.23.0), and Connector Settings policy UX (v0.24.0) complete.
Migrations 0001-0026 applied to Neon production. `db:check` passed on 2026-06-25.

What is built: onboarding, ingestion, retrieval, 7 agent rooms, 20 role dashboards, Ask, governance (passports, output gates, learning signals), Decision Twin, entity extraction, Company Memory pages/backlinks, eval harness, Executive Synthesis, scheduled synthesis, billing tiers, Stripe, orchestration dispatcher, first Slack inbound ingestion path, Connector Settings policy UX, Workflow Twin Scorer, backcasting, shadow ROI, the v0.25.0 Knowledge Workspace, transaction-safe multi-table repository writes (Task #35), policy-driven LLM routing with fallback chains (Task #36), Sentry error tracking wired but disabled pending a DSN (Task #32/#37), Google Drive OAuth, Microsoft SharePoint/Teams OAuth, Gmail, Outlook Mail, IMAP Email, GitHub, Jira, HubSpot, QuickBooks, LinkedIn, engineering guardrails, pilot paperwork, and the product-subdomain code layer. Current `origin/main` is `c55417e`; confirm Render is deployed to `c55417e` or newer before demoing product domains.

Immediate next build:
1. Log in to Render and confirm `nexus-mission-control` deployed commit matches `c55417e` or newer; trigger manual deploy from `main` if stale.
2. Configure product domains in order: Cloudflare DNS -> Render custom domains -> Clerk allowed origins/redirect URLs.
3. Run authenticated smoke for `/knowledge`, `/workflows`, `/settings/connectors`, `/board`, and Ask note citations.
4. Run product-domain smoke for `app`, `nexus`, `quorum`, `meridian`, `vantage`, and `nucleus.pinavia.io` using `docs/PRODUCTION_HEALTH_CHECKLIST.md`.
5. Continue connector OAuth registration and live install-flow tests as needed; the code layer is broader than the external provider approvals.
   - Google Cloud OAuth client -- `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`
   - Azure AD app -- `MICROSOFT_CLIENT_ID`/`MICROSOFT_CLIENT_SECRET`/`MICROSOFT_TENANT_ID`
   - GitHub OAuth app (github.com/settings/developers) -- `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`
   - Atlassian OAuth 2.0 (3LO) app (developer.atlassian.com) -- `JIRA_CLIENT_ID`/`JIRA_CLIENT_SECRET`
   - HubSpot public app (developers.hubspot.com) -- `HUBSPOT_CLIENT_ID`/`HUBSPOT_CLIENT_SECRET`
   - Intuit app (developer.intuit.com) -- `QUICKBOOKS_CLIENT_ID`/`QUICKBOOKS_CLIENT_SECRET`/`QUICKBOOKS_ENVIRONMENT`
   - LinkedIn app (developer.linkedin.com) -- `LINKEDIN_CLIENT_ID`/`LINKEDIN_CLIENT_SECRET`, plus apply for the Community Management API product separately before expecting real post data
   - Each redirect URI: `{NEXT_PUBLIC_APP_URL}/api/connectors/{type}/callback`.
6. Scope and build the aggregate/rollup follow-up work flagged as open in `TASKS.md`/`CHANGELOG.md` for Jira (sprint/epic rollups), HubSpot (contact activity, email sequences), GitHub (CI/deployment-frequency signals), and QuickBooks (P&L/cash-flow/AR-AP-aging/balance-sheet reports).

Open design question (not yet implemented, analysis delivered to Ali, awaiting his decision): dynamic per-job model switching between deepseek-v4-pro and deepseek-v4-flash (draft-then-refine recommended) and a typed `AgentSkill` enum for ingestion-type-to-skill mapping. See Task #38.

Known missing:
- Aggregate/rollup signals for Jira, HubSpot, GitHub, QuickBooks (current scope is per-record, not the originally-specced summary signals -- see `TASKS.md`).
- Attachment extraction and thread rollups for Gmail and Outlook Mail; folder browsing beyond INBOX and attachment extraction for IMAP -- see `TASKS.md`.
- Real-OAuth-app verification for all 9 connectors now built (Google Drive, SharePoint/Teams, GitHub, Jira, HubSpot, QuickBooks, LinkedIn, Gmail, Outlook Mail) -- none tested against live credentials yet. IMAP needs a real-mailbox connection test instead (no OAuth).
- LinkedIn Community Management API partner approval -- separate from OAuth client registration, required before `files`/`ingest` return real post data.
- `npm install` has not been run anywhere for `imapflow`/`mailparser`/`@types/mailparser` -- first build attempt after install may surface type or peer-dependency issues.
- Salesforce, Xero, and Meta connectors remain entirely unbuilt.
- v0.25.0 authenticated production smoke for `/knowledge`, `/workflows`, `/settings/connectors`, and Ask note citations.
- Cron job entries in `render.yaml` (dispatch, billing, trial conversion) -- handlers exist in code, just not declared in the blueprint.

Start by confirming git status, then read the files above, then proceed.
```
