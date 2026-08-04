# Vertical Product Trust And Failure Contract

Status: Design and implementation contract. The controls and events below are required before a candidate vertical route is described as pilot-ready.

Last updated: 2026-07-29.

Figma source: [Vertical Trust + Failure States](https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=233-2).

## Shared Trust Layer

Every generated or reviewable artefact has three quiet, consistent placements:

| Placement | Required content |
|---|---|
| Artefact provenance strip | `AI-assisted`, `Human-authored`, or `Human-reviewed`; source count; source freshness band; access-scope state. |
| Pre-commit consequence preview | Named accountable human; what becomes fixed or externally visible; unresolved caveats; required review; cancel path. |
| Footer trust link | Data handling, model-use policy, retention, subprocessors, human-authority statement, and export/access controls. |

Do not publish a claim that workspace evidence is not used to train models until every enabled model path, third-party processor, and contractual setting has been verified.

## Standard On-Screen Language

- **AI assistance:** `Drafted with AI assistance from the listed sources. Not verified until a named reviewer approves.`
- **Human authority:** `This action is recorded against you as the accountable person.`
- **Evidence limit:** `Coverage reflects sources connected to this workspace. Absence of a finding is not assurance.`
- **Access scope:** `Some items are restricted by your access scope and are not shown. This is not the same as no evidence.`
- **Freshness:** `Sources checked {date}. Regulations and figures may have changed since.`

## Confidence And Evidence Validity

Numeric confidence percentages must not be the primary user signal. Use these bands consistently:

| Band | Meaning | Not a claim that... |
|---|---|---|
| Verified | Source-backed, current under its configured validity rule, and human-reviewed where required. | the conclusion is legally, commercially, or professionally correct. |
| Supported | Source-backed but requires a named reviewer or further contextual validation. | the evidence is complete. |
| Limited | Missing, stale, conflicting, access-limited, or insufficient evidence. | no issue exists. |
| Blocked | A required control, source, reviewer, or permission prevents progress. | the product can safely continue. |

Each evidence record must carry `valid_until`, `superseded_by`, `superseded_at`, and `downstream_impact_state`. A pack issued before expiry must surface a downstream-impact event when a linked evidence item expires, changes, or is withdrawn.

## Forbidden Action Enforcement Matrix

| Product | Forbidden action | Blocking UI control | Audit event on attempted action | Required test |
|---|---|---|---|---|
| Quorum | Finalize minutes, sign, file, or approve a board action | Human authentication gate with named chair/secretary, consequence preview, and disabled finalisation control without role/record prerequisites | `quorum.finalisation_blocked` | `quorum-forbidden-finalisation.test.ts` |
| Meridian | File, submit, certify, or sign a regulatory package | Human Filing Handoff; named authorized filer; external-channel handoff; no submit credential/control in Meridian | `meridian.filing_blocked` | `meridian-forbidden-filing.test.ts` |
| Vantage | Mark a deal approved, investable, rejected, legally cleared, or risk-free | Decision Handoff only accepts named IC/buyer questions; no outcome CTA or automated status transition | `vantage.decision_blocked` | `vantage-forbidden-decision.test.ts` |
| Nucleus | Publish client advice, approve on a firm's behalf, or conceal fixed trust mechanics | Partner-review plus controlled-publish gate; client preview; immutable provenance/review/footer contract | `nucleus.publish_blocked` | `nucleus-forbidden-publish.test.ts` |

The event names and test files are planned contracts, not claims that runtime enforcement exists today.

## Failure And Dispute Screens

| Product | Planned screen | Candidate route | Required outcome |
|---|---|---|---|
| Quorum | Minutes Correction & Restatement | `/board/minutes/correction` | Correct a governed record without erasing the original, notify affected directors, and preserve the restatement trail. |
| Quorum | Evidence Withdrawal / Superseded Source | `/board/evidence-impact` | Identify affected packs, directors, decisions, and required acknowledgement after a source changes. |
| Meridian | Regulator Query & Response Log | `/meridian/regulator-queries` | Assign, draft, review, submit externally, and retain post-submission responses. |
| Meridian | Requirement Change Watch | `/meridian/requirement-changes` | Alert on source changes, map affected requirements/packs, and require human disposition. |
| Vantage | Evidence Contradiction View | `/vantage/contradictions` | Compare conflicting sources, record advisor disposition, and expose downstream memo impact. |
| Vantage | Post-Decision Learning | `/vantage/post-decision-learning` | Record outcome/assumption variance without revising the original IC basis. |
| Nucleus | Client Dispute & Escalation | `/nucleus/client-disputes` | Keep client challenge, internal review, response approval, and correspondence scope controlled. |
| Nucleus | Engagement Closeout & Data Return | `/nucleus/closeout` | Run contractual closeout, export-on-exit, return/deletion request, legal hold, and access revocation. |
| Shared | Access Denied / Scope Limited | shared component | Distinguish restricted evidence from no evidence, state who can request access, and preserve count-level impact where permitted. |
| Shared | Evidence Superseded | shared component | Show old/new source relation, validity, downstream impact, acknowledgement state, and repair action. |
| Shared | Artefact Provenance Strip | shared component | Reveal author/agent/model class, source count, freshness band, review state, and one-click source access. |
| Shared | Consequence Preview | shared component | Explain the irreversible act, named actor, scope, disclosures, audit event, and cancel/return path before commit. |

## Data Sharing, Access, Retention

- Evidence is workspace-scoped by default. Cross-product reuse within a workspace requires an explicit **Share to another product room** action, named source owner, recipient room, purpose, access classification, expiry, and audit event. No implicit Vantage-to-Quorum or other cross-product surfacing.
- A user without access sees the shared Access Denied state, not an empty-evidence state.
- Every archive/closeout surface must display retention basis, retention end or review date, legal-hold status, deletion-request status, export-on-exit availability, and access revocation state. Actual retention periods are policy/configuration values, not a hardcoded universal number.
- A read-only responsive surface is required for Quorum Director Pre-Read, Vantage IC Memo, and Nucleus Client Portal. Full mobile authoring is explicitly later scope; read, evidence drill-down, and comment must work before those routes are pilot-ready.

## Control-First Build Gate

For any vertical, build the authority gate, audit event schema, provenance strip, access-denied state, and consequence preview before its drafting or export surface. A drafting surface cannot be marked complete while those controls remain only in Figma.
