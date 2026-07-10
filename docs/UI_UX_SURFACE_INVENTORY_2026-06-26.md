# UI/UX Surface Inventory - 2026-06-26

Purpose: support the Figma V0.1/V0.2 desktop-browser review with a real end-to-end product flavour instead of isolated screens.

## Surface Arc

1. Public entry and pilot intent
   - `/` introduces Mission Control, room-based intelligence, operating stats, and the connect-verify-decide loop.
   - `/product-brief` is the shareable one-page buyer brief.
   - `/readiness` scores seven dimensions and routes the buyer to foundations, focused pilot, deployment, or accelerated deployment.
   - `/start-pilot` routes signup into onboarding.

2. Workspace setup
   - `/onboarding` runs seven steps: Workspace, Discover, Profile, Roles, Upload, Preview, Go Live.
   - Role selection, starter upload packs, and first-focus intent make onboarding the best place to show V0.2 guidance.

3. Data connection and intake
   - `/settings/connectors` is the connector catalogue: SaaS, warehouse, private/IMAP, OAuth status, policies, and setup hints.
   - `/ingestion` handles file upload, extraction confidence, processed/pending/quarantined outcomes.
   - `/sources` shows status summaries, evidence records, source paths, hashes, timestamps, and deletion.

4. Trust and review
   - `/review` combines in-review recommendations, pending approval, quarantined evidence, and the latest audit trail.
   - `/approvals` is the evidence approval queue.
   - `/evidence/[id]` is the evidence detail surface for source, confidence, freshness, extracted text, and original document access.

5. Intelligence and work
   - `/dashboard/[role]` is the room model: Executive, Operating, Growth, Technology, Finance, Risk, People.
   - `/ask` is workspace-scoped Q&A with agent governance lens, department filtering, answer confidence, freshness, evidence refs, and escalation.
   - `/recommendations` is the review/action queue for AI-generated recommendations.
   - `/decisions` is the Decision & Action Twin with decision proposals, status, priority, actions, blockers, and owners.
   - `/workflows` is Workflow Twins: scorer, inventory, backcast, shadow ROI, and latest scorer run.
   - `/entities` and `/entities/[id]` are Company Memory, linking people/projects/risks/KPIs/systems/processes to evidence, decisions, recommendations, actions, and timeline.
   - `/knowledge` is the governed vault workspace: notes, graph, backlinks, entity links, portability, and local sync.

6. Governance and proof
   - `/settings` covers Plan & Usage, Workspace, Company Profile, LLM Provider, Sources, Policies, AI Policy, Eval, Prompts, Agent Governance, Scheduled Synthesis, API Keys, Roles, Audit Log, Demo Tools.
   - `/settings/policies` covers allowed providers, thresholds, and local-only mode.
   - `/export` is the delivery hub for pilot paperwork, weekly brief, one-pager, risk radar, and recommendation register.
   - `/export/weekly-brief`, `/export/one-pager`, and `/pilot/paperwork` are the shareable value-proof outputs.

## V0.1 vs V0.2 Read

V0.1 should be represented as a strong room-and-tool cockpit. It is credible, distinctive, and close to the Render structure, but it asks users to decide where to go after each result.

V0.2 should keep rooms as the mental model while adding guided routing: every upload, answer, evidence badge, decision, workflow, and export should carry the next governed action.

## Figma Artifact

Figma file: `https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun`

Primary review pages:
- `04 V0.1 V0.2 Desktop Buildout` for the side-by-side V0.1/V0.2 strategy comparison.
- `05 V0.1 Full Desktop Prototype` for the fully expanded Render-aligned V0.1 desktop journey.
- `06 V0.2 Full Desktop Prototype` for the fully expanded proposed guided-routing desktop journey.

Key sections:
- Four-screen V0.1 row and four-screen V0.2 row for executive entry, decision/approval, evidence trust, and workflow run.
- Deep user-hit extension for ingestion and Ask.
- End-to-end surface story covering public entry, onboarding, connectors, ingestion, review, approvals, evidence, Ask, rooms, decisions, workflows, company memory, exports, settings, AI policy, and pilot paperwork.

V0.1 full prototype screens:
1. Public Home
2. Product Brief
3. Readiness Assessment
4. Onboarding Workspace
5. Onboarding Discover
6. Onboarding Profile
7. Onboarding Roles
8. Onboarding Upload
9. Onboarding Preview
10. Onboarding Go Live
11. Executive Room
12. Ask
13. Ingestion
14. Sources
15. Review Queue
16. Approvals
17. Evidence Detail
18. Recommendations
19. Decisions
20. Workflow Twins
21. Company Memory
22. Entity Detail
23. Knowledge Workspace
24. Export Hub
25. Connectors
26. Settings
27. AI Policy
28. Weekly Brief
29. One Pager
30. Pilot Paperwork

V0.2 full prototype uses the same 30-screen arc for direct comparison, with these product differences visible across the board:
- The executive route is explicit on every screen through a Now / Next strip and a single primary next action.
- Confidence surfaces link to trust drawer previews: sources, freshness, sensitivity, model route, reviewer status, and audit trace.
- Approvals include consequence previews before they unlock exports, notifications, tasks, or any external-send path.
- Ingestion, Ask, Sources, Review, and Export surfaces show source coverage as found, weak, stale, missing, or quarantined.
- Ownership is visible across onboarding, review, approvals, decisions, workflows, settings, and policy so work does not disappear into generic queues.

Review question for colleagues: which version helps an executive understand, trust, and act faster?
