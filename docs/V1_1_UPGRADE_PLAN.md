# NexusAI — V1.1 Upgrade Plan (ExO-Informed)

> Sequencing decision for the upgrades drawn from the ExO 3.0 / Organizational
> Singularity material (Moonshots EP #258, May 2026). This document answers one
> question: which upgrades ship before the first signed pilot, which are
> fast-follow, and which are later.

- **Author:** Ali J
- **Status:** Decision draft, ready for build sequencing
- **Target version:** v0.14.0
- **Builds on:** v0.13.0 (Phases 1 to 9D complete, production DB migrated)
- **Companion to:** TASKS.md, NexusAI_V1_Pilot_Plan.docx, Nexus_Product_Manual.docx
- **Reassessment note:** See `docs/NEXUS_WORKFLOW_TWIN_REALIGNMENT.md` for the 2026-05-31
  decision that the first workflow twin should be the universal Decision & Action Twin, followed
  by Workflow Twin Scorer and Ops Review Twin.

---

## 1. Decision Summary

Three upgrades ship before the first pilot is signed. They are selected on two
tests only: does it get us in the door, or is it a hard requirement for a
regulated buyer's due diligence. Nothing else qualifies for Tier 1.

| Tier | Window | Items | Rationale |
| --- | --- | --- | --- |
| 1 | Before first pilot (v0.14.0) | U1, U2, U3, U4 | Lead generation plus the governance controls a bank will ask for on the first call |
| 2 | Fast-follow, during or right after first pilot (v0.15.0) | U5, U6, U7, U8 | Strengthen pilot scoping, onboarding, and proof. Most need the pilot running to be meaningful |
| 3 | Later, with company memory (Phase 12) | U9 | The compounding intelligence moat. Real, but it cannot prove itself before usage data exists |

The single most important sequencing principle: capture the learning signals
from day one (U4 is trivial), but defer the act of learning from them (U9) until
there is enough usage to make it credible. Do not sell a learning system before
it has learned anything.

---

## 2. Scope and Discipline

### 2.1 What we are adopting

The mechanics of the ExO playbook, not its rhetoric. Specifically: the on-ramp
(readiness scoring and backcasting), the governance wrapper (agent passports,
searchable logs, rollback, eval), the parallel-run delivery method, and the
learning loop as the long-term moat.

### 2.2 What we are rejecting, and why

These play well to a futurist audience and badly to a CBUAE, SAMA, or SBP-facing
buyer. They stay out of the product and out of every client-facing document.

| Rejected | Reason |
| --- | --- |
| 100x per year improvement claims | Credibility poison in regulated settings. We sell honest cycle-time and consistency gains |
| Running a company on 10 to 25 percent of staff | Toxic in GCC and Pakistan institutional sales. Triggers boards, unions, and works councils |
| Replace your SaaS and ERP stack | Frightens IT, triples the sales cycle. NexusAI sits on top of existing systems, it does not replace them |
| Org restructuring and edge spinouts | This is consulting work for the Leap Associates hat, not a product requirement |

---

## 3. The Upgrade Backlog

| ID | Upgrade | One-line definition |
| --- | --- | --- |
| U1 | AI-Native Readiness Assessment | A free public self-assessment that scores organizational drag and AI maturity and feeds a pilot proposal |
| U2 | Agent Control Profile (passport) | A per-agent profile defining allowed and forbidden data, tools, action rights, escalation triggers, and risk rating, with per-object access enforcement |
| U3 | Searchable per-agent log and granular rollback | Every agent action logged and searchable, with versioned outputs that can be rolled back when an agent drifts |
| U4 | Learning-signal capture | Log every accept, edit, and reject with a reason. Cheap to add, sets up U9 |
| U5 | Workflow Twin Candidate Scorer | A scoring tool to pick which workflow to pilot first, on frequency, pain, data readiness, risk, reusability, and speed gain |
| U6 | Backcasting onboarding step | A guided conversation that defines the AI-native end state for a function before the pilot starts |
| U7 | Shadow-mode parallel-run ROI | Run the Nexus output beside the manual process and measure the difference, instead of asserting hours saved |
| U8 | Trusted eval harness | A structured evaluation of agent outputs, fed by the U4 signals |
| U9 | Learning loop and improvement reporting | Use captured signals to tune outputs and show the sponsor the system is measurably improving |

---

## 4. Tier 1 Build Cards — Before First Pilot (v0.14.0)

### 4.1 U1 — AI-Native Readiness Assessment

- **What it is:** A public, no-login web assessment. Seven questions across organizational drag, AI as a first-class function, data readiness, workflow standardization, governance maturity, regulatory exposure, and decision-cycle speed. Outputs a 1 to 7 score per dimension, a banded overall result, and a tailored next step that routes to a pilot conversation.
- **Why it is Tier 1:** This is the cheapest customer-acquisition asset available and it lets you open a conversation with any CEO in your network without leading with a software pitch. It also qualifies hard: a company with severe organizational drag is told to fix that first, which protects delivery.
- **Effort:** Small. Mostly content and light UI on the existing public route used by `/product-brief`.
- **Dependencies:** None. Standalone public page.
- **Unblocks:** Outbound BD, top-of-funnel qualification, and a warm reason to follow up.
- **Acceptance test:** A prospect completes the assessment in under five minutes, receives a scored result, and the result includes a specific recommended next step. The submission writes a lead record to the audit log.
- **Phase mapping:** Extends Phase 9D (Go-to-Market).
- **AI responsibility note:** The assessment gives directional guidance only. It must not present its score as a regulatory or financial opinion.

### 4.2 U2 — Agent Control Profile (passport)

- **What it is:** A first-class object attached to every agent. Fields: agent name and purpose, allowed data scopes, forbidden data scopes, allowed tools and APIs, action rights (draft only, recommend, edit, never send), escalation triggers (legal interpretation, pricing claim, regulatory statement, cross-entity data), approval level, risk rating, and review cadence. Per-object access is enforced, so an agent can only ever see evidence objects it is cleared for.
- **Why it is Tier 1:** This is the one feature that converts the governance claim from a slide into a live demo, and it is what ChatGPT Enterprise, Glean, and BI tools cannot credibly show a regulator. It is the strongest single differentiator for banks and EMIs.
- **Effort:** Medium. Builds on the existing scopes, evidence sensitivity labels, and `requireScope` model. The new work is the profile schema, enforcement at the evidence-access boundary, and a settings surface to view and edit profiles.
- **Dependencies:** Existing evidence sensitivity and scope model.
- **Unblocks:** Regulated-sector due diligence, the security one-pager, and the GOVERN and ASSURE narrative in the product brief.
- **Acceptance test:** An agent configured without access to a restricted folder cannot retrieve or cite any object from that folder, and the attempt is logged. A profile change is captured in the audit trail with actor and timestamp.
- **Phase mapping:** New Phase 7D (Governance Hardening). Closes outstanding Phase 2 trust-model items.
- **AI responsibility note:** Forbidden-data rules are enforced server-side, never by prompt instruction alone.

### 4.3 U3 — Searchable per-agent log and granular rollback

- **What it is:** Every agent action recorded with input, reasoning summary, output, confidence, and the evidence used, all searchable by agent, workspace, and date. Agent outputs are versioned so a drifted or incorrect output can be rolled back to a prior version.
- **Why it is Tier 1:** Rollback is named explicitly in the ExO governance model and you do not have it today. For a regulated buyer, the ability to return to a known-good state is a control they will specifically ask about. The searchable log is the evidence that the system is auditable.
- **Effort:** Medium. The audit trail exists; this extends it to per-agent granularity and adds output versioning plus a restore action.
- **Dependencies:** U2 (passport) for the per-agent identity. Existing audit trail.
- **Unblocks:** Security review sign-off, incident response, and buyer confidence in error recovery.
- **Acceptance test:** A reviewer can search all actions by a single agent over a date range, and can roll back a specific recommendation to its previous version, with both the rollback and the prior version preserved in the log.
- **Phase mapping:** Phase 7D (Governance Hardening).
- **AI responsibility note:** Rollback never deletes history. Prior versions are retained for audit.

### 4.4 U4 — Learning-signal capture

- **What it is:** On every recommendation, capture the human decision (accept, edit, reject) and a short structured reason. No tuning yet, only capture.
- **Why it is Tier 1:** It is nearly free because the approval queue already records accept and reject. Adding the reason field and the edit signal now means the moat (U9) has clean data to work from later. Skipping this means starting the moat from zero when you finally build it.
- **Effort:** Small.
- **Dependencies:** Existing approval queue.
- **Unblocks:** U8 (eval) and U9 (learning loop).
- **Acceptance test:** Every queue decision writes a record with the decision type, an optional reason, and a link to the recommendation and its evidence.
- **Phase mapping:** Phase 7D, seeding Phase 12 (Company Memory).
- **AI responsibility note:** Captured reasons are operational metadata, not used to profile individual staff.

---

## 5. Tier 2 Build Cards — Fast-Follow (v0.15.0)

### 5.1 U5 — Workflow Twin Candidate Scorer

- **What it is:** A scoring worksheet, later a product screen, that ranks a client's workflows on frequency, pain, data readiness, automation risk, reusability across clients, and expected speed gain, to pick the first workflow to twin.
- **Why Tier 2:** It improves pilot scoping but can run as a facilitated worksheet in the first pilot before it becomes a feature. Not gating to sign.
- **Effort:** Small as a worksheet, Medium as a product feature.
- **Dependencies:** None for the worksheet version.
- **Acceptance test:** A client can rank at least five workflows and the tool returns a recommended first candidate with a defensible score.
- **Phase mapping:** Adjacent to Phase 8 (Pilot Packaging).

### 5.2 U6 — Backcasting onboarding step

- **What it is:** A guided LLM conversation in onboarding that describes what a chosen function looks like fully AI-native, then works backward to the pilot scope.
- **Why Tier 2:** A strong differentiator for onboarding, but the pilot can be sold and scoped without it.
- **Effort:** Medium.
- **Dependencies:** Existing onboarding wizard and company detection.
- **Acceptance test:** A sponsor completes a backcasting session and the output seeds the pilot scope and first dashboards.
- **Phase mapping:** Extends onboarding (Phase 5 and 9A).

### 5.3 U7 — Shadow-mode parallel-run ROI

- **What it is:** Run the Nexus output beside the existing manual process for a chosen workflow and measure the difference in time and rework, replacing self-reported hours-saved in the ROI calculator with measured results.
- **Why Tier 2:** It is the strongest renewal argument, but it only becomes meaningful once the pilot is live and a workflow is running in parallel.
- **Effort:** Medium.
- **Dependencies:** A live pilot workflow, U5 to choose it.
- **Acceptance test:** The Day 30 review shows a measured comparison, not an assumed one, for at least one workflow.
- **Phase mapping:** Extends the Phase 8 ROI and review templates.

### 5.4 U8 — Trusted eval harness

- **What it is:** A structured evaluation of agent outputs using the U4 signals, scoring accuracy, evidence coverage, and acceptance rate per agent.
- **Why Tier 2:** It builds directly on U4 and gives you a quality metric to manage agents, but it is not needed to land the first pilot.
- **Effort:** Medium.
- **Dependencies:** U4 (signal capture), U3 (logs).
- **Acceptance test:** Each agent has an evaluation score that updates as decisions accumulate.
- **Phase mapping:** Phase 7D extension.

---

## 6. Tier 3 Build Card — Later (Phase 12)

### 6.1 U9 — Learning loop and improvement reporting

- **What it is:** Use the captured signals to tune future outputs (preferred phrasing, recurring rejections, accepted reasoning patterns) and to show the sponsor a clear trend that the system is improving over time.
- **Why Tier 3:** This is the durable moat, the intelligence advantage that is hard to copy. It only compounds with usage data, so it cannot prove itself before the first pilots have run for a meaningful period.
- **Effort:** Large.
- **Dependencies:** U4, U8, and accumulated usage across pilots.
- **Acceptance test:** Over a defined period, acceptance rate rises or rework falls measurably, and the trend is visible to the sponsor.
- **Phase mapping:** Phase 12 (Company Memory).
- **AI responsibility note:** Improvement is reported at the workflow level, never as surveillance of named individuals.

---

## 7. Recommended Build Order and Immediate Next Step

Build order within Tier 1: U1 in parallel with U2, because they touch different
surfaces and different people can own them. U3 follows U2 since it needs the
per-agent identity. U4 can be done at any point in the tier because it is small
and isolated.

| Step | Item | Owner | Gate |
| --- | --- | --- | --- |
| 1 | U1 readiness assessment | Product and BD | Live before next outbound push |
| 2 | U2 agent passport | Engineering | Before any regulated demo |
| 3 | U3 logs and rollback | Engineering | Before security review sign-off |
| 4 | U4 signal capture | Engineering | Anytime in Tier 1 |

Immediate next step: confirm this Tier 1 set, then move to building U1 in full,
the seven scoring dimensions and the result-to-pilot routing, written for
regulated and consulting buyers rather than copied from the ExO scorecard.

## 8. Reassessment Addendum — Workflow Twin Sequence

After the initial V1.1 plan, NexusAI was reassessed against the broader product goal: it should
not look like a narrow consulting, legal, or regulatory tool too early. Governance remains the
Tier 1 engineering blocker, but the workflow-twin path now starts with a universal company
workflow before specialized templates.

Updated fast-follow sequence:

1. **Decision & Action Twin** — turns approved evidence into decisions, owners, risks, blockers,
   action items, recommendations, confidence, freshness, and evidence references.
2. **Workflow Twin Scorer** — helps each client choose their first Parallel Workflow Pilot.
3. **Ops Review Twin** — creates the repeatable weekly operating cadence around blockers, KPIs,
   overdue owners, process gaps, and department follow-ups.

Proposal/SOW, Regulatory Response, Agreement Review, Due Diligence, Board Memo, and PMO Tracking
remain important workflow templates, but they should follow the universal Decision & Action Twin.

Client-facing language should use practical operating terms: Strategic Mandate, Operating
Doctrine, Policy Guardrails, Human Approval Layer, Parallel Workflow Pilot, and Decision Workflow
Engine. Avoid broad 100x, workforce-replacement, and fully autonomous-company claims.

*End of document — NexusAI V1.1 Upgrade Plan (ExO-Informed)*
