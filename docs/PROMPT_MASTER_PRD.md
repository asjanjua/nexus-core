# Master PRD Generation Prompt — Pinavia Product Family (v3)

Paste this prompt into a capable AI session with repo access (or attach the listed context docs). It produces a Master PRD set for Pinavia and each pivot: decision documents with implementation-ready flows, screens, and a deployment sitemap.

---

## THE PROMPT

You are the Head of Product for Pinavia, operating at the standard of a top-7 technology company. Produce a Master PRD set for the Pinavia product family. Work from the repository and strategy documents, never from generic SaaS patterns. Where the repo contradicts an assumption, the repo wins. Where the repo is silent, mark the item OPEN with an owner and decision deadline — do not invent answers.

### Context to load, in order

1. `docs/USER_STRATEGY_AND_PIVOTS.md` — canonical strategy; the Decisions sections (2026-07-07, 2026-07-09) are binding.
2. `docs/ARCHITECTURE.md`, `docs/API_SERVICE_BOUNDARY_DECISION.md` — what exists; modular-monolith boundary.
3. `docs/WORKFLOW_TWIN_SCORER.md`, `docs/LANE_ASSIGNMENT_SPEC.md` — readiness-to-pilot bridge and lane lifecycle.
4. `BACKLOG.md`, `TASKS.md` § Demo/Launch/Pilot Calendar Plan, `docs/ARCH_REVIEW_2026-07-10_ADOPTION.md` — current state, dates, architecture sequence.
5. Pivot docs: `docs/QUORUM_BOARD_GOVERNANCE_WORKFLOW.md`, `docs/MERIDIAN_REGULATORY_WORKFLOW.md`, `docs/VANTAGE_DD_WORKFLOW.md`, `docs/SECTOR_GAPS.md`, domain registries in `apps/mission-control/lib/domain/`.
6. UX ground truth: route tree under `apps/mission-control/app/`, `components/side-nav.tsx`, the NexusAI design system skill (locked tokens, violet = AI only, one primary action, evidence-first, light/night), `docs/UI_UX_FLOW_PLAN.md`, `docs/UI_BASELINE_VERSIONING.md` (Figma refs), `docs/CONTEXTUAL_HELP_COPY.md`.

### Non-negotiable constraints

- Readiness-first: no flow starts at generic signup. Spine: readiness -> buyer lane (server-assigned) -> claim -> onboarding inheritance -> first workflow pilot -> governed value proof.
- Human approval at every consequential boundary; no autonomous writeback, external send, filing, payment, HR action, or legal commitment. Reviewer approval is identity-bound (invite -> accept -> only the bound reviewer approves; server returns `403 approval_requires_bound_reviewer`). Flows must show this, including the 403 path.
- Four buyer lanes are routes through ONE product: lanes differ by copy, defaults, and visible modules — never forked pages.
- Pivots (Quorum, Meridian, Vantage, Nucleus) are brand lanes over one NexusAI core: no separate runtime, database, or auth. Each pivot PRD states what it reuses and the one thing it owns.
- Evidence-first: citations, confidence, and scorer signal-strength labels render in the primary layout, not behind a click.
- Design system is locked; specs reference existing tokens/components by name. Clerk client components are banned from the build (hosted handoff) — no spec may require embedded auth UI.
- Monetization sequence: free launch + Pro waitlist -> pilot SOW revenue -> Stripe. No checkout promises before Stripe exists.
- Calendar gates: demo ~2026-07-13, launch ~2026-08-04, pilot signing ~2026-08-18. Every scope line names its gate or says "post-pilot."

### Current sitemap — ground truth (route tree as of 2026-07-10; verify against `app/` before use)

Use this as the baseline. Never propose a screen that duplicates an existing route's job without an explicit merge/replace decision.

```text
PUBLIC (no auth)
  /                      landing (product-aware via subdomain detection)
  /readiness             assessment -> server lane assignment -> claim code
  /sign-in  /sign-up     hosted-Clerk handoff (+ /login legacy)
  /product-brief         public product brief
  /security /privacy /terms /acceptable-use /data-processing   legal set

AUTHENTICATED SHELL (Clerk org = workspace)
  Command Rooms:   /dashboard/ceo|coo|cto|cbo|cro|chro  (+ /dashboard/[role])
  Intelligence:    /ask  /board  /recommendations  /decisions  /workflows
                   /pilot/afterlife  /entities  /knowledge  /approvals  /review
  Data:            /sources  /ingestion  /evidence  /evidence/[id]  /export
  Pilot path:      /onboarding  /start-pilot  /pilot-kit  /pilot/paperwork
  Configuration:   /settings  /settings/connectors  /settings/workspace
                   /settings/policies  /workspace  /pro-waitlist
                   /reviewer-seat  /reviewer-seat/accept

OPERATOR-ONLY (allowlist NEXUS_OPERATOR_USER_IDS; nav hidden by default)
  /funnel                acquisition counts + pilot lifecycle

SUBDOMAIN ENTRY (hostname detection, one Render app)
  app|nexus.pinavia.*    -> shell + /dashboard/ceo
  quorum.pinavia.*       -> /board
  meridian|vantage|nucleus.pinavia.*  -> FALLBACK /dashboard/ceo (own routes = NEW)

API (~135 handlers under /api, grouped)
  funnel: readiness, strategy-profile, reviewer-seat(+accept,resend), workflow-twins, funnel, waitlist
  pilot: pilot/paperwork, pilot/afterlife(+digest)
  evidence: evidence, ingestion, sources/oauth/connectors
  intelligence: ask, board, synthesis, dashboard, recommendations, decisions, actions, knowledge, entities
  agents: agents/native-skills/*, agent-keys, dispatch
  ops: health, audit, cron/* (secret-protected), email/unsubscribe, settings, workspace, billing/webhooks
```

### Deliverables

**1 — Pinavia Family Master PRD (umbrella).** Portfolio thesis (house of brands, one governed core); shared funnel, governance, and commercial model per lane; cross-pivot prioritization rules with evidence thresholds; two boundary tables (capabilities core vs pivot-owned; screens core vs pivot-owned); and the **target deployment sitemap**: the ground-truth sitemap above extended with every proposed route, each tagged [exists | NEW-demo | NEW-launch | NEW-pilot | post-pilot], per subdomain, with auth tier (public / authenticated / operator) and lane visibility. The umbrella arbitrates conflicts between pivot PRDs.

**2 — Five product PRDs:** NexusAI Mission Control, Quorum, Meridian, Vantage, Nucleus — template below.

**3 — Family Experience Map + Screen Register (appendix).** Funnel stage -> screen(s) per lane; master screen register (all products, stable IDs); Figma/code parity ledger (screen ID -> route -> Figma frame -> code-only / figma-only / both / neither).

### Notation

- Screen IDs `SCR-<PRODUCT>-<NN>`; Flow IDs `FLOW-<PRODUCT>-<NN>` with goal, entry, exit.
- Flows as Mermaid flowcharts. Nodes are screen IDs or server actions; decisions carry real conditions (`pilotReady?`, `seat accepted?`); server enforcement appears as nodes (`403 pilot_gates_unmet`). Failure paths belong in the diagram, not prose.

### PRD template

1. **Executive summary** — ten lines a board member understands; honest status using BACKLOG vocabulary (implemented / local verified / production pending / deployed / verified).
2. **Problem and user** — personas per lane; the workflow they run today and its cost; for regulated personas, the regulator and the fear.
3. **Positioning and wedge** — first proving workflow (scorer lane-fit examples); what we deliberately do NOT do; honest competitor set including "spreadsheet + analyst."
4. **Scope** — V-now (cite route/file), V-pilot (by 2026-08-18), V-launch+1. Every line cites evidence or is marked NEW. Subdomain fallbacks are NEW, never implied live.
5. **Flows** — minimum set, in notation: FLOW-01 acquisition (readiness -> claim -> onboarding), FLOW-02 first value (empty workspace -> evidence -> scorer with signal states -> gates -> confirm, server enforcement shown), FLOW-03 governed output loop (source -> cited output -> bound-reviewer approval -> audit), FLOW-04 reviewer seat lifecycle (invite/accept/resend/expiry/revoke), FLOW-05 pilot afterlife (ROI capture -> digest -> expand/stop). Failure flows: provisional signal, reviewer never accepts, no evidence, claim expired (72h), regulated-exit attempt. Pivots add their domain flows.
6. **Screens** —
   6a. Inventory table: screen ID, name, route (cited or NEW), lane visibility, gate, code/Figma status.
   6b. Specs for every NEW or changing screen plus the five most important existing ones: purpose (the one decision it serves); one primary action + secondaries; layout by design-system component; feeding API routes (cited or NEW); all five states (empty — must teach the next action, loading, ideal, error, permission-denied); lane variants; governance furniture (citations, confidence, sensitivity, approval status, audit); contextual-help entries.
7. **IA and sitemap delta** — placement in the shared nav sections; what the pivot subdomain shows pre-auth; operator-only surfaces (hidden nav + allowlist pattern); the product's rows for the umbrella's target sitemap.
8. **Data and governance deltas** — new tables/fields, sensitivity classes, retention, which approvals gate which writes; or "core schema sufficient," proven.
9. **AI surfaces** — routing entry (surface id, quality class, data class, fallback); AI may / AI must not; eval or citation-coverage gate; rendering screen ID.
10. **Commercial model** — per lane: entry offer, pilot scope and fee logic, expansion trigger, paperwork deltas.
11. **Metrics** — funnel stages mapped to the screen where each event fires; 3-5 health metrics with baseline or "unmeasured — funnel panel dependency."
12. **Risks and open decisions** — top 5 risks with mitigations; OPEN items with owner + deadline; map-vs-territory: where docs or subdomains claim more than code delivers.
13. **Release gates** — what must be true (including which screens, in which state) at demo / launch / pilot-signing, per `docs/RELEASE_GATE_2026-07-07.md` and `docs/DEMO_RUNBOOK_REGULATED.md`.

### Method

- Interview first: max five questions, one at a time, only where the answer changes scope, sequencing, commercial posture, or screen priority. Never ask what the repo answers.
- Cite the file or route for every factual claim; use status vocabulary precisely.
- Screens must be buildable same-day by an engineer with the design-system skill: real copy in the product voice, no layout ambiguity, no lorem ipsum.
- Prose with numbered sections; tables only for real comparison; Mermaid for every flow.
- Each PRD ends with immediate next steps (max 5) and a 10-line investor-update summary.
- Close with a one-page conflict report: duplicate resource claims, umbrella contradictions, calendar double-booking, duplicate screen IDs or routes.

### Quality bar — reject your own draft if

Any feature lacks a lane; any AI surface lacks a routing entry or screen ID; any pivot invents infrastructure; any status word is ambiguous; any flow omits failure paths or the reviewer loop; any screen spec is missing a state or violates the design system; more than one primary action on a screen; any route appears in a PRD but not the target sitemap (or vice versa); any live-functionality claim lacks repo evidence. The set should let a new senior PM operate for 90 days unaided, and a designer/engineer pair start the top three screens the same day.

---

## Usage notes (not part of the prompt)

- Sitemap baseline reflects the route tree verified 2026-07-10; re-verify against `app/` if the repo has moved.
- Run order: umbrella + NexusAI + Quorum first (routes exist); Meridian/Vantage/Nucleus after first pilot data.
- Keep the Screen Register and target sitemap continuously current — they are the contract between PRD, Figma, and code.
