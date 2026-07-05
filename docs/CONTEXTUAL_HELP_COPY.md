# Contextual Help Copy Registry

Status: Active UX copy registry.
Last updated: 2026-07-05.

This file tracks the plain-language explanations used by the contextual help question-mark dialogs in Mission Control.

When adding a feature:

1. Add help only where the user may reasonably ask, "What does this mean?" or "How should I use this?"
2. Keep the title short.
3. Explain meaning, why it matters, and what the user should do.
4. Avoid technical implementation language unless the user must configure something.
5. Keep the app copy and this registry aligned in the same pull request.

Implementation:

- Component: `apps/mission-control/components/ui/help-dialog.tsx`
- Primitives: `HelpDialog`, `HelpLabel`
- KPI support: `KpiHero.help` in `apps/mission-control/components/ui/nexus-primitives.tsx`

## Current Help Items

| Surface | Item | Dialog title | Plain-language explanation |
|---|---|---|---|
| Executive Room | Confidence KPI | Evidence confidence | This is the average confidence score across the evidence in this workspace. Higher confidence means Nexus has cleaner, more usable sources. Use it to decide whether the brief is ready to trust or whether evidence needs review first. |
| Executive Room | Open decisions KPI | Open decisions | These are decisions that still need a human owner to resolve them. Nexus can draft and suggest, but the decision stays human-owned. |
| Executive Room | Blockers KPI | Blockers | Blockers are open actions marked as preventing progress. Treat these first because new synthesis or exports may be less useful until the blocker is cleared. |
| Executive Room | Hours back KPI | Hours back | This is a directional estimate of time returned by using approved evidence and active agent briefs. It is not a billing number; use it as a pilot value signal. |
| Executive Room | Today's executive route | Today's executive route | This is the short list of work Nexus thinks matters next. It combines blockers, open decisions, and recommendations so executives do not need to inspect every room first. |
| Executive Room | Mission health | Mission health | Mission health shows whether each room has enough cleared evidence and whether there are visible blockers. Use it as a scan before drilling into a room. |
| Executive Room | Guided next action | Guided next action | This is an AI-generated suggestion for the next practical step. It should guide attention, not replace judgment. The owner and audit chips show who should act and how it is tracked. |
| Executive Room | Active recommendations | Active recommendations | Recommendations are AI-drafted suggestions based on approved evidence. They are not actions until a human approves, rejects, or turns them into a decision. |
| Ask | Query box | Workspace-scoped question | Ask uses only this workspace's approved evidence, notes, and allowed agent context. It should answer business questions with sources, not general internet questions. |
| Ask | Agent selector | Agent governance lens | The lens chooses which agent passport and rules apply before evidence reaches the model. Use General Ask for broad questions, or choose a specialist when the question belongs to risk, strategy, finance, security, or governance. |
| Ask | Department filter | Department filter | This narrows Ask to evidence from one department. Use it when you want Finance, Risk, Operations, or another team view instead of a company-wide answer. |
| Ask | Answer panel | Ask answer | The answer is generated from approved workspace evidence. Check the confidence badge and source list before using it in a client, board, or operating decision. |
| Ask | Freshness badge | Freshness | Freshness shows the age of the newest relevant source used in this answer. Lower is generally better for fast-moving risks or operating updates. |
| Ingestion | Upload panel | Upload and ingest | Upload adds files to Nexus as evidence. Nexus extracts text, checks confidence and provenance, then either clears the source, sends it to approval, or quarantines it. |
| Ingestion | Extraction confidence | Extraction confidence | This estimates how reliably Nexus understood the file text and metadata. High confidence can enter synthesis automatically; medium confidence needs review; low confidence is quarantined. |
| Ingestion | Quarantine note | Quarantine | Quarantine means Nexus will not use the file in answers or briefs. This protects the workspace when a source is unclear, incomplete, or missing reliable provenance. |
| Executive Synthesis | Brief label | Executive brief | This brief answers the questions that matter to this role using specialist agent briefs and approved evidence. Use it as the top-level summary before drilling into sources or decisions. |
| Executive Synthesis | Answered count | Answered questions | This shows how many role-specific questions had enough usable evidence for Nexus to answer. If the count is low, upload or approve more relevant sources. |
| Executive Synthesis | Human approval badge | Human-approved actions only | Nexus can recommend or draft next steps, but it does not take external action automatically. A human must approve anything that becomes a real decision or workflow step. |
| Approvals | Queue title | Evidence approval queue | This queue holds evidence that is usable enough to review, but not safe enough to approve automatically. Approve only sources you are comfortable letting Nexus use in answers and briefs. |
| Approvals | Confidence | Review confidence | Confidence shows how clearly Nexus extracted and understood this source. Medium-confidence items need human review before they can influence briefs or recommendations. |
| Recommendations | Queue title | Recommendation queue | Recommendations are generated from approved evidence. Review the confidence and source trail, then approve only when the recommendation is useful and safe to act on. |
| Workflows | Scorer | Workflow Twin Scorer | The scorer ranks possible pilot workflows by pain, data readiness, risk, speed benefit, and executive judgment. Use the top recommendation to choose a practical first pilot. |
| Workflows | Score column | Workflow score | The overall score combines readiness, pain, risk, and benefit into one ranking. Higher means this workflow is a better first pilot candidate. |
| Workflows | Data column | Data readiness | Data readiness shows whether Nexus has enough usable evidence to support this workflow. Low data readiness usually means more uploads or connectors are needed first. |
| Workflows | Risk column | Workflow risk | Risk captures compliance, operational, or judgment risk. High-risk workflows may still be valuable, but they need clearer approval boundaries. |
| Workflows | Speed column | Speed benefit | Speed estimates how much faster this workflow could become with Nexus support. Use it as a practical value signal, not a final ROI claim. |
| Workflows | Backcast | Backcast the pilot | Backcasting starts with the outcome you want at the end of the pilot, then works backward to define scope, milestones, evidence, approvals, and success metrics. |
| Workflows | Shadow ROI | Shadow ROI | Shadow ROI compares the current manual process against a Nexus-assisted run before making commercial claims. It helps prove value with observed time saved and rework reduced. |
| Workflows | Manual minutes | Manual minutes | How long this workflow usually takes without Nexus. Use the best honest estimate or an observed baseline from a recent run. |
| Workflows | Nexus minutes | Nexus minutes | How long the same workflow takes with Nexus assisting. This should include human review time, not just AI processing time. |
| Settings | AI budget | AI budget | This shows how much of the monthly model-token allowance the workspace has used. If it reaches the limit, AI features may pause or become restricted until the next reset. |
| Settings | Resource limits | Resource limits | These are plan limits for roles, evidence, team members, API keys, and Ask usage. They help prevent a pilot workspace from growing beyond the current subscription. |
| Settings | Features | Plan features | This list shows which product capabilities are enabled on the current plan and which require an upgrade. |
| Settings | Quarantine threshold | Quarantine threshold | Evidence below this confidence level is blocked from answers and briefs. Raising it is safer but may send more sources to review; lowering it allows more sources through. |
| Settings | Default upload sensitivity | Default upload sensitivity | This is the default classification for newly uploaded files. Use Internal for normal operating files, Confidential for sensitive business material, and Restricted for content that should rarely leave tight controls. |
| Settings | Slack integration | Slack integration | When enabled, Nexus can receive approved Slack events and files according to connector policy. Leave it off until the workspace has a Slack app and clear channel rules. |
| Settings | Allowed providers | Allowed AI providers | These are the model providers this workspace is allowed to use. Regulated or sensitive clients may restrict the list to approved providers only. |
| Settings | Local-only mode | Local-only mode | Local-only mode blocks cloud model calls for this workspace. Use it only when the client requires local or controlled processing and the local runtime is ready. |
| Settings | Sensitivity ceiling | Sensitivity ceiling | The ceiling is the highest sensitivity level AI providers may process. If a source is more sensitive than the ceiling, Nexus should block it from model context. |
| Settings | Human-review threshold | Human-review threshold | Outputs below this confidence level should be reviewed before use. Raising it increases caution; lowering it reduces review volume. |
| Settings | Scheduled synthesis | Scheduled synthesis | Scheduled synthesis automatically refreshes selected leadership briefs on a cadence. It is useful for weekly reviews and recurring executive updates. |
| Settings | Cadence | Cadence | Cadence controls when Nexus refreshes the selected briefs. Use a simple preset unless you need a custom cron schedule. |
| Settings | Roles to refresh | Roles to refresh | Choose which leadership lenses should be regenerated on schedule. Start with the CEO or sponsor role for demos, then add more roles once evidence coverage improves. |
| Settings | Delivery channels | Delivery channels | Delivery controls where scheduled briefs appear. In-app history is active now; email and Slack depend on provider configuration and workspace policy. |
| Connectors | Connector setup guide | Connector setup guide | This is the complete connector list for this workspace. Use it to see which connectors are live, which are future, what credentials are required, and which provider setup page to open before clicking Install. |
| Connectors | Connector max sensitivity | Connector max sensitivity | This is the highest sensitivity level this connector may ingest. Anything above the limit should be blocked or held back by policy. |
| Connectors | Allowed Slack channel IDs | Allowed Slack channel IDs | Only messages from these Slack channels can become evidence. Use this to keep pilots focused and avoid pulling unrelated conversations into Nexus. |
| Connectors | Default sensitivity | Default sensitivity | This label is applied to new evidence from the connector unless a more specific rule overrides it. |
| Connectors | Max sensitivity | Max sensitivity | This caps the sensitivity level this connector is allowed to ingest. Use a lower cap for channels or systems that should never bring restricted material into Nexus. |
| Connectors | Source policy | Source policy | Source policy controls how Nexus treats incoming data from this connector: ingest automatically, prefer manual review, or disable the source. |
| Connectors | IMAP host | IMAP host | The IMAP host is the mail server address provided by your email host, such as imap.example.com. Nexus uses it to read mailbox messages after you connect. |
