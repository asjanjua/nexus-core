# NexusAI Mission Control -- User Flows

Updated: 2026-06-10
Version: v0.18.0

> This document describes the end-to-end journeys a user takes through NexusAI Mission Control.
> It serves three audiences: pilot sponsors (what happens when I use this), developers (how the
> pieces connect), and the build team (where new features plug in).
>
> For technical plumbing and data model details, see ARCHITECTURE.md.
> For the feature checklist, see TASKS.md.

---

## 1. First Contact -- Public Pages (No Login Required)

### 1.1 AI-Native Readiness Assessment

**Entry:** `/readiness` (public, no auth)

**Flow:**
1. User lands on the readiness page. No account or login required.
2. Seven-dimension scoring questionnaire: AI maturity, data readiness, governance posture, executive alignment, technology stack, change readiness, and risk appetite.
3. User submits answers.
4. System scores each dimension, produces a readiness profile with strengths and gaps.
5. `POST /api/readiness/submit` captures the lead (name, email, company) and audit-logs the assessment.
6. User sees results immediately. Leap Associates receives the lead for follow-up.

**Why this matters:** This is the top-of-funnel entry point. A prospect who completes this is pre-qualified and has already self-assessed their AI readiness. The sales conversation starts from their score, not from zero.

### 1.2 Product Brief

**Entry:** `/product-brief` (public)

**Flow:** Static page describing the NexusAI value proposition, agent rooms, governance model, and pilot structure. No interactive elements. Used as a leave-behind after demos.

---

## 2. Sign-Up and Authentication

### 2.1 New User Registration

**Entry:** `/sign-up`

**Flow:**
1. Clerk-hosted sign-up form. Email or SSO.
2. On success, Clerk creates user and organization.
3. System checks for an existing workspace. If none, redirects to `/onboarding`.
4. If workspace exists, redirects to the user's default dashboard.

### 2.2 Returning User Login

**Entry:** `/sign-in` or `/login`

**Flow:**
1. Clerk-hosted sign-in.
2. On auth, system loads workspace. If workspace is in demo mode, a banner indicates it.
3. Redirect to last-used dashboard or `/dashboard/ceo` by default.

---

## 3. Onboarding -- First Workspace Setup

**Entry:** `/onboarding` (redirected after first sign-up)

This is a 7-step wizard (`app/onboarding/wizard.tsx`). Each step must complete before advancing.

### Step 1 -- Workspace Provision

System creates the workspace record. User sees a loading state while the backend provisions workspace settings, default policies, and initial audit event.

### Step 2 -- AI Discovery

User describes their company in free text and/or selects a sector from the sector library (8 sectors: financial services, professional services, technology, healthcare, manufacturing, retail/consumer, energy/resources, real estate/construction).

The system uses `detectCompanyProfile()` to identify sector, sub-sector, stage, size band, and regulatory context. Sector cards highlight what NexusAI already knows about their industry.

### Step 3 -- Profile Confirmation

System shows the detected company profile: name, sector, sub-sector, business model, stage, headcount band, and archetype (corporate, startup_scaleup, sme_physical, digital_native, professional_practice).

User confirms or corrects. The archetype selection determines which roles are suggested, what brief language agents use, and which evidence types are expected.

### Step 4 -- Role Selection

System runs `suggestRolesForProfile()` against the 20-role registry. Roles are shown in three states:

- **Active:** live dashboard, recommended for this company profile
- **Staged:** anticipated for next growth stage, visible but not populated
- **Available:** relevant but not yet activated

User selects which roles to activate. CEO is always locked active. User can also add custom roles. The selection determines which Agent Rooms are populated and which specialist agents generate briefs.

### Step 5 -- Document Upload with AI Classification

User uploads up to 10 files (PDF, DOCX, PPTX, XLSX, TXT, MD).

For each file, `classifyFilename()` auto-detects department and suggests sensitivity. User can override both. Sensitivity options: public, internal, confidential, restricted.

Files are ingested via `POST /api/ingestion/status`:
- Text extraction and source classification
- Confidence scoring and sensitivity assignment
- pgvector embedding (when enabled)
- Original file stored in R2 (when enabled)
- Each record gets ingestionStatus: processed, pending_approval, quarantined, or failed

### Step 6 -- Evidence Preview

User sees ingestion results: how many files processed, pending, quarantined. Each file shows extraction confidence and assigned sensitivity. User can review and adjust before proceeding.

### Step 7 -- Go Live

User sets a focus intent (free text, e.g., "What's blocking our growth and what risks need my attention?"). System runs `mapFocusToDashboard()` to suggest which Agent Room to open first.

User selects a role dashboard to enter. The wizard passes the first suggested question as a query parameter so the Ask panel can pre-populate.

**End state:** User lands in their first Agent Room with evidence already ingested and a question ready to ask.

---

## 4. Daily Operation -- The Core Loop

Once onboarded, the daily product loop has four surfaces: Dashboards (Agent Rooms), Ask, Decisions, and Approvals.

### 4.1 Agent Room Dashboards

**Entry:** `/dashboard/[role]` (e.g., `/dashboard/ceo`, `/dashboard/coo`)

**Flow:**
1. Dashboard page loads for the selected role.
2. `cardsForRole()` in `dashboard.ts` identifies which specialist agents serve this role using `agentBriefIdsForRoleContext()`.
3. For each agent:
   a. Load the agent's Agent Control Profile (passport).
   b. Load all processed evidence for the workspace.
   c. Filter evidence through `filterEvidenceByPassport()` -- denied evidence is audited and never enters model context.
   d. Build company context prefix using `buildCompanyContext()` with archetype-aware brief language via `briefLanguageInstruction()`.
   e. Send filtered evidence to LLM with agent mandate, role context, and system prompt.
   f. Run output through `evaluateOutputGate()` -- checks for legal, regulatory, pricing, data, and external comms triggers. Hard-stop patterns (send_email, submit_filing, make_payment, etc.) are blocked.
   g. Save the generated brief as an `agent_outputs` row with version, confidence, evidence refs, and active flag.
   h. Write audit event.
4. Dashboard renders cards. Each card shows: agent name, brief content, confidence score, evidence count, and timestamp.
5. User can interact with each card: view evidence refs, submit learning signals (approve/edit/reject/thumbs_up/thumbs_down), or drill into evidence.

**What the user sees:** One leadership synthesis first, with named AI analysts underneath as the proof trail. Not a BI dashboard. Not charts.

### 4.1a Executive Synthesis Brief

**Entry:** `/dashboard/[role]` (primary dashboard view)

**Flow:**
1. Dashboard loads the normal specialist cards through `cardsForRole()`.
2. The dashboard passes those governed cards into `synthesiseForRole()` to produce one role-aware brief from the specialist card summaries and evidence refs.
3. The synthesis service applies company context, archetype language, and the `synthesis.executive` prompt registry entry.
4. CEO receives 7 leadership questions. COO, CFO, CTO/CDO, CBO/CMO, and CHRO receive 5 role-tuned questions. Other roles receive a generic leadership framework.
5. Each synthesis answer runs through red-team checks before display.
6. Dashboard renders the synthesis as the primary card with numbered answers, confidence, evidence count, and answered/total indicator.
7. Specialist agent cards appear below in a collapsible "Specialist Agent Detail" section.
8. If the user filters by a single agent with `?agent=...`, Nexus bypasses synthesis and shows that specialist view directly.

**What the user sees:** One executive brief that answers the only questions that matter for their role. Specialist agents are the proof trail, not the primary experience.

**Known follow-on polish:** synthesis output history, manual refresh, source/entity backlinks in answers, and learning-signal controls directly on synthesis answers.

### 4.2 Ask Panel

**Entry:** `/ask` or the Ask panel within any dashboard

**Flow:**
1. User types a natural language question (or uses a pre-populated suggested question).
2. Ask loads recent history with `GET /api/ask?limit=20`, scoped to the current workspace and user.
3. `POST /api/ask` with query and optional agentKey.
4. `answerWithEvidence()` in `retrieval.ts`:
   a. If agentKey provided, load the agent's passport and apply `filterEvidenceByPassport()` before any search.
   b. Load all processed, non-restricted evidence for the workspace.
   c. **Tier 1 (vector):** If `NEXUS_VECTOR_SEARCH=enabled`, embed the query via OpenAI text-embedding-3-small and run cosine similarity search against evidence embeddings.
   d. **Tier 2 (keyword):** TF-style term matching with confidence bonus. Used when vector search is disabled, returns nothing, or fails.
   e. Recent conversation turns are added only as interpretive context for follow-up wording.
   f. Top-ranked candidates are sent to LLM with company context prefix.
   g. LLM generates an evidence-backed answer with confidence and source references.
   h. Output gate evaluation: escalation triggers route to human review, hard-stop patterns block.
   i. If evidence is insufficient, system refuses to answer rather than speculate.
5. User and assistant turns are persisted in `ask_conversation_messages`.
6. Response returned with: answer text, confidence score, evidence references (with source path, type, timestamp), freshness signal, and any escalation flags.

**Clear history:** The Ask UI `Clear` button calls `DELETE /api/ask`, removing the current user's workspace-scoped conversation history.

### 4.3 Decisions and Actions

**Entry:** `/decisions`

**Flow:**
1. User sees all decisions for the workspace, organized by status tabs: Open, Decided, Deferred, Cancelled.
2. Summary strip shows counts: open decisions, decided, open actions, blockers.

**Creating a decision manually:**
1. User clicks "New Decision."
2. Fills in: title, description, priority (low/medium/high/critical), optional deadline.
3. System saves via `POST /api/decisions` with audit event.
4. Decision appears in the Open tab with priority badge.

**Adding actions to a decision:**
1. Within a decision card, user clicks "Add Action."
2. Fills in: action text, owner, due date, isBlocker flag.
3. System saves via `POST /api/actions` with audit event.
4. Action appears inline with checkbox for completion, blocker badge if flagged, and overdue highlighting if past due date.

**Completing actions:**
1. User checks off an action. `PATCH /api/actions/[id]` updates status to done with completedAt timestamp.
2. When all actions for a decision are done, user can mark the decision as Decided.

**Creating decisions from AI proposals:**
1. User clicks "Propose from agent outputs."
2. `POST /api/decisions/extract` scans recent active `agent_outputs`.
3. `proposeDecisionsFromAgentOutputs()` extracts decision/action candidates with title, owner, rationale, priority, sourceOutputId, evidenceRefs, and proposed actions.
4. The UI shows candidates in an AI-proposed decisions panel.
5. Nothing is canonical yet. User reviews each candidate and clicks "Create decision."
6. System creates the decision via `POST /api/decisions`, then creates its proposed actions via `POST /api/actions`.
7. The proposal card marks as Created and the decision appears in the normal decision list.

**Why this matters:** Nexus moves from "track decisions manually" to "read agent work, detect likely decisions, and let the human approve the record."

### 4.4 Entity Extraction and Company Memory

**Entry:** any successful upload through onboarding or `/ingestion`

**Flow:**
1. User uploads a document or evidence file.
2. The ingestion service extracts text, classifies confidence/sensitivity, and saves the evidence record.
3. If the record is `processed`, Nexus extracts candidate entities such as organizations, people, systems, risks, KPIs, amounts, dates, and processes.
4. Extracted entities are upserted into the workspace entity index.
5. Each entity is linked back to the source evidence through `evidence_entity_links` with confidence metadata.
6. Agent/API clients can query `GET /api/entities` with optional type/search filters to inspect the workspace memory index.

**Why this matters:** Nexus now begins to remember the nouns of the company, not just the documents. This is the first substrate for future entity pages, backlinks, graph views, and the Obsidian-like Company Memory layer.

### 4.5 Evidence Review and Approvals

**Entry:** `/approvals`

**Flow:**
1. Page loads all evidence with `pending_approval` status.
2. For each item, reviewer sees: source path, extracted text preview, confidence score, detected sensitivity, department classification.
3. Reviewer can:
   - **Approve:** moves to `processed` status, evidence becomes available for dashboards and Ask.
   - **Reject:** moves to `quarantined` status, evidence is excluded from all executive outputs.
   - **Adjust sensitivity:** change the sensitivity label before approving.
4. Each action writes an audit event.

**Why this exists:** Low-confidence or policy-flagged evidence must be human-reviewed before it enters the governed evidence base. This is principle #3 (human approval at high-impact boundaries).

---

## 5. Governance and Administration

### 5.1 Settings Hub

**Entry:** `/settings`

Ten tabs, each serving a distinct governance function:

| Tab | Purpose |
|---|---|
| Workspace | Workspace name, status (trial/pilot/active/suspended), billing state |
| Company Profile | Edit company context used by all agents |
| LLM Provider | Select model, view token usage, daily budget controls |
| Sources | Manage evidence sources and ingestion settings |
| Policies | Sensitivity defaults, evidence handling policies |
| Agent Governance | Agent Control Profiles, passport management, output log |
| API Keys | Scoped bearer tokens for agent/API access |
| Roles | View and manage activated roles |
| Audit Log | Searchable append-only event log |
| Demo Tools | Demo mode toggle, sector pack reset, suggested questions |

### 5.2 Agent Governance Flow

**Entry:** Settings > Agent Governance tab

**Viewing profiles:**
1. All Agent Control Profiles listed with: agent name, status (active/suspended), version, sensitivity ceiling, action rights.

**Creating/editing a profile:**
1. Select an agent or create new.
2. Configure: allowed evidence scopes, forbidden scopes, max sensitivity, allowed/forbidden tools, action right level (retrieve/summarize/draft/recommend/prepare_for_approval), hard stops, escalation triggers, approval level, risk rating, review cadence.
3. Save creates a new version. Prior versions are preserved, never overwritten.

**Suspending an agent:**
1. Admin clicks Suspend on an active profile.
2. Suspended agents cannot retrieve evidence or generate outputs.
3. All evidence denial attempts by suspended agents are audited.
4. Resume restores the profile to active.

### 5.3 Agent Output Log and Rollback

**Entry:** Settings > Agent Governance > Output Log section

**Flow:**
1. Searchable log of all agent-generated outputs. Filter by agent, date range, action type.
2. Each entry shows: timestamp, agent name, action, input summary, output confidence, evidence refs.
3. **Rollback:** Select a historical output, click "Roll back."
4. System deactivates current active output, reactivates the selected prior version, writes audit event with actor, rolledBackFrom, rolledBackTo, and reason.
5. Prior versions are never deleted.

### 5.4 Learning Signal Submission

**Entry:** Agent Output Log or dashboard card actions

**Flow:**
1. On any agent output card, user sees signal buttons: Approve, Edit, Reject, Thumbs Up, Thumbs Down.
2. User clicks a signal. Optional comment field.
3. `POST /api/learning-signals` saves: outputId, workspaceId, signalType, comment, actor.
4. Fires `agent_learning_signal` audit event.
5. `GET /api/learning-signals/summary` aggregates counts and quality metrics per agent.

**Why this matters:** These signals are the seed data for the eval harness (P2-A) and future learning loops. Clean signal capture now means the system can improve later.

---

## 6. Exports and Pilot Delivery

### 6.1 Export Hub

**Entry:** `/export`

Four export artifacts available:

| Export | Route | Format |
|---|---|---|
| Weekly Executive Brief | `/export/weekly-brief` | Print page / PDF |
| Risk Radar | `/api/export/risk-radar?format=csv` | CSV download |
| Recommendation Register | `/api/export/reco-register?format=csv` | CSV download |
| Executive One-Pager | `/export/one-pager` | Print page / PDF |

Each export uses the same governed evidence base as dashboards. Evidence that was denied by passport filters or quarantined never appears in exports.

### 6.2 Pilot Kit

**Entry:** `/pilot-kit`

Pre-packaged materials for pilot sponsors: onboarding checklist, success scorecard, SOW template structure, and demo scripts. Used by the sales team during pilot delivery.

---

## 7. Demo Mode

### 7.1 Demo Reset Flow

**Entry:** Settings > Demo Tools tab

**Flow:**
1. Admin selects a sector pack (Financial Services, Professional Services, or SaaS).
2. Clicks "Reset Demo Workspace."
3. System clears existing evidence and loads the selected sector pack: pre-written CEO-grade evidence with named metrics, named risks, named deadlines, named people, and consequence language.
4. Three pre-tuned suggested questions per pack are loaded (not AI-generated at runtime).
5. `demoSummary` field shows in the Settings panel confirming which pack is active.
6. Admin (or prospect) navigates to a dashboard. Agent briefs generate from the demo evidence.
7. Ask panel can be used with the suggested questions to demonstrate evidence-grounded answers.

**Why 3 packs:** Financial services for regulated-sector buyers, professional services for consulting/advisory buyers, SaaS for technology buyers. Each pack speaks the language of that buyer's boardroom.

---

## 8. API and Agent Access

### 8.1 API Key Authentication

**Entry:** Settings > API Keys tab

**Flow:**
1. Admin creates a scoped API key with name and permission scope.
2. System returns the bearer token (shown once).
3. External agents or integrations call NexusAI APIs using `Authorization: Bearer <token>`.
4. Every API call is workspace-scoped and scope-checked.

### 8.2 Agent API Flow

An external agent (or future orchestration layer) interacting with NexusAI:

1. Authenticate with scoped bearer token.
2. `POST /api/ask` with query and agentKey. The agentKey determines which passport governs the request.
3. System applies passport filters, retrieves evidence, generates answer, runs output gate.
4. Returns evidence-backed answer with confidence and source refs.
5. Agent can submit learning signals on the output via `POST /api/learning-signals`.
6. Agent can create decisions via `POST /api/decisions` and actions via `POST /api/actions`.

---

## 9. Connector Flow (Skeleton Only)

### 9.1 Slack Connector

**Entry:** Settings > Connectors (`/settings/connectors`)

**Current state:** OAuth and events skeleton exists. No live data sync or evidence ingestion flow. This is Phase 10 work.

**Intended flow (future):**
1. Admin connects Slack workspace via OAuth.
2. System listens for events on configured channels.
3. Messages meeting relevance and sensitivity criteria are ingested as evidence records with full provenance.
4. Evidence enters the same governed pipeline: confidence scoring, sensitivity assignment, passport filtering.

---

## 10. Flow Interactions and Cross-Cutting Concerns

### 10.1 Audit Trail

Every significant action writes an audit event: evidence ingestion, evidence review, agent output generation, output rollback, learning signal submission, decision/action CRUD, passport changes, tool denial, evidence denial, output gate escalation/block. Audit events are append-only and workspace-scoped. Viewable in Settings > Audit Log.

### 10.2 Sensitivity and Confidentiality

Sensitivity labels (public, internal, confidential, restricted) are assigned at ingestion and enforced throughout:
- Evidence with sensitivity above an agent's ceiling is denied before retrieval.
- Restricted evidence is excluded from general retrieval entirely.
- Sensitivity labels carry through to exports.
- Every denial is audited.

### 10.3 Confidence Scoring

Confidence is stored as a 0-100 integer and converted at repository boundaries. Every agent output, evidence record, and Ask answer carries a confidence score. Low-confidence evidence routes to pending_approval. The confidence score is visible to users on every card and answer.

### 10.4 LLM Cost Controls

Per-workspace rate limiting (Map keyed by workspaceId). Daily token budget tracked in `llm_usage` table. Multi-provider routing: Anthropic, DeepSeek, OpenAI-compatible. Cost per request logged.

### 10.5 AI Trust Controls

P2 adds a visible trust layer for regulated buyers:
- Settings > Eval runs the 30-case golden set and stores run summaries.
- Settings > Prompts shows the read-only prompt manifest with owners and versions.
- Settings > AI Policy controls provider allow-list, local-only mode, sensitivity ceiling, and review threshold.
- Ask and dashboard outputs run through red-team checks before display.
- Low-confidence outputs below workspace threshold route to review instead of normal display.

---

## Appendix: Flow Summary Matrix

| Flow | Entry Point | Auth Required | Key Services | Writes To |
|---|---|---|---|---|
| Readiness Assessment | `/readiness` | No | readiness scoring | audit_events |
| Sign-up/Login | `/sign-up`, `/sign-in` | Clerk | Clerk auth | workspaces |
| Onboarding | `/onboarding` | Yes | company-detection, role-suggestion, ingestion | workspaces, workspace_profiles, evidence_records, audit_events |
| Dashboard | `/dashboard/[role]` | Yes | dashboard.ts, synthesis.ts, passport-policy, output-gate, llm | agent_outputs, audit_events |
| Ask | `/ask` | Yes | retrieval.ts, passport-policy, output-gate, llm | audit_events |
| Decisions | `/decisions` | Yes | repository CRUD | decisions, actions, audit_events |
| Approvals | `/approvals` | Yes | repository review | evidence_records, audit_events |
| Settings | `/settings` | Yes | various | workspace_settings, agent_control_profiles, audit_events |
| Eval Harness | Settings > Eval | Yes | eval/harness, llm | eval_runs, audit_events |
| Prompt Registry | Settings > Prompts | Yes | prompts/registry | prompt_registry, audit_events |
| Exports | `/export` | Yes | dashboard.ts, repository | (read-only) |
| Demo Reset | Settings > Demo | Yes | sector-packs | evidence_records, workspace_settings |
| API Access | API routes | Bearer token | retrieval, repository | varies by endpoint |
