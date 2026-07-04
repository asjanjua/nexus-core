# NexusAI User Strategy and Pivot Map

Status: Canonical strategy note for paperwork, roadmap, backlog, and user-flow alignment.
Last updated: 2026-07-04.

## Core Pivot

NexusAI should not treat signup as the start of a generic dashboard experience. The commercial path should be:

```text
Readiness assessment -> buyer lane -> signup/onboarding -> first workflow pilot -> governed value proof
```

The strategic pivot is from account creation to pilot conversion. Clerk remains the identity provider, but NexusAI should own the market-aware user strategy: who the user is, what kind of buyer they represent, what first workflow proves value, and which governance boundary is required before expansion.

## Auth and Email Boundary

Clerk owns authentication email flows. NexusAI should not build a custom email-confirmation or password-reset system while Clerk remains the hosted identity provider.

- Clerk handles signup verification, signin verification codes or links, password resets, account security email, and future organization invitation email.
- NexusAI handles product email only: scheduled synthesis briefs, cron-driven notifications, pilot communications, support/security notifications, and later workflow alerts.
- Product email should use a managed delivery provider such as Resend or Cloudflare Email Sending, configured through `NEXUS_RESEND_API_KEY` and `NEXUS_FROM_EMAIL` or an equivalent provider adapter.
- Pinavia/Nexus sender identity should use a domain-authenticated address such as `Nexus <noreply@pinavia.io>` or `Pinavia <hello@pinavia.io>`.
- Do not self-host a mail server for V1 demos or early pilots. Email reliability is a deliverability and reputation problem, not just an SMTP implementation problem.

## Voice and Local Whisper Boundary

Voice should be future-proofed but not shipped as a first-iteration demo dependency. The V1 demo path should stay text, upload, Ask, synthesis, approvals, and scheduled email.

- Browser microphone capture stays out of V1. The current security posture denies microphone access by default, which is appropriate for regulated demos.
- Local PC dictation is acceptable as a user-side convenience if it produces text before Nexus receives it. In that mode Nexus receives a normal Ask query or note, not raw audio.
- Nexus-owned audio processing starts later with explicit consent, audit logging, sensitivity gating, and a transcript-first model.
- The lowest-risk future seam is "local Whisper or OS dictation -> transcript -> Ask or evidence ingestion." The higher-risk seams are WhatsApp voice notes, inbound voice calls, call recording, and voice evidence ingestion.
- Do not block the first iteration on Whisper, Deepgram, Twilio Voice, browser microphone permissions, or audio storage.

## Operating Paper Trail

The current paperwork set is the operating layer for this strategy:

- `BACKLOG.md` is the cross-document backlog and release-gate map.
- `TASKS.md` is the detailed execution checklist.
- `HANDOVER.md` is the current relay state for the next operator or agent.
- `docs/ROADMAP.md` is the product narrative and sequencing view.
- `docs/KNOWLEDGE_WORKSPACE.md` is the v0.25.0 company-memory feature spec.
- Pilot paperwork lives in `docs/PILOT_SOW_TEMPLATE.md`, `docs/PILOT_ONBOARDING_CHECKLIST.md`, `docs/PILOT_SUCCESS_SCORECARD.md`, and `docs/PILOT_BILLING_TRIGGERS.md`.

Before any paid-pilot push, these documents should agree on three things: current release status, the first workflow being sold, and the proof loop used to decide whether the pilot expands.

## Buyer Lanes

| Lane | Typical user | Pricing path | First value moment | Trust requirement | Primary CTA |
| --- | --- | --- | --- | --- | --- |
| Evaluator / SME | Founder, owner, operator, small team | Free | Readiness result plus one sample owner/CEO brief | Clear limits, no jargon, obvious source trail | Complete readiness and try a guided workspace |
| SME self-serve | Owner-led business, startup, single-user team | Pro | Upload a small source bundle and get a plain-language operating brief | Simple confidence and source visibility | Start with one owner workflow |
| Business / advisory | Growth company, consulting/advisory client, transformation sponsor | Business | Score candidate workflows and produce a sponsor-ready pilot scope | Named sponsor, reviewer, evidence bundle, exportable pack | Start a paid workflow pilot |
| Regulated enterprise | Bank, fintech, healthcare, government-linked, institution-facing buyer | Enterprise | Governance-first workspace with agent passports and approval boundaries | Audit trail, sensitivity controls, no autonomous writeback, procurement path | Book governed pilot / deployment scoping |

The lanes are not separate products. They are separate routes through the same product, with different defaults, proof points, and paperwork.

## Flow Strategy

1. **Readiness assessment qualifies the user.**
   Capture company, role, sector, size, readiness band, priority, and email. The assessment should produce a buyer lane and next action, not only a score.

2. **Signup inherits the readiness context.**
   A qualified user who signs up should not restart from zero. Onboarding should know the sector, company size, readiness band, priority, and likely buyer lane.

3. **Onboarding narrows scope.**
   The first authenticated experience should confirm profile, roles, governance posture, and source readiness. The goal is not broad exploration; it is choosing the first workflow that can prove value safely.

4. **Workflow scorer becomes the pilot bridge.**
   The workflow scorer should select the first Parallel Workflow Pilot using frequency, pain, data readiness, safety, reusability, speed gain, and sponsor readiness.

5. **Paperwork follows the chosen workflow.**
   SOWs, onboarding checklists, success scorecards, and billing triggers should reference the chosen first workflow, named sponsor, reviewer, evidence bundle, governance boundary, and shadow ROI metric.

## Lane-Specific Product Strategy

### Evaluator / SME

- Keep the experience lightweight and fast.
- Use owner/CEO language instead of enterprise governance language.
- Show one clear output with evidence links before asking for deeper setup.
- Avoid procurement and complex controls unless the user asks.
- Upgrade signal: user wants more evidence records, more roles, exports, or scheduled synthesis.

### SME Self-Serve

- Treat Pro as the natural paid path.
- Emphasize source upload, plain-language briefs, weekly synthesis, and simple operating decisions.
- Keep trust visible through confidence, sources, and human approval language.
- First workflow examples: weekly owner brief, cash/runway review, customer issue review, ops blocker report.

### Business / Advisory

- Treat Business as the paid pilot lane.
- Lead with the workflow scorer, sponsor-ready exports, decision twin, and pilot artifacts.
- Require sponsor and reviewer names before the pilot scope is considered complete.
- First workflow examples: proposal pipeline review, project delay report, board-pack variance summary, executive risk brief.

### Regulated Enterprise

- Treat Enterprise as a governed deployment lane, not self-serve checkout.
- Lead with agent passports, audit trail, sensitivity controls, approval gates, data residency, and no autonomous writeback.
- Require explicit evidence boundaries, escalation triggers, and human reviewers.
- First workflow examples: regulatory issue tracker summary, supplier risk review, risk/control evidence pack, board risk brief.

## Success Metrics

Track the strategy as a funnel:

- Readiness assessment completed.
- Buyer lane assigned.
- Signup or scoping CTA completed.
- Workspace provisioned with readiness context.
- First workflow selected.
- Sponsor and reviewer named.
- Evidence bundle connected or uploaded.
- First governed brief generated.
- Approval/review loop completed.
- Shadow ROI captured.
- Pilot scope accepted, expanded, or stopped.

## Implementation Implications

- Docs and sales materials should describe readiness-first routing consistently.
- App implementation should eventually persist a Nexus strategy profile alongside Clerk identity.
- Billing and paperwork should not assume one generic buyer.
- Public-facing copy should avoid internal "pivot" language, but internal docs should name the pivot clearly.
- Regulated-buyer language must preserve the human-approval and no-autonomous-writeback boundary.
- Keep auth email and product email separate: Clerk for verification and account lifecycle, NexusAI delivery provider for operational product emails.

## Current Plan

1. **Finish the v0.25.0 release gate.**
   Confirm Render is serving the pushed commit, then run authenticated smoke for `/knowledge`, `/workflows`, `/settings/connectors`, and Ask note citations.

2. **Productize the strategy profile.**
   Persist readiness assessment context, buyer lane, role, sector, company size, priority, and governance posture so signup and onboarding inherit the strategy instead of restarting from scratch.

3. **Route onboarding into the first workflow.**
   Use the workflow scorer and backcasting output to choose one pilot workflow, name the sponsor/reviewer, attach the evidence bundle, and define the shadow ROI metric.

4. **Use Knowledge Workspace as the memory layer.**
   Let `/knowledge` capture reusable project notes, workflow briefs, entity context, and pilot learnings while keeping evidence refs and note refs separate.

5. **Keep paperwork synchronized.**
   Every release or strategic shift should update `CHANGELOG.md`, `TASKS.md`, `HANDOVER.md`, `BACKLOG.md`, `docs/ROADMAP.md`, and the relevant pilot docs before it is treated as done.

6. **Configure production email deliberately.**
   Before demos use custom domains, confirm Clerk email verification is enabled, set the product sender domain (`pinavia.io`), configure the product email provider credentials in Render, and send one scheduled synthesis test email end to end.
