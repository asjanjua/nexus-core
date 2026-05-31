/**
 * Sector demo packs — pre-built evidence sets for sales demos.
 *
 * Each pack contains 5 realistic document excerpts that produce compelling
 * dashboard cards and risk signals across the key agent rooms.
 *
 * Sectors: financial_services | professional_services | technology_saas
 *
 * Usage: POST /api/workspace/demo-reset?sector=financial_services
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
  evidence: DemoEvidenceItem[];
};

const financialServicesPack: DemoPack = {
  sector: "financial_services",
  workspaceName: "Gulf Capital Partners",
  companyDescription: "Regional investment bank and asset manager operating across GCC. Regulated by CBUAE. AUM $2.4B. 320 staff.",
  evidence: [
    {
      sourcePath: "board-pack-q2-2026.pdf",
      sourceType: "document",
      department: "Finance",
      sensitivity: "confidential",
      freshnessHours: 48,
      text: `Board Pack Q2 2026 — Gulf Capital Partners
Executive Summary: Net revenue for Q2 2026 was AED 142M, up 8% on Q1. Fee income from asset management grew 14% driven by new mandates from sovereign clients. Cost-to-income ratio improved to 61% from 65%.
Key Risks: USD/AED spread compression is reducing FX desk margin. Three compliance findings from the CBUAE supervisory review remain open — remediation plans due end of Q3.
Capital Adequacy: Tier 1 ratio 16.2%, comfortably above the 12% regulatory minimum. Liquidity Coverage Ratio at 138%.
Upcoming: Board approval required for the proposed acquisition of a 30% stake in a UAE-licensed digital payments firm. Legal DD in progress. Expected close: September 2026.`,
    },
    {
      sourcePath: "cbuae-supervisory-findings-2026.pdf",
      sourceType: "document",
      department: "Risk & Compliance",
      sensitivity: "confidential",
      freshnessHours: 72,
      text: `CBUAE Supervisory Review — Findings Summary
Finding 1 (High): AML transaction monitoring thresholds for cross-border wire transfers above AED 500,000 are below regulatory expectations. Required action: recalibrate rules engine by 31 August 2026.
Finding 2 (Medium): KYC refresh cycles for 47 dormant corporate accounts are overdue by more than 90 days. Required action: complete refresh or close accounts by 30 September 2026.
Finding 3 (Low): Whistleblower policy not updated to reflect 2025 CBUAE guidance on anonymous reporting. Required action: update policy document and conduct staff training.
All findings acknowledged. Remediation roadmap submitted to regulator on 14 May 2026.`,
    },
    {
      sourcePath: "payments-revenue-report-may-2026.xlsx",
      sourceType: "document",
      department: "Operations",
      sensitivity: "internal",
      freshnessHours: 96,
      text: `Payments Revenue Report — May 2026
Total payment volumes processed: AED 4.7B (up 11% MoM). SWIFT cross-border: AED 2.1B. Domestic transfers: AED 1.9B. FX conversions: AED 700M.
Revenue: Net FX spread income AED 3.2M, down from AED 4.1M in April due to tighter USD/AED spreads. Transaction fee income AED 1.8M.
Operational: 3 SWIFT rejections in the month — all due to incomplete beneficiary data from a single corporate client. Client notified. STP rate 99.1%.
Risk flags: Two transactions flagged by sanctions screening — both resolved as false positives after enhanced due diligence. No SAR filed.`,
    },
    {
      sourcePath: "investment-portfolio-risk-review-q2.pdf",
      sourceType: "document",
      department: "Investment Management",
      sensitivity: "confidential",
      freshnessHours: 120,
      text: `Investment Portfolio Risk Review — Q2 2026
AUM: USD 2.4B across 6 strategies. Fixed income (42%), GCC equities (28%), private credit (18%), alternatives (12%).
Market risk: Duration mismatch in fixed income book widened to 2.1 years against 1.5 year benchmark. Rising US rate expectations are creating mark-to-market pressure on the long-duration positions.
Credit risk: One private credit position (USD 85M infrastructure loan, Oman) is on watchlist following a 60-day payment delay by the borrower. Collateral review in progress.
Liquidity: Redemption notice received for USD 120M from a single institutional client. 30-day notice period. Liquid assets sufficient; no forced selling required.`,
    },
    {
      sourcePath: "digital-transformation-roadmap-2026.pdf",
      sourceType: "document",
      department: "Technology",
      sensitivity: "internal",
      freshnessHours: 168,
      text: `Digital Transformation Roadmap 2026 — Gulf Capital Partners
Priority 1: Core banking system migration to cloud-hosted platform. Timeline: Q4 2026. Budget: AED 22M approved. Vendor selected (Temenos SaaS). Data migration planning in progress.
Priority 2: API-first client portal launch for institutional clients. MVP delivery: September 2026. Enables real-time portfolio reporting and digital document exchange.
Priority 3: AI-assisted document review for KYC and credit analysis. Pilot with 3 relationship managers from Q3. Requires regulatory pre-approval under CBUAE AI governance guidance.
Risk: Cloud migration is on the critical path. Any delay pushes Priority 2 launch. Mitigation: parallel-run strategy approved for 90 days post-cutover.`,
    },
  ],
};

const professionalServicesPack: DemoPack = {
  sector: "professional_services",
  workspaceName: "Meridian Advisory Group",
  companyDescription: "Management consulting firm. 85 consultants. Offices in Dubai and Riyadh. Focus: financial services, government, and digital transformation.",
  evidence: [
    {
      sourcePath: "bd-pipeline-may-2026.xlsx",
      sourceType: "document",
      department: "Business Development",
      sensitivity: "confidential",
      freshnessHours: 48,
      text: `BD Pipeline Report — May 2026 — Meridian Advisory Group
Total pipeline value: AED 28M across 14 active opportunities.
Top 3 opportunities: (1) Saudi PIF digital strategy — AED 7.2M, shortlisted, presentation scheduled June 2026. (2) UAE central bank regulatory tech review — AED 3.8M, RFP submitted, decision expected July. (3) GCC logistics group operational transformation — AED 2.4M, in commercial negotiation.
Conversion rate YTD: 34% (target 40%). Pipeline coverage ratio: 3.1x (target 3x — on track).
Risk: Three proposals pending with clients who have indicated budget freezes. Combined value AED 5.1M — marked as at-risk. Recommend re-engagement calls this week.`,
    },
    {
      sourcePath: "utilisation-report-may-2026.pdf",
      sourceType: "document",
      department: "Operations",
      sensitivity: "internal",
      freshnessHours: 72,
      text: `Consultant Utilisation Report — May 2026
Firm-wide billable utilisation: 71% (target 75%). Decline from 76% in April driven by two project completions without immediate follow-on work.
By level: Directors 82%, Managers 74%, Senior Consultants 68%, Analysts 62%. Analyst utilisation is the key concern — 4 analysts on bench since 1 May.
Revenue at risk: AED 420K per month from unbilled capacity. If utilisation does not recover to 75% by end of June, the firm will miss Q2 revenue target by approximately 8%.
Action: BD team has identified 3 short-term advisory mandates that could absorb bench capacity. Decisions expected within 2 weeks.`,
    },
    {
      sourcePath: "saudi-expansion-business-case.pdf",
      sourceType: "document",
      department: "Strategy",
      sensitivity: "confidential",
      freshnessHours: 96,
      text: `Saudi Arabia Expansion Business Case — Meridian Advisory Group
Recommendation: Establish a wholly-owned entity in Riyadh under Vision 2030 professional services licensing. Target operating date: Q1 2027.
Market opportunity: CAGR 14% for management consulting in KSA through 2028, driven by Vision 2030 programme delivery. Estimated addressable market: SAR 2.1B.
Investment required: AED 4.2M over 18 months (entity setup, office, 8 Riyadh-based hires, Saudi partner relations).
Revenue projection: AED 6.5M in Year 1, AED 14M in Year 2 if anchor client secured. NPV positive at 3 years with 22% IRR.
Risk: Saudisation (Nitaqat) requirements mandate 25% Saudi national workforce by Year 2. Recruitment pipeline for Saudi nationals is the critical constraint.`,
    },
    {
      sourcePath: "project-status-report-june-2026.pdf",
      sourceType: "document",
      department: "Delivery",
      sensitivity: "internal",
      freshnessHours: 24,
      text: `Project Status Report — June 2026
Active engagements: 9 projects, 6 on track, 2 at risk, 1 delayed.
At risk: (1) UAE insurance regulator digital strategy — client decision-maker changed mid-project, scope re-confirmation required. Risk to AED 1.8M revenue recognition in Q2. (2) Riyadh bank operating model — data access delays from client IT team have pushed workstream 2 back by 3 weeks.
Delayed: GCC telecoms market entry — client requested pause pending board approval of strategy. Resume expected August 2026.
Mitigation: Project leads have escalation calls scheduled with client sponsors this week. Partner review of at-risk projects on 10 June.`,
    },
    {
      sourcePath: "people-review-h1-2026.pdf",
      sourceType: "document",
      department: "People",
      sensitivity: "confidential",
      freshnessHours: 144,
      text: `H1 2026 People Review — Meridian Advisory Group
Headcount: 85 consultants (target 90). 3 open roles: 2 senior consultant positions (Dubai), 1 manager (Riyadh). Time-to-hire averaging 67 days, above the 45-day target.
Attrition: 11% annualised (target <10%). Two departures this month — both to competitor firms. Exit interviews indicate compensation competitiveness is a concern at Manager level.
Performance: Top quartile performers (18 people) have not received retention packages. Recommendation: approve AED 1.2M discretionary retention pool to prevent further departures ahead of the Saudi expansion.
Promotions: 6 promotions recommended for September cycle — budgeted.`,
    },
  ],
};

const technologySaasPack: DemoPack = {
  sector: "technology_saas",
  workspaceName: "Vanta Systems",
  companyDescription: "B2B SaaS platform for supply chain visibility. 140 staff. Series B ($22M). Customers in retail, FMCG, and 3PL across MENA and South Asia.",
  evidence: [
    {
      sourcePath: "mrr-dashboard-may-2026.xlsx",
      sourceType: "document",
      department: "Finance",
      sensitivity: "confidential",
      freshnessHours: 48,
      text: `MRR Dashboard — May 2026 — Vanta Systems
MRR: $1.42M (up 6.3% MoM). ARR run-rate: $17.1M. Net Revenue Retention: 108%. Gross churn: 1.2% MoM (within target of <1.5%).
New ARR: $320K from 4 new logos. Expansion ARR: $88K from 3 upsells. Churn: $42K (1 mid-market customer, citing budget reallocation).
Pipeline: $4.2M in active pipeline. Weighted forecast: $1.8M close in next 60 days.
Unit economics: CAC $18,400. LTV $142,000. LTV:CAC ratio 7.7x (target >5x). Payback period 14 months.
Cash: $8.4M runway at current burn. 18 months to next required capital event.`,
    },
    {
      sourcePath: "product-roadmap-q3-2026.pdf",
      sourceType: "document",
      department: "Product",
      sensitivity: "internal",
      freshnessHours: 96,
      text: `Product Roadmap Q3 2026 — Vanta Systems
Theme: Predictive Intelligence Layer — moving from reactive visibility to proactive supply chain risk alerts.
Key deliverables: (1) AI disruption alerts — LLM-powered analysis of supplier news, port congestion data, and weather events. Target: July release. (2) Multi-modal shipment tracking — integrate air freight APIs (IATA ONE Record) alongside existing ocean and road. Target: August. (3) Customer-facing analytics dashboards — self-serve BI for operations managers. September.
Deferred to Q4: ERP connector for SAP S/4HANA (customer request backlog: 12 customers, ACV risk $620K if not delivered by Q4).
Engineering capacity: 18 engineers across 3 squads. Squad 3 (integrations) is short 1 senior engineer — open role, 6 weeks to hire.`,
    },
    {
      sourcePath: "customer-health-report-may-2026.pdf",
      sourceType: "document",
      department: "Customer Success",
      sensitivity: "internal",
      freshnessHours: 72,
      text: `Customer Health Report — May 2026
Total customers: 94. Health distribution: Green 71, Amber 18, Red 5.
Red accounts (at immediate churn risk): (1) Falcon Retail (AED 85K ARR) — product adoption at 22%, champion left organisation. (2) Horizon 3PL (AED 62K ARR) — competitor evaluation underway, renewal in 60 days. (3) Nile FMCG (AED 110K ARR) — integration delays have blocked go-live, customer frustrated.
Amber accounts requiring escalation: 3 accounts have DAU below 30% of licensed seats. CSM team stretched — 1 open CSM headcount.
Action: Executive sponsor outreach to all 5 Red accounts this week. Nile FMCG: assign dedicated implementation resource to unblock go-live.`,
    },
    {
      sourcePath: "sprint-report-s24-2026.pdf",
      sourceType: "document",
      department: "Technology",
      sensitivity: "internal",
      freshnessHours: 36,
      text: `Sprint 24 Report — Engineering — Vanta Systems
Velocity: 84 story points completed (target 90). Shortfall due to 2 unexpected P1 incidents this sprint.
Incidents: (1) API gateway latency spike on 22 May — caused by a misconfigured rate limit on the new multi-tenant routing layer. Resolved in 4.2 hours. 3 enterprise customers affected. (2) Data pipeline delay for ocean freight ETL — 6-hour data lag for 11 customers on 24 May. Root cause: upstream carrier API schema change not caught by contract tests.
Technical debt: Test coverage at 61% (target 80%). Coverage has declined 4 points in 3 sprints due to feature pressure. CTO has approved 1 sprint dedicated to test coverage in Q3.
Next sprint focus: AI disruption alerts MVP, SAP connector scoping, and incident retrospective actions.`,
    },
    {
      sourcePath: "series-b-investor-update-june-2026.pdf",
      sourceType: "document",
      department: "Strategy",
      sensitivity: "confidential",
      freshnessHours: 120,
      text: `Series B Investor Update — June 2026 — Vanta Systems
ARR: $17.1M (on track for $22M exit ARR target). Growth rate 89% YoY. NRR 108%.
Highlights: Signed first enterprise deal in Saudi Arabia (ACV $480K) — validates GCC expansion thesis. Strategic partnership signed with a Tier 1 logistics provider covering 8 MENA countries.
Risks: (1) SAP integration delay — 12 customers waiting, creates renewal risk in Q4. (2) Engineering hiring — 3 open senior roles, competitive market. (3) Macro: one enterprise prospect in Pakistan has paused evaluation due to PKR depreciation impacting USD-denominated contracts.
Next milestone: Series C readiness — target $40M ARR before raise. Expected timeline: Q2 2027 if growth trajectory holds.`,
    },
  ],
};

export const DEMO_PACKS: Record<string, DemoPack> = {
  financial_services: financialServicesPack,
  professional_services: professionalServicesPack,
  technology_saas: technologySaasPack,
};

export const DEMO_PACK_SECTORS = Object.keys(DEMO_PACKS) as Array<keyof typeof DEMO_PACKS>;
