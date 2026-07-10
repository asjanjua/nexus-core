/**
 * Client-safe company classification helpers.
 *
 * Keep this module free of database, filesystem, and LLM imports. It is used by
 * the onboarding wizard in the browser and by server routes during ingestion.
 */

export type SuggestedDocument = {
  name: string;
  type: "pdf" | "docx" | "xlsx" | "txt" | "md" | "pptx";
  priority: "high" | "medium";
  description: string;
};

export type FileClassification = {
  department: string;
  sensitivity: "public" | "internal" | "confidential" | "restricted";
  sourceType?: string;
  extractionHints?: string[];
  evidenceWarnings?: string[];
};

export function classifyFilename(filename: string, sector = ""): FileClassification {
  const lower = filename.toLowerCase();
  const extractionHints: string[] = [];
  const evidenceWarnings: string[] = [];
  let sourceType: string | undefined;

  const addHints = (...hints: string[]) => {
    for (const hint of hints) {
      if (!extractionHints.includes(hint)) extractionHints.push(hint);
    }
  };

  const addWarning = (warning: string) => {
    if (!evidenceWarnings.includes(warning)) evidenceWarnings.push(warning);
  };

  let department = "General";
  if (
    /google local service ads|local service ads|meta radius|radius campaign|local radius|sms campaign|nearby campaign/i.test(lower)
  ) {
    department = "Marketing";
    sourceType = "local_ad_performance";
    addHints("location", "radius", "spend", "calls", "messages", "direction requests", "cost per lead", "response rate");
    addWarning("Local ad reports should be compared against actual calls, visits, or WhatsApp replies before changing spend.");
  } else if (
    /meta ads|facebook ads|google ads|performance max|pmax|tiktok business|linkedin campaign|snapchat ads|campaign manager|roas|cpm|cpc|ctr|ad set|adset|conversions?|campaign spend|audience/i.test(lower)
  ) {
    department = "Marketing";
    sourceType = "ad_performance";
    addHints("ROAS", "impressions", "CPM", "CPC", "CTR", "conversions", "spend", "creative name", "audience name", "frequency", "reach", "campaign status");
    addWarning("Cross-platform attribution may double-count conversions unless source exports include deduped attribution windows.");
  } else if (
    /instagram insights|tiktok analytics|linkedin company|facebook page insights|youtube studio|twitter analytics|x analytics|social export|organic social|engagement rate|followers|reach report/i.test(lower)
  ) {
    department = "Marketing";
    sourceType = "social_export";
    addHints("reach", "impressions", "engagement rate", "follower growth", "post type", "audience geography", "top content");
  } else if (
    /whatsapp business|whatsapp broadcast|message report|catalog performance|contact list|wa contacts|broadcast analytics/i.test(lower)
  ) {
    department = "Marketing";
    sourceType = "whatsapp_business";
    addHints("messages sent", "delivery rate", "read rate", "reply rate", "template name", "opt-out indicators", "catalog clicks");
    addWarning("WhatsApp exports can contain personal data; verify consent and opt-out handling before broad sharing.");
  } else if (
    /google business profile|google my business|business profile|direction requests|calls from listing|reviews export|local search|map views/i.test(lower)
  ) {
    department = "Marketing";
    sourceType = "local_business";
    addHints("search appearances", "direction requests", "calls", "website clicks", "review rating", "review themes", "location");
  } else if (
    /creator|influencer|affiliate|promo code|promocode|utm|deliverable|creator performance|affiliate link/i.test(lower)
  ) {
    department = "Marketing";
    sourceType = "creator_performance";
    addHints("creator name", "deliverables", "promo code", "affiliate link", "UTM", "redemptions", "engagement", "cost per acquisition");
  } else if (
    /mailchimp|klaviyo|hubspot|activecampaign|active campaign|brevo|email campaign|crm export|newsletter/i.test(lower)
  ) {
    department = "Marketing";
    sourceType = "email_crm";
    addHints("open rate", "click rate", "unsubscribe rate", "conversion", "segment", "campaign name", "lifecycle stage");
  } else if (/board|steering|exec|c-suite|ceo|coo|cfo|townhall/i.test(lower)) {
    department = "Executive / Strategy";
  } else if (/risk|compliance|regulatory|audit|legal|aml|kyc|policy|procedure|control/i.test(lower)) {
    department = "Risk & Compliance";
  } else if (/financ|budget|p&l|revenue|cost|cashflow|forecast|invoice|expense|margin/i.test(lower)) {
    department = "Finance";
  } else if (/sales|pipeline|crm|deal|commercial|bd|partnership|proposal|quote|prospect/i.test(lower)) {
    department = "Commercial / Sales";
  } else if (/tech|engineer|system|infra|security|devops|architect|cloud|incident|postmortem|sla/i.test(lower)) {
    department = "Technology";
  } else if (/ops|operation|kpi|perform|delivery|logistics|process|workflow|sop/i.test(lower)) {
    department = "Operations";
  } else if (/market|brand|campaign|seo|content|social|launch|pr/i.test(lower)) {
    department = "Marketing";
  } else if (/hr|talent|people|hiring|org|culture|payroll|headcount|attrition/i.test(lower)) {
    department = "HR / People";
  } else if (/strategy|roadmap|plan|vision|okr|goal/i.test(lower)) {
    department = "Strategy";
  } else if (/product|feature|sprint|backlog|user|ux|design/i.test(lower)) {
    department = "Product";
  }

  let sensitivity: FileClassification["sensitivity"] = "internal";
  if (/board|legal|salary|payroll|personal|pii|gdpr|restricted|confidential/i.test(lower)) {
    sensitivity = "confidential";
  }
  if (/password|credential|secret|token|api.?key/i.test(lower)) {
    sensitivity = "restricted";
  }

  if (sourceType === "whatsapp_business" || sourceType === "creator_performance") {
    sensitivity = sensitivity === "restricted" ? sensitivity : "confidential";
  }

  if ((sector === "financial_services" || sector === "healthcare") && sensitivity === "internal") {
    if (!/public|press|release|marketing|blog/i.test(lower)) {
      sensitivity = "confidential";
    }
  }

  if (/learning phase|limited learning|budget constrained|creative fatigue|audience overlap|frequency/i.test(lower)) {
    addWarning("Ad delivery health signal detected; compare budget, learning status, frequency, and creative fatigue before recommending spend changes.");
  }

  const locationMatch = lower.match(/\b(branch|location|store)[-_ ]?([a-z0-9]+)\b|dubai mall|riyadh|karachi|lahore|islamabad|jeddah|abu dhabi/i);
  if (locationMatch) {
    addHints("location label");
    addWarning(`Location signal detected in filename: ${locationMatch[0]}. Use this for per-location review until structured location tagging is added.`);
  }

  return {
    department,
    sensitivity,
    sourceType,
    extractionHints: extractionHints.length ? extractionHints : undefined,
    evidenceWarnings: evidenceWarnings.length ? evidenceWarnings : undefined
  };
}

export function getDefaultDocuments(sector: string): SuggestedDocument[] {
  const packs: Record<string, SuggestedDocument[]> = {
    financial_services: [
      { name: "Latest Board Pack", type: "pdf", priority: "high", description: "Strategic context and board-level risk signals" },
      { name: "Risk Register", type: "xlsx", priority: "high", description: "Current risk inventory and mitigation status" },
      { name: "Regulatory Compliance Report", type: "pdf", priority: "high", description: "Regulatory obligations, gaps, and pending actions" },
      { name: "Financial Performance Report", type: "xlsx", priority: "high", description: "P&L, KPIs, and variance to plan" },
      { name: "AML/KYC Policy Manual", type: "docx", priority: "medium", description: "Compliance procedures and control framework" }
    ],
    professional_services: [
      { name: "Business Development Pipeline", type: "xlsx", priority: "high", description: "Proposal pipeline, win rates, and revenue forecast" },
      { name: "Client Engagement Status Report", type: "docx", priority: "high", description: "Active projects, delivery status, and issues" },
      { name: "Monthly P&L by Practice Area", type: "xlsx", priority: "high", description: "Revenue, margin, and utilisation by team" },
      { name: "Resource Utilisation Report", type: "xlsx", priority: "medium", description: "Billable vs non-billable hours and capacity" },
      { name: "Partner / Client Meeting Notes", type: "docx", priority: "medium", description: "Key decisions and relationship signals" }
    ],
    technology_saas: [
      { name: "Product Roadmap", type: "pdf", priority: "high", description: "Feature priorities, timelines, and strategic bets" },
      { name: "Monthly MRR / ARR Report", type: "xlsx", priority: "high", description: "Revenue growth, churn, and expansion metrics" },
      { name: "Engineering Sprint Report", type: "docx", priority: "medium", description: "Velocity, blockers, and technical debt signals" },
      { name: "Security Audit Report", type: "pdf", priority: "high", description: "Vulnerabilities, risks, and remediation plan" },
      { name: "Customer NPS / Feedback Analysis", type: "xlsx", priority: "medium", description: "User satisfaction trends and churn signals" }
    ],
    manufacturing: [
      { name: "Production KPI Report", type: "xlsx", priority: "high", description: "OEE, defect rates, and capacity utilisation" },
      { name: "Supply Chain Risk Register", type: "xlsx", priority: "high", description: "Supplier risk, lead times, and buffer stock" },
      { name: "Quality Audit Report", type: "pdf", priority: "high", description: "Non-conformances, corrective actions, and compliance" },
      { name: "Maintenance and Incident Log", type: "xlsx", priority: "medium", description: "Equipment failures and downtime trends" },
      { name: "Financial Performance Report", type: "xlsx", priority: "high", description: "COGS, margin, and variance to plan" }
    ],
    retail_commerce: [
      { name: "Weekly Trading Report", type: "xlsx", priority: "high", description: "Sales, conversion, and category performance" },
      { name: "Inventory Aging Report", type: "xlsx", priority: "high", description: "Stock levels, slow-movers, and write-off risk" },
      { name: "Customer Feedback / NPS Survey", type: "xlsx", priority: "medium", description: "Satisfaction trends and churn signals" },
      { name: "Supplier Scorecard", type: "xlsx", priority: "medium", description: "Delivery performance and compliance" },
      { name: "Campaign Performance Report", type: "pdf", priority: "medium", description: "Marketing ROI and channel attribution" }
    ],
    healthcare: [
      { name: "Clinical Audit Report", type: "pdf", priority: "high", description: "Patient outcomes, safety incidents, and quality metrics" },
      { name: "Regulatory Compliance Status", type: "docx", priority: "high", description: "Accreditation gaps and regulatory obligations" },
      { name: "Financial and Billing Report", type: "xlsx", priority: "high", description: "Revenue cycle, reimbursement, and cost per episode" },
      { name: "Patient Satisfaction Report", type: "pdf", priority: "medium", description: "CSAT, NPS, and complaint analysis" },
      { name: "Incident and Risk Register", type: "xlsx", priority: "high", description: "Patient safety events and mitigation actions" }
    ],
    real_estate_construction: [
      { name: "Project Status Report", type: "docx", priority: "high", description: "Delivery milestones, cost variance, and blockers" },
      { name: "QS Cost Report", type: "xlsx", priority: "high", description: "Budget, committed costs, and forecast at completion" },
      { name: "Occupancy and Leasing Report", type: "xlsx", priority: "high", description: "Occupancy rates, lease renewals, and pipeline" },
      { name: "Board Investment Paper", type: "pdf", priority: "high", description: "Strategic rationale, returns, and risk for key decisions" },
      { name: "Environmental / ESG Report", type: "pdf", priority: "medium", description: "Sustainability compliance and ESG obligations" }
    ],
    education_training: [
      { name: "Student Enrolment Report", type: "xlsx", priority: "high", description: "Enrolment trends, growth, and forecast" },
      { name: "Accreditation Status Report", type: "docx", priority: "high", description: "Compliance status and upcoming requirements" },
      { name: "Financial Performance Report", type: "xlsx", priority: "high", description: "Revenue, cost per student, and budget variance" },
      { name: "Student Feedback / NPS", type: "xlsx", priority: "medium", description: "Satisfaction trends and at-risk cohort signals" },
      { name: "Faculty / Staff Report", type: "docx", priority: "medium", description: "Headcount, attrition, and development needs" }
    ]
  };

  return packs[sector] ?? packs.technology_saas;
}
