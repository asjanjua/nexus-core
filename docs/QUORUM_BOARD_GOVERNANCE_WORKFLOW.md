# Quorum Board Governance Workflow

Status: Draft product workflow, now represented in code and Figma.
Last updated: 2026-07-06.

This note turns Quorum from a board-intelligence screen into a board-governance workflow model. It is a product and UX planning document, not legal advice. Country rules must be reviewed by qualified counsel or a company secretary before Quorum is used for statutory compliance.

## Product Position

Quorum should help directors, company secretaries, CEOs, sponsors, and advisors run a clean board process from source evidence to board decision record.

The current six-screen Figma build is useful for a concept review, but it is not enough for a full board workflow. The next version needs to show how a real board meeting is configured, convened, checked for quorum, documented, approved, signed, and filed into an auditable governance record.

Current design/code refs:

- Code registry: `apps/mission-control/lib/board-governance-workflow.ts`
- Current app surface: `/board`
- Quorum concept Figma V0.1: https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=78-3
- Quorum governance workflow Figma V0.2: https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=80-3
- Cross-vertical input/action Figma board: https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=87-3

## Pakistan-First Source Pack

Start with Pakistan because the current Meridian/SECP queue is Pakistan-first and the user discussions have centered on SECP/NBFI use cases.

Primary sources to track in the product source pack:

| Source | Link | Why it matters for Quorum |
|---|---|---|
| SECP Companies Act, 2017 | https://www.secp.gov.pk/companies-act-2017/ | Director minimums, elections and terms, board proceedings, quorum, records of board resolutions and minutes, circular resolutions, powers of board, director interest disclosures. |
| SECP Best Practices Guide: Conducting Board Meetings and General Meetings | https://www.secp.gov.pk/document/best-practices-guide-conducting-board-meetings-general-meetings/ | Practical meeting lifecycle guidance for notice, agenda, conduct, minutes, and records. |
| SECP Listed Companies Code of Corporate Governance Regulations, 2019 | https://www.secp.gov.pk/document/listed-companies-code-of-corporate-governance-regulations-2019/ | Listed-company board composition, governance responsibilities, committee expectations, terms of reference, audit/HR/remuneration/risk/sustainability patterns. |
| SECP regulations catalog | https://www.secp.gov.pk/laws/regulations/ | Current update tracker for CCG, Companies Regulations, NBFC Regulations, postal ballot rules, and other sector overlays. |
| NBFC and Notified Entities Regulations | https://www.secp.gov.pk/laws/regulations/ | Sector overlay for NBFC/AMC/deposit-taking entities and board/committee compliance where applicable. |
| Companies Regulations, 2024 | https://www.secp.gov.pk/laws/regulations/ | Current company filing, forms, authorisation, and procedural detail that may affect exports and compliance packs. |

Important Pakistan baseline points to model as configurable rules:

- Minimum directors vary by company type: single-member company, private company, unlisted public company, listed company.
- Listed-company board quorum is not the same as private-company quorum; private/unlisted rules depend on articles and source pack.
- Public companies have a board-meeting cadence requirement.
- Board and committee minutes, participant names, board resolutions by circulation, authentication, draft circulation, and record retention need their own record workflow.
- Directors' conflicts/interests should be declared and attached to relevant agenda items before discussion or decision.
- Committee minutes and recommendations need to flow back to the board where the board has final authority.
- Circular resolutions are a separate decision path and must be carried into a later minutes record.
- Listed/NBFC/sector-specific overlays can change the required committees, frequency, quorum, reporting, disclosures, and sign-off artifacts.

## Jurisdiction Pack Model

Do not hardcode one country into the app. Treat each legal environment as a versioned jurisdiction pack:

| Layer | Examples | Quorum behavior |
|---|---|---|
| Country | Pakistan, UAE, Saudi Arabia, UK | Sets baseline company-law rules and official source links. |
| Entity type | Single-member, private, unlisted public, listed, nonprofit, NBFC, bank | Sets director count, meeting cadence, quorum source, records, forms, and committee expectations. |
| Regulator overlay | SECP, SBP, PSX, DFSA, ADGM, CMA | Adds sector-specific committees, policies, filings, and approvals. |
| Company articles | Articles of association, shareholder agreement, board charter | Overrides or fills procedural details such as private-company quorum and reserved matters. |
| Board policy pack | TORs, delegation matrix, approval matrix, conflicts policy, document retention policy | Converts internal policies into agenda checks, authority checks, and export requirements. |

Each pack should have:

- source URL
- effective date
- reviewed-by field
- expiry/review date
- rule confidence
- rule owner
- affected workflow stages
- plain-language explanation for users

The code registry now formalizes this as `quorumJurisdictionPackRequirements`. A country pack is not production-ready until it has official source links, effective/review dates, entity and regulator overlays, company-document override rules, and a qualified reviewer.

## Screen Guidance

The code registry also defines `quorumScreenGuidance` and `guidanceForQuorumScreen()`. This is the editable product copy source for the Figma input/action review board and future route build-out.

For each Quorum screen, the guidance must answer:

- what the user needs to provide
- what the product should ask them to do next
- which human-control guardrail remains visible before any board record becomes final

When a new Quorum screen is added, add its guidance in the same pull request and keep the Figma board or successor UI baseline in sync.

## Governance Boundaries

Quorum's boundaries are now formalized in `quorumGovernanceBoundaries`:

| Boundary | Product rule |
|---|---|
| No legal authority | Quorum can organize board process, evidence, minutes, and governance records, but it is not a lawyer, regulator, company secretary of record, or statutory filing authority. |
| Human approval control | Quorum may prepare notices, packs, minutes, action registers, and export packets; it must not approve, sign, file, send, or make a board record final automatically. |
| Jurisdiction review required | Country, entity, regulator, and company-article rules must be source-backed and reviewed by qualified local counsel or a company secretary before statutory use. |

## Runtime Safety

Keep `screensForStage()` strict for tests and registry authors. It should throw when a stage references a deleted or missing screen.

When route code starts using the registry, prefer `safeScreensForStage()`. It logs missing draft screens and renders the screens that still exist, so a route does not fail completely while a workflow is being expanded.

## Core Objects

Quorum should understand these governance objects:

| Object | Purpose |
|---|---|
| Company profile | Jurisdiction, entity type, regulator overlays, articles, financial year, secretary/advisor contacts. |
| Board register | Directors, chair, CEO, nominee directors, independent directors, gender/fit-and-proper flags, appointment dates, term expiry, directorship limits, training status. |
| Committee register | Audit, HR/remuneration, risk, nomination, sustainability, shariah, investment, credit, or custom committees. |
| Terms of reference | Committee mandate, membership, quorum, chair, secretary, cadence, authority, escalation path, reports to board. |
| Policy library | Board charter, delegation of authority, conflicts, related-party transactions, document retention, signing authority, reserved matters. |
| Meeting | Board or committee meeting, type, date, location/video mode, notice status, attendees, apologies, quorum, agenda, pack, minutes, actions. |
| Agenda item | Topic, owner, required decision type, authority route, conflict status, evidence, recommendation, resolution wording, vote/signature requirement. |
| Board pack | Evidence set, management paper, committee recommendation, financials, risk note, legal note, AI summary, source coverage, change log. |
| Attendance and quorum | Attendees, proxies/alternates where allowed, video attendance, conflicted directors removed from quorum where applicable, quorum result. |
| Conflict declaration | Annual declarations plus meeting/item-specific disclosures, recusals, note for minutes. |
| Decision or resolution | Approved, rejected, deferred, noted, recommended to shareholders, circular resolution, or action-only item. |
| Minutes | Draft, director review, chair authentication, final record, committee circulation, board follow-up, retention status. |
| Signature packet | Chair/company secretary signatures, director e-sign acknowledgment, wet-sign export, evidence of approval. |
| Action register | Owner, due date, status, board item, evidence link, escalation and next meeting carry-forward. |
| Audit trail | Who changed what, when, source, approval, export, and whether the record is draft or final. |

## End-To-End Workflow

### 1. Configure The Board

User selects country, entity type, regulator overlay, articles/policy pack, financial year, board size, and committees.

The product should show:

- required vs actual director count
- director term expiry view
- committee coverage gaps
- missing TORs or policies
- source pack date and confidence

### 2. Build The Board And Committee Registers

User adds directors, officers, committee members, chair/secretary roles, independence, nominee status, related-party flags, and training/fit-and-proper metadata.

Quorum should flag:

- too few directors
- missing required representation
- expired term
- missing consent/profile data
- too many open directorships where a rule applies
- committee membership gap
- committee chair requirement gap

### 3. Define TORs, Policies, And Delegated Authority

User uploads or creates:

- board charter
- committee TORs
- delegation matrix
- reserved matters
- signing authority
- conflict policy
- related-party policy
- minutes and record retention policy

Quorum should convert these into structured checks before agenda approval.

### 4. Plan Meeting Calendar

User creates annual board and committee calendars with cadence requirements.

Quorum should show:

- planned vs required meetings
- overdue committee meetings
- upcoming statutory/reporting deadlines
- agenda themes by quarter
- committee-to-board reporting dependencies

### 5. Create Notice And Agenda

Company secretary or sponsor builds the agenda, tags each item, attaches papers, and selects the expected outcome.

Agenda item types:

- for information
- for discussion
- for approval
- for noting
- for recommendation
- for shareholder escalation
- circular resolution
- committee escalation

Each agenda item should require:

- owner
- authority route
- evidence/pack status
- conflict check
- recommended decision wording
- required sign-off
- minutes note template

### 6. Assemble Board Pack

Quorum pulls from Nexus evidence, connectors, previous minutes, actions, committee packs, and management papers.

Pack status should show:

- source coverage
- missing evidence
- outdated data
- new deltas since last meeting
- open contradictions
- confidential/restricted material
- AI-generated summary with evidence trail

### 7. Pre-Meeting Director Review

Directors read the pack, ask questions, mark items for discussion, and submit conflicts or requested clarifications.

Quorum should support:

- Director Q&A tied to evidence
- unresolved question tracker
- item-level risk and confidence
- changes since pack published
- late-paper warning
- read receipt or acknowledgment where the company wants it

### 8. Attendance, Quorum, And Conflicts

At meeting start, Quorum checks attendance and item-level conflicts.

The screen should show:

- attendees and apologies
- video attendance counted where allowed
- board quorum result
- committee quorum result
- directors conflicted on each item
- whether conflicted directors should leave discussion/vote
- quorum recalculation after recusal

### 9. Conduct Agenda And Capture Decisions

For each item, Quorum captures:

- discussion summary
- evidence cited
- questions raised
- management responses
- conflict handling
- decision route
- vote result or consensus
- conditions attached
- next action
- draft minutes text

Decision outcomes:

- approved
- approved with conditions
- rejected
- deferred
- noted
- referred to committee
- recommended to shareholders
- passed by circulation

### 10. Draft, Review, Approve, And Authenticate Minutes

After the meeting, Quorum creates draft minutes and tracks review.

Minutes workflow:

1. Draft generated from agenda decisions, attendance, conflicts, and discussion notes.
2. Secretary edits and sends to chair/directors.
3. Directors comment or request corrections.
4. Chair authenticates the final minutes or next meeting chair authenticates where applicable.
5. Final minutes enter the board record with retention/audit metadata.

Minutes should always be visibly marked:

- draft
- under review
- approved for signature
- authenticated/final
- exported

### 11. Signatures, Filings, And Export Pack

Quorum should support:

- chair signature packet
- company secretary certification
- director acknowledgment
- circular resolution signature trail
- board pack PDF
- minutes PDF
- action register export
- compliance evidence pack
- source index

Human approval remains the boundary. Quorum should prepare and track, not file or legally sign on behalf of users in V1.

### 12. Post-Meeting Action Register

Every decision can create actions with owners, deadlines, and next-meeting carry-forward.

The board view should show:

- overdue actions
- actions due before next meeting
- actions blocked by missing evidence
- management updates
- committee follow-up
- items requiring shareholder or regulator action

## Required UI Screens Beyond Current Six

The next Figma version should add these desktop-browser screens:

| Screen | Purpose |
|---|---|
| Quorum Setup Wizard | Country, entity type, regulator, source pack, articles, board secretary, financial year. |
| Board Register | Director count, composition, terms, independence, nominee status, training/fit-and-proper metadata. |
| Committee Register | Committees, members, chairs, secretaries, cadence, coverage gaps. |
| TOR And Policy Library | Board charter, committee TORs, delegation matrix, conflicts, signing authority, retention policy. |
| Meeting Calendar | Annual board/committee cadence, statutory deadlines, next meeting readiness. |
| Agenda Builder | Agenda items, authority route, outcome type, owner, evidence, conflict check, draft resolution. |
| Board Pack Builder | Papers, evidence coverage, missing materials, source confidence, deltas since last meeting. |
| Director Pre-Read | Pack reading, Q&A, unresolved clarifications, conflict declarations. |
| Attendance And Quorum | Attendees, apologies, video mode, board/committee quorum, item-level recusal impact. |
| Conflict Declaration | Annual and item-level conflicts, recusal status, minutes note. |
| Committee Recommendation | Committee paper, recommendation to board, minutes link, escalation trail. |
| Decision And Vote Capture | Discussion, motion/resolution, vote/consensus, conditions, deferred actions. |
| Circular Resolution | Circulate resolution, attached papers, approval tracker, later board-minute noting. |
| Minutes Drafting | AI-assisted draft from agenda, decisions, conflicts, attendance, and actions. |
| Minutes Review And Sign-Off | Comments, corrections, chair authentication, final record status. |
| Action Register | Owners, due dates, blockers, carry-forward to next board/committee meeting. |
| Governance Audit Pack | Board pack, minutes, resolution log, signature packet, source index, retention status. |

## MVP Recommendation

For the first Quorum demo, build the full workflow in Figma before expanding code. The current `/board` route can remain the intelligence entry point, but the product story needs three arcs:

1. Setup and compliance readiness: board profile, committees, TORs, policies, cadence.
2. Meeting run: agenda, board pack, Q&A, quorum, conflicts, decisions.
3. Record and follow-through: minutes, signatures, action register, audit export.

The first code expansion after the Figma pass should be:

1. Board profile and committee register data model.
2. Agenda item and meeting model.
3. Minutes/action register workflow.
4. Jurisdiction pack registry with Pakistan-first source metadata.

## Open Questions

- Confirm whether Quorum first targets Pakistan private companies, Pakistan listed companies, NBFCs, or consulting-led board advisory packs.
- Confirm whether the first buyer is the company secretary, CEO, board chair, independent director, or external advisor.
- Confirm whether V1 should stop at board-pack/minutes preparation, or include e-signature integrations later.
- Confirm whether country packs after Pakistan should be GCC-first, UK-first, or customer-led.
- Decide whether legal source review is performed internally, by counsel, or by a company-secretarial partner before demo claims.
