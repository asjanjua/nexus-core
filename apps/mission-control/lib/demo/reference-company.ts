/**
 * Reference company fixture — a fully populated demo workspace.
 *
 * Unlike the sector demo packs (`sector-packs.ts`), which seed evidence only,
 * this fixture is the whole chain a sales conversation needs to feel alive:
 * company profile, evidence, a strategy/readiness profile (buyer lane, sponsor,
 * reviewer, selected workflow, readiness band), and one workflow twin. Loading
 * it produces a workspace where the dashboards, Ask, the workflow scorer, and
 * the pilot paperwork pack (`/pilot/paperwork`) are all immediately populated.
 *
 * Chosen sector: a GCC Electronic Money Institution (EMI) — high document
 * volume, high decision stakes, and a regulated operating model, which is the
 * strongest NexusAI demo and the core Leap buyer.
 *
 * This is a PORTABLE DATASET (pure data). The loader that writes it into a real
 * workspace is `POST /api/workspace/seed-demo`, which reuses the governed
 * ingestion path so seeded evidence passes the same trust pipeline as real data.
 */

import type { DemoEvidenceItem } from "@/lib/demo/sector-packs";
import type { StrategyProfileInput, WorkflowTwinInput, WorkspaceProfile } from "@/lib/contracts";

export type ReferenceCompany = {
  key: string;
  workspaceName: string;
  companyDescription: string;
  demoSummary: string;
  suggestedQuestions: string[];
  /** Workspace profile fields (sector-aware defaults for the whole product). */
  profile: Omit<WorkspaceProfile, "workspaceId" | "updatedAt">;
  /** Strategy/readiness profile that drives onboarding routing and the pilot paperwork pack. */
  strategyProfile: StrategyProfileInput;
  /** The first workflow twin, so the scorer and paperwork `selectedWorkflow` resolve. */
  workflowTwin: WorkflowTwinInput;
  /** Governed evidence set (ingested through the real pipeline). */
  evidence: DemoEvidenceItem[];
};

export const REFERENCE_COMPANY: ReferenceCompany = {
  key: "reference-emi",
  workspaceName: "Qasr Pay",
  companyDescription:
    "GCC-licensed Electronic Money Institution offering wallets, merchant acquiring, and payroll cards. " +
    "1.8M active wallets, AED 640M annualised TPV, 74 staff, regulated by the central bank. " +
    "Facing a merchant onboarding backlog, one open AML finding, and a thin-margin acquiring book that " +
    "needs a board decision on interchange strategy before the next licence review.",
  demoSummary:
    "GCC EMI with 1.8M wallets, an open AML finding, a merchant onboarding backlog, and a board decision " +
    "pending on interchange — the full regulated-fintech operating picture in one workspace.",
  suggestedQuestions: [
    "What is the status of the open AML finding and what remediation is due before the licence review?",
    "Where is the merchant onboarding backlog concentrated and what is driving the delay?",
    "Is the merchant acquiring book profitable after interchange and fraud losses, and what decision does the board need?",
  ],

  profile: {
    companyName: "Qasr Pay",
    sector: "financial_services",
    subsector: "Electronic Money Institution / Payments",
    businessModel: "b2b2c",
    companyStage: "scale_up",
    employeeBand: "51_200",
    region: "GCC",
    primaryGoals: ["regulatory_compliance", "revenue_growth", "risk_management"],
    riskProfile: "conservative",
    priorityRoles: ["ceo", "coo", "cfo", "cro", "cto"],
    companyArchetype: "corporate",
    archetypeVersion: "1.0",
    briefLanguageMode: "formal",
    locationCount: 1,
    roleStates: {},
  },

  strategyProfile: {
    buyerLane: "regulated_enterprise",
    role: "coo",
    sector: "financial_services",
    companySize: "51_200",
    priority: "high",
    sponsorName: "Nadia Al-Farsi",
    sponsorEmail: "nadia.alfarsi@qasrpay.example",
    reviewerName: "Omar Haddad",
    reviewerEmail: "omar.haddad@qasrpay.example",
    governancePosture: "regulated",
    selectedWorkflow: "Merchant Onboarding Risk Review",
    readinessScores: {
      org_drag: 3,
      ai_maturity: 3,
      data_readiness: 4,
      governance: 5,
      decision_velocity: 3,
      talent: 4,
      execution: 4,
    },
    readinessBand: "Building",
  },

  workflowTwin: {
    type: "workflow_scorer",
    name: "Merchant Onboarding Risk Review",
    status: "active",
    config: {
      description:
        "Scores incoming merchant applications on AML risk, expected TPV, and documentation completeness, " +
        "then routes high-risk or incomplete applications to human review before approval.",
      cadence: "per_application",
      firstOutcome: "Cut onboarding decision time from 6 days to under 48 hours while holding the AML review bar.",
    },
    owner: "coo",
  },

  evidence: [
    {
      sourcePath: "board-pack-q3-2026.pdf",
      sourceType: "document",
      department: "Executive",
      sensitivity: "confidential",
      freshnessHours: 72,
      text:
        "Qasr Pay Board Pack, Q3 2026. Active wallets 1.82M (+9% QoQ). Annualised TPV AED 640M. " +
        "Net revenue AED 41.2M, take rate 0.64%. Cash runway 14 months. KEY DECISION FOR THE BOARD: approve a " +
        "revised interchange strategy for merchant acquiring — current blended margin after interchange and fraud " +
        "is 11 bps, below the 18 bps plan. Two open strategic risks: (1) merchant onboarding backlog now at 430 " +
        "applications, (2) one open AML finding from the central bank due for remediation before the November licence review.",
    },
    {
      sourcePath: "cbuae-aml-finding-2026-04.pdf",
      sourceType: "document",
      department: "Compliance",
      sensitivity: "confidential",
      freshnessHours: 120,
      text:
        "Regulatory finding reference AML-2026-04. The regulator identified that enhanced due diligence (EDD) was not " +
        "consistently applied to merchants in higher-risk MCC categories. Required remediation: implement risk-based EDD " +
        "triggers, backfill EDD on 210 flagged merchants, and evidence board-level oversight of the AML programme. " +
        "Remediation deadline: 15 November 2026. Failure to remediate risks a conditional licence renewal.",
    },
    {
      sourcePath: "aml-alert-backlog-june.xlsx",
      sourceType: "finance_export",
      department: "Compliance",
      sensitivity: "confidential",
      freshnessHours: 48,
      text:
        "Transaction monitoring alert backlog as of June: 1,240 open alerts, 62% older than the 30-day SLA. Two analysts " +
        "cover a queue sized for five. Median time-to-disposition 41 days. Backlog concentrated in wallet-to-wallet " +
        "transfers above AED 10,000 and payroll-card cash-out. RISK: SLA breaches are themselves reportable and compound the open finding.",
    },
    {
      sourcePath: "merchant-onboarding-funnel.xlsx",
      sourceType: "finance_export",
      department: "Operations",
      sensitivity: "internal",
      freshnessHours: 36,
      text:
        "Merchant onboarding funnel: 430 applications in progress. Stage breakdown — document collection 180, KYB review 140, " +
        "AML risk scoring 70, final approval 40. Median cycle time 6.1 days; 22% of applications stall in KYB awaiting " +
        "trade-licence verification. Estimated deferred TPV from the backlog: AED 58M annualised. Owner: COO.",
    },
    {
      sourcePath: "acquiring-unit-economics.xlsx",
      sourceType: "finance_export",
      department: "Finance",
      sensitivity: "confidential",
      freshnessHours: 96,
      text:
        "Merchant acquiring unit economics: average merchant TPV AED 42K/month, blended MDR 1.35%, interchange + scheme " +
        "fees 1.02%, fraud + chargeback losses 0.22%, net margin 11 bps. Top 10% of merchants generate 61% of TPV. " +
        "DECISION SUPPORT: raising MDR 15 bps on the long tail or renegotiating scheme fees would move net margin to ~18 bps.",
    },
    {
      sourcePath: "product-roadmap-h2-2026.docx",
      sourceType: "document",
      department: "Product",
      sensitivity: "internal",
      freshnessHours: 60,
      text:
        "H2 2026 product roadmap: (1) automated KYB via trade-licence API to cut onboarding stall, (2) risk-based EDD " +
        "engine to satisfy AML-2026-04, (3) merchant tiering for MDR optimisation. Engineering capacity is the constraint: " +
        "the EDD engine and KYB automation compete for the same two backend engineers. RISK: sequencing both after the " +
        "licence review would leave the AML remediation manual.",
    },
  ],
};
