# UI V0.3 Plan — Delta after the Trust & Failure Contract

Status: Amendment to `UI_V0_3_PILOT_LIFECYCLE_FIGMA_PLAN.md` (2026-07-07).
Issued: 2026-07-29, after `VERTICAL_PRODUCT_TRUST_AND_FAILURE_CONTRACT.md` and
`NUCLEUS_ADVISORY_DELIVERY_WORKFLOW.md` landed.

The V0.3 plan is not withdrawn. Its spine, lane variants, and map-vs-territory
ledger still hold. Five things in it are now wrong or incomplete, and one of
them is already shipped and contradicting us in production.

---

## D1 — Numeric confidence is now forbidden as the primary signal (P1, shipped conflict)

The Contract states plainly: *"Numeric confidence percentages must not be the
primary user signal"*, and defines four bands — **Verified / Supported /
Limited / Blocked** — each with an explicit "not a claim that…" caveat.

The V0.3 plan contradicts this directly. Its lane table specifies
`Scorer confidence, evidence count` as the evaluator trust cue, and Frame 9 is
built around a numeric provisional signal.

This is not only a design-doc conflict. It is live:

| Surface | Current | Problem |
|---|---|---|
| `components/marketing/decision-passport.tsx` | `82% · agent-network channel unevidenced` | On the public homepage. Presents a number as the trust signal. |
| `components/ask-panel.tsx` | `Confidence: {n}% · via Ask` | Carried into the decision rationale. |
| `components/dashboard-panel.tsx` | `confidence {n}%` badge, `confPct` | Primary operator surface. |
| `components/ui/trust-drawer-trigger.tsx` | `pct = Math.round(confidence * 100)` | The shared confidence badge — the root of most of the above. |
| `trust-drawer.tsx`, `synthesis-brief.tsx`, `evidence-source-list.tsx`, `dashboard-charts.tsx` | numeric % | Secondary surfaces. |

There is **no band helper in `lib/`**. Nothing maps a confidence float to
Verified/Supported/Limited/Blocked today.

**Action, in this order:**

1. Add `lib/confidence-bands.ts` exporting the four-band mapping plus each
   band's caveat string, with the thresholds as named constants, not literals
   scattered across components.
2. Change `ConfidenceBadge` in `components/ui/trust-drawer-trigger.tsx` to
   render the band as the primary signal, with the percentage demoted to a
   title/secondary line. Most surfaces inherit the fix from this one change.
3. Update the Decision Passport's caveat stage to read `Limited` with the
   existing explanatory copy, not `82%`. It is on the homepage and it is the
   most visible contradiction of our own contract.

Rationale worth keeping: a percentage invites a buyer to treat 82% as
*probably right*. The bands force the question the product actually answers —
is this reviewed, is it merely sourced, or is the evidence thin.

---

## D2 — The reviewer "future seat affordance" is stale (P2)

V0.3 says reviewer is *"a named text field today, with a visually distinct
future reviewer seat affordance in the regulated variant only"*.

Identity-bound reviewer seats shipped in migration `0035_reviewer_seats`, with
invite, accept, and approval binding. The affordance is no longer future.

**Action:** the regulated lane variant should render the real seat state —
invited, accepted, bound, expired — not a placeholder. The open unknown in
V0.3 (*"whether the future-seat affordance implies Clerk organizations sooner
than planned"*) is resolved: it does, and it already happened.

---

## D3 — Lane trust cues must inherit the shared layer, not invent per-lane sets (P2)

V0.3 gives each lane its own ad-hoc cue list (`Light`, `Evidence + approval
trail`, `Full: sensitivity, model route, human approval boundary`).

The Contract mandates three fixed placements on **every** artefact:
provenance strip, pre-commit consequence preview, footer trust link. These are
not per-lane choices.

**Action:** rewrite the V0.3 lane table so the three placements are constant
and only their *content density* varies by lane. A lane may not omit a
placement. This also makes the frames cheaper to build, since the three
components are shared.

---

## D4 — "Empty" and "Access denied" were conflated (P2)

V0.3 Frame 5 is `empty (pre-readiness claim)`. The Contract separates two
states that must never look alike:

- **Access Denied / Scope Limited** — *"Some items are restricted by your
  access scope and are not shown. This is not the same as no evidence."*
- **Empty** — genuinely no evidence.

Collapsing them tells a restricted user that no risk exists. In a regulated
review that is the worst possible false negative.

**Action:** add a distinct Access-Denied frame to the regulated state set, and
add `Evidence Superseded` alongside it. Both are listed in the Contract as
shared components, so they are built once and reused across all four verticals.

---

## D5 — The Control-First Build Gate reorders the work (P1 for sequencing)

The Contract's closing rule: *"build the authority gate, audit event schema,
provenance strip, access-denied state, and consequence preview before its
drafting or export surface. A drafting surface cannot be marked complete while
those controls remain only in Figma."*

V0.3 has no such ordering, and current practice has run the other way — hubs
and drafting surfaces first, controls later. Meridian has a Scope arc and a
filing-pack route; it does not yet have `meridian.filing_blocked` enforcement
or the forbidden-action test the Contract names.

**Action:** before any further vertical *screen* work, land the four
forbidden-action enforcements and their audit events:

| Product | Event | Test file named in the Contract |
|---|---|---|
| Quorum | `quorum.finalisation_blocked` | `quorum-forbidden-finalisation.test.ts` |
| Meridian | `meridian.filing_blocked` | `meridian-forbidden-filing.test.ts` |
| Vantage | `vantage.decision_blocked` | `vantage-forbidden-decision.test.ts` |
| Nucleus | `nucleus.publish_blocked` | `nucleus-forbidden-publish.test.ts` |

The Contract is explicit that these are *"planned contracts, not claims that
runtime enforcement exists today"*. Until they exist, no vertical route should
be described as pilot-ready in a buyer conversation.

---

## D6 — Nucleus is no longer absent from the territory map (P3)

V0.3 does not mention Nucleus. `NUCLEUS_ADVISORY_DELIVERY_WORKFLOW.md` now
defines its arcs, screen set, brand contract, and validation boundaries, and
`/nucleus`, `/nucleus/profile`, and `/nucleus/reviewer-console` exist as
routes.

**Action:** the V0.3 ledger's "live today / candidate" split needs a Nucleus
row. Its white-label brand contract also interacts with D3: the fixed trust
placements are exactly what a firm may *not* override, which is the governance
guarantee Nucleus sells.

---

## Not changed by this delta

- The nine-stage spine and its Candidate labelling.
- Four lane variants as the frame set.
- `nexus-design-system` as the locked token source.
- The rule that no frame may imply an unbuilt route is live.

## Housekeeping found while reviewing

`docs/` contains duplicate `" 2.md"` copies of five files
(`NUCLEUS_ADVISORY_DELIVERY_WORKFLOW 2.md`,
`VERTICAL_PRODUCT_TRUST_AND_FAILURE_CONTRACT 2.md`, both red-team docs, and
`VERTICAL_PRODUCT_SCREEN_PLANS_2026-07-29 2.md`). These are sync-conflict
artefacts, not intentional versions. They should be deleted before one is
edited by mistake and two contradictory contracts end up in the repo.
