# NexusAI PRD

Status: launch-priority product | Owner: Product + Engineering | Updated: 2026-08-02

## 1. Executive summary

1. NexusAI is Pinavia’s governed executive-intelligence core for owners, sponsors, and regulated teams.
2. It begins with readiness, not generic signup (`docs/USER_STRATEGY_AND_PIVOTS.md`).
3. Its first proof is a source-backed brief or selected workflow with a named human reviewer.
4. It wins by preserving evidence, confidence, sensitivity, and authority boundaries in one workspace.
5. It is not a system of record, autonomous agent, or decision-maker.
6. Readiness/lane profiles, reviewer seats, workflow scoring, pilot outcomes, approvals, and evidence are implemented in schema/routes.
7. Public readiness and start-pilot routes are deployed per `HANDOVER.md`.
8. Signed-in mutable flow and deployment-SHA confirmation remain production-pending / observation gaps where handover says so.
9. Public launch target is 2026-09-01; pilot signing target is OPEN, currently 2026-09-15.
10. Commercial sequence is waitlist, paid SOW pilot, then Stripe self-serve.

## 2. Problem and users

Evaluator/SME founders work from scattered updates and spreadsheets; SME self-serve owners need one plain-language operating brief; advisory sponsors need a bounded workflow and proof pack; regulated enterprise sponsors (e.g. SBP/SECP/SAMA-facing teams) fear unsupported summaries, uncontrolled data, and an unaccountable action. All use the same four lanes in `docs/USER_STRATEGY_AND_PIVOTS.md`.

## 3. Positioning and wedge

Wedge: readiness-to-workflow selection followed by an evidence-backed executive risk/decision brief. The honest alternative is spreadsheet + analyst, alongside BI/knowledge tools that do not preserve the same governed review loop. NexusAI does not replace records, authorize a decision, or perform external action.

## 4. Scope

| Horizon | Scope |
|---|---|
| V-now | `/readiness`, `/start-pilot`, `/workflows`, `/approvals`, `/dashboard/[role]`; lane/reviewer/pilot tables and routes (`apps/mission-control/app`, `db/schema.ts`) |
| V-pilot | NEW: one signed-in end-to-end launch workflow with controlled evidence, reviewer acceptance, shadow ROI and expand/stop proof |
| V-launch+1 | NEW: Stripe self-serve after paid-pilot evidence; richer funnel panel and product analytics |

## 5. User journeys and failure states

Readiness → lane assignment → signup inherits strategy profile → sponsor/reviewer/governance confirmation → evidence upload/connect → scorer labels signal strength → selected workflow → source-backed draft → reviewer approval → shadow ROI → expand/hold/stop. With no evidence, show provisional result and request sources. With no accepted reviewer, keep `pilotReady=false`. If review is refused, retain draft and reason; no external effect. If pilot stops, record outcome and suspend/retain only under the agreed data policy.

## 6. Data and governance

Core schema is sufficient: `strategy_profiles`, `reviewer_seats`, `workflow_twin_runs`, `pilot_outcomes`, `evidence_records`, `recommendations`, `approvals`, and `audit_events`. Sensitivity is public/internal/confidential/restricted. Approval gates recommendation promotion and pilot readiness; no automatic writeback. Retention policy is OPEN — Security + Product, 2026-08-16.

## 7. AI surfaces

| Surface | Routing / data | May / must not | Trust gate |
|---|---|---|---|
| Readiness/workflow scorer | `workflow_twin` policy; workspace evidence | Rank and explain; must not bind buyer or approve pilot | Signal label + sponsor/reviewer/evidence gates |
| Ask / executive synthesis | `web_ask`, `dashboard_synthesis`; configured provider fallback | Cite and draft; must not invent or decide | Citation coverage + reviewer |
| Recommendation / decision | `recommendation_finalization`, `decision_memo`; premium finalization | Prepare for approval; must not execute | Evidence refs + approval |

Routing is authoritative in `lib/config/model-routing.ts`; numeric eval thresholds are unmeasured — Engineering owner, 2026-08-16.

## 8. Commercial model

Evaluator: free readiness. SME: Pro waitlist, no checkout. Advisory: fixed-scope SOW for one workflow and scorecard. Regulated: governed deployment scoping and SOW. All use SOW/onboarding/scorecard/billing trigger docs; NexusAI changes the workflow and data boundary only.

## 9. Metrics

Track the shared funnel from assessment to expand/stop. Product metrics: readiness-to-claim rate, first-evidence rate, reviewer-acceptance rate, source coverage per draft, workflow-to-ROI completion. Baselines: unmeasured — funnel panel dependency.

## 10. Risks and open decisions

Map vs territory: public entry routes are deployed; do not claim a complete live pilot loop until signed-in mutable smoke. Risks: cold-start scoring, reviewer drop-off, insufficient evidence, unconfirmed deployment SHA, premature checkout. Mitigations are provisional labels, invite reminders, source checklist, release evidence, and waitlist-only copy. OPEN: launch pilot workflow owner by 2026-08-05; retention policy by 2026-08-16.

## 11. Release gates

By 2026-08-16 prove one reviewer-bound workflow; by 2026-09-01 verify public readiness/start-pilot and truthful waitlist; by 2026-09-15 target have SOW, scorecard, billing trigger, and expand/stop criterion. Follow `docs/RELEASE_GATE_2026-07-07.md` and `docs/DEMO_RUNBOOK_REGULATED.md`.

## Immediate next steps

1. Name the first workflow and design partner.
2. Complete invite/redeem/reviewer smoke.
3. Run controlled evidence-to-approval proof.
4. Record baseline funnel events.
5. Confirm launch deployment SHA.

## Partner update

NexusAI is the launch core. It routes buyers from readiness into one governed pilot, not an empty dashboard. Evidence, confidence, reviewer identity, and approval are product mechanics. Public entry routes are deployed; mutable signed-in proof remains the gate. The launch offers free access and Pro intent collection, not premature checkout. Paid SOW pilots come first. The immediate objective is one source-backed, reviewer-approved workflow with measurable shadow ROI. No AI output acts externally or replaces human authority. The September launch will be limited to verified claims. Expansion follows the pilot outcome.
