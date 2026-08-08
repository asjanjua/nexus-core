# Figma <-> PRD Alignment Worklist

> **CORRECTED 2026-08-08 — §1 BELOW IS WRONG.** The "VERIFIED LIVE ... SINGLE
> page" claim is false. Read directly via `use_figma`/`figma.root.children`, the
> file contains **38 pages**, including all four recorded as missing:
> `01 Nexus System` (`0:1`), `08 Quorum UI UX Build` (`78:2`),
> `09 Quorum Governance Workflow V0.2` (`80:2`), and
> `11 Vertical Input Action Screens V0.2` (`87:2`). Frames spot-checked intact
> (`213:2`, `182:2`, `222:3` with all 17 Quorum sub-frames).
>
> The false negative came from Figma's lazy page loading: `get_metadata` with no
> nodeId returns only the loaded page, and unloaded pages report `children: 0`.
> OPEN #0 is closed — nothing was deleted, and the FIGMA-ONLY rows in §2 are
> real inventory, not missing assets.
>
> Current code-derived debt list: `docs/FIGMA_DESIGN_DEBT_2026-08-06.md`.

Status: Working alignment ledger between the Figma file, the shipped routes, and the Master PRD screen register (`docs/PROMPT_MASTER_PRD.md` Deliverable 3).
Figma file: `NcQ8F5a0hczwGwZua2gfun`.
VERIFIED LIVE via Figma MCP (W0 pass): file `NcQ8F5a0hczwGwZua2gfun` now contains a SINGLE page. The previously recorded pages (01 Nexus System, 08 Quorum UI UX Build, 09 Quorum Governance Workflow V0.2, 11 Vertical Input Action Screens) are NOT in this file — restructured, moved to another file, or deleted. Locating them is OPEN item #0.

## 1. Figma inventory (VERIFIED)

**Page `105:2` — "00 Pinavia / Executive Landing"** containing two frames:

| Frame | Node | Content | Maps to |
| --- | --- | --- | --- |
| Pinavia Executive Landing / 1440x900 | 105:3 | Above-the-fold concept: hero, evidence-in -> AI analysis -> governed decision composition, five-room family rail (Executive / Board / Submission / Deal / Engagement rooms) | `/` landing concept |
| Landing / Shipped page mirror / 1440 full-length | 153:2 | Full 9-section shipped-page mirror: governed AI layer + HeroQueryPanel (ordinary-AI vs Pinavia comparison), where-the-money-goes, **Decision Passport** (7-step: evidence -> AI draft -> caveat -> human owner -> approval gate -> audit trail -> export), operating layer, proof stats (100% sourced / 0 unapproved actions / 5 rooms), 6 USPs, differentiation, 3 regulated case studies, product family with honest status chips (NexusAI "Live core", Quorum "Live route", Meridian "Live hub", Vantage + Nucleus "Design candidate"), pilot-path CTA, footer | `/` landing (shipped mirror) |

Notable: the landing already encodes PRD-grade concepts — the Decision Passport as the governed-output loop made visual, the violet-marks-AI rule stated in the design itself ("the one signal we never reuse for decoration"), honest per-product status chips, and the pilot-path CTA matching the readiness-first funnel. The Master PRD prompt should treat the Decision Passport as a canonical flow artifact (it IS FLOW-x-03 rendered for buyers).

**Missing from this file (previously recorded, location unknown):** design-system board (01), 6 Quorum UX screens (08), 17-screen Quorum governance flow (09), 33 Meridian/Vantage vertical frames (11), Nucleus/Ask explorations.

## 2. Parity ledger — code vs Figma

Legend: BOTH = code + Figma exist · CODE-ONLY = shipped, no frame · FIGMA-ONLY = designed, no route · NEITHER = PRD-required, nothing yet.

### CODE-ONLY (shipped 2026-07-07 -> 07-09; Figma has never seen these) — highest design debt
| Screen | Route | Why it matters |
| --- | --- | --- |
| Reviewer seat management | `/reviewer-seat` | Core regulated story; demo walks it live |
| Reviewer invite accept | `/reviewer-seat/accept` | First screen an invited reviewer ever sees — brand moment, currently code-designed |
| Pilot afterlife | `/pilot/afterlife` | Sponsor value-proof surface; grows into renewal conversation |
| Pilot funnel (operator) | `/funnel` | Operator-only; lower priority |
| Pro waitlist | `/pro-waitlist` | Launch surface (~Aug 4); needs pricing-page-grade polish |
| Scorer signal labels + pilot-status card | `/workflows`, dashboards | Provisional-signal states exist in code only; Figma workflows frames predate them |
| Onboarding LaneBanner + reclassification | `/onboarding` | Governed lane checkpoint never designed in Figma |

### BOTH (verify drift, don't rebuild)
`/board` vs page 08 (code shipped after design — check delta states match); `/dashboard/ceo` + shell vs V0.1/V0.2 baselines (ledger notes batches 1-2 may need rebuild); `/readiness` (verify advisor callout + lane result states); `/ask` (recent Figma pass — check against shipped evidence pills/citations); landing `/` (subdomain brand lockups).

### FIGMA-ONLY (STATUS UNVERIFIED — these frames were not found in the main file; see OPEN #0)
17-screen Quorum governance flow (page 09); 33 vertical input/action frames (page 11) for Meridian/Vantage; Nucleus explorations. These become V-pilot / V-launch+1 / post-pilot scope lines in their PRDs — the PRD decides which get built, the rest stay explicitly parked.

### NEITHER (PRD-required, no design, no code)
Meridian/Vantage/Nucleus subdomain landing + first real route (currently `/dashboard/ceo` fallback); public Pro-interest capture on the readiness result (decision 2026-07-09); permission-denied states as designed patterns (`funnel_operator_only`, `approval_requires_bound_reviewer`); empty/cold-start states as a designed pattern family (signal `none` is the demo's teaching moment).

## 3. Work list (priority order, gate-tagged)

**W0 — Verify (PARTIALLY DONE: Figma pass complete, repo pass pending)**
0. **OPEN #0 (Ali):** locate the missing design assets — design-system board, Quorum 08/09 pages, vertical 11 page, Nucleus/Ask explorations. Are they in another Figma file, a branch, or deleted? Until answered, all FIGMA-ONLY rows in §2 are unverified and W4 items 13-15 are blocked. If deleted deliberately, the PRDs start pivot design from zero — record that as the decision.
1. ~~Re-auth Figma MCP; list pages/frames~~ DONE — see §1; only the landing page exists in `NcQ8F5a0hczwGwZua2gfun`.
2. `ls apps/mission-control/app` on Ali's machine to confirm route state (sandbox mount degraded).

**W1 — Demo gate (~2026-07-13): Figma catches up to the demo path**
3. Frame the reviewer-seat pair (`/reviewer-seat`, `/reviewer-seat/accept`) from shipped code — code-to-design, all five states, esp. accept-page signed-out state (hosted-Clerk pattern).
4. Add signal-strength states (none/weak/moderate/strong + provisional line) to the workflows recommendation frame and pilot-status card frame.
5. Frame the onboarding LaneBanner + regulated-exit confirmation states.
6. Verify `/board` frames match shipped code (drift check only).

**W2 — Launch gate (~2026-08-04): launch surfaces designed before polish-coding**
7. Pro waitlist page + Pro-interest capture on the public readiness result (design first this time — it's a conversion surface).
8. Landing/brand pass verified against subdomain lockups; night-theme coverage.
9. Empty-state pattern family: one designed pattern, applied to workflows/afterlife/knowledge/evidence cold-starts.
10. Permission-denied pattern (operator-only + bound-reviewer 403) as a design-system component.

**W3 — Pilot gate (~2026-08-18): sponsor-facing value surfaces**
11. Pilot afterlife + ROI digest email design pass (sponsor-grade, exportable).
12. Funnel operator view (low polish acceptable; operator-only).

**W4 — PRD-driven (run the Master PRD prompt first; do not build ahead of it)**
13. Quorum: PRD selects which of the 17 governance frames enter V-pilot scope; align frame names to `SCR-QRM-NN` IDs; archive the rest as parked.
14. Meridian/Vantage: PRD triages the 33 vertical frames into scope lines; no code until a subdomain route is funded.
15. Nucleus: explorations stay parked until the PRD exists.
16. Rename all active frames to Screen Register IDs (`SCR-<PRODUCT>-<NN>`) and record the frame refs in the parity ledger — Figma frame name = screen ID becomes the standing convention.

## 4. Standing rules

- The Screen Register (PRD Deliverable 3) is the single source of truth; this worklist feeds it and dies after the first full register exists.
- Code-first screens get code-to-design frames (Figma catches up); conversion and sponsor surfaces get design-first treatment.
- A Figma frame without a PRD scope line is parked inventory, not a commitment — pivots especially.
- Every new frame uses the locked design system (01 Nexus System page); violet = AI surfaces only; one primary action per frame.
