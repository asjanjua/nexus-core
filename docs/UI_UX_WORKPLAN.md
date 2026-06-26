# NexusAI UI/UX Workplan

Updated: 2026-06-25 (rev 4, Lime reinstated as Pinavia brand accent)
Status: Active
Figma file: https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun
Related: UI_UX_FLOW_PLAN.md, UI_UX_EXPERT_REVIEW_2026-06-16.md, NexusAI_Design_Philosophy v1.2

> Rev 2 note: Figma Desktop App MCP write access is confirmed working and screens have shipped through it, so the write-access risk is closed. This revision converts the planned write-access check into a stability and file-state check, declares a single token source of truth, elevates the Mode Indicator to an explicit design task, resequences states ahead of code, adds an external review gate, guardrails the Mission Health Score, and tracks the deployment-model UI. Scope remains core product; pivots and deployment models are tracked as a stub in Phase 7.
>
> Rev 3 note: patched six findings from Queen's review of rev 2. Phase 2 estimate recalibrated bottom-up to ~10 hours; Phase 4 state design raised to ~4 hours with a scope-down fallback; Review Gate A now requires a named non-builder reviewer with defined criteria; grayscale-first gate (§5.1) added to the Phase 2 method; Figma version-snapshot and rollback added to the Phase 1.4 variable push; and the Lime token aligned to Design Philosophy §4.1 (now declared the token authority). Lime is resolved: dropped per Ali's decision, palette locked at nine tokens (matches Design Philosophy v1.3). One open decision remains before Phase 2 closes: name the Gate A reviewer.

---

## 1. MCP Capability Assessment (Verified 2026-06-25)

### What we actually have connected

The Figma MCP connected to this workspace is the **official Figma MCP with Plugin API access**, not Framelink. This is a critical distinction.

| Capability | Tool | Direction |
|---|---|---|
| Create/edit screens, frames, components | `use_figma` (Plugin API JS) | **Write** |
| Create new Figma files | `create_new_file` | **Write** |
| Upload images/assets into Figma | `upload_assets` | **Write** |
| Generate FigJam diagrams | `generate_diagram` | **Write** |
| Read design context + reference code | `get_design_context` | Read |
| Screenshot any node | `get_screenshot` | Read |
| Read variables/tokens | `get_variable_defs` | Read |
| Read libraries | `get_libraries` | Read |
| Map nodes to code components | `add_code_connect_map` | Write |

### What this means

The workflow is **bidirectional**. Claude can both write designs into Figma AND read them back out as code. This is significantly more powerful than the Framelink read-only model (which only supports `get_figma_data` and `download_figma_images`).

### Code Connect status (Step 5, 2026-06-26)

**Blocked on plan tier — confirmed, not a workaround.** `send_code_connect_mappings` / `add_code_connect_map` require a Dev or Full seat on a Figma **Organization or Enterprise** plan. Ali's teams are pro and starter (`whoami` confirmed); Ali has decided not to upgrade. The bidirectional design-to-code loop above still works in full (write, read, screenshot, design-context) — only the live Code Connect linking step is unavailable. The six locked signature patterns are mapped manually below instead, which is audit-equivalent even without the live Figma integration.

File: `NcQ8F5a0hczwGwZua2gfun` ("Nexus-Mission-Control-Base-UI-UX"), page "06 V0.2 Full Desktop Prototype" (node `44:2`).

| Pattern | Figma node (representative) | Code component |
|---|---|---|
| Trust Drawer | `44:299` ("Card / Trust drawer preview") | `apps/mission-control/components/ui/trust-drawer-trigger.tsx`, `components/trust-drawer.tsx`, `lib/trust-drawer-context.tsx` |
| Approval Consequence Preview | `44:304` ("Card / Approval consequence") | `apps/mission-control/components/ui/consequence-preview.tsx` (+ `useConsequencePreview` hook) |
| Now / Next strip | `44:102` / `44:105` ("Chip / Now", "Chip / Next gate") | `apps/mission-control/components/ui/now-next-strip.tsx` |
| Mode Indicator | `54:2` ("Card / Mode indicator" — built this session, did not previously exist in this page) | `apps/mission-control/lib/mode-context.tsx` (`ModeIndicator`) |
| Nav Health Badges | `54:25` ("Card / Nav health badges" — built this session) | `apps/mission-control/components/side-nav.tsx` (`NavBadge`, `badgeFor`) |
| Passport Drift Warning | `54:48` ("Card / Passport drift warning" — built this session) | `apps/mission-control/app/settings/page.tsx` (Agent Governance tab, `hasDrifted` block) |

Note on instancing: every repeated card on page `44:2` (Trust Drawer, Approval Consequence, etc.) is a **duplicated plain frame, not a true Figma component instance** — confirmed via metadata search (zero `<component>` tags in the subtree). One mapping per pattern documents the correspondence; it does not cascade to all ~30 per-screen copies the way a real component/instance relationship would. Converting these into genuine main components + instances is follow-on work, not done here.

### Queen's Review findings (still valid)

The Queen's Veracity Analysis of 2026-06-25 correctly identified:

1. **Framelink MCP is read-only.** True. But our connected MCP is not Framelink.
2. **Figma REST API has no write endpoints for design elements.** True. Our MCP uses the Plugin API, which does have write access.
3. **Figma Config 2026 Design Agent is native to Figma, not controllable via MCP.** True. Design Agent is a separate capability. Our MCP write access is through Plugin API code execution, which is a different mechanism.

### Corrected workflow

```
Design tokens (code) ─► use_figma (Plugin API) ─► Figma canvas
                                                       │
Figma canvas ─► get_design_context ─► Claude ─► React/Next.js code
                                                       │
React components ─► add_code_connect_map ─► Figma Code Connect
```

This is a full design-to-code AND code-to-design loop.

---

## 2. Current State

### Figma file

Page "01 Nexus System" contains the design system board: 10 color tokens, component starter set (buttons, badges, stat cards, room cards), and 4 UX principles.

The screen designs from Batches 1-2 (7 screens) were previously created on page "02 Nexus v1 Consulting Screens" per the flow plan. Current file structure shows only the system board page. Screens may need to be rebuilt or are on a branch/version.

### Design system tokens

**Authority:** Design Philosophy v1.5 §4.1 is the authoritative token list. This local table is a restatement and is superseded by the philosophy doc on any conflict. Phase 1 codifies from the philosophy doc, not from this table.

| Token | Hex | Usage |
|---|---|---|
| Ink | #0B1020 | Sidebar, high-trust dark surfaces |
| Slate | #243044 | Secondary navigation |
| Mist | #F5F7FA | App background |
| White | #FFFFFF | Main panels |
| Signal | #147B58 | Live, verified, success (status) |
| Violet | #7A3FF2 | AI-generated, autonomy (the prized accent; never decorative) |
| Data Blue | #1D5FD1 | Evidence, metrics |
| Warning | #C98200 | Approval, human review |
| Critical | #B42318 | High risk, blocked |
| Lime | #86BC25 | Pinavia brand accent (level-2 brand token); brand and activation only, never status |

> **RESOLVED (rev 4, Ali's decision): Lime (#86BC25) is reinstated as the Pinavia brand accent.** Nine semantic status tokens above, plus Lime as a level-2 Pinavia brand token (Design Philosophy v1.5 §4.1 and §10.5). Lime is used for brand and activation moments only and never signals operating status, so it does not compete with Signal green in the command surfaces. Codify the nine status tokens in level 1 and Lime in level 2.

### Expert review status

9 findings documented in UI_UX_EXPERT_REVIEW_2026-06-16.md: 3 P1 (action hierarchy, trust evidence, approval consequences), 4 P2 (time orientation, nav badges, passport versioning, empty states), 2 P3 (scan affordances, accessibility). 8 mini features proposed.

---

## 3. Workplan

> Timing note: the per-phase hour figures below are planning placeholders. Recalibrate them from real throughput now that screens have shipped through the Desktop App MCP. Use measured time-per-frame from work already done, not these round numbers. Design-to-code (Phase 5) stays assistive, not automatic, until one screen is generated and adapted end to end.
>
> Rev 3: where no measured throughput exists yet, conservative bottom-up estimates have replaced the old round numbers (Phase 2 and Phase 4 below). The first action of any phase with an estimate is to confirm or replace it from real data. Estimates account for the save-and-verify overhead (Phase 0.2) and a rework buffer for frames that fail to render.

### Phase 0: Stability and File-State Check (Session 0, ~30 min)

**Goal:** Confirm the ground before committing to rebuild estimates, and lock the operating pattern that protects against mid-write disconnects.

0.1. Run `get_metadata` on the Figma file and confirm exactly which pages and screens currently exist. The plan must not estimate a rebuild against an unconfirmed file state.
0.2. Establish the **save-and-verify pattern** as a standing rule for every write session: after each frame or component is created via `use_figma`, immediately `get_screenshot` to confirm it rendered, before moving to the next. If the Desktop App MCP disconnects mid-write, this caps lost work at one frame.
0.3. Declare the **single token source of truth** before any token work (see Phase 1). Bidirectional write means tokens can be written to both Tailwind and Figma; without one authoritative side they will drift within two sessions.
0.4. Confirm the Desktop App is running and the MCP connection is live at the start of each session; treat a dropped connection as a stop-and-reconnect event, not a retry-blindly event.

**Deliverable:** Verified file state, a written save-and-verify rule, and a declared token source of truth. Gates all later phases.

### Phase 1: Design System Codification (Session 1, ~2 hours)

**Goal:** Lock the Tailwind config and Figma variables so every screen and component uses the same tokens, from one authoritative source.

**Source of truth (load-bearing):** The codebase Tailwind config is the single source of truth for tokens. Figma variables are generated to match it, never the reverse. Any token change starts in code and is pushed to Figma in the same session. This is the rule that prevents the drift that bidirectional write otherwise guarantees.

1.1. Read current Figma variables via `get_variable_defs` to confirm what exists and where it already diverges from code.
1.2. Create/update Tailwind config in the codebase with all design tokens (colors, spacing per the fixed scale, the type ramp, shadows per the fixed elevation set, radii). This is the authoritative definition.
1.3. **Split tokens into three levels** (per Design Philosophy v1.4 §10.5 and Pinavia_Brand_and_Domain_Architecture.md). Level 1, core tokens (structure, spacing, type ramp, elevation, semantic status colours including the violet AI accent), fixed across all products and deployments. Level 2, Pinavia brand tokens (logo, primary brand colour, typeface), the parent identity applied to core and all pivots. Level 3, white-label override, a full replacement of the Pinavia brand layer with a client firm's identity, for Nucleus deployments. Re-skinning may only touch levels 2 and 3; level 1 stays locked. Build all three levels now even though pivots are out of scope, or it gets retrofitted at higher cost.
1.4. Push matching variables into Figma via `use_figma` so Figma mirrors the code definition. **Snapshot and rollback (variable pushes are not covered by the per-frame save-and-verify rule):** before pushing, save a named version in Figma's version history. After pushing, verify every variable via `get_variable_defs`. If the push fails or disconnects mid-operation, revert to the named version rather than leaving Figma half-updated. Codify the nine status tokens in level 1 and Lime as a level-2 Pinavia brand token (resolved rev 4).
1.5. Create shared Figma components for: buttons (primary, secondary, ghost, destructive), badges (status, count, confidence), cards (room, stat, agent), nav items, table rows.
1.6. Verify round-trip: `get_design_context` on a component returns code that uses the correct Tailwind classes.

**Deliverable:** Locked design system with code as source of truth, a three-level token split (core, Pinavia brand, white-label override), and Figma mirroring code.

### Phase 2: Screen Rebuild and Completion (~10 hours / ~5 sessions, confirm from real throughput first)

**Goal:** All 15 screens from the flow plan exist in Figma with expert review fixes applied.

> Estimate basis (replaces the old "~6 hours"): 30 min per screen x 15 screens, plus 30 min for the four-state Mode Indicator design (2.11a is a design task, not a frame-generation task), plus a 20% rework buffer for frames that fail to render under the save-and-verify rule. Net ~10 hours. First action of this phase: if measured time-per-frame exists from screens already shipped, replace this estimate with it.

**Batch 1-2 Rebuild** (if screens are missing from current file):

2.1. Executive Command Center (with P1 primary action fix, nav badges)
2.2. Agent Control Profile (with P2 passport version/owner)
2.3. Workflow Twin Run (with P2 Now/Next strip, time orientation)
2.4. Mission Creation (with primary action: "Launch guarded run")
2.5. Mission Run Detail (with Now/Next strip, gate status)
2.6. Evidence Room (with Trust Drawer pattern)
2.7. Approval Inbox (with P1 consequence preview)

**Batch 3 (new):**

2.8. Risk and Audit Dashboard
2.9. Integration Hub
2.10. Integration Detail
2.11. Governance Settings
2.11a. **Mode Indicator (Design Philosophy Pillar 3.6) — designed explicitly, not deferred to code.** A persistent, shared component designed in Figma with its four states: cloud storage and cloud model; desktop plus cloud; local-first (stored on device, model cloud or local); and on-prem (nothing leaves your premises). Each state visually distinct, never overstated. This is the strongest trust signal for regulated buyers and must exist as a design object before Phase 5 wires it. Replaces the previous treatment as a Phase 4 code-only concern.

**Batch 4 (new):**

2.12. User and Role Management
2.13. Onboarding: Company Setup
2.14. Onboarding: First Mission Template
2.15. Audit Export / Executive Pack

**Method:** For each screen, Claude writes Plugin API JavaScript via `use_figma` that creates the frame layout, applies design tokens, and populates with realistic NexusAI data. Expert review findings are baked in from the start (not retrofitted).

**Grayscale-first gate (Design Philosophy §5.1, previously missing):** build and resolve each screen's structure in grayscale before the colour system is applied. If the layout does not read in black, white, and grey, fix the structure before adding tokens; colour will not rescue a weak layout. Screenshot the grayscale version via `get_screenshot` as the gate artifact, then apply colour and depth. This is what makes the §9 checklist item "Did the screen pass the grayscale gate?" answerable at Review Gate A and Phase 6.

**Deliverable:** Complete Figma prototype covering all 10 product flows.

### Review Gate A: External Eyes (after Phase 2, ~30 min)

**Goal:** Catch direction errors before they are carried into mini features, states, and code.

**Who reviews (the gate is ceremony without a real person):** Ali is the founder and sole developer, and Claude is the builder, so Ali reviewing Claude's output is still self-review for the judgment-call checklist items (for example "would a risk officer find this more reassuring than a spreadsheet"). The reviewer must be someone other than Ali and Claude who meets these minimum criteria:
- Has NOT seen the screens during construction.
- Has context on the regulated-buyer profile (fintech, banking, compliance).
- Is willing to say plainly "this does not work."

Acceptable reviewers: a Leap associate, a trusted advisor, or a pilot prospect. **Name the reviewer before Phase 2 completes.** If genuinely no qualified person is available, the honest fallback is a structured cold-eyes pass where Ali reviews against the §9 checklist after at least a 24-hour gap from construction, explicitly noting that this is weaker than a true external review.

- The named reviewer walks the full Figma prototype.
- Run every screen against the 8-point screen checklist in Design Philosophy §9, including the grayscale-gate item. Log gaps; do not proceed with unresolved P1-level checklist failures.

**Deliverable:** A short gap list and the reviewer's name on record. Phases 3 onward only start once it is cleared.

### Phase 3: Expert Review Mini Features (Session 5, ~2 hours)

**Goal:** Build the 4 highest-impact mini features as Figma components and interaction patterns.

3.1. Trust Drawer: reusable slide-over showing evidence sources, freshness, confidence, sensitivity, last review, audit events.
3.2. Approval Consequence Preview: consequence section showing if-approved/if-rejected/if-changed outcomes.
3.3. Command Palette: keyboard-first action launcher overlay.
3.4. Mission Health Score: single composite metric card. **Guardrail (Design Philosophy Section 8, not a BI tool):** the score is only allowed if it is evidence-backed and drills down to its inputs on click. A composite number with no traceable inputs is exactly the vanity metric the philosophy forbids. If it cannot drill down to evidence, cut it.

**Deliverable:** Mini feature components in Figma, ready for code generation.

### Phase 4: State Design — Empty/Loading/Error (~4 hours / 2 sessions)

**Goal:** Design the non-happy-path states in Figma BEFORE any code is generated. This sequencing is deliberate and follows Design Philosophy Sections 5.4 and 7: design the unhappy states first so the prototype, and the code generated from it, accounts for them. Generating happy-path code first (the previous order) means tearing it up to retrofit states.

> Estimate basis (replaces the old "~2 hours"): this covers at least 9 distinct, screen-specific state designs. "Connector disconnected" on Integration Hub needs different treatment from "no evidence" on Evidence Room; these are not generic. At a realistic ~15-20 min each plus realistic copy and an actionable CTA per state, this is a ~4 hour task, not 2. **Scope-down option if time is tight:** design the 3 highest-impact states (no evidence, connector disconnected, offline) across the 5 highest-traffic screens first, and defer the rest to a follow-on pass rather than rushing all 9 thin.

4.1. Design empty states in Figma for: no missions, no evidence connected, no approvals, connector disconnected, evidence below confidence threshold, and the on-prem/local offline state from Pillar 3.6.
4.2. Design loading and partial-ingestion states (show what is ready versus still processing, not a blank wait).
4.3. Design error-recovery patterns, distinguishing a benign "optional cloud feature unreachable" from a genuine local error.
4.4. Each state gets an actionable next step, never a dead end.

**Deliverable:** Complete state designs in Figma, so the prototype shown at Review Gate A is extended to cover real conditions before code begins.

### Phase 5: Design-to-Code Generation (Sessions 7-9, time TBD — recalibrate)

**Goal:** Generate production React/Next.js components from the Figma designs, now including states.

> Estimate caution: the previous "~6 hours for 15 screens" is not credible until proven. Generate and fully adapt ONE screen end to end first, measure it, then estimate the rest from that number.

5.1. For each screen, call `get_design_context` to extract reference code and screenshots.
5.2. Adapt reference code to the NexusAI stack: Next.js 15 App Router, Tailwind, shadcn/ui conventions. Treat reference code as a starting point, not final output.
5.3. Create React components in `apps/mission-control/components/ui/` for shared design system pieces, including the empty/loading/error states from Phase 4.
5.4. Create page layouts in `apps/mission-control/app/` for each product flow.
5.5. Wire Code Connect mappings via `add_code_connect_map` so Figma nodes link to React components.
5.6. Implement the Mode Indicator (designed in Phase 2.11a) as a context/provider applied across all screens.

**Deliverable:** Coded UI shell matching the Figma prototype, states included. Not wired to APIs yet, but structurally complete.

### Phase 6: Verification and Polish (Session 10, ~2 hours)

6.1. Screenshot every Figma screen via `get_screenshot` and verify visual consistency.
6.2. Run accessibility check: contrast ratios, touch targets, color-only indicators.
6.3. Verify all Tailwind tokens match Figma variables (no drift).
6.4. Review Code Connect mappings are complete.
6.5. Update UI_UX_FLOW_PLAN.md with final state.

**Deliverable:** Verified, consistent design system with full Figma-to-code traceability.

> Add to Phase 6: run the full 8-point screen checklist from Design Philosophy Section 9 against every coded screen, not just the contrast check, and confirm the three-level token split from Phase 1.3 still holds.

### Phase 7: Deployment-Model and Pivot UI (stub, scheduled later)

**Goal:** Track, but not yet build, the Section 10 and 11 surfaces from Design Philosophy v1.2 so they are not forgotten and not foreclosed by earlier decisions.

This phase is intentionally a placeholder. The core-product sprint (Phases 0-6) must not block on it, but Phase 1's token split and Phase 2.11a's Mode Indicator are the hooks that keep it cheap to build later. Scope when prioritised:

7.1. Desktop shell surfaces (Tauri): native window chrome continuous with the Ink nav, app menu, system tray, deep links.
7.2. Local-first setup flows: license-key unlock, local-model endpoint detection and setup, enterprise config to pin endpoint and lock cloud off.
7.3. The four pivots (Quorum, Meridian, Vantage, Nucleus): per Section 10.2, change only lead buyer language, primary action, and lead evidence; reuse everything else. Nucleus exercises the level-3 white-label override from Phase 1.3.
7.4. Funnel and upgrade moments (Section 11.5): designed, restrained upgrade prompts tied to felt value; on-prem framed as the premium destination, not the free app with a price tag.

**Deliverable:** A scoped backlog, not built work. Prevents the strategy in v1.2 from silently falling out of the plan.

---

## 4. Dependencies and Constraints

| Dependency | Status | Impact |
|---|---|---|
| Figma MCP Plugin API access | Connected and verified | Unblocked |
| Design tokens in Tailwind config | Partial (colors defined in flow plan, not in tailwind.config) | Phase 1 resolves |
| Expert review findings | Documented, not applied | Phase 2-3 resolve |
| Mode Indicator architecture | Designed in ENGINEERING_GUARDRAILS.md, not built | Designed in Figma at Phase 2.11a, implemented at Phase 5.6 |
| LLM routing wiring | Infrastructure task, not UI dependent | No impact on UI work |
| render.yaml cron entries | Infrastructure task, not UI dependent | No impact on UI work |

---

## 5. What This Does NOT Cover

This workplan covers design and UI shell generation. It does NOT cover:

- API wiring (connecting React components to existing API routes)
- Backend changes (all APIs already exist)
- Infrastructure upgrades (Render, Neon tier changes)
- LLM routing or cron entry fixes (separate infrastructure tasks)
- Figma Design Agent usage (native to Figma, not MCP-controllable)
- Mobile/responsive design (deferred to Tauri Mobile phase)
- Building the deployment-model and pivot UI (tracked as a stub in Phase 7, not built in this sprint)

---

## 6. Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Desktop App MCP disconnects mid-write (dominant operational risk)** | **High** (observed, not hypothetical: multiple MCP servers have dropped mid-session) | Phase 0 save-and-verify caps per-frame loss; but session productivity loss remains, so keep sessions short and checkpoint often |
| Generated code needs significant manual adjustment | **High** | Prove one screen end to end before estimating the rest; treat reference code as a start, not final output |
| **Phase 4 state design under-estimated** | **High** | Most under-budgeted phase; estimate raised to ~4 hours with a scope-down fallback (3 states x 5 screens) |
| **Review Gate A becomes ceremonial without a named reviewer** | Medium | Name a real non-builder reviewer before Phase 2 completes, or use the 24-hour cold-eyes fallback explicitly marked as weaker |
| Design token drift between Figma and code | Medium | Code is the single source of truth (Phase 1); changes start in code and push to Figma same session; Phase 6 verifies |
| Plugin API rate limits or execution caps | Medium | Batch operations, test with small frames first |
| Figma file structure doesn't match expectations | Low | Resolved by Phase 0 `get_metadata` check before any estimate is trusted |
| Scope drifts back to core-only and v1.2 strategy is lost | Medium | Phase 7 stub plus Phase 1 brand-token layer keep pivots and deployment models tracked and cheap to build later |

---

## 7. Immediate Next Steps

1. Run Phase 0 first: confirm file state via `get_metadata`, write down the save-and-verify rule, and declare code as the token source of truth. This gates the rebuild estimate.
2. Start Phase 1: lock the Tailwind config as source of truth, split tokens into core and brand layers, then mirror to Figma.
3. Build Batch 3 screens using `use_figma` with expert review fixes baked in, and design the Mode Indicator (2.11a) explicitly.
4. Hold Review Gate A with a non-builder before any mini features, states, or code.
5. Design states (Phase 4) before generating code (Phase 5). Prove one screen end to end before estimating the rest.
6. Keep Phase 7 (deployment models, pivots) as a tracked stub; do not let it block the core sprint, but do not let it disappear either.

**Decisions status:**
- Lime token: RESOLVED (rev 4). Reinstated as the Pinavia brand accent, a level-2 brand token used for brand and activation only, never status (Design Philosophy v1.5 §4.1, §10.5).
- Review Gate A reviewer: OPEN. Name a non-builder with regulated-buyer context before Phase 2 closes, or commit to the explicitly-weaker 24-hour cold-eyes fallback.
