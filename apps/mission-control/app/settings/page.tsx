/**
 * Main Settings page — replaces the stub pages that existed before.
 * Client component with tab navigation across:
 *   Workspace | LLM Provider | Sources | Policies | API Keys | Roles
 */
"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/page-shell";
import { MetaChip } from "@/components/ui/nexus-primitives";
import {
  briefLanguageModeForArchetype,
  getAllSectors,
  getArchetypeEvidenceExpectation,
  getSector
} from "@/lib/domain/sector-library";

// ---------------------------------------------------------------------------
// Types (mirrored from contracts for client-side use)
// ---------------------------------------------------------------------------

type WorkspaceSettings = {
  workspaceId: string;
  name: string;
  timezone: string;
  llmProvider: "anthropic" | "openai" | "azure_openai" | "deepseek" | "openai_compatible";
  llmModel: string;
  quarantineThreshold: number;
  defaultSensitivity: string;
  slackEnabled: boolean;
  teamsEnabled: boolean;
  allowedProviders: Array<"anthropic" | "openai" | "azure_openai" | "deepseek" | "openai_compatible" | "local">;
  localOnlyMode: boolean;
  sensitivityCeiling: "public" | "internal" | "confidential" | "restricted";
  approvalRequiredThreshold: number;
  updatedAt: string;
};

type AgentKey = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  active: boolean;
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
};

type NewKeyResult = AgentKey & { secret: string };

type AgentControlProfile = {
  id: string;
  workspaceId: string;
  agentKey: string;
  name: string;
  purpose: string;
  version: number;
  status: "draft" | "active" | "suspended";
  allowedScopes: string[];
  forbiddenScopes: string[];
  maxSensitivity: "public" | "internal" | "confidential" | "restricted";
  crossEntityAccess: boolean;
  allowedTools: string[];
  forbiddenTools: string[];
  policyControlledApis: Record<string, unknown>;
  actionRight: "retrieve" | "summarize" | "draft" | "recommend" | "prepare_for_approval";
  hardStops: string[];
  escalationTriggers: string[];
  approvalLevel: "owner" | "partner" | "client" | "board";
  riskRating: "low" | "medium" | "high" | "regulated";
  reviewCadence: "per_output" | "weekly" | "monthly" | "event";
  watcherAgents: string[];
  logLevel: "actions" | "actions_sources" | "full";
  createdBy: string;
  createdAt: string;
  updatedBy?: string | null;
  updatedAt: string;
};

type AgentOutput = {
  id: string;
  workspaceId: string;
  agentId: string;
  agentVersion: number;
  roleKey: string;
  content: string;
  inputSummary: string;
  evidenceRefs: string[];
  confidence: number;
  outputVersion: number;
  isActive: boolean;
  replacedById?: string | null;
  createdAt: string;
};

type SynthesisSchedule = {
  id: string;
  workspaceId: string;
  enabled: boolean;
  cron: string;
  timezone: string;
  roles: string[];
  delivery: Array<"in_app" | "email" | "slack">;
  emailTargets: string[];
  slackChannel?: string | null;
  lastRunAt?: string | null;
  lastStatus?: "success" | "partial" | "failed" | null;
  createdAt: string;
  updatedAt: string;
};

type WorkspaceProfile = {
  companyName?: string | null;
  sector?: string | null;
  subsector?: string | null;
  businessModel?: string | null;
  companyStage?: string | null;
  employeeBand?: string | null;
  region?: string | null;
  primaryGoals: string[];
  riskProfile?: string | null;
  priorityRoles: string[];
  companyArchetype?: string | null;
  archetypeVersion?: string | null;
  briefLanguageMode?: "formal" | "plain";
  locationCount?: number;
  roleStates?: Record<string, unknown>;
  updatedAt?: string;
};

const TABS = [
  { id: "plan", label: "Plan & Usage" },
  { id: "workspace", label: "Workspace" },
  { id: "profile", label: "Company Profile" },
  { id: "llm", label: "LLM Provider" },
  { id: "sources", label: "Sources" },
  { id: "policies", label: "Policies" },
  { id: "ai-policy", label: "AI Policy" },
  { id: "eval", label: "Eval" },
  { id: "prompts", label: "Prompts" },
  { id: "agent-governance", label: "Agent Governance" },
  { id: "synthesis-schedule", label: "Scheduled Synthesis" },
  { id: "apikeys", label: "API Keys" },
  { id: "roles", label: "Roles" },
  { id: "audit", label: "Audit Log" },
  { id: "demo", label: "Demo Tools" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const BUSINESS_MODEL_OPTIONS = [
  "b2b",
  "b2c",
  "b2b2c",
  "marketplace",
  "services",
  "government",
];

const STAGE_OPTIONS = ["pre_revenue", "early_stage", "growth", "scale_up", "enterprise", "public"];
const EMPLOYEE_OPTIONS = ["1_10", "11_50", "51_200", "201_1000", "1001_5000", "5000_plus"];
const RISK_OPTIONS = ["conservative", "moderate", "growth_oriented", "aggressive"];
const ARCHETYPE_OPTIONS = [
  { value: "corporate", label: "Corporate / governed company" },
  { value: "startup_scaleup", label: "Startup / scale-up" },
  { value: "sme_physical", label: "Owner-operated physical business" },
  { value: "digital_native", label: "Digital-native / internet-first company" },
  { value: "professional_practice", label: "Professional practice" },
] as const;
const GOAL_OPTIONS = [
  "revenue_growth",
  "cost_reduction",
  "regulatory_compliance",
  "market_expansion",
  "digital_transformation",
  "risk_management",
  "talent_retention",
  "product_launch",
];

const SCOPE_OPTIONS = [
  { value: "read:dashboard", label: "Read dashboards" },
  { value: "read:evidence", label: "Read evidence" },
  { value: "read:recommendations", label: "Read recommendations" },
  { value: "read:settings", label: "Read settings" },
  { value: "read:workflows", label: "Read workflows" },
  { value: "write:ingest", label: "Ingest documents" },
  { value: "write:approvals", label: "Approve recommendations" },
  { value: "write:settings", label: "Update settings" },
  { value: "write:workflows", label: "Create workflow runs" },
  { value: "admin", label: "Full admin access" }
];

// ---------------------------------------------------------------------------
// Plan & Usage tab
// ---------------------------------------------------------------------------

type PlanSummaryData = {
  plan: string;
  planLabel: string;
  priceCents: number;
  tokenBudget: { used: number; limit: number; percentUsed: number; resetAt: string };
  limits: {
    roles: { used: number; limit: number };
    evidence: { used: number; limit: number };
    team: { used: number; limit: number };
    apiKeys: { used: number; limit: number };
    askDailyLimit: number | null;
  };
  features: {
    scheduledSynthesis: boolean;
    emailDelivery: boolean;
    slackDelivery: boolean;
    exports: boolean;
    decisionExtraction: boolean;
    customPassports: boolean;
    dataResidency: boolean;
    apiAccess: boolean;
  };
};

function BudgetBar({ pct }: { pct: number }) {
  const color = pct >= 95 ? "bg-red-500" : pct >= 80 ? "bg-amber-400" : "bg-nexus-accent";
  return (
    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function LimitRow({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = limit === -1 || limit === 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const warn = !unlimited && pct >= 80;
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
      <span className="text-white/60">{label}</span>
      <span className={warn ? "text-amber-300 font-medium" : "text-white/80"}>
        {unlimited ? `${used} / Unlimited` : `${used} / ${limit}`}
      </span>
    </div>
  );
}

function FeatureRow({ label, enabled, requiredPlan }: { label: string; enabled: boolean; requiredPlan?: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
      <span className="text-white/60">{label}</span>
      {enabled
        ? <span className="badge badge-green">Enabled</span>
        : <span className="badge badge-muted">{requiredPlan ? `Requires ${requiredPlan}` : "Not available"}</span>
      }
    </div>
  );
}

function PlanTab({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<PlanSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingBanner, setBillingBanner] = useState<"success" | "cancelled" | null>(null);

  useEffect(() => {
    // Read billing result from URL query param (Stripe redirects here after checkout)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const result = params.get("billing");
      if (result === "success" || result === "cancelled") {
        setBillingBanner(result);
        // Clean the URL without reload
        const clean = new URL(window.location.href);
        clean.searchParams.delete("billing");
        clean.searchParams.delete("plan");
        window.history.replaceState({}, "", clean.toString());
      }
    }

    fetch("/api/billing/plan", { headers: { "x-workspace-id": workspaceId } })
      .then((r) => r.json())
      .then((j) => { if (j.ok) setData(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  async function handleUpgrade(plan: "pro" | "business") {
    setUpgrading(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-workspace-id": workspaceId },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json() as { ok: boolean; data?: { url: string }; error?: string };
      if (json.ok && json.data?.url) {
        window.location.href = json.data.url;
      } else {
        console.error("Checkout error:", json.error);
        setUpgrading(null);
      }
    } catch {
      setUpgrading(null);
    }
  }

  async function handleManagePlan() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "x-workspace-id": workspaceId },
      });
      const json = await res.json() as { ok: boolean; data?: { url: string }; error?: string };
      if (json.ok && json.data?.url) {
        window.location.href = json.data.url;
      }
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) return <p className="text-white/40 text-sm">Loading plan data...</p>;
  if (!data) return <p className="text-white/40 text-sm">Plan data unavailable.</p>;

  const { tokenBudget, limits, features } = data;
  const priceFmt = data.priceCents > 0
    ? `$${(data.priceCents / 100).toLocaleString()}/month`
    : data.plan === "enterprise" ? "Custom pricing" : "Free";
  const resetDate = new Date(tokenBudget.resetAt).toLocaleDateString(undefined, { month: "long", day: "numeric" });
  const unlimited = tokenBudget.limit === 0;
  const isPaid = data.plan === "pro" || data.plan === "business" || data.plan === "enterprise";

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Post-checkout banners */}
      {billingBanner === "success" && (
        <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          Your plan has been upgraded. It may take a moment to reflect below.
        </div>
      )}
      {billingBanner === "cancelled" && (
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
          Checkout was cancelled. Your plan has not changed.
        </div>
      )}

      {/* Plan header */}
      <section className="panel space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wide text-nexus-accent/70">Your Plan</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{data.planLabel} — {priceFmt}</h3>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isPaid && (
              <button
                onClick={handleManagePlan}
                disabled={portalLoading}
                className="badge badge-outline hover:opacity-80 transition-opacity text-xs disabled:opacity-50"
              >
                {portalLoading ? "Opening..." : "Manage Plan"}
              </button>
            )}
            {data.plan === "free" && (
              <button
                onClick={() => handleUpgrade("pro")}
                disabled={upgrading !== null}
                className="badge badge-green hover:opacity-80 transition-opacity text-xs disabled:opacity-50"
              >
                {upgrading === "pro" ? "Redirecting..." : "Upgrade to Pro — $499/mo"}
              </button>
            )}
            {data.plan === "pro" && (
              <button
                onClick={() => handleUpgrade("business")}
                disabled={upgrading !== null}
                className="badge badge-green hover:opacity-80 transition-opacity text-xs disabled:opacity-50"
              >
                {upgrading === "business" ? "Redirecting..." : "Upgrade to Business — $2,500/mo"}
              </button>
            )}
            {data.plan === "business" && (
              <a
                href="mailto:hello@nexusai.io?subject=NexusAI%20Enterprise%20Enquiry"
                className="badge badge-green hover:opacity-80 transition-opacity text-xs"
              >
                Talk to us about Enterprise
              </a>
            )}
          </div>
        </div>

        {/* Budget warning banners */}
        {!unlimited && tokenBudget.percentUsed >= 100 && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Monthly AI budget reached. AI features are paused until {resetDate} or you upgrade.
          </div>
        )}
        {!unlimited && tokenBudget.percentUsed >= 95 && tokenBudget.percentUsed < 100 && (
          <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
            Your AI budget is almost exhausted ({tokenBudget.percentUsed}% used). Responses may be limited soon.
          </div>
        )}
        {!unlimited && tokenBudget.percentUsed >= 80 && tokenBudget.percentUsed < 95 && (
          <div className="rounded-lg border border-amber-400/25 bg-amber-400/5 px-4 py-3 text-sm text-amber-200/80">
            You&apos;ve used {tokenBudget.percentUsed}% of your monthly AI budget. Resets {resetDate}.
          </div>
        )}
      </section>

      {/* AI Budget */}
      <section className="panel space-y-3">
        <p className="panel-title">AI Budget This Month</p>
        {unlimited ? (
          <p className="text-sm text-white/60">Unlimited AI budget on your plan. Resets {resetDate}.</p>
        ) : (
          <>
            <BudgetBar pct={tokenBudget.percentUsed} />
            <div className="flex justify-between text-xs text-white/40">
              <span>{(tokenBudget.used / 1_000_000).toFixed(1)}M of {(tokenBudget.limit / 1_000_000).toFixed(1)}M tokens used</span>
              <span>Resets {resetDate}</span>
            </div>
          </>
        )}
      </section>

      {/* Resource limits */}
      <section className="panel space-y-1">
        <p className="panel-title mb-2">Resource Limits</p>
        <LimitRow label="Active roles" used={limits.roles.used} limit={limits.roles.limit} />
        <LimitRow label="Evidence records" used={limits.evidence.used} limit={limits.evidence.limit} />
        <LimitRow label="Team members" used={limits.team.used} limit={limits.team.limit} />
        <LimitRow label="API keys" used={limits.apiKeys.used} limit={limits.apiKeys.limit} />
        <div className="flex items-center justify-between text-sm py-1.5">
          <span className="text-white/60">Ask questions / day</span>
          <span className="text-white/80">{limits.askDailyLimit === null ? "Unlimited" : limits.askDailyLimit}</span>
        </div>
      </section>

      {/* Features */}
      <section className="panel space-y-1">
        <p className="panel-title mb-2">Features</p>
        <FeatureRow label="Scheduled synthesis" enabled={features.scheduledSynthesis} requiredPlan="Pro" />
        <FeatureRow label="Email delivery" enabled={features.emailDelivery} requiredPlan="Business" />
        <FeatureRow label="Slack delivery" enabled={features.slackDelivery} requiredPlan="Enterprise" />
        <FeatureRow label="Exports (CSV, PDF, Word)" enabled={features.exports} requiredPlan="Pro" />
        <FeatureRow label="AI decision extraction" enabled={features.decisionExtraction} requiredPlan="Business" />
        <FeatureRow label="Custom agent passports" enabled={features.customPassports} requiredPlan="Business" />
        <FeatureRow label="Data residency / local-only" enabled={features.dataResidency} requiredPlan="Enterprise" />
        <FeatureRow label="API access" enabled={features.apiAccess} requiredPlan="Pro" />
      </section>

      <p className="text-xs text-white/30">
        For Enterprise pricing or custom arrangements, contact{" "}
        <a href="mailto:hello@nexusai.io" className="underline">hello@nexusai.io</a>.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workspace tab
// ---------------------------------------------------------------------------

function WorkspaceTab({ workspaceId }: { workspaceId: string }) {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/settings/workspace?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((j) => j.ok && setSettings(j.data));
  }, [workspaceId]);

  if (!settings) return <p className="text-white/50 text-sm">Loading...</p>;

  async function save() {
    setSaving(true);
    await fetch("/api/settings/workspace", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, name: settings!.name, timezone: settings!.timezone })
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <label className="label">Workspace Name</label>
        <input
          className="input"
          value={settings.name}
          onChange={(e) => setSettings({ ...settings, name: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Timezone</label>
        <select
          className="input"
          value={settings.timezone}
          onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
        >
          {["UTC", "Asia/Riyadh", "Asia/Dubai", "Asia/Karachi", "Europe/London", "America/New_York"].map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Workspace ID</label>
        <p className="text-white/50 text-xs font-mono mt-1">{settings.workspaceId}</p>
      </div>
      <div>
        <label className="label">Last Updated</label>
        <p className="text-white/50 text-xs mt-1">{new Date(settings.updatedAt).toLocaleString()}</p>
      </div>
      <button className="btn-primary" onClick={save} disabled={saving}>
        {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Company profile tab
// ---------------------------------------------------------------------------

function ProfileTab() {
  const sectors = getAllSectors();
  const [profile, setProfile] = useState<WorkspaceProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/workspace/profile")
      .then((r) => r.json())
      .then((j) => {
        const data = j.ok && j.data ? j.data : {};
        setProfile({
          companyName: data.companyName ?? "",
          sector: data.sector ?? sectors[0]?.key ?? "technology_saas",
          subsector: data.subsector ?? "",
          businessModel: data.businessModel ?? "b2b",
          companyStage: data.companyStage ?? "growth",
          employeeBand: data.employeeBand ?? "51_200",
          region: data.region ?? "",
          primaryGoals: Array.isArray(data.primaryGoals) ? data.primaryGoals : [],
          riskProfile: data.riskProfile ?? "moderate",
          priorityRoles: Array.isArray(data.priorityRoles) ? data.priorityRoles : [],
          companyArchetype: data.companyArchetype ?? null,
          archetypeVersion: data.archetypeVersion ?? null,
          briefLanguageMode: data.briefLanguageMode ?? "formal",
          locationCount: data.locationCount ?? 1,
          roleStates: data.roleStates ?? {},
          updatedAt: data.updatedAt,
        });
      });
  }, []);

  if (!profile) return <p className="text-white/50 text-sm">Loading...</p>;

  const sector = getSector(profile.sector ?? "");
  const subsectors = sector?.subsectors ?? [];
  const uploadPack = (sector?.documentTypes ?? []).slice(0, 5);
  const defaultRoles = sector?.defaultRoles ?? ["CEO", "COO", "CTO"];
  const archetypeExpectation = getArchetypeEvidenceExpectation(profile.companyArchetype);

  function update(next: Partial<WorkspaceProfile>) {
    setProfile((current) => current ? { ...current, ...next } : current);
  }

  function toggleGoal(goal: string) {
    const current = new Set(profile!.primaryGoals);
    if (current.has(goal)) current.delete(goal);
    else current.add(goal);
    update({ primaryGoals: Array.from(current) });
  }

  function setRoles(value: string) {
    update({
      priorityRoles: value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    const body = {
      companyName: profile.companyName || null,
      sector: profile.sector || null,
      subsector: profile.subsector || null,
      businessModel: profile.businessModel || null,
      companyStage: profile.companyStage || null,
      employeeBand: profile.employeeBand || null,
      region: profile.region || null,
      primaryGoals: profile.primaryGoals,
      riskProfile: profile.riskProfile || null,
      priorityRoles: profile.priorityRoles.length ? profile.priorityRoles : defaultRoles,
      companyArchetype: profile.companyArchetype ?? null,
      archetypeVersion: profile.archetypeVersion ?? null,
      briefLanguageMode: profile.briefLanguageMode ?? "formal",
      locationCount: profile.locationCount ?? 1,
      roleStates: profile.roleStates ?? {},
    };
    const res = await fetch("/api/workspace/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.ok) {
      setProfile(json.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <div className="space-y-5 max-w-2xl">
        <div className="panel text-sm text-white/70">
          This profile shapes dashboard language, Ask answers, upload recommendations,
          sensitivity defaults, and role suggestions. AI may suggest it, but humans confirm it here.
        </div>
        <div>
          <label className="label">Company Name</label>
          <input
            className="input"
            value={profile.companyName ?? ""}
            onChange={(e) => update({ companyName: e.target.value })}
            placeholder="e.g. Leap Associates"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Sector</label>
            <select
              className="input"
              value={profile.sector ?? ""}
              onChange={(e) => {
                const nextSector = getSector(e.target.value);
                update({
                  sector: e.target.value,
                  subsector: "",
                  priorityRoles: nextSector?.defaultRoles.slice(0, 6) ?? profile.priorityRoles,
                });
              }}
            >
              {sectors.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Subsector</label>
            <select
              className="input"
              value={profile.subsector ?? ""}
              onChange={(e) => update({ subsector: e.target.value })}
            >
              <option value="">Select a focus area</option>
              {subsectors.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Business Model</label>
            <select className="input" value={profile.businessModel ?? "b2b"} onChange={(e) => update({ businessModel: e.target.value })}>
              {BUSINESS_MODEL_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Company Stage</label>
            <select className="input" value={profile.companyStage ?? "growth"} onChange={(e) => update({ companyStage: e.target.value })}>
              {STAGE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Employee Band</label>
            <select className="input" value={profile.employeeBand ?? "51_200"} onChange={(e) => update({ employeeBand: e.target.value })}>
              {EMPLOYEE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Region</label>
            <input className="input" value={profile.region ?? ""} onChange={(e) => update({ region: e.target.value })} placeholder="GCC, Pakistan, UK..." />
          </div>
        </div>
        <div>
          <label className="label">Company Archetype</label>
          <select
            className="input"
            value={profile.companyArchetype ?? ""}
            onChange={(e) => {
              const companyArchetype = e.target.value || null;
              update({
                companyArchetype,
                briefLanguageMode: briefLanguageModeForArchetype(companyArchetype),
                archetypeVersion: `manual-confirmed:${new Date().toISOString()}`,
              });
            }}
          >
            <option value="">Not set</option>
            {ARCHETYPE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-white/40">
            Profile last updated: {profile.archetypeVersion ? profile.archetypeVersion.replace("manual-confirmed:", "") : "not confirmed"}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Brief Language</label>
            <select
              className="input"
              value={profile.briefLanguageMode ?? "formal"}
              onChange={(e) => update({ briefLanguageMode: e.target.value as WorkspaceProfile["briefLanguageMode"] })}
            >
              <option value="formal">Formal executive</option>
              <option value="plain">Plain owner update</option>
            </select>
          </div>
          <div>
            <label className="label">Location Count</label>
            <input
              type="number"
              min={1}
              className="input"
              value={profile.locationCount ?? 1}
              onChange={(e) => update({ locationCount: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>
        </div>
        <div>
          <label className="label">Risk Posture</label>
          <select className="input" value={profile.riskProfile ?? "moderate"} onChange={(e) => update({ riskProfile: e.target.value })}>
            {RISK_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Primary Goals</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => toggleGoal(goal)}
                className={[
                  "rounded-full border px-3 py-1 text-xs transition",
                  profile.primaryGoals.includes(goal)
                    ? "border-nexus-accent/60 bg-nexus-accent/15 text-nexus-accent"
                    : "border-white/20 text-white/50 hover:border-white/40",
                ].join(" ")}
              >
                {goal.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Priority Roles</label>
          <input
            className="input"
            value={(profile.priorityRoles.length ? profile.priorityRoles : defaultRoles).join(", ")}
            onChange={(e) => setRoles(e.target.value)}
          />
        </div>
        {profile.roleStates && Object.keys(profile.roleStates).length > 0 && (
          <div className="panel">
            <p className="panel-title">Role State</p>
            <p className="mt-2 text-xs text-white/45">
              Active, staged, and dual-hat roles are stored on the workspace profile. Promotion flows become part of the role activation panel in the pilot packaging phase.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(profile.roleStates).map(([roleKey, state]) => {
                const roleState = state && typeof state === "object" && "state" in state
                  ? String((state as { state?: unknown }).state ?? "available")
                  : "available";
                return (
                  <span key={roleKey} className="badge badge-muted">
                    {roleKey.replace(/_/g, " ")}: {roleState.replace(/_/g, " ")}
                  </span>
                );
              })}
            </div>
          </div>
        )}
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving..." : saved ? "Saved" : "Save Company Profile"}
        </button>
      </div>

      <aside className="space-y-4">
        <div className="panel">
          <p className="panel-title">Archetype evidence expectations</p>
          <p className="mt-2 text-xs text-white/45">
            Used by onboarding, ingestion guidance, and agent brief language.
          </p>
          <ul className="mt-3 space-y-2">
            {(archetypeExpectation?.evidenceTypes ?? uploadPack).slice(0, 6).map((item, index) => (
              <li key={item} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">
                <span className="text-white/35">0{index + 1}</span> {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <p className="panel-title">Derived starter upload pack</p>
          <p className="mt-2 text-xs text-white/45">
            Derived from the stored sector profile, so it stays available after onboarding.
          </p>
          <ul className="mt-3 space-y-2">
            {uploadPack.map((item, index) => (
              <li key={item} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">
                <span className="text-white/35">0{index + 1}</span> {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <p className="panel-title">AI responsibility</p>
          <p className="mt-2 text-sm leading-6 text-white/60">
            AI suggests sector, roles, documents, KPIs, risks, and first dashboards.
            Humans confirm this profile before NexusAI uses it as workspace context.
          </p>
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LLM Provider tab
// ---------------------------------------------------------------------------

function LLMTab({ workspaceId }: { workspaceId: string }) {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/settings/workspace?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((j) => j.ok && setSettings(j.data));
  }, [workspaceId]);

  if (!settings) return <p className="text-white/50 text-sm">Loading...</p>;

  const modelOptions: Record<string, string[]> = {
    anthropic: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
    deepseek: ["deepseek-v4-pro", "deepseek-v4-flash"],
    openai_compatible: ["deepseek-v4-pro", "deepseek-v4-flash", "qwen-plus", "kimi-k2"],
    openai: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
    azure_openai: ["gpt-4o", "gpt-4-turbo"]
  };

  async function save() {
    setSaving(true);
    await fetch("/api/settings/workspace", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        llmProvider: settings!.llmProvider,
        llmModel: settings!.llmModel
      })
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div className="panel text-sm text-white/70">
        Set the AI provider and model used for dashboard synthesis and Ask queries.
        Switching providers requires the corresponding API key to be set as an environment variable.
      </div>
      <div>
        <label className="label">Provider</label>
        <select
          className="input"
          value={settings.llmProvider}
          onChange={(e) =>
            setSettings({
              ...settings,
              llmProvider: e.target.value as WorkspaceSettings["llmProvider"],
              llmModel: modelOptions[e.target.value][0]
            })
          }
        >
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="deepseek">DeepSeek</option>
          <option value="openai_compatible">OpenAI-compatible</option>
          <option value="openai">OpenAI (GPT)</option>
          <option value="azure_openai">Azure OpenAI</option>
        </select>
      </div>
      <div>
        <label className="label">Model</label>
        <select
          className="input"
          value={settings.llmModel}
          onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
        >
          {(modelOptions[settings.llmProvider] ?? []).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Environment Variable Required</label>
        <p className="text-white/50 text-xs font-mono mt-1">
          {settings.llmProvider === "anthropic" && "ANTHROPIC_API_KEY"}
          {settings.llmProvider === "deepseek" && "DEEPSEEK_API_KEY"}
          {settings.llmProvider === "openai_compatible" && "OPENAI_COMPAT_API_KEY or DEEPSEEK_API_KEY"}
          {settings.llmProvider === "openai" && "OPENAI_API_KEY"}
          {settings.llmProvider === "azure_openai" && "AZURE_OPENAI_API_KEY + AZURE_OPENAI_ENDPOINT"}
        </p>
      </div>
      <button className="btn-primary" onClick={save} disabled={saving}>
        {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sources tab
// ---------------------------------------------------------------------------

function SourcesTab() {
  const connectors = [
    { name: "Google Drive", status: "configured", icon: "G" },
    { name: "Slack", status: "configured", icon: "S" },
    { name: "Microsoft Teams", status: "deferred", icon: "T" },
    { name: "SharePoint", status: "deferred", icon: "SP" },
    { name: "Confluence", status: "deferred", icon: "C" },
    { name: "Notion", status: "deferred", icon: "N" }
  ];

  return (
    <div className="space-y-4 max-w-lg">
      <div className="panel text-sm text-white/70">
        Connector status for v1 pilot. Docs and Comms connectors are active.
        Additional connectors are on the roadmap.
      </div>
      {connectors.map((c) => (
        <div key={c.name} className="panel flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
            {c.icon}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{c.name}</p>
          </div>
          <span
            className={`badge ${c.status === "configured" ? "badge-green" : "badge-muted"}`}
          >
            {c.status}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Policies tab
// ---------------------------------------------------------------------------

function PoliciesTab({ workspaceId }: { workspaceId: string }) {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/settings/workspace?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((j) => j.ok && setSettings(j.data));
  }, [workspaceId]);

  if (!settings) return <p className="text-white/50 text-sm">Loading...</p>;

  async function save() {
    setSaving(true);
    await fetch("/api/settings/workspace", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        quarantineThreshold: settings!.quarantineThreshold,
        defaultSensitivity: settings!.defaultSensitivity
      })
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div className="panel text-sm text-white/70">
        Ingestion and sensitivity policies. Evidence below the quarantine threshold
        is excluded from all executive outputs.
      </div>
      <div>
        <label className="label">Quarantine Threshold</label>
        <p className="text-white/50 text-xs mb-2">
          Evidence with extraction confidence below this value is quarantined.
          Current: {Math.round(settings.quarantineThreshold * 100)}%
        </p>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(settings.quarantineThreshold * 100)}
          onChange={(e) =>
            setSettings({ ...settings, quarantineThreshold: Number(e.target.value) / 100 })
          }
          className="w-full accent-blue-400"
        />
        <div className="flex justify-between text-xs text-white/40 mt-1">
          <span>0% (accept all)</span>
          <span>100% (quarantine all)</span>
        </div>
      </div>
      <div>
        <label className="label">Default Upload Sensitivity</label>
        <select
          className="input"
          value={settings.defaultSensitivity}
          onChange={(e) => setSettings({ ...settings, defaultSensitivity: e.target.value })}
        >
          <option value="public">Public</option>
          <option value="internal">Internal</option>
          <option value="confidential">Confidential</option>
          <option value="restricted">Restricted</option>
        </select>
      </div>
      <div>
        <label className="label">Slack Integration</label>
        <label className="flex items-center gap-2 mt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.slackEnabled}
            onChange={(e) => setSettings({ ...settings, slackEnabled: e.target.checked })}
          />
          <span className="text-sm">Enable Slack event listener</span>
        </label>
      </div>
      <button className="btn-primary" onClick={save} disabled={saving}>
        {saving ? "Saving..." : saved ? "Saved" : "Save Policies"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Policy tab (P2-D)
// ---------------------------------------------------------------------------

function AIPolicyTab({ workspaceId }: { workspaceId: string }) {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const providers: WorkspaceSettings["allowedProviders"] = ["anthropic", "deepseek", "openai_compatible", "openai", "azure_openai"];

  useEffect(() => {
    fetch(`/api/settings/workspace?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((j) => j.ok && setSettings(j.data));
  }, [workspaceId]);

  if (!settings) return <p className="text-white/50 text-sm">Loading...</p>;

  function toggleProvider(provider: WorkspaceSettings["allowedProviders"][number]) {
    if (!settings) return;
    const current = settings.allowedProviders ?? [];
    setSettings({
      ...settings,
      allowedProviders: current.includes(provider)
        ? current.filter((item) => item !== provider)
        : [...current, provider]
    });
  }

  async function save() {
    setSaving(true);
    await fetch("/api/settings/workspace", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        allowedProviders: settings!.allowedProviders,
        localOnlyMode: settings!.localOnlyMode,
        sensitivityCeiling: settings!.sensitivityCeiling,
        approvalRequiredThreshold: settings!.approvalRequiredThreshold
      })
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="panel text-sm text-white/70">
        Control which AI providers can process this workspace, what sensitivity level is allowed,
        and when low-confidence outputs should route to human review.
      </div>
      <div className="panel space-y-3">
        <p className="panel-title">Allowed providers</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {providers.map((provider) => (
            <label key={provider} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={(settings.allowedProviders ?? []).includes(provider)}
                onChange={() => toggleProvider(provider)}
              />
              <span>{provider}</span>
            </label>
          ))}
        </div>
      </div>
      <label className="panel flex items-center justify-between gap-4 text-sm">
        <span>
          <span className="block font-medium text-white/85">Local-only mode</span>
          <span className="text-white/45">Blocks cloud LLM calls for this workspace.</span>
        </span>
        <input
          type="checkbox"
          checked={settings.localOnlyMode}
          onChange={(e) => setSettings({ ...settings, localOnlyMode: e.target.checked })}
        />
      </label>
      <div>
        <label className="label">Sensitivity ceiling</label>
        <select
          className="input"
          value={settings.sensitivityCeiling}
          onChange={(e) => setSettings({ ...settings, sensitivityCeiling: e.target.value as WorkspaceSettings["sensitivityCeiling"] })}
        >
          <option value="public">Public</option>
          <option value="internal">Internal</option>
          <option value="confidential">Confidential</option>
          <option value="restricted">Restricted</option>
        </select>
      </div>
      <div>
        <label className="label">Human-review threshold</label>
        <p className="text-white/50 text-xs mb-2">Outputs below {Math.round(settings.approvalRequiredThreshold * 100)}% confidence should be reviewed before use.</p>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(settings.approvalRequiredThreshold * 100)}
          onChange={(e) => setSettings({ ...settings, approvalRequiredThreshold: Number(e.target.value) / 100 })}
          className="w-full accent-blue-400"
        />
      </div>
      <button className="btn-primary" onClick={save} disabled={saving}>
        {saving ? "Saving..." : saved ? "Saved" : "Save AI Policy"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Eval tab (P2-A)
// ---------------------------------------------------------------------------

type EvalRun = {
  id: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  avgConfidence: number;
  avgLatencyMs: number;
  createdAt: string;
  results: Array<{ caseId: string; category: string; passed: boolean; notes: string }>;
};

function EvalTab() {
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [running, setRunning] = useState(false);

  async function load() {
    const res = await fetch("/api/eval/results");
    const json = await res.json();
    if (json.ok) setRuns(json.data.runs);
  }

  useEffect(() => {
    load();
  }, []);

  async function runNow() {
    setRunning(true);
    const res = await fetch("/api/eval/run", { method: "POST" });
    const json = await res.json();
    setRunning(false);
    if (json.ok) setRuns([json.data, ...runs].slice(0, 10));
  }

  const latest = runs[0];
  return (
    <div className="space-y-5 max-w-3xl">
      <div className="panel flex items-center justify-between gap-4">
        <div>
          <p className="panel-title">AI evaluation harness</p>
          <p className="mt-1 text-sm text-white/55">Runs 30 golden cases across risk, decisions, recommendations, classification, grounding, and refusal.</p>
        </div>
        <button className="btn-primary" onClick={runNow} disabled={running}>
          {running ? "Running..." : "Run eval now"}
        </button>
      </div>
      {latest ? (
        <div className="panel">
          <p className="panel-title">Latest run</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div><p className="text-xs text-white/40">Pass rate</p><p className="text-2xl">{Math.round(latest.passRate * 100)}%</p></div>
            <div><p className="text-xs text-white/40">Passed</p><p className="text-2xl">{latest.passed}/{latest.total}</p></div>
            <div><p className="text-xs text-white/40">Confidence</p><p className="text-2xl">{Math.round(latest.avgConfidence * 100)}%</p></div>
            <div><p className="text-xs text-white/40">Avg latency</p><p className="text-2xl">{latest.avgLatencyMs}ms</p></div>
          </div>
          <ul className="mt-4 space-y-2">
            {latest.results.slice(0, 8).map((result) => (
              <li key={result.caseId} className="rounded-lg border border-white/10 px-3 py-2 text-sm">
                <span className={result.passed ? "text-green-300" : "text-red-300"}>{result.passed ? "Pass" : "Fail"}</span>
                <span className="ml-2 text-white/70">{result.caseId}</span>
                <span className="ml-2 text-white/35">{result.category}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-white/45">No eval runs yet.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prompt Registry tab (P2-B)
// ---------------------------------------------------------------------------

type PromptManifestEntry = {
  key: string;
  version: string;
  owner: string;
  description: string;
  changelog: string[];
  lastUpdated: string;
};

function PromptsTab() {
  const [prompts, setPrompts] = useState<PromptManifestEntry[]>([]);

  useEffect(() => {
    fetch("/api/prompts")
      .then((r) => r.json())
      .then((j) => j.ok && setPrompts(j.data.prompts));
  }, []);

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="panel text-sm text-white/70">
        Read-only prompt manifest. Template bodies are intentionally hidden from this API response;
        this view is for versioning, ownership, and regression control.
      </div>
      {prompts.map((prompt) => (
        <div key={prompt.key} className="panel">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-sm text-white/85">{prompt.key}</p>
            <span className="badge badge-muted">v{prompt.version}</span>
            <span className="text-xs text-white/35">{prompt.owner}</span>
          </div>
          <p className="mt-2 text-sm text-white/60">{prompt.description}</p>
          <p className="mt-2 text-xs text-white/35">{prompt.changelog[0]}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// API Keys tab
// ---------------------------------------------------------------------------

const SYNTHESIS_ROLE_OPTIONS = [
  { value: "ceo", label: "CEO brief" },
  { value: "coo", label: "COO execution" },
  { value: "cfo", label: "CFO finance" },
  { value: "cto", label: "CTO / CDO tech" },
  { value: "cbo", label: "CBO growth" },
  { value: "chro", label: "CHRO people" }
];

const CRON_PRESETS = [
  { label: "Monday 7:00 AM", value: "0 7 * * 1" },
  { label: "Every weekday 7:00 AM", value: "0 7 * * 1,2,3,4,5" },
  { label: "Daily 7:00 AM", value: "0 7 * * *" },
  { label: "Every 15 minutes (testing)", value: "*/15 * * * *" }
];

function SynthesisScheduleTab() {
  const [schedule, setSchedule] = useState<SynthesisSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/synthesis-schedule")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setSchedule(j.data);
        else setError(j.error ?? "Unable to load synthesis schedule.");
      })
      .catch(() => setError("Unable to load synthesis schedule."))
      .finally(() => setLoading(false));
  }, []);

  function patchSchedule(patch: Partial<SynthesisSchedule>) {
    if (!schedule) return;
    setSchedule({ ...schedule, ...patch });
    setMessage(null);
    setError(null);
  }

  function toggleRole(role: string) {
    if (!schedule) return;
    const roles = schedule.roles.includes(role)
      ? schedule.roles.filter((item) => item !== role)
      : [...schedule.roles, role];
    patchSchedule({ roles: roles.length ? roles : [role] });
  }

  async function save() {
    if (!schedule) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/synthesis-schedule", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          enabled: schedule.enabled,
          cron: schedule.cron,
          timezone: schedule.timezone,
          roles: schedule.roles,
          delivery: schedule.delivery,
          emailTargets: schedule.emailTargets,
          slackChannel: schedule.slackChannel ?? null
        })
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error ?? "Unable to save schedule.");
      setSchedule(json.data);
      setMessage("Schedule saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save schedule.");
    } finally {
      setSaving(false);
    }
  }

  async function runTest() {
    setTesting(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/synthesis-schedule/test", { method: "POST" });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error ?? "Unable to run synthesis.");
      setMessage(`Test run complete: ${json.data.generated} brief(s), ${json.data.failed} failure(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run synthesis.");
    } finally {
      setTesting(false);
    }
  }

  if (loading) return <p className="text-white/50 text-sm">Loading synthesis schedule...</p>;
  if (!schedule) return <p className="text-red-300 text-sm">{error ?? "Schedule unavailable."}</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/40">Scheduled Synthesis</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Refresh leadership briefs automatically</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
              Nexus will regenerate selected executive synthesis briefs on a cadence and store each run in
              the agent output history. Email and Slack delivery are configuration-ready, but in-app
              delivery is the active pilot channel today.
            </p>
          </div>
          <label className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={schedule.enabled}
              onChange={(e) => patchSchedule({ enabled: e.target.checked })}
            />
            Enabled
          </label>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel space-y-4">
          <div>
            <p className="panel-title">Cadence</p>
            <p className="mt-1 text-sm text-white/50">Use a preset or enter a five-field cron expression.</p>
          </div>
          <select
            className="input w-full"
            value={CRON_PRESETS.some((preset) => preset.value === schedule.cron) ? schedule.cron : "custom"}
            onChange={(e) => {
              if (e.target.value !== "custom") patchSchedule({ cron: e.target.value });
            }}
          >
            {CRON_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>{preset.label}</option>
            ))}
            <option value="custom">Custom</option>
          </select>
          <input
            className="input w-full font-mono"
            value={schedule.cron}
            onChange={(e) => patchSchedule({ cron: e.target.value })}
            placeholder="0 7 * * 1"
          />
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.14em] text-white/40">Timezone</span>
            <input
              className="input w-full"
              value={schedule.timezone}
              onChange={(e) => patchSchedule({ timezone: e.target.value })}
              placeholder="UTC"
            />
          </label>
          <p className="text-xs text-white/35">
            The cron endpoint checks a 15-minute window, so a scheduled 7:00 AM run can be triggered by a
            scheduler polling at 7:00-7:14.
          </p>
        </div>

        <div className="panel space-y-4">
          <div>
            <p className="panel-title">Roles to refresh</p>
            <p className="mt-1 text-sm text-white/50">Pick the leadership lenses Nexus should regenerate.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {SYNTHESIS_ROLE_OPTIONS.map((role) => (
              <label
                key={role.value}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/70"
              >
                <input
                  type="checkbox"
                  checked={schedule.roles.includes(role.value)}
                  onChange={() => toggleRole(role.value)}
                />
                {role.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="panel space-y-4">
        <div>
          <p className="panel-title">Delivery</p>
          <p className="mt-1 text-sm text-white/50">In-app history is live. Email and Slack delivery are next-pass channels.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="rounded-xl border border-green-300/20 bg-green-300/10 p-3 text-sm text-green-100">
            <input
              className="mr-2"
              type="checkbox"
              checked={schedule.delivery.includes("in_app")}
              onChange={() => patchSchedule({ delivery: ["in_app"] })}
            />
            In-app output history
            <span className="mt-1 block text-xs text-green-100/60">Active now</span>
          </label>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-white/45">
            Email digest
            <span className="mt-1 block text-xs text-white/30">Coming next with Resend</span>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-white/45">
            Slack digest
            <span className="mt-1 block text-xs text-white/30">Coming after Slack sync is active</span>
          </div>
        </div>
      </div>

      {(message || error) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          error ? "border-red-300/30 bg-red-300/10 text-red-100" : "border-green-300/30 bg-green-300/10 text-green-100"
        }`}>
          {error ?? message}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" onClick={save} disabled={saving || schedule.roles.length === 0}>
          {saving ? "Saving..." : "Save schedule"}
        </button>
        <button className="btn-subtle" onClick={runTest} disabled={testing || schedule.roles.length === 0}>
          {testing ? "Running..." : "Run test now"}
        </button>
      </div>
    </div>
  );
}

function APIKeysTab({ workspaceId }: { workspaceId: string }) {
  const [keys, setKeys] = useState<AgentKey[]>([]);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState<string[]>(["read:dashboard", "read:evidence"]);
  const [creating, setCreating] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<NewKeyResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/agent-keys?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((j) => j.ok && setKeys(j.data));
  }, [workspaceId]);

  function toggleScope(scope: string) {
    setNewScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  async function createKey() {
    if (!newName.trim() || !newScopes.length) return;
    setCreating(true);
    const res = await fetch("/api/agent-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, name: newName.trim(), scopes: newScopes })
    });
    const json = await res.json();
    if (json.ok) {
      setNewKeyResult(json.data);
      setKeys((prev) => [json.data, ...prev]);
      setNewName("");
    }
    setCreating(false);
  }

  async function revokeKey(id: string) {
    await fetch(`/api/agent-keys/${id}`, { method: "DELETE" });
    setKeys((prev) => prev.map((k) => k.id === id ? { ...k, active: false } : k));
  }

  function copySecret() {
    if (newKeyResult?.secret) {
      navigator.clipboard.writeText(newKeyResult.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="panel text-sm text-white/70">
        API keys allow external agents (Codex, Claude tools, custom scripts) to authenticate
        against NexusAI using OAuth2 client credentials or direct Bearer tokens.
        The secret is shown only once on creation.
      </div>

      {newKeyResult && (
        <div className="panel border border-yellow-500/40 bg-yellow-500/5">
          <p className="text-sm font-medium text-yellow-300 mb-2">New key created - copy the secret now</p>
          <p className="text-xs text-white/50 mb-2">This will not be shown again.</p>
          <div className="flex gap-2 items-center">
            <code className="text-xs bg-black/40 rounded px-2 py-1 flex-1 break-all">{newKeyResult.secret}</code>
            <button className="btn-secondary text-xs" onClick={copySecret}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            className="text-xs text-white/40 mt-3 hover:text-white/60"
            onClick={() => setNewKeyResult(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="panel space-y-4">
        <p className="text-sm font-semibold">Create New Key</p>
        <div>
          <label className="label">Key Name</label>
          <input
            className="input"
            placeholder="e.g. Codex Agent, Weekly Brief Script"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Scopes</label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {SCOPE_OPTIONS.map((s) => (
              <label key={s.value} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={newScopes.includes(s.value)}
                  onChange={() => toggleScope(s.value)}
                />
                <span>{s.label}</span>
              </label>
            ))}
          </div>
        </div>
        <button className="btn-primary" onClick={createKey} disabled={creating || !newName.trim()}>
          {creating ? "Creating..." : "Create Key"}
        </button>
      </div>

      <div>
        <p className="text-sm font-semibold mb-3">Existing Keys ({keys.length})</p>
        {!keys.length && <p className="text-white/40 text-sm">No keys created yet.</p>}
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="panel flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{k.name}</p>
                <p className="text-xs text-white/50 font-mono">{k.prefix}••••••••</p>
                <p className="text-xs text-white/40 mt-1">
                  Scopes: {k.scopes.join(", ")}
                </p>
                <p className="text-xs text-white/30 mt-1">
                  Created {new Date(k.createdAt).toLocaleDateString()}
                  {k.lastUsedAt && ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`badge ${k.active ? "badge-green" : "badge-muted"}`}>
                  {k.active ? "active" : "revoked"}
                </span>
                {k.active && (
                  <button
                    className="text-xs text-red-400 hover:text-red-300"
                    onClick={() => revokeKey(k.id)}
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel text-sm text-white/60">
        <p className="font-semibold mb-2">How to authenticate (OAuth2 client credentials)</p>
        <pre className="text-xs bg-black/40 rounded p-3 overflow-x-auto whitespace-pre-wrap">{`POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=<workspaceId>
&client_secret=<your-api-key-secret>
&scope=read:dashboard read:evidence

→ { access_token: "...", token_type: "Bearer", expires_in: 3600 }

Then use: Authorization: Bearer <access_token>`}</pre>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agent Governance tab
// ---------------------------------------------------------------------------

type LearningSignalType = "approve" | "edit" | "reject" | "thumbs_up" | "thumbs_down";

function AgentGovernanceTab() {
  const [profiles, setProfiles] = useState<AgentControlProfile[]>([]);
  const [outputs, setOutputs] = useState<AgentOutput[]>([]);
  const [outputAgent, setOutputAgent] = useState("");
  const [outputDays, setOutputDays] = useState("7");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [signalSent, setSignalSent] = useState<Record<string, LearningSignalType>>({});
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent-control-profiles");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "load_failed");
      setProfiles(json.data.profiles ?? []);
      await loadOutputs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown_error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function loadOutputs(agent = outputAgent, days = outputDays) {
    const params = new URLSearchParams({ days, limit: "50" });
    if (agent) params.set("agentId", agent);
    const res = await fetch(`/api/agent-outputs?${params.toString()}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error ?? "outputs_load_failed");
    setOutputs(json.data.outputs ?? []);
  }

  const latestProfiles = Object.values(
    profiles.reduce<Record<string, AgentControlProfile>>((acc, profile) => {
      const current = acc[profile.agentKey];
      if (!current || profile.version > current.version) acc[profile.agentKey] = profile;
      return acc;
    }, {})
  ).sort((a, b) => a.name.localeCompare(b.name));

  async function seedDefaults() {
    setSavingKey("seed");
    setError(null);
    try {
      const res = await fetch("/api/agent-control-profiles?seed=1", { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "seed_failed");
      setProfiles(json.data.profiles ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown_error");
    } finally {
      setSavingKey(null);
    }
  }

  async function suspend(agentKey: string) {
    setSavingKey(agentKey);
    setError(null);
    try {
      const res = await fetch(`/api/agent-control-profiles/${encodeURIComponent(agentKey)}/suspend`, { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "suspend_failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown_error");
    } finally {
      setSavingKey(null);
    }
  }

  async function createVersion(profile: AgentControlProfile, patch: Partial<AgentControlProfile>) {
    setSavingKey(profile.agentKey);
    setError(null);
    try {
      const next = { ...profile, ...patch };
      const res = await fetch("/api/agent-control-profiles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agentKey: next.agentKey,
          name: next.name,
          purpose: next.purpose,
          status: next.status,
          allowedScopes: next.allowedScopes,
          forbiddenScopes: next.forbiddenScopes,
          maxSensitivity: next.maxSensitivity,
          crossEntityAccess: next.crossEntityAccess,
          allowedTools: next.allowedTools,
          forbiddenTools: next.forbiddenTools,
          policyControlledApis: next.policyControlledApis,
          actionRight: next.actionRight,
          hardStops: next.hardStops,
          escalationTriggers: next.escalationTriggers,
          approvalLevel: next.approvalLevel,
          riskRating: next.riskRating,
          reviewCadence: next.reviewCadence,
          watcherAgents: next.watcherAgents,
          logLevel: next.logLevel,
        })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "save_failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown_error");
    } finally {
      setSavingKey(null);
    }
  }

  function splitList(value: string) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  async function sendSignal(output: AgentOutput, signalType: LearningSignalType) {
    setSavingKey(`sig-${output.id}`);
    setError(null);
    try {
      let editedContent: string | undefined;
      if (signalType === "edit") {
        editedContent = window.prompt("Paste the corrected version of this brief:", output.content) ?? undefined;
        if (!editedContent) return; // user cancelled
      }
      const res = await fetch("/api/learning-signals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agentId: output.agentId,
          outputId: output.id,
          signalType,
          editedContent
        })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "signal_failed");
      setSignalSent((prev) => ({ ...prev, [output.id]: signalType }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown_error");
    } finally {
      setSavingKey(null);
    }
  }

  async function rollbackOutput(output: AgentOutput) {
    const reason = window.prompt("Why are we rolling back this output?", "Reviewer selected prior version") ?? "";
    setSavingKey(output.id);
    setError(null);
    try {
      const res = await fetch(`/api/agent-outputs/${encodeURIComponent(output.id)}/rollback`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "rollback_failed");
      await loadOutputs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown_error");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="panel text-sm text-white/70">
        Agent passports answer four reviewer questions: what can this agent see, what can it do,
        when does it escalate, and who is accountable. Every edit creates a new version.
      </div>

      {error && <div className="panel border-red-400/30 text-sm text-red-300">{error}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/50">
          Showing {latestProfiles.length} latest agent passport{latestProfiles.length === 1 ? "" : "s"}.
        </p>
        <button className="btn-secondary text-xs" onClick={seedDefaults} disabled={savingKey === "seed"}>
          {savingKey === "seed" ? "Seeding..." : "Seed default passports"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-white/40">Loading agent governance...</p>
      ) : latestProfiles.length === 0 ? (
        <div className="panel text-sm text-white/50">
          No agent passports found. Seed defaults to create least-privilege profiles for the agent library and regulated demo agents.
        </div>
      ) : (
        <div className="space-y-3">
          {latestProfiles.map((profile) => (
            <details key={`${profile.agentKey}-${profile.version}`} className="panel group" open={profile.riskRating === "regulated"}>
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">{profile.name}</p>
                  <p className="mt-1 text-xs text-white/50">{profile.purpose}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="badge">v{profile.version}</span>
                    <span className={`badge ${profile.status === "active" ? "badge-green" : "badge-muted"}`}>{profile.status}</span>
                    <span className="badge">{profile.riskRating}</span>
                    <span className="badge">max {profile.maxSensitivity}</span>
                    <span className="badge">{profile.actionRight}</span>
                    <span className="badge">approval {profile.approvalLevel}</span>
                  </div>
                </div>
                <span className="text-xs text-white/35 group-open:rotate-180">⌄</span>
              </summary>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 text-xs">
                  <div>
                    <p className="font-medium text-white/70">Allowed scopes</p>
                    <p className="mt-1 text-white/45">{profile.allowedScopes.join(", ") || "none"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-white/70">Forbidden scopes</p>
                    <p className="mt-1 text-white/45">{profile.forbiddenScopes.join(", ") || "none"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-white/70">Escalation triggers</p>
                    <p className="mt-1 text-white/45">{profile.escalationTriggers.join(", ") || "none"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-white/70">Hard stops</p>
                    <p className="mt-1 text-white/45">{profile.hardStops.join(", ") || "none"}</p>
                  </div>
                  <p className="text-white/30">
                    Updated {new Date(profile.updatedAt).toLocaleString()} by {profile.updatedBy ?? profile.createdBy}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-white/50">
                      Max sensitivity
                      <select
                        className="input mt-1"
                        defaultValue={profile.maxSensitivity}
                        onChange={(e) => createVersion(profile, { maxSensitivity: e.target.value as AgentControlProfile["maxSensitivity"] })}
                      >
                        {["public", "internal", "confidential", "restricted"].map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-white/50">
                      Action right
                      <select
                        className="input mt-1"
                        defaultValue={profile.actionRight}
                        onChange={(e) => createVersion(profile, { actionRight: e.target.value as AgentControlProfile["actionRight"] })}
                      >
                        {["retrieve", "summarize", "draft", "recommend", "prepare_for_approval"].map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </label>
                  </div>
                  <label className="text-xs text-white/50">
                    Allowed scopes (comma-separated)
                    <input
                      className="input mt-1"
                      defaultValue={profile.allowedScopes.join(", ")}
                      onBlur={(e) => createVersion(profile, { allowedScopes: splitList(e.target.value) })}
                    />
                  </label>
                  <label className="text-xs text-white/50">
                    Forbidden scopes (comma-separated)
                    <input
                      className="input mt-1"
                      defaultValue={profile.forbiddenScopes.join(", ")}
                      onBlur={(e) => createVersion(profile, { forbiddenScopes: splitList(e.target.value) })}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {profile.status === "active" ? (
                      <button
                        className="btn-secondary text-xs text-red-300"
                        onClick={() => suspend(profile.agentKey)}
                        disabled={savingKey === profile.agentKey}
                      >
                        {savingKey === profile.agentKey ? "Saving..." : "Suspend agent"}
                      </button>
                    ) : (
                      <button
                        className="btn-secondary text-xs"
                        onClick={() => createVersion(profile, { status: "active" })}
                        disabled={savingKey === profile.agentKey}
                      >
                        {savingKey === profile.agentKey ? "Saving..." : "Resume as new version"}
                      </button>
                    )}
                    <button
                      className="btn-secondary text-xs"
                      onClick={() => createVersion(profile, {})}
                      disabled={savingKey === profile.agentKey}
                    >
                      Create new version
                    </button>
                  </div>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}

      <section className="panel space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Searchable Agent Output Log</p>
            <p className="mt-1 text-xs text-white/50">
              Review generated briefs by agent, evidence, confidence, and version. Rollback keeps history intact.
            </p>
          </div>
          <button className="btn-secondary text-xs" onClick={() => loadOutputs()}>
            Refresh log
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-white/50">
            Agent
            <select
              className="input mt-1"
              value={outputAgent}
              onChange={(e) => {
                setOutputAgent(e.target.value);
                void loadOutputs(e.target.value, outputDays);
              }}
            >
              <option value="">All agents</option>
              {latestProfiles.map((profile) => (
                <option key={profile.agentKey} value={profile.agentKey}>{profile.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-white/50">
            Date range
            <select
              className="input mt-1"
              value={outputDays}
              onChange={(e) => {
                setOutputDays(e.target.value);
                void loadOutputs(outputAgent, e.target.value);
              }}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </label>
          <label className="text-xs text-white/50">
            Action type
            <select className="input mt-1" defaultValue="agent_output_created" disabled>
              <option value="agent_output_created">Agent outputs</option>
            </select>
          </label>
        </div>

        {outputs.length === 0 ? (
          <p className="text-sm text-white/40">No agent outputs found for this filter yet. Open a dashboard to generate briefs.</p>
        ) : (
          <div className="space-y-2">
            {outputs.map((output) => {
              // Passport Drift Warning — locked signature pattern (see nexus-design-system
              // skill): flag when the agent's control profile has moved to a newer version
              // since this specific output was generated. Real comparison only — agent v{n}
              // is the version stored on the AgentOutput row at creation time
              // (lib/services/dashboard.ts: agentVersion: passport?.version ?? 1); current
              // version comes from the live agent-control-profiles history, same data the
              // passport cards above render. No drift is inferred unless both numbers exist
              // and disagree.
              const currentProfile = latestProfiles.find((p) => p.agentKey === output.agentId);
              const hasDrifted = Boolean(currentProfile) && currentProfile!.version !== output.agentVersion;
              return (
                <article key={output.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{output.agentId} · {output.roleKey}</p>
                      <p className="mt-1 text-xs text-white/40">
                        {new Date(output.createdAt).toLocaleString()} · output v{output.outputVersion} · agent v{output.agentVersion}
                      </p>
                      {hasDrifted && (
                        <p className="mt-1.5">
                          <MetaChip
                            label={`Passport drift — this brief ran on agent v${output.agentVersion}, control profile is now v${currentProfile!.version}`}
                            tone="warn"
                          />
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`badge ${output.isActive ? "badge-green" : "badge-muted"}`}>
                        {output.isActive ? "active" : "historical"}
                      </span>
                      <span className="badge">{Math.round(output.confidence * 100)}%</span>
                      <span className="badge">{output.evidenceRefs.length} sources</span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-white/45">Prompt: {output.inputSummary}</p>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/70">{output.content}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-white/30">ID {output.id}</span>
                  {signalSent[output.id] ? (
                    <span className="text-xs text-emerald-400">
                      Signal recorded: {signalSent[output.id]}
                    </span>
                  ) : (
                    <>
                      <button
                        className="btn-secondary text-xs"
                        title="Approve — this output is accurate and useful"
                        onClick={() => sendSignal(output, "approve")}
                        disabled={!!savingKey}
                      >
                        Approve
                      </button>
                      <button
                        className="btn-secondary text-xs"
                        title="Edit — submit a corrected version"
                        onClick={() => sendSignal(output, "edit")}
                        disabled={!!savingKey}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-secondary text-xs"
                        title="Reject — this output should not have been produced"
                        onClick={() => sendSignal(output, "reject")}
                        disabled={!!savingKey}
                      >
                        Reject
                      </button>
                      <button
                        className="btn-secondary text-xs"
                        title="Thumbs up"
                        onClick={() => sendSignal(output, "thumbs_up")}
                        disabled={!!savingKey}
                      >
                        👍
                      </button>
                      <button
                        className="btn-secondary text-xs"
                        title="Thumbs down"
                        onClick={() => sendSignal(output, "thumbs_down")}
                        disabled={!!savingKey}
                      >
                        👎
                      </button>
                    </>
                  )}
                  {!output.isActive && (
                    <button
                      className="btn-secondary text-xs"
                      onClick={() => rollbackOutput(output)}
                      disabled={savingKey === output.id}
                    >
                      {savingKey === output.id ? "Rolling back..." : "Roll back to this version"}
                    </button>
                  )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Roles tab
// ---------------------------------------------------------------------------

function RolesTab() {
  const roles = [
    {
      id: "ceo",
      label: "CEO",
      description: "Strategic priorities, cross-functional risks, open decisions.",
      path: "/dashboard/ceo"
    },
    {
      id: "coo",
      label: "COO",
      description: "Execution status, process issues, overdue items, owner map.",
      path: "/dashboard/coo"
    },
    {
      id: "cbo",
      label: "CBO / Strategy",
      description: "Growth opportunities, partner pipeline, strategic alignment.",
      path: "/dashboard/cbo"
    },
    {
      id: "cto",
      label: "CTO / CDO",
      description: "Technology health, data governance, security and AI pipeline status.",
      path: "/dashboard/cto"
    }
  ];

  return (
    <div className="space-y-4 max-w-lg">
      <div className="panel text-sm text-white/70">
        Each role maps to a dedicated dashboard synthesized from the same evidence base.
        User-to-role mapping is managed through the database users and roles tables.
      </div>
      {roles.map((r) => (
        <div key={r.id} className="panel">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold">{r.label}</p>
              <p className="text-xs text-white/60 mt-1">{r.description}</p>
            </div>
            <a href={r.path} className="btn-secondary text-xs">View</a>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audit Log tab
// ---------------------------------------------------------------------------

type AuditEvent = {
  id: string;
  type: string;
  actor: string;
  timestamp: string;
  payload: Record<string, unknown>;
};

const AUDIT_TYPE_COLORS: Record<string, string> = {
  ingestion_extraction_completed: "text-green-400",
  ingestion_original_stored: "text-green-300",
  evidence_deleted: "text-red-400",
  recommendation_generated: "text-nexus-accent",
  approval_granted: "text-green-400",
  approval_rejected: "text-amber-400",
  ingestion_original_storage_failed: "text-red-300",
};

function auditSummary(event: AuditEvent): string {
  const p = event.payload;
  switch (event.type) {
    case "ingestion_extraction_completed":
      return `Extracted ${p.extractedCharCount ?? "?"} chars · ${p.extractionMethod ?? "?"} · ID: ${String(p.evidenceId ?? "").slice(0, 12)}`;
    case "evidence_deleted":
      return `Removed "${p.sourcePath ?? p.evidenceId}" · dept: ${p.department ?? "—"} · was: ${p.ingestionStatus ?? "?"}`;
    case "recommendation_generated":
      return `${p.count ?? "?"} recommendation(s) generated`;
    case "approval_granted":
      return `Approved: ${String(p.recommendationId ?? "").slice(0, 12)} · actor: ${event.actor}`;
    case "approval_rejected":
      return `Rejected: ${String(p.recommendationId ?? "").slice(0, 12)} · reason: ${p.reason ?? "—"}`;
    case "ingestion_original_stored":
      return `Original stored at ${p.sourceUri ?? "—"}`;
    case "ingestion_original_storage_failed":
      return `Storage failed for ${p.fileName ?? "—"}: ${p.error ?? "unknown"}`;
    default:
      return Object.keys(p).length
        ? Object.entries(p).slice(0, 2).map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`).join(" · ")
        : "—";
  }
}

function AuditTab() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/audit/events?limit=${limit}`)
      .then((r) => r.json())
      .then((j) => { if (j.ok) setEvents(j.data.events ?? []); })
      .finally(() => setLoading(false));
  }, [limit]);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="panel text-sm text-white/70">
        System audit trail for this workspace. Every ingestion, deletion, approval,
        profile change, and authentication event is recorded here.
        Evidence-level and recommendation-level events are always captured regardless of LLM availability.
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-white/60">Showing last {limit} events</p>
        <div className="flex gap-2">
          {[25, 50, 100].map((n) => (
            <button
              key={n}
              onClick={() => setLimit(n)}
              className={[
                "rounded-full border px-3 py-1 text-xs transition",
                limit === n
                  ? "border-nexus-accent/60 bg-nexus-accent/15 text-nexus-accent"
                  : "border-white/20 text-white/40 hover:border-white/40",
              ].join(" ")}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-white/40 text-sm">Loading audit events...</p>
      ) : events.length === 0 ? (
        <div className="panel text-sm text-white/50">
          No audit events yet. Events are recorded as documents are ingested, reviewed, approved, and deleted.
        </div>
      ) : (
        <div className="space-y-1.5">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-xs"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-medium ${AUDIT_TYPE_COLORS[event.type] ?? "text-white/60"}`}>
                    {event.type.replace(/_/g, " ")}
                  </span>
                  <span className="text-white/30">·</span>
                  <span className="text-white/40">{event.actor}</span>
                </div>
                <span className="text-white/30 shrink-0">
                  {new Date(event.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-white/40">{auditSummary(event)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demo Tools tab
// ---------------------------------------------------------------------------

const DEMO_SECTORS = [
  { value: "financial_services", label: "Financial Services (Gulf Capital Partners)" },
  { value: "professional_services", label: "Professional Services (Meridian Advisory Group)" },
  { value: "technology_saas", label: "Technology / SaaS (Vanta Systems)" },
];

function DemoTab({ workspaceId }: { workspaceId: string }) {
  const [demoMode, setDemoMode] = useState<boolean | null>(null);
  const [sector, setSector] = useState("technology_saas");
  const [resetting, setResetting] = useState(false);
  const [togglingDemo, setTogglingDemo] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resetResult, setResetResult] = useState<{
    workspaceName: string;
    demoSummary: string;
    suggestedQuestions: string[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/settings/workspace")
      .then(r => r.json())
      .then(j => { if (j.ok) setDemoMode(j.data?.demoMode ?? false); })
      .catch(() => setDemoMode(false));
  }, [workspaceId]);

  async function toggleDemoMode() {
    if (demoMode === null) return;
    setTogglingDemo(true);
    setMessage(""); setError("");
    try {
      const res = await fetch("/api/settings/workspace", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ demoMode: !demoMode }),
      });
      const j = await res.json();
      if (j.ok) { setDemoMode(!demoMode); setMessage(!demoMode ? "Demo mode enabled. Ingestion is now blocked." : "Demo mode disabled."); }
      else setError(j.error ?? "Failed to update demo mode");
    } catch { setError("Network error"); }
    finally { setTogglingDemo(false); }
  }

  async function resetDemo() {
    setResetting(true); setMessage(""); setError(""); setResetResult(null);
    try {
      const res = await fetch(`/api/workspace/demo-reset?sector=${sector}`, { method: "POST" });
      const j = await res.json();
      if (j.ok) {
        setMessage(j.data?.message ?? "Demo workspace reset.");
        if (j.data?.suggestedQuestions) {
          setResetResult({
            workspaceName: j.data.workspaceName,
            demoSummary: j.data.demoSummary,
            suggestedQuestions: j.data.suggestedQuestions,
          });
        }
      } else setError(j.error ?? "Reset failed");
    } catch { setError("Network error"); }
    finally { setResetting(false); }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-xl border border-purple-400/20 bg-purple-400/5 p-5">
        <h3 className="mb-1 text-sm font-semibold text-white">Demo Mode</h3>
        <p className="mb-4 text-xs text-white/50">
          Enables the DEMO badge in the top bar and blocks real document ingestion.
          Use before every sales demo to prevent accidental data entry.
        </p>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${demoMode ? "text-purple-300" : "text-white/40"}`}>
            {demoMode === null ? "Loading..." : demoMode ? "Demo mode is ON" : "Demo mode is OFF"}
          </span>
          <button
            onClick={toggleDemoMode}
            disabled={togglingDemo || demoMode === null}
            className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
              demoMode ? "bg-white/10 text-white hover:bg-white/20" : "bg-purple-600 text-white hover:bg-purple-500"
            }`}
          >
            {togglingDemo ? "Updating..." : demoMode ? "Disable Demo Mode" : "Enable Demo Mode"}
          </button>
        </div>
      </div>

      <div className={`rounded-xl border p-5 transition-opacity ${demoMode ? "border-white/10 opacity-100" : "border-white/5 opacity-40 pointer-events-none"}`}>
        <h3 className="mb-1 text-sm font-semibold text-white">Reset Demo Workspace</h3>
        <p className="mb-4 text-xs text-white/50">
          Clears all evidence, recommendations, and decisions. Re-seeds with a realistic sector pack.
          Run this before every new sales demo.
        </p>
        <div className="mb-3">
          <label className="mb-1 block text-xs text-white/60">Sector Pack</label>
          <select
            value={sector}
            onChange={e => setSector(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          >
            {DEMO_SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <button
          onClick={resetDemo}
          disabled={resetting || !demoMode}
          className="w-full rounded-lg bg-red-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-40"
        >
          {resetting ? "Resetting..." : "Reset Demo Workspace"}
        </button>
      </div>

      {message && <p className="text-xs text-green-300">{message}</p>}
      {error && <p className="text-xs text-red-300">{error}</p>}

      {resetResult && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-white">{resetResult.workspaceName}</p>
            <p className="mt-1 text-xs text-white/55">{resetResult.demoSummary}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-white/70 mb-2">Pre-loaded Ask questions for this demo:</p>
            <ol className="space-y-1.5">
              {resetResult.suggestedQuestions.map((q, i) => (
                <li key={i} className="flex gap-2 text-xs text-white/60">
                  <span className="shrink-0 text-emerald-400 font-medium">{i + 1}.</span>
                  <span>{q}</span>
                </li>
              ))}
            </ol>
          </div>
          <p className="text-xs text-white/35">
            Open the CEO dashboard and paste any of these into the Ask panel to start the demo.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-white/5 bg-white/3 p-4 text-xs text-white/40">
        <p className="font-medium text-white/60">Export Pilot Artifacts</p>
        <p className="mt-1">
          Access the <a href="/export" className="underline hover:text-white/80">Export Hub</a> to
          generate the weekly brief, one-pager, risk radar CSV, and recommendation register CSV.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main settings page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("workspace");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Resolve the real workspace from the session/token rather than hardcoding.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.data?.workspaceId) setWorkspaceId(j.data.workspaceId);
      })
      .catch(() => setWorkspaceId("workspace-demo")); // fallback for dev
  }, []);

  if (!workspaceId) {
    return (
      <PageShell title="Settings" description="Configure workspace, LLM provider, sources, policies, and API access.">
        <p className="text-white/40 text-sm">Loading...</p>
      </PageShell>
    );
  }

  return (
    <PageShell title="Settings" description="Configure workspace, LLM provider, sources, policies, and API access.">
      <div className="flex gap-1 mb-6 border-b border-white/10 pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab === tab.id
                ? "text-white border-b-2 border-blue-400"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "plan" && <PlanTab workspaceId={workspaceId} />}
        {activeTab === "workspace" && <WorkspaceTab workspaceId={workspaceId} />}
        {activeTab === "profile" && <ProfileTab />}
        {activeTab === "llm" && <LLMTab workspaceId={workspaceId} />}
        {activeTab === "sources" && <SourcesTab />}
        {activeTab === "policies" && <PoliciesTab workspaceId={workspaceId} />}
        {activeTab === "ai-policy" && <AIPolicyTab workspaceId={workspaceId} />}
        {activeTab === "eval" && <EvalTab />}
        {activeTab === "prompts" && <PromptsTab />}
        {activeTab === "agent-governance" && <AgentGovernanceTab />}
        {activeTab === "synthesis-schedule" && <SynthesisScheduleTab />}
        {activeTab === "apikeys" && <APIKeysTab workspaceId={workspaceId} />}
        {activeTab === "roles" && <RolesTab />}
        {activeTab === "audit" && <AuditTab />}
        {activeTab === "demo" && <DemoTab workspaceId={workspaceId} />}
      </div>
    </PageShell>
  );
}
