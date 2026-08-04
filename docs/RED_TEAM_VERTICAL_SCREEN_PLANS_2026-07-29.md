# Red Team Review: Vertical Product Screen Plans V1.2

Status: Design review. No live-status claims.
Reviewed artefacts: `VERTICAL_PRODUCT_SCREEN_PLANS_2026-07-29.md`, `UI_BASELINE_VERSIONING.md`, Figma board `222:2`.
Date: 2026-07-29.

## 1. Verdict

The architecture is sound. Domain-owned objects instead of a shared workflow template is the right call, and the four-part legibility rule (accountable human, evidence state, next governed action, authority boundary) is the strongest idea in the plan.

Three things will hurt you if left as-is:

1. Document drift is already live. `UI_BASELINE_VERSIONING.md` and the screen plan disagree on routes today, and the V1.2 row is missing from the Baseline Ledger.
2. The boundary statements are prose, not enforceable UI. A boundary that exists only in a design doc will not survive implementation, and will not survive a regulator or a client counsel asking "show me where the system stops".
3. There is no failure-path design. Every arc is a happy path. The screens that matter commercially are the ones where evidence is stale, the reviewer disagrees, the client disputes, or the model was wrong.

## 2. Findings by severity

### 2.1 Critical

**F1. Route drift between the two source-of-truth documents.**

| Product | Screen plan route | UI_BASELINE Route Mapping | Issue |
|---|---|---|---|
| Nucleus | `/nucleus/profile` | `/nucleus/setup` | Direct conflict |
| Meridian | `/meridian/evidence-requests`, `/review`, `/filing-handoff`, `/archive` | absent | 4 routes unmapped |
| Vantage | `/vantage/workstreams`, `/questions`, `/mitigations`, `/archive` | absent | 4 routes unmapped |
| Nucleus | `/nucleus/team`, `/delivery-plan`, `/client-questions`, `/assurance` | absent | 4 routes unmapped |

Fix: make the screen plan the single route registry and have `UI_BASELINE_VERSIONING.md` reference it rather than restate it. Duplicated tables always diverge.

**F2. V1.2 is in `Current Screen Sets` but not in the Baseline Ledger.** The ledger stops at V1.1. Your own Version Gates require a ledger row. The governance doc is failing its own gate.

**F3. No consequence preview on irreversible actions.** Chair authentication, filing handoff, IC handoff, and client publishing are all one-way doors. Nucleus lists "consequence previews" as fixed trust mechanics, but the other three products do not. Every one-way action needs a pre-commit screen showing what becomes immutable, who is named, what is disclosed, and what cannot be undone.

**F4. Authority boundaries are declared, not enforced.** "Must not file", "must not label a deal approved", "must not make minutes final automatically" are statements of intent. Add a machine-checkable list per product: named forbidden action, the UI control that prevents it, the audit event emitted on attempt, and the test that proves it. Without this, the boundary is marketing.

### 2.2 High

**F5. Missing failure and dispute screens.** Suggested additions, each low-cost and high-trust:

| Product | Missing screen | Why it matters |
|---|---|---|
| Quorum | Minutes Correction and Restatement | Boards correct minutes. Immutable-only records are unusable in practice. |
| Quorum | Evidence Withdrawal / Superseded Source | A pack goes out, the underlying figure changes. Directors must be told. |
| Meridian | Regulator Query and Response Log | Filing is not the end. Post-submission queries are the real workload. |
| Meridian | Requirement Change Watch | Regulations change mid-application. Silent staleness is your biggest liability. |
| Vantage | Evidence Contradiction View | Two sources disagree. Today this hides inside Evidence Depth. |
| Vantage | Post-Decision Learning | Close the loop between IC decision and outcome. This is your renewal argument. |
| Nucleus | Client Dispute and Escalation | A client challenges a conclusion. Where does that live? |
| Nucleus | Engagement Closeout and Data Return | Contractual and PDPL/GDPR relevant. |
| All | Access Denied / Scope Limited state | Evidence exists but this user cannot see it. Must be distinguishable from "no evidence". |

The Access Denied case is the most important. Conflating "you may not see this" with "this does not exist" is a correctness bug in a governance product.

**F6. Evidence contract has no expiry semantics.** You carry source, freshness, confidence, access scope, provenance, and caveats. You do not carry validity period, supersession pointer, or a rule for what happens when an evidence item expires after a pack was issued. Add `valid_until`, `superseded_by`, and a downstream impact view.

**F7. Quorum is at 17 screens and Meridian, Vantage, Nucleus are at 12 each.** That symmetry looks designed rather than derived. Meridian in particular is under-screened relative to real filing workloads. Do not defend 12 for its own sake.

**F8. No mobile or read-only executive surface.** Every ledger entry says 1440x900 desktop. Directors read board packs on iPads and phones. Chairs approve on the move. At minimum, define a responsive read-and-comment surface for Quorum pre-read, Vantage IC memo, and Nucleus client portal. Flag full mobile as out of scope explicitly, in writing.

**F9. Nucleus white-label creates an accountability ambiguity.** If the client sees the partner firm's brand and something is wrong, who is accountable? The screen plan says the firm is responsible, but the client-facing surface must carry a persistent, non-overridable "powered by, delivered by" attribution and a fixed trust footer. Put it in the fixed mechanics list.

### 2.3 Medium

**F10. Confidence display is unspecified.** "Transparent confidence" is not a design. Pick one scheme, define its bands, define what a user may and may not infer from it, and use it identically across all four products. Numeric percentages imply precision you do not have. Prefer three or four named bands with written definitions.

**F11. Build order does not gate on control screens.** The Family Build Order says add review/handoff before exports, which is right, but the per-product build orders put review and handoff late. Invert this. Build the boundary and the audit event before the drafting surface, so the drafting surface cannot ship without them.

**F12. No cross-product evidence-sharing rule.** All four products sit on the same Nexus Core. Can a Vantage diligence finding surface in a Quorum board pack? Legally and commercially this needs an explicit answer with a UI. Silence here becomes a data-segregation incident.

**F13. Retention and deletion are absent.** Archive screens exist in Meridian, Vantage, and Nucleus. None of them state retention period, legal-hold behaviour, deletion request handling, or export-on-exit. This is directly in scope for PDPL, GDPR, and most client MSAs.

**F14. Agent and automation visibility is not on any screen.** If agents draft, the user must see which agent, which model class, what it read, and when. Add a per-artefact provenance strip.

## 3. Trust, privacy and AI disclosure layer

Add one shared, light-touch layer across all 53 screens. Light means present and readable, never a modal, never a wall of legal text.

### 3.1 Three placements only

| Placement | What it carries | Weight |
|---|---|---|
| Artefact-level chip | AI-assisted / Human-authored / Human-reviewed, plus source count | One line, always visible on any generated artefact |
| Pre-commit panel | On irreversible actions only: named human, what becomes fixed, what is disclosed, unresolved caveats | Appears once, at the gate |
| Footer trust link | Data handling, model use, retention, subprocessors, human-authority statement | Persistent, quiet, one click |

### 3.2 Standard microcopy

Use these exact strings so language does not drift across products.

- AI assistance: "Drafted with AI assistance from the listed sources. Not verified until a named reviewer approves."
- Human authority: "This action is recorded against you as the accountable person."
- Boundary: "Pinavia does not file, sign, approve, or certify. Authorized humans do."
- Evidence limits: "Coverage reflects sources connected to this workspace. Absence of a finding is not assurance."
- Access scope: "Some items are restricted by your access scope and are not shown. This is not the same as no evidence."
- Freshness: "Sources checked {date}. Regulations and figures may have changed since."
- Data handling: "Your evidence stays in your workspace. It is not used to train models."

Only publish the last line if it is true of every model path in use, including any third-party API. Verify before shipping it.

### 3.3 Per-product accent

| Product | Additional standing disclosure |
|---|---|
| Quorum | "Prepared for the board. Legal validity, adoption, and authentication remain with the chair, secretary, and counsel." |
| Meridian | "Not regulatory or legal advice. Submission requires an authorized filer." |
| Vantage | "Not investment advice. Coverage is not a recommendation and is not a clean bill of health." |
| Nucleus | "Delivered by {firm}. Recommendations and client-facing conclusions are the firm's, not the platform's." |

### 3.4 Security and privacy cues that belong on-screen

Keep to what a user can act on: access scope of the current view, who else can see this artefact, whether the item contains classified or personal data, and export controls with watermark and recipient logging. Everything else goes in the trust link.

## 4. Design system checks

- One primary action per screen. Fifty-three screens is where that rule breaks first, especially Board Pack Builder and IC Memo Builder.
- The violet AI rule must apply to every generated element, including generated table cells and generated summary lines, not just panels.
- Evidence-first means a citation is reachable in one click from any assertion. Test this on the memo builders specifically.
- Empty states must state the reason and the next action, not just "no data".
- Accessibility is unproven. Contrast, focus order, and keyboard paths for approval actions are approval-critical. Do not ship a governance gate that is mouse-only.

## 5. Recommended screen count after fixes

| Product | Now | Add | Proposed |
|---|---:|---:|---:|
| Quorum | 17 | 2 | 19 |
| Meridian | 12 | 2 | 14 |
| Vantage | 12 | 2 | 14 |
| Nucleus | 12 | 2 | 14 |
| Shared states | 0 | 4 | 4 |
| Total | 53 | 12 | 65 |

Shared states: Access Denied / Scope Limited, Evidence Superseded, Agent Provenance strip, Consequence Preview. Build these once as components, not per product.

## 6. Immediate next steps

1. Fix the route conflict. Decide `/nucleus/profile` or `/nucleus/setup`, then delete the duplicate route table from `UI_BASELINE_VERSIONING.md` and point it at the screen plan.
2. Add the V1.2 row to the Baseline Ledger today. Your own gate is failing.
3. Write the forbidden-action matrix: four products, named forbidden acts, blocking control, audit event, test name. One table, one page.
4. Design the four shared components before any new product screen. They unblock twelve findings at once.
5. Add the twelve missing screens to the Figma board as titled placeholders with the four legibility elements filled in. Placeholders prevent the plan from silently being read as complete.
6. Verify the "not used to train models" claim against every model path before that string appears in any UI.
7. Decide the cross-product evidence-sharing rule and write it into the screen plan under Shared Delivery Rules.
