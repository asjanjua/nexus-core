# TASKS.md — NexusAI Roadmap and Checklist

> Master task list for the NexusAI relay team. Do not delete tasks; mark them complete with `[x]`.

---

## Project Overview

**Project name:** NexusAI Mission Control
**Goal:** Executive intelligence command layer for paid enterprise pilots.
**Target:** CEOs, COOs, CTO/CDOs, strategy leaders, and transformation sponsors who need faster evidence-backed understanding of company status, risks, decisions, and recommendations.
**Stack:** Next.js 15, TypeScript, Clerk, Postgres/Drizzle/pgvector, R2, Render, LLM provider routing.

---

## Roadmap Principle

Build from **essential** to **aspirational**:

1. Make the product trustworthy, usable, and sellable.
2. Prove the paid pilot loop with documents, evidence, dashboards, Ask, recommendations, and approvals.
3. Add enterprise collaboration and core connectors.
4. Expand into company memory, local/private processing, contextual agents, and Obsidian-inspired experiences.

---

## Phase 1 — Essential Foundation

- [x] Create Mission Control app in `apps/mission-control`
- [x] Add Clerk auth and workspace scoping
- [x] Add Postgres/Drizzle schema and migrations
- [x] Add ingestion contracts, provenance, confidence, quarantine statuses
- [x] Add R2 original-file storage path
- [x] Add pgvector migration and vector retrieval path
- [x] Deploy on Render
- [x] Verify live auth, ingestion, and workspace scoping
- [x] Add dependency vulnerability cleanup pass
- [x] Add production health checklist for DB, vector search, object storage, auth, and LLM provider

---

## Phase 2 — AI Trust and Operating Model

- [ ] Define AI modes used across the product: Detect, Extract, Classify, Summarize, Reason, Recommend, Draft, Monitor, Route, Act-with-Approval
- [ ] Define AI trust levels: deterministic system action, AI-assisted suggestion, AI-generated draft, human-approved output, blocked/refused output
- [ ] Define global AI output contract: answer, confidence, evidence refs, freshness, sensitivity, reasoning note, suggested next action, and refusal reason
- [ ] Define where AI can act autonomously: low-risk classification, deduplication suggestions, search expansion, draft generation, and non-sensitive summaries
- [ ] Define where AI must ask for approval: recommendations, outbound messages, canonical memory promotion, sensitive summaries, connector actions, and agent task completion
- [ ] Define where AI must never act in V1: financial transactions, HR actions, legal commitments, contract approvals, system writebacks, social posting, or external commitments
- [ ] Add AI model-routing policy by task type: cheap model for classification, stronger model for synthesis, embedding model for retrieval, local model for sensitive extraction
- [ ] Add AI cost and latency budgets per task type
- [ ] Add AI fallback policy when provider fails: retry, downgrade model, deterministic fallback, or human review queue
- [ ] Add AI audit event schema for every generation, classification, recommendation, refusal, and agent action
- [ ] Add AI evaluation harness with golden prompts for risks, decisions, recommendations, sector classification, source grounding, and restricted-data refusal
- [ ] Add prompt/version registry so every AI behavior has a named prompt, owner, version, and changelog
- [ ] Add hallucination controls: cite evidence, refuse weak evidence, show confidence, and never invent source references
- [ ] Add red-team checks for sensitive data leakage, unsafe recommendations, unsupported claims, and role-inappropriate outputs
- [ ] Add workspace-level AI policy settings: allowed providers, local-only modes, sensitivity thresholds, and approval requirements
- [ ] Add per-phase AI responsibility map so every roadmap phase states what AI detects, what AI drafts, what AI routes, and what humans approve

---

## Phase 3 — Public Front Door, Trust, and Licensing

- [ ] Add public landing page before authenticated app routes
- [ ] Add hero section with headline: "Your company's second brain for decisions, risks, and executive action."
- [ ] Add subheadline explaining evidence-backed briefs, recommendations, role-aware intelligence, and company memory
- [ ] Add primary CTA: "Start a Pilot"
- [ ] Add secondary CTA: "View Demo Workspace"
- [ ] Add product mockup area showing CEO Brief, Risk Radar, Decision Memo, and Evidence Panel
- [ ] Add value cards: Evidence-backed answers, Company memory that compounds, Cloud or local processing for sensitive files
- [ ] Add trust line: "Built for human-approved executive intelligence. Every answer links back to evidence."
- [ ] Add `/terms` page
- [ ] Add `/privacy` page
- [ ] Add `/security` page
- [ ] Add `/acceptable-use` page
- [ ] Add enterprise `/data-processing` placeholder for future DPA flow
- [ ] Adopt PolyForm Noncommercial 1.0.0 for public source distribution
- [ ] Add commercial license available notice to README
- [ ] Add `LICENSE.md` with PolyForm Noncommercial terms
- [ ] Add human-review disclaimer for AI-generated executive outputs
- [ ] Add customer data ownership statement
- [ ] Add beta/pilot software disclaimer

---

## Phase 4 — Core Product UX Stabilization

- [x] Batch upload up to 10 files in onboarding
- [x] Batch upload up to 10 files in dashboard ingestion
- [x] Add active side-nav highlighting
- [x] Add dashboard loading skeletons
- [x] Polish Ask tab history, source details, and suggested prompts
- [x] Polish ingestion result guidance and quarantine refresh prompt
- [x] Polish recommendations empty state and actor handling
- [ ] Rewrite remaining technical page descriptions into exec-friendly language
- [ ] Add mobile/tablet navigation behavior
- [ ] Convert duplicated dashboard routes into one dynamic route
- [ ] Add richer source display instead of raw evidence IDs where possible
- [ ] Add richer original document preview path

---

## Phase 5 — Company Context Onboarding

- [x] Add sector/company type library
- [x] Add workspace profile contract and persistence
- [x] Add onboarding step for company type before uploads
- [x] Add free-text company description box
- [x] Add AI classifier for sector, subsector, business model, likely roles, likely documents, KPIs, and risk defaults
- [x] Add deterministic fallback when AI is unavailable
- [x] Let users confirm/edit AI-generated company profile
- [x] Use company profile in dashboard and Ask prompts
- [x] Use company profile to recommend first upload pack
- [ ] Add Settings page editor for company profile after onboarding
- [ ] Persist confirmed upload-pack suggestions or derive them from the stored sector profile on demand
- [ ] Add AI responsibility notes: AI detects sector/profile, suggests roles/docs/KPIs/risks, humans confirm profile before it becomes workspace context
- [ ] Add profile-confidence gate: low-confidence company detection routes to manual selection instead of silently applying defaults

---

## Phase 6 — Evidence, Ingestion, and Governance

- [ ] Add department taxonomy
- [ ] Add department metadata to evidence records
- [ ] Let users choose department during upload
- [ ] Add AI-suggested department labels per file
- [ ] Add department filters in Sources, Ingestion, Ask, and dashboards
- [ ] Add sector-specific department defaults
- [ ] Add AI responsibility notes: AI classifies document department/sensitivity, humans can override, restricted files inherit stricter processing rules
- [ ] Add admin delete/archive path for test or bad evidence records
- [ ] Add audit view improvements
- [ ] Add rate-limit/cost guardrails for LLM calls
- [ ] Add AI responsibility notes: AI can flag weak evidence, stale evidence, conflicting evidence, and unsafe outputs; humans approve promotion and external delivery
- [ ] Add AI refusal patterns for missing evidence, low confidence, restricted data, stale sources, and role-unauthorized requests

---

## Phase 7 — Paid Pilot Packaging

- [ ] Add sponsor-facing onboarding checklist
- [ ] Add pilot success scorecard
- [ ] Add weekly executive brief export
- [ ] Add risk radar export
- [ ] Add recommendation register export
- [ ] Add sample dataset / demo workspace reset flow
- [ ] Add AI responsibility notes: AI generates pilot artifacts from approved evidence; sponsor review required before final external pack delivery

---

## Phase 8 — Team Members and Sub-Accounts

- [ ] Add workspace member invitation flow from Settings
- [ ] Add roles: Owner, Admin, Executive, Reviewer, Contributor, Viewer
- [ ] Add CxO/business lens assignment per member: CEO, COO, CBO/Strategy, CTO/CDO, Finance, Risk, Sales, Operations, HR, Product
- [ ] Add department and sensitivity access policy per member
- [ ] Add invitation emails and accepted/pending/revoked membership states
- [ ] Add audit events for invite, role change, removal, and access-policy changes
- [ ] Add team member management page for CXOs/admins
- [ ] Add read-only external advisor access for consultants, board members, and pilot sponsors
- [ ] Add AI responsibility notes: AI suggests role/lens/access defaults from job title and department, but admins approve permissions

---

## Phase 9 — Core Enterprise Connectors

- [ ] Build connector abstraction: auth, sync schedule, source object mapping, provenance, permissions, and failure handling
- [ ] Add connector registry UI in Settings with status, owner, last sync, health, and sensitivity policy
- [ ] Add source-level access and sensitivity controls per connector
- [ ] Add per-connector audit trail and sync failure alerts
- [ ] Add OAuth/token refresh and rotation handling
- [ ] Add CSV/export fallback for systems without API access
- [ ] Add webhook ingestion path for tools that support real-time updates
- [ ] Add department-specific connector bundles
- [ ] Add Docs + Comms bundle: Google Drive, SharePoint, OneDrive, Dropbox, Box, Slack, Microsoft Teams, Gmail, Outlook
- [ ] Add Meetings bundle: Zoom, Google Meet, Microsoft Teams recordings/transcripts, Otter.ai, Fireflies.ai
- [ ] Add Project/Work bundle: Jira, Linear, Asana, Monday.com, ClickUp, Trello, Smartsheet
- [ ] Add CRM/Sales bundle: Salesforce, HubSpot, Microsoft Dynamics 365 CRM, Zoho CRM, Pipedrive
- [ ] Add Finance/ERP bundle: NetSuite, SAP, Oracle ERP, Microsoft Dynamics 365 Finance, QuickBooks, Xero, Sage
- [ ] Add HR/People bundle: Workday, BambooHR, HiBob, ADP, SAP SuccessFactors, Oracle HCM
- [ ] Add BI/Data bundle: Power BI, Tableau, Looker, Metabase, Snowflake, BigQuery, Redshift, Databricks
- [ ] Add Support/Customer bundle: Zendesk, Intercom, Freshdesk, ServiceNow, Gainsight
- [ ] Add Engineering/Product bundle: GitHub, GitLab, Bitbucket, Sentry, Datadog, PagerDuty, Jira, Linear
- [ ] Add Security/Compliance bundle: Vanta, Drata, OneTrust, Okta, Microsoft Entra ID, Google Workspace Admin
- [ ] Add Procurement/Legal bundle: DocuSign, Ironclad, Coupa, Zip, SharePoint legal folders
- [ ] Add Marketing/Growth bundle: Google Analytics, Search Console, Google Ads, LinkedIn Ads, HubSpot Marketing, Mailchimp
- [ ] Add AI responsibility notes: AI normalizes connector data into evidence/entities, summarizes trends, detects anomalies, and drafts recommendations; humans approve writebacks or outbound actions
- [ ] Add connector-specific AI policy for each system: read-only, draft-only, approval-required writeback, or blocked

---

## Phase 10 — Social, Market, and External Signal Connectors

- [ ] Add Social Media bundle: Meta/Facebook Pages, Instagram Business, LinkedIn Pages, X/Twitter, TikTok Business, YouTube, Reddit, Threads
- [ ] Add Meta integration path for Facebook Pages and Instagram Business insights, posts, comments, ad performance, and audience metrics
- [ ] Add social listening and brand-risk ingestion for executive reputation, campaign performance, customer sentiment, and competitor signals
- [ ] Add social connector safety policy: no autonomous posting in V1, read-only analytics and draft recommendations only
- [ ] Add connector priority order: Drive/SharePoint/OneDrive, Slack/Teams, Gmail/Outlook, Jira/Asana/Monday, Salesforce/HubSpot, BI exports, QuickBooks/Xero/NetSuite, ServiceNow/Vanta/Drata, GitHub/GitLab/Sentry/Datadog, Workday/BambooHR/HiBob, Meta/LinkedIn/Google Analytics

---

## Phase 11 — Company Memory / Second Brain

- [ ] Define Nexus company-memory model: Evidence, Entity, Decision, Recommendation, Risk, KPI, Project, Person, Department, System, Process, and Meeting
- [ ] Add backlinks between evidence, entities, decisions, recommendations, owners, risks, and KPIs
- [ ] Add entity pages that show timeline, linked evidence, decisions, open risks, and recommendations
- [ ] Add "What changed since last week?" memory diff view
- [ ] Add recurring-memory detection for risks, blockers, customers, projects, and strategic themes
- [ ] Add provenance-preserving summarization for entity pages
- [ ] Add AI responsibility notes: AI proposes links/entities/memory updates, humans approve canonical memory for high-impact records
- [ ] Add memory confidence scoring: inferred, supported, confirmed, stale, contradicted
- [ ] Add Markdown/Obsidian-compatible export for company memory notes
- [ ] Add optional Markdown/Obsidian import path for existing company vaults
- [ ] Add frontmatter schema for exported notes so company memory remains portable

---

## Phase 12 — Hybrid Cloud + Local Edge Client

- [ ] Define hybrid deployment modes: Cloud SaaS, Private Cloud/VPC, Local Edge Client, and Full On-Prem Appliance
- [ ] Add local edge client architecture for sensitive documents that should not leave the customer environment
- [ ] Define what stays local: original files, raw extracted text, embeddings if required, local audit logs, and restricted evidence
- [ ] Define what can sync to cloud: redacted summaries, metadata, evidence hashes, approved insights, aggregate dashboards, and non-sensitive recommendations
- [ ] Add customer policy controls for cloud-allowed, local-only, restricted, and do-not-process data classes
- [ ] Add local ingestion worker that watches approved folders and processes PDFs/DOCX/PPTX/XLSX/Slack/Teams exports locally
- [ ] Add local LLM processing option for extraction cleanup, classification, entity detection, and first-pass summarization
- [ ] Add model/provider options for local processing: Apple Silicon llama.cpp, Ollama, LM Studio, vLLM on GPU server, or customer-approved internal model endpoint
- [ ] Evaluate Mac Studio appliance package for regulated clients: managed device, encrypted storage, local LLM, local vector index, VPN/tunnel, remote monitoring, and update channel
- [ ] Add secure sync protocol from local client to Nexus cloud with signed payloads, tenant-scoped keys, retry queue, and audit receipts
- [ ] Add admin UI showing local client health: online/offline, last sync, queue depth, model version, ingestion throughput, and failed jobs
- [ ] Add installer/update path for local client: macOS app, Docker Compose, or lightweight CLI service
- [ ] Add "never upload originals" customer mode where cloud dashboards only receive approved summaries and provenance hashes
- [ ] Add disaster-recovery and key-rotation process for local/on-prem customers
- [ ] Add pricing/package decision for local appliance: software-only, managed Mac Studio, or customer-owned hardware
- [ ] Add AI responsibility notes: local AI processes restricted files inside customer boundary, cloud AI only sees permitted summaries/metadata
- [ ] Add local-vs-cloud model policy per sensitivity class and per connector

---

## Phase 13 — Contextual Company Agents

- [ ] Define agent persona model: name, role, purpose, skills, memory scope, permissions, escalation rules, and company-context grounding
- [ ] Add agent templates that adapt to company sector and profile: Chief of Staff, Risk Analyst, COO Operator, Sales/Growth Analyst, CTO/CDO Data Steward, Compliance Reviewer, Finance Analyst
- [ ] Add agent "souls": stable voice, working style, memory, priorities, and behavioral constraints per company context
- [ ] Add agent task runner for evidence review, brief drafting, risk watch, recommendation follow-up, decision tracking, and owner nudges
- [ ] Add skill registry for agents inspired by Hermes/OpenClaw: read documents, summarize, search memory, draft memo, create task, send Slack update, prepare review packet
- [ ] Add human approval boundary for all external actions and high-impact recommendations
- [ ] Add agent memory journal: what the agent learned, why it changed confidence, and which evidence caused the change
- [ ] Add agent handoff protocol so Codex/Hermes/OpenClaw-style agents can work inside one Nexus workspace without losing context
- [ ] Add agent activity feed for CXOs: current tasks, blocked items, recent findings, and recommended next actions
- [ ] Add company-specific agent creation flow during onboarding after role selection
- [ ] Add AI responsibility notes: agents can monitor, draft, classify, summarize, and prepare work packets; high-impact actions require human approval
- [ ] Add agent permission tiers: observer, analyst, drafter, operator-with-approval, blocked

---

## Phase 14 — Obsidian-Inspired Experience

- [ ] Add graph view of company memory: entities, evidence, decisions, risks, recommendations, owners, and departments
- [ ] Add canvas view for strategy maps, operating models, risk maps, project maps, and decision trees
- [ ] Add bidirectional links in UI so every insight can jump to source evidence and related entities
- [ ] Add note-style entity pages with backlinks, tags, frontmatter metadata, and source panels
- [ ] Add saved views: CEO map, COO execution map, Risk radar map, Strategy growth map, Technology/data map
- [ ] Add visual clustering by sector, department, sensitivity, freshness, and confidence
- [ ] Add "open in vault/export to vault" action for Obsidian-compatible markdown bundles
- [ ] Add keyboard-first navigation and command palette for power users
- [ ] Add graph/canvas permissions so restricted evidence is hidden or masked for unauthorized users
- [ ] Add AI responsibility notes: AI suggests graph links, clusters, canvases, and narrative paths; users choose what becomes visible or canonical
