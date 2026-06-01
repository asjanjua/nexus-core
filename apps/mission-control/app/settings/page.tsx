/**
 * Main Settings page — replaces the stub pages that existed before.
 * Client component with tab navigation across:
 *   Workspace | LLM Provider | Sources | Policies | API Keys | Roles
 */
"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/page-shell";
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
  llmProvider: "anthropic" | "openai" | "azure_openai";
  llmModel: string;
  quarantineThreshold: number;
  defaultSensitivity: string;
  slackEnabled: boolean;
  teamsEnabled: boolean;
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
  { id: "workspace", label: "Workspace" },
  { id: "profile", label: "Company Profile" },
  { id: "llm", label: "LLM Provider" },
  { id: "sources", label: "Sources" },
  { id: "policies", label: "Policies" },
  { id: "agent-governance", label: "Agent Governance" },
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
  { value: "write:ingest", label: "Ingest documents" },
  { value: "write:approvals", label: "Approve recommendations" },
  { value: "admin", label: "Full admin access" }
];

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
// API Keys tab
// ---------------------------------------------------------------------------

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

function AgentGovernanceTab() {
  const [profiles, setProfiles] = useState<AgentControlProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent-control-profiles");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "load_failed");
      setProfiles(json.data.profiles ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown_error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

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
    setResetting(true); setMessage(""); setError("");
    try {
      const res = await fetch(`/api/workspace/demo-reset?sector=${sector}`, { method: "POST" });
      const j = await res.json();
      if (j.ok) setMessage(j.data?.message ?? "Demo workspace reset.");
      else setError(j.error ?? "Reset failed");
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
        {activeTab === "workspace" && <WorkspaceTab workspaceId={workspaceId} />}
        {activeTab === "profile" && <ProfileTab />}
        {activeTab === "llm" && <LLMTab workspaceId={workspaceId} />}
        {activeTab === "sources" && <SourcesTab />}
        {activeTab === "policies" && <PoliciesTab workspaceId={workspaceId} />}
        {activeTab === "agent-governance" && <AgentGovernanceTab />}
        {activeTab === "apikeys" && <APIKeysTab workspaceId={workspaceId} />}
        {activeTab === "roles" && <RolesTab />}
        {activeTab === "audit" && <AuditTab />}
        {activeTab === "demo" && <DemoTab workspaceId={workspaceId} />}
      </div>
    </PageShell>
  );
}
