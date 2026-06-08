/**
 * Sector demo packs — pre-built evidence sets for sales demos.
 *
 * Each pack contains 5 realistic document excerpts that produce compelling
 * dashboard cards and risk signals across the key agent rooms.
 *
 * Sectors: financial_services | professional_services | technology_saas
 *
 * Usage: POST /api/workspace/demo-reset?sector=financial_services
 *
 * Design rules (audit 2026-06-01):
 * - Every evidence item must contain at least one named metric, named risk, or named decision.
 * - suggestedQuestions are pre-tuned for the sector CEO — not AI-generated at runtime.
 * - company description opens with a CEO-level headline, not a corporate blurb.
 * - Each pack must produce a credible risk radar, a clear open decision, and a financial signal.
 */

export type DemoEvidenceItem = {
  sourcePath: string;
  sourceType: string;
  department: string;
  sensitivity: "internal" | "confidential";
  text: string;
  freshnessHours: number;
};

export type DemoPack = {
  sector: string;
  workspaceName: string;
  companyDescription: string;
  demoSummary: string;                // one sentence shown in Settings demo UI
  suggestedQuestions: string[];       // 3 pre-tuned CEO-level Ask questions shown on Go Live
  evidence: DemoEvidenceItem[];
};

// ---------------------------------------------------------------------------
// Financial Services — Gulf Capital Partners
// ---------------------------------------------------------------------------

const financialServicesPack: DemoPack = {
  sector: "financial_services",
  workspaceName: "Gulf Capital Partners",
  companyDescription:
    "Regional investment bank and asset manager with AED 2.4B AUM, 320 staff, regulated by CBUAE. " +
    "Three open regulatory findings, a pending digital payments acquisition, and a duration mismatch " +
    "in the fixed income book — all requiring board-level decisions before Q3 close.",
  demoSummary:
    "Investment bank with 3 open CBUAE findings, a pending acquisition, and AED 120M redemption notice — " +
    "everything a GCC financial services CEO faces this quarter.",
  suggestedQuestions: [
    "What are the open CBUAE regulatory findings and what are the remediation deadlines?",
    "What is the current capital adequacy and liquidity position, and are there any covenant risks?",
    "What decisions are required from the board before the digital payments acquisition can close?",
  ],
  evidence: [
    {
      sourcePath: "board-pack-q2-2026.pdf",
      sourceType: "document",
      department: "Finance",
      sensitivity: "confidential",
      freshnessHours: 48,
      text: `Board Pack Q2 2026 — Gulf Capital Partners

Executive Summary: Net revenue Q2 2026 was AED 142M, up 8% on Q1. Fee income from asset management grew 14% driven by new sovereign mandates. Cost-to-income ratio improved to 61% from 65% in Q1.

Key Risks This Quarter:
1. USD/AED spread compression has reduced FX desk margin by 22% since January. Net FX spread income in May was AED 3.2M versus AED 4.1M in April.
2. Three CBUAE supervisory findings remain open. Remediation plans submitted; deadlines are 31 August and 30 September 2026. Non-compliance risks a formal supervisory notice.
3. Duration mismatch in fixed income book widened to 2.1 years against the 1.5-year benchmark. Rising US rate expectations are creating mark-to-market pressure of approximately USD 18M on long-duration positions.

Capital Position: Tier 1 ratio 16.2% (regulatory minimum 12%). Liquidity Coverage Ratio 138%. Both comfortably above minimums.

Open Decision — Board Approval Required: Proposed acquisition of a 30% stake in a UAE-licensed digital payments firm. Legal DD in progress. Investment committee has recommended approval subject to satisfactory DD outcomes. Expected close: September 2026. Acquisition price: AED 85M. Requires board resolution.

Liquidity Event: USD 120M redemption notice received from a single institutional client. 30-day notice period active. Liquid assets sufficient to meet redemption without forced selling — confirmed by treasury.`,
    },
    {
      sourcePath: "cbuae-supervisory-findings-2026.pdf",
      sourceType: "document",
      department: "Risk & Compliance",
      sensitivity: "confidential",
      freshnessHours: 72,
      text: `CBUAE Supervisory Review — Findings Summary — Gulf Capital Partners

Finding 1 — CRITICAL (Deadline: 31 August 2026):
AML transaction monitoring thresholds for cross-border wire transfers above AED 500,000 are below regulatory expectations. Current rules engine flags 1.4% of transactions; CBUAE benchmark is 2.1–2.8% for a firm of this profile. Required action: recalibrate rules engine and demonstrate improved detection rates to CBUAE by 31 August 2026. Failure to remediate may result in a formal enforcement notice.

Finding 2 — MEDIUM (Deadline: 30 September 2026):
KYC refresh cycles for 47 dormant corporate accounts are overdue by more than 90 days. Accounts are frozen pending refresh. Combined relationship value approximately AED 220M. Required action: complete KYC refresh or close accounts by 30 September 2026.

Finding 3 — LOW (Deadline: 31 October 2026):
Whistleblower policy not updated to reflect 2025 CBUAE guidance on anonymous reporting channels. Required action: update policy document, implement secure reporting channel, and conduct staff training.

Status: All findings acknowledged in writing. Remediation roadmap submitted to regulator 14 May 2026. CBUAE confirmation of receipt received. Next supervisory checkpoint: October 2026.`,
    },
    {
      sourcePath: "payments-revenue-report-may-2026.xlsx",
      sourceType: "document",
      department: "Operations",
      sensitivity: "internal",
      freshnessHours: 96,
      text: `Payments Revenue Report — May 2026 — Gulf Capital Partners

Volume: Total payment volumes processed AED 4.7B (up 11% MoM). Breakdown: SWIFT cross-border AED 2.1B, domestic transfers AED 1.9B, FX conversions AED 700M.

Revenue Performance:
- Net FX spread income: AED 3.2M (down from AED 4.1M in April — USD/AED spread tightened by 18 bps)
- Transaction fee income: AED 1.8M (stable)
- Combined payments revenue: AED 5.0M (down 13% MoM, trend requires CEO attention)

Operational Quality:
- STP rate: 99.1% (target 99.5% — slightly below)
- 3 SWIFT rejections in May — all caused by incomplete beneficiary data from a single corporate client (Al Fajr Holdings). Client formally notified. Repeat failure will trigger client review.
- 2 transactions flagged by sanctions screening — both resolved as false positives after enhanced due diligence. No SAR filed.

Risk Note: The consistent decline in FX spread income (3 consecutive months) is a structural revenue risk if USD/AED peg assumptions shift.`,
    },
    {
      sourcePath: "investment-portfolio-risk-review-q2.pdf",
      sourceType: "document",
      department: "Investment Management",
      sensitivity: "confidential",
      freshnessHours: 120,
      text: `Investment Portfolio Risk Review — Q2 2026 — Gulf Capital Partners

AUM: USD 2.4B across 6 strategies.
Asset allocation: Fixed income 42%, GCC equities 28%, private credit 18%, alternatives 12%.

Market Risk — Active Issue:
Duration mismatch in fixed income book: 2.1 years actual vs 1.5-year benchmark. Mark-to-market impact of a 100bp rate increase would be approximately USD 18M. US Federal Reserve has signalled 2 further rate increases in 2026. Investment committee has approved a duration reduction programme — target completion Q3 2026. Execution 40% complete.

Credit Risk — Watchlist:
One private credit position (USD 85M infrastructure loan, Oman toll road project) is on watchlist following a 60-day payment delay by the borrower. Independent collateral review initiated. Collateral coverage ratio currently 1.4x. If payment is not received within 30 days, provision of USD 12M will be required under IFRS 9.

Liquidity Event:
USD 120M redemption notice from a single institutional client (Kuwait sovereign wealth fund mandate). 30-day notice period expires 15 June 2026. Treasury has confirmed liquid asset coverage. No forced selling required. However, post-redemption AUM falls to USD 2.28B — impacts management fee run-rate by approximately USD 800K annually.`,
    },
    {
      sourcePath: "digital-transformation-roadmap-2026.pdf",
      sourceType: "document",
      department: "Technology",
      sensitivity: "internal",
      freshnessHours: 168,
      text: `Digital Transformation Roadmap 2026 — Gulf Capital Partners

Priority 1 — Core Banking Migration (Budget: AED 22M approved):
Migration to Temenos SaaS cloud-hosted platform. Timeline: go-live Q4 2026. Vendor selected. Data migration planning 30% complete. Risk: cloud migration is the critical dependency for all digital initiatives. Any delay pushes the client portal launch. Mitigation: parallel-run strategy approved for 90 days post-cutover.

Priority 2 — Institutional Client Portal (Target: September 2026):
API-first client portal enabling real-time portfolio reporting and digital document exchange. Current state: wireframes approved, development sprint 3 of 8. On track. Blocked by core banking migration completion for live data feeds.

Priority 3 — AI-Assisted Document Review (Target: Q3 Pilot):
AI-assisted KYC and credit analysis document review. Pilot with 3 relationship managers from Q3. CBUAE AI governance pre-approval required before full deployment — application to be submitted by end of June 2026. This initiative directly addresses Finding 2 (KYC backlog) from the supervisory review.

Budget status: AED 22M approved for Priority 1. Priorities 2 and 3 funded from existing IT budget. Total digital spend 2026: AED 28M.`,
    },
  ],
};

// ---------------------------------------------------------------------------
// Professional Services — Meridian Advisory Group
// ---------------------------------------------------------------------------

const professionalServicesPack: DemoPack = {
  sector: "professional_services",
  workspaceName: "Meridian Advisory Group",
  companyDescription:
    "85-person management consulting firm in Dubai and Riyadh with AED 28M in active pipeline, " +
    "utilisation at 71% against a 75% target, two at-risk projects, and a Saudi Arabia expansion " +
    "decision that needs to land before Q3 budgets close.",
  demoSummary:
    "Consulting firm with a pipeline coverage gap, bench capacity burning AED 420K/month, " +
    "and a Saudi expansion decision on the table — the priorities every professional services managing partner is weighing.",
  suggestedQuestions: [
    "What is the current utilisation rate and what is the monthly revenue at risk from bench capacity?",
    "Which pipeline opportunities are at risk this quarter and what is the recommended action?",
    "What are the key risks and financial projections for the Saudi Arabia expansion?",
  ],
  evidence: [
    {
      sourcePath: "bd-pipeline-may-2026.xlsx",
      sourceType: "document",
      department: "Business Development",
      sensitivity: "confidential",
      freshnessHours: 48,
      text: `BD Pipeline Report — May 2026 — Meridian Advisory Group

Total active pipeline: AED 28M across 14 opportunities.
Pipeline coverage ratio: 3.1x against AED 9M Q3 revenue target (target 3x — on track).
YTD conversion rate: 34% (target 40% — underperforming by 6 points).

Top 3 Opportunities:
1. Saudi PIF Digital Strategy — AED 7.2M. Status: shortlisted (2 of 4 firms). Presentation scheduled 18 June 2026. Win probability: 45%. This is the single most important deal of the year.
2. UAE Central Bank Regulatory Technology Review — AED 3.8M. Status: RFP submitted 30 May. Decision expected July 2026. Win probability: 55% (strong relationships with client).
3. GCC Logistics Group Operational Transformation — AED 2.4M. Status: commercial negotiation. Stalled on day-rate structure. Partner intervention required this week.

At-Risk Pipeline (Budget Freeze):
Three proposals with clients indicating budget freezes. Combined value AED 5.1M:
- Gulf Insurance Group (AED 2.1M) — CFO on hold pending board approval of 2026 budget
- Abu Dhabi municipality digital strategy (AED 1.6M) — procurement freeze until August
- Riyadh healthcare group (AED 1.4M) — leadership change, new sponsor not yet confirmed
Recommended action: re-engagement calls to all three this week. Do not write off until Q3.`,
    },
    {
      sourcePath: "utilisation-report-may-2026.pdf",
      sourceType: "document",
      department: "Operations",
      sensitivity: "internal",
      freshnessHours: 72,
      text: `Consultant Utilisation Report — May 2026 — Meridian Advisory Group

Firm-wide billable utilisation: 71% (target 75%). Down from 76% in April.
Cause: Two project completions — UAE insurance digital strategy and Riyadh bank operating model Phase 1 — without immediate follow-on work confirmed.

By seniority:
- Directors: 82% (above target — fully staffed on PIF bid and CBUAE project)
- Managers: 74% (slightly below target)
- Senior Consultants: 68% (below target — 2 on bench)
- Analysts: 62% (materially below target — 4 analysts on bench since 1 May)

Financial Impact:
- Revenue at risk from unbilled capacity: AED 420,000 per month
- If utilisation does not recover to 75% by 30 June, Q2 revenue miss of approximately 8% (AED 720K)
- Q2 EBITDA margin will compress from 24% to approximately 19% if bench persists

Resolution Path:
BD team has identified 3 short-term advisory mandates that could absorb bench capacity:
1. Dubai government innovation sprint (AED 180K, 6 weeks)
2. Regional bank IT strategy review (AED 240K, 8 weeks)
3. FMCG group supply chain diagnostic (AED 160K, 4 weeks)
Client decisions on all three expected within 2 weeks.`,
    },
    {
      sourcePath: "saudi-expansion-business-case.pdf",
      sourceType: "document",
      department: "Strategy",
      sensitivity: "confidential",
      freshnessHours: 96,
      text: `Saudi Arabia Expansion Business Case — Meridian Advisory Group

Recommendation: Establish a wholly-owned entity in Riyadh under Vision 2030 professional services licensing framework. Target operating date: Q1 2027.

Market Opportunity:
- Management consulting market CAGR 14% through 2028 in KSA, driven by Vision 2030 programme delivery
- Estimated addressable market: SAR 2.1B by 2027
- Current Meridian Saudi revenues: AED 3.2M (all delivered out of Dubai — significant travel cost drag)

Investment Required: AED 4.2M over 18 months
Breakdown: Entity setup and licensing AED 800K, Riyadh office AED 600K, 8 senior hires AED 2.4M, Saudi partner relations and BD AED 400K.

Financial Projections:
- Year 1 revenue (Riyadh entity): AED 6.5M (anchor client scenario: AED 9.2M if PIF mandate won)
- Year 2 revenue: AED 14M (requires 2 anchor clients)
- IRR: 22% at Year 3. NPV positive with 2-year payback in base case.

Critical Risk — Saudisation (Nitaqat):
25% Saudi national workforce requirement by Year 2. Current Meridian headcount: 0 Saudi nationals. Recruitment pipeline for qualified Saudi national consultants is the single critical path item. Recommend engaging Saudi national recruitment partner immediately to begin pipeline development.

Decision required from partners: Board vote required by 30 June 2026 to meet Q1 2027 operating date.`,
    },
    {
      sourcePath: "project-status-report-june-2026.pdf",
      sourceType: "document",
      department: "Delivery",
      sensitivity: "internal",
      freshnessHours: 24,
      text: `Project Status Report — June 2026 — Meridian Advisory Group

Active engagements: 9 projects total. 6 on track, 2 at risk, 1 paused.

AT RISK — Revenue recognition threatened:

1. UAE Insurance Regulator Digital Strategy (AED 1.8M, Q2 revenue recognition):
Client's primary decision-maker (Director of Strategy) left the organisation on 28 May.
New Director appointed but not yet briefed on the project. Scope re-confirmation call scheduled
8 June. Risk: if scope is reduced by new Director, AED 600K of billable work in Q2 is at risk.
Owner: Senior Partner Layla Hassan. Escalation call with CFO sponsor arranged.

2. Riyadh Bank Operating Model — Workstream 2 (AED 2.9M total project):
Client IT team has not provided data access for HR systems — 3-week delay to workstream 2.
Impact: final report delivery pushed from 20 June to 11 July. Client has been informed.
Risk to Q2 revenue recognition: AED 480K invoice delayed to Q3.
Owner: Manager Khalid Al-Rashid.

PAUSED:
GCC Telecoms Market Entry (AED 1.6M). Client requested pause pending internal board approval
of strategy. Resume expected August 2026. No revenue impact until Q3.

UPCOMING DECISION: Partner review of all at-risk projects scheduled 10 June.`,
    },
    {
      sourcePath: "people-review-h1-2026.pdf",
      sourceType: "document",
      department: "People",
      sensitivity: "confidential",
      freshnessHours: 144,
      text: `H1 2026 People Review — Meridian Advisory Group

Headcount: 85 consultants (target 90 by year-end). 3 open roles: 2 Senior Consultants (Dubai), 1 Manager (Riyadh). Average time-to-hire: 67 days (target 45 days — 49% above target).

Attrition: 11% annualised (target under 10%). Two departures this month:
- Manager Sana Mirza — left for McKinsey Dubai. Exit interview: compensation gap at Manager level cited.
- Senior Consultant Omar Barakat — left for in-house strategy role at a regional developer. Exit interview: career progression pace and project variety cited.

Retention Risk:
Top-quartile performers (18 people identified in H1 review) have not received retention packages.
Benchmark data shows Meridian Manager total compensation is 12–15% below competitor firms.
Recommendation: Approve AED 1.2M discretionary retention pool before Q3 to prevent further departures, particularly ahead of the Saudi expansion where this cohort is critical.

Promotions: 6 promotions recommended for September cycle — all budgeted. No issues.

Saudi Expansion Dependency: Saudisation requirement means 7 Saudi national consultants must be hired by end of 2027. Current pipeline: 0. This is the single highest-priority People action for H2 2026.`,
    },
  ],
};

// ---------------------------------------------------------------------------
// Technology SaaS — Vanta Systems
// ---------------------------------------------------------------------------

const technologySaasPack: DemoPack = {
  sector: "technology_saas",
  workspaceName: "Vanta Systems",
  companyDescription:
    "Series B B2B SaaS platform ($17.1M ARR, 108% NRR) for supply chain visibility across MENA and South Asia. " +
    "5 accounts at immediate churn risk, a SAP integration delay threatening $620K in Q4 renewals, " +
    "and 18 months of runway before the next capital event.",
  demoSummary:
    "Growth-stage SaaS with strong NRR but 5 red-flagged customer accounts, an overdue SAP connector, " +
    "and engineering capacity gaps — the real operating picture behind the Series B metrics.",
  suggestedQuestions: [
    "Which customer accounts are at immediate churn risk and what actions are assigned to each?",
    "What is the SAP integration delay costing us in renewal risk and when is the latest we can ship it?",
    "What is our current runway and what ARR milestone do we need to hit before the Series C raise?",
  ],
  evidence: [
    {
      sourcePath: "mrr-dashboard-may-2026.xlsx",
      sourceType: "document",
      department: "Finance",
      sensitivity: "confidential",
      freshnessHours: 48,
      text: `MRR Dashboard — May 2026 — Vanta Systems

MRR: $1.42M (up 6.3% MoM). ARR run-rate: $17.1M. YoY growth: 89%.
Net Revenue Retention: 108%. Gross churn: 1.2% MoM (within target of <1.5%).

New ARR: $320K from 4 new logos (average ACV $80K — healthy SME deals, not enterprise).
Expansion ARR: $88K from 3 upsells (all in the logistics vertical).
Churned ARR: $42K — 1 mid-market customer (RetailNow, Dubai) cited budget reallocation. Exit interview: product adoption was low (18% of licensed seats in use).

Unit Economics:
CAC: $18,400. LTV: $142,000. LTV:CAC ratio: 7.7x (target >5x — healthy).
Payback period: 14 months (target <18 months — on track).

Cash Position:
Cash: $8.4M. Monthly net burn: $465K. Runway: 18 months (to November 2027).
Series C target: $40M ARR (current trajectory suggests Q2 2027 if growth holds).
Risk: If growth rate decelerates below 60% YoY, Series C timeline pushes to Q3–Q4 2027 — extending runway pressure.

Key Metric to Watch: New logo ACV has been flat at $75–85K for 3 consecutive months. Need at least one enterprise deal (ACV >$200K) in the pipeline to demonstrate enterprise readiness for Series C.`,
    },
    {
      sourcePath: "product-roadmap-q3-2026.pdf",
      sourceType: "document",
      department: "Product",
      sensitivity: "internal",
      freshnessHours: 96,
      text: `Product Roadmap Q3 2026 — Vanta Systems

Theme: Predictive Intelligence Layer — moving from reactive visibility to proactive supply chain risk signals.

Key Deliverables:
1. AI Disruption Alerts (Target: July 2026):
   LLM-powered monitoring of supplier news, port congestion data, and weather events.
   Generates proactive risk alerts before shipment delays occur.
   Status: MVP in development, Sprint 24 partially complete. On track for July.

2. Multi-Modal Shipment Tracking (Target: August 2026):
   Integrate air freight APIs (IATA ONE Record standard) alongside existing ocean and road.
   Expands TAM by 30% (air freight customers currently unsupported).
   Status: API spec complete, development not yet started. Tight timeline.

3. Customer-Facing Analytics Dashboards (Target: September 2026):
   Self-serve BI for operations managers. Reduces CSM escalation load by estimated 35%.
   Status: design approved, Sprint 5 of 12 equivalent.

DEFERRED TO Q4 — HIGH RISK:
SAP S/4HANA ERP Connector.
Customer request backlog: 12 customers explicitly waiting. Combined ACV at renewal risk if not
delivered by Q4: $620,000. CTO has approved 1 additional engineer allocation from Q3 Squad 3
to accelerate, but Squad 3 has an open senior engineer role (6 weeks to hire minimum).
This is the single biggest renewal risk in the product roadmap.`,
    },
    {
      sourcePath: "customer-health-report-may-2026.xlsx",
      sourceType: "document",
      department: "Customer Success",
      sensitivity: "internal",
      freshnessHours: 72,
      text: `Customer Health Report — May 2026 — Vanta Systems

Total customers: 94. Health distribution: Green 71 (76%), Amber 18 (19%), Red 5 (5%).

RED ACCOUNTS — Immediate Churn Risk (Combined ARR: $331K):

1. Falcon Retail (AED 85K ARR, renewal: August 2026):
   Product adoption 22% of licensed seats (threshold: 60%). Champion Sarah Al-Mansoori left
   organisation 3 weeks ago. No replacement identified. Executive sponsor outreach required this week.
   Risk level: CRITICAL.

2. Horizon 3PL (AED 62K ARR, renewal: July 2026 — 60 days):
   Competitor (Shippeo) evaluation underway. CSM confirmed prospect demo was last week.
   Differentiator conversation needed immediately. Assign senior CSM and arrange product roadmap
   preview call. Risk level: HIGH.

3. Nile FMCG (AED 110K ARR, renewal: September 2026):
   Integration delays have blocked go-live for 4 months. Customer is frustrated and has formally
   escalated. Root cause: customer's IT team provided incorrect API credentials twice.
   Vanta must assign a dedicated implementation engineer to drive this to completion.
   Risk level: HIGH.

4. Gulf Retail Group (AED 48K ARR, renewal: October 2026):
   DAU at 11% of licensed seats. No CSM engagement in 6 weeks (capacity gap).
   Risk level: MEDIUM-HIGH.

5. Karachi Logistics (AED 26K ARR, renewal: December 2026):
   PKR depreciation has increased USD contract cost by 38% in local currency terms.
   Customer requesting a PKR-denominated pricing option. Risk level: MEDIUM.

AMBER — 18 accounts require proactive outreach this month. 3 accounts: DAU below 30% of seats.
CSM capacity note: 1 open CSM headcount. Current CSMs are at 94% capacity. Hiring is critical.`,
    },
    {
      sourcePath: "sprint-report-s24-2026.pdf",
      sourceType: "document",
      department: "Technology",
      sensitivity: "internal",
      freshnessHours: 36,
      text: `Sprint 24 Engineering Report — Vanta Systems

Velocity: 84 story points completed vs 90-point target. Miss driven by 2 unplanned P1 incidents.

P1 INCIDENTS THIS SPRINT:

Incident 1 — API Gateway Latency Spike (22 May, 4.2 hours):
Misconfigured rate limit on new multi-tenant routing layer caused 8–12 second response times
for all API calls. 3 enterprise customers affected (including Nile FMCG — worsened their existing
frustration). Resolved: rate limit reconfigured. Post-mortem complete. Fix: automated config
validation added to deployment pipeline.

Incident 2 — Ocean Freight ETL Data Lag (24 May, 6 hours):
6-hour data lag for 11 customers. Root cause: upstream carrier API changed schema without notice;
not caught by Vanta's contract tests. 11 customers saw stale shipment data for 6 hours.
Customer communications sent within 2 hours of detection. Root cause fix shipped in Sprint 24.
Post-mortem action: contract test coverage for all 3rd-party APIs to be completed by end of Q3.

Technical Debt Status:
Test coverage: 61% (target 80%). Coverage has declined 4 points across 3 consecutive sprints due to
feature pressure. CTO has approved 1 dedicated sprint for test coverage in Q3 (Sprint 28, August).

Next Sprint (Sprint 25) Focus:
AI disruption alerts MVP completion, SAP connector technical design document, and incident
retrospective action items.`,
    },
    {
      sourcePath: "series-b-investor-update-june-2026.pdf",
      sourceType: "document",
      department: "Strategy",
      sensitivity: "confidential",
      freshnessHours: 120,
      text: `Series B Investor Update — June 2026 — Vanta Systems

ARR: $17.1M (on track for $22M exit ARR target for the year). YoY growth: 89%. NRR: 108%.

Highlights This Quarter:
- First enterprise deal in Saudi Arabia signed: ACV $480K (Riyadh-based logistics operator, 3-year contract). Validates GCC expansion thesis and provides a reference customer for Series C.
- Strategic partnership signed with a Tier 1 GCC logistics provider (name confidential per NDA) covering 8 MENA countries. Estimated incremental ARR potential: $1.2–1.8M over 24 months.
- AI disruption alerts feature in final development — expected to be the primary growth driver in H2.

Risks to Monitor:
1. SAP Integration Delay: 12 customers explicitly waiting. Combined renewal ACV at risk in Q4: $620K. This is the top product risk for the remainder of the year.
2. Engineering Hiring: 3 open senior engineering roles. Competitive talent market. Time-to-hire averaging 9 weeks. Squad 3 (integrations — responsible for SAP connector) is operating understaffed.
3. Macro — Pakistan: One enterprise prospect (DHL Pakistan subsidiary) has paused evaluation due to PKR depreciation impact on USD-denominated contracts. ACV $220K — not in current forecast but was a high-probability close.
4. Customer Success Capacity: 1 open CSM role while 5 red accounts require intensive intervention. This is a people-allocation risk, not a product risk.

Series C Readiness:
Target: $40M ARR before raise. Expected timeline: Q2 2027 if current growth trajectory holds.
Key milestones before raise: (1) enterprise logo count >15, (2) NRR sustained above 110%, (3) SAP connector shipped, (4) AI disruption alerts demonstrating measurable churn reduction.`,
    },
  ],
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const DEMO_PACKS: Record<string, DemoPack> = {
  financial_services:   financialServicesPack,
  professional_services: professionalServicesPack,
  technology_saas:      technologySaasPack,
};

export const DEMO_PACK_SECTORS = Object.keys(DEMO_PACKS) as Array<keyof typeof DEMO_PACKS>;
