# Quorum PRD — Board Governance

Status: bounded product-room pilot pattern | Owner: Product + Governance | Updated: 2026-08-02

## 1. Executive summary

1. Quorum serves board chairs, company secretaries, and CEO offices.
2. Its value moment is a cited board-pack delta and reviewer-ready action/minutes draft.
3. It wins on evidence, audit, and explicit director authority—not portal logistics.
4. The buyer lane is business/advisory or regulated enterprise.
5. It competes honestly with spreadsheet + analyst and board portals such as Diligent/OnBoard.
6. `/board` and `/board/minutes/draft` are code-backed protected routes (`HANDOVER.md`).
7. Board delta endpoint exists at `/api/board/delta`.
8. Signed-in board-cycle smoke remains required; no route may be called a live full board workflow without it.
9. It reuses NexusAI identity, evidence, approvals, audit, and routing.
10. It owns board-cycle vocabulary and no system-of-record replacement.

## 2. Problem and user

Directors skim long packs; actions and changed risks disappear between meetings. The company secretary is champion; chair/CEO is economic buyer (`products/quorum/positioning.md`). Regulated boards fear unsupported advice, loss of accountability, and unauditable decision records; applicable regulator depends on the institution (e.g. SBP/SAMA), so jurisdiction is captured rather than assumed.

## 3. Positioning and wedge

First pilot: approved board materials → stable-baseline/delta brief → director review → action/minutes draft. Quorum does not replace a board portal, approve minutes, bind directors, send packs, or create legal commitments. It owns the synthesis/review loop, not meeting logistics.

## 4. Scope

| Horizon | Scope |
|---|---|
| V-now | `/board`, `/board/minutes/draft`, `/api/board/delta`, core evidence/approval/audit (`apps/mission-control/app`, `HANDOVER.md`) |
| V-pilot | NEW: board-cycle object linking pack, meeting, named secretary, director reviewer, delta and action register |
| V-launch+1 | NEW: controlled board-portal import and between-meetings change brief |

## 5. Journeys

Readiness/Quorum landing → regulated/advisory lane → inherited onboarding → secretary names sponsor/reviewer and uploads approved pack → delta draft with sources → director/secretary review → human-approved minutes/action handoff → value proof (preparation time, unresolved actions) → expand/stop. No evidence means request pack; low signal marks provisional; reviewer never accepts means no pilot-ready state; stopped cycle is logged as pilot outcome.

## 6. Data and governance

Core schema supports evidence, reviewer seats, recommendations, approvals, audit, and pilot outcome. NEW for pilot: `board_cycle`, `board_pack_version`, and action-to-cycle linkage; retain under the client’s board-record policy, not an invented universal retention rule. Sensitivity normally confidential/restricted. Chair/secretary approval gates any minutes/action export; Quorum never sends or records a binding resolution.

## 7. AI surfaces

Board delta and minutes draft use a sponsor-facing quality route (`recommendation_finalization` / `decision_memo`) with configured fallback; source retrieval uses `web_ask`. AI may compare supplied packs, cite evidence, and draft; it must not determine a resolution, approve minutes, or communicate externally. Trusted promotion requires 100% material-claim source linking and named secretary/director review; metric baseline unmeasured — Governance owner, 2026-08-16.

## 8. Commercial model

Entry: readiness/board-cycle discovery. Pilot: one full cycle, with commercial anchor USD 5K and annual range USD 12–20K from `products/quorum/positioning.md` (commercial hypothesis, not a checkout price). Expansion: repeat cycles and action carry-forward after scorecard proof. Paperwork uses core SOW/scorecard, with board pack scope, secretary reviewer, confidentiality, and meeting-cycle metric.

## 9. Metrics

Shared funnel plus pack-to-draft time, cited-material-claim coverage, reviewer completion, carried-action closure, and board-cycle renewal. Baselines unmeasured.

## 10. Risks and open decisions

Map vs territory: protected routes exist; an operationally verified end-to-end board cycle does not yet. Risks: confidential pack handling, false implication of formal minutes, missing reviewers, calendar pressure, and unvalidated pricing. Mitigate with restricted sensitivity, explicit draft labels, reviewer gate, one-cycle scope, and SOW pricing approval. OPEN: design partner/chair by 2026-08-16; data retention/counsel rule by 2026-08-16.

## 11. Release gates

Demo: show a clearly synthetic/authorized pack and review boundary. Launch: public promise only of a governed pilot pattern. Pilot signing: accepted reviewer, approved source pack, board-cycle scope, scorecard, and SOW. Follow release/runbook discipline in the family PRD.

## Immediate next steps

1. Secure one secretary-led design partner.
2. Define board-cycle fields and retention policy.
3. Smoke pack-to-delta-to-review signed in.
4. Validate price and SOW scope.
5. Record cycle time baseline.

## Partner update

Quorum is Pinavia’s board-governance room, not a replacement board portal. Its first proof is a source-backed board delta and human-reviewed action/minutes draft. Protected board routes exist, but a signed-in board-cycle proof is still required. It shares the NexusAI governance core and owns only board-cycle semantics. Directors retain all authority. The first pilot is one board cycle with a secretary, reviewer, approved pack, and scorecard. Commercial anchors are hypotheses until a design partner validates them. No minutes are approved or sent by AI. Expansion follows demonstrated preparation-time and action-follow-through value.
