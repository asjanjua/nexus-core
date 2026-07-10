# NexusAI AI-Native Readiness Assessment

## Purpose
The readiness assessment is the public on-ramp into NexusAI. It should help a prospective client understand whether they are ready for an executive intelligence pilot, what must be fixed first, and which pilot path makes sense.

It is a business development tool, not a regulatory, legal, financial, or operational opinion.

Readiness is also the first step in the user strategy documented in `docs/USER_STRATEGY_AND_PIVOTS.md`: readiness assessment -> buyer lane -> signup/onboarding -> first workflow pilot -> governed value proof.

## Target User
- CEO, COO, Managing Director, founder, transformation sponsor, or strategy lead
- Regulated and institution-facing buyers in financial services, healthcare, professional services, and complex operating businesses
- Consulting leads who need a fast way to qualify pilot fit before proposing NexusAI

## User Promise
In under five minutes, the user receives:
- A 1 to 7 score across seven readiness dimensions
- A banded result: Emerging, Developing, Advanced, or AI-Native Ready
- A recommended next step: fix drag first, book a scoping call, start a paid pilot, or prepare a full deployment roadmap
- A lightweight explanation written in advisory language, not SaaS marketing language

## Seven Dimensions

| Dimension | What It Measures | Low Score Signal | High Score Signal |
| --- | --- | --- | --- |
| Organizational drag | How much approval friction slows decisions | Many layers, unclear owners, slow sign-offs | Clear ownership and fast review loops |
| AI as a first-class function | Whether AI is treated as a core operating capability | Experiments scattered across teams | Named AI owner, budget, governance, and roadmap |
| Data readiness | Whether key documents and data can be found and trusted | Files scattered, stale, duplicated, unlabeled | Clean source folders, owners, freshness, sensitivity labels |
| Workflow standardization | Whether recurring work is documented enough to twin | Work depends on tribal knowledge | Workflows documented with inputs, outputs, owners, and exceptions |
| Governance maturity | Whether AI can be controlled, reviewed, and audited | No review queue, no access policy, no rollback | Audit trail, approval gates, agent passports, and escalation rules |
| Regulatory exposure | How safely the company can introduce AI in high-stakes processes | AI touches sensitive outputs without controls | Clear boundaries, human accountability, and regulator-safe evidence |
| Decision-cycle speed | How quickly leaders move from evidence to action | Status questions take days to answer | Decisions, risks, and actions are visible with current evidence |

## Scoring Anchors
Each dimension is scored from 1 to 7.

| Score | Meaning |
| --- | --- |
| 1 | Not ready. Basic operating clarity is missing. |
| 2 | Early. Some data or workflow structure exists, but decisions still depend on ad hoc follow-up. |
| 3 | Developing. The company can run a small discovery project but should not start broad automation. |
| 4 | Pilotable. A narrow NexusAI pilot can work with careful scope and human review. |
| 5 | Strong pilot fit. Evidence sources, owners, and review routines are mostly in place. |
| 6 | Deployment-ready. The company can support multiple workflows with governance. |
| 7 | AI-native ready. The company has the governance, data, and operating discipline to compound learning over time. |

## Result Bands

| Total Score | Band | Interpretation | CTA |
| --- | --- | --- | --- |
| 7-20 | Emerging | Do not automate yet. Reduce drag and organize source evidence first. | Send readiness checklist and offer advisory session |
| 21-34 | Developing | A scoped discovery or workflow-mapping sprint is appropriate. | Book 30-minute scoping call |
| 35-42 | Advanced | Good fit for a 6-8 week paid pilot over documents, comms, and one priority workflow. | Start pilot proposal |
| 43-49 | AI-Native Ready | Candidate for accelerated NexusAI deployment with governance, agent passports, and shadow-mode ROI. | Prepare deployment roadmap |

## Buyer-Lane Routing

| Signal | Buyer lane | Route |
| --- | --- | --- |
| Emerging score, small team, unclear owner | Evaluator / SME | Send foundations checklist, product brief, and optional advisory session before signup. |
| Developing score, owner-led or startup, clear source bundle | SME self-serve | Route to signup with a Pro-oriented onboarding path and one owner workflow. |
| Advanced score, transformation sponsor, advisory or growth company | Business / advisory | Route to signup or scoping call with workflow scorer and pilot paperwork. |
| Regulated sector, large organization, procurement/security concern | Regulated enterprise | Route to governed scoping with agent passports, approval gates, and security review language. |

The lane is directional, not an eligibility decision. A human can override it during scoping.

## Lead Record Contract
Every submission should capture:
- `submitted_at`
- `company_name`
- `email`
- `role`
- `sector`
- `company_size`
- `dimension_scores`
- `total_score`
- `band`
- `buyer_lane`
- `triggered_cta`
- `free_text_priority`
- `utm_source`
- `workspace_or_lead_id`
- `first_workflow_hint`

## AI Role
AI may:
- Summarize the user's result in plain business language
- Suggest 2-3 likely pilot themes based on the score pattern
- Draft a follow-up email for the consulting team
- Suggest questions for the scoping call

AI must not:
- Present the score as a certification
- Claim regulatory readiness
- Recommend staff reductions
- Guarantee ROI
- Make legal, financial, compliance, or operational determinations

## Follow-Up Motion

### Emerging
Subject: Your NexusAI readiness result: fix the drag first

Message: Your score suggests the biggest opportunity is not AI deployment yet. The first step is to reduce decision friction and organize the evidence that leaders already depend on. We can help you identify the two or three operating blockers that must be fixed before a pilot will pay off.

### Developing
Subject: Your NexusAI readiness result: good fit for scoping

Message: You appear ready for a narrow scoping conversation. The goal would be to identify one workflow or executive question that has enough evidence, enough pain, and low enough operational risk for a paid pilot.

### Advanced
Subject: Your NexusAI readiness result: paid pilot candidate

Message: Your answers suggest a strong fit for a 6-8 week NexusAI Executive Intelligence Pilot. The next step is to confirm source availability, decision owners, governance constraints, and the first workflow to measure.

### AI-Native Ready
Subject: Your NexusAI readiness result: accelerated deployment candidate

Message: Your organization appears ready for a more ambitious deployment path. We should discuss agent passports, shadow-mode ROI, and the governance model needed to move from executive intelligence to operating intelligence.

## Acceptance Checklist
- Assessment is public and does not require login.
- Completion takes under five minutes.
- Each dimension uses original NexusAI wording, not copied third-party scoring language.
- The result includes a clear disclaimer.
- The result writes a lead/audit record.
- The CTA differs by score band.
- The output is useful even when the user is not ready to buy.
