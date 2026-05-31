"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAllSectors, getSector } from "@/lib/domain/sector-library";
import { labelForRole, ROLE_REGISTRY } from "@/lib/domain/role-registry";
import { roleStatesFromSuggestions, suggestRolesForProfile, type SuggestedRole } from "@/lib/services/role-suggestion";
import type { DetectedProfile, FocusMapping } from "@/lib/services/company-detection";
import type { SuggestedDocument } from "@/lib/services/company-classification";
import type { WorkspaceRoleState } from "@/lib/contracts";
import { classifyFilename } from "@/lib/services/company-classification";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IngestionResult = {
  id: string;
  ingestionStatus: string;
  extractionConfidence: number;
  sourcePath: string;
};

type FileWithMeta = {
  file: File;
  department: string;
  sensitivity: "public" | "internal" | "confidential" | "restricted";
};

type WizardRole = {
  key: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  badge: string;
  reason?: string;
  state?: "active" | "staged" | "available" | "dual_hat";
  locked?: boolean;
  dualHatCandidate?: boolean;
  stagedCondition?: string;
  relevanceScore?: number;
  isCustom?: boolean;
};

type Props = {
  workspaceId: string;
  displayName: string;
  isAuthenticated: boolean;
};

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const MAX_ONBOARDING_FILES = 10;

// ---------------------------------------------------------------------------
// All available role cards (CEO, COO, CFO, CTO, CBO, CRO)
// ---------------------------------------------------------------------------

const ALL_ROLES: WizardRole[] = [
  {
    key: "ceo",
    label: "CEO",
    description: "Strategic priorities, cross-functional risks, and open decisions.",
    icon: "◈",
    color: "border-purple-400/30 hover:border-purple-400/60",
    badge: "Strategic",
  },
  {
    key: "coo",
    label: "COO",
    description: "Operational health, delivery pipeline, and execution blockers.",
    icon: "◉",
    color: "border-blue-400/30 hover:border-blue-400/60",
    badge: "Operations",
  },
  {
    key: "cbo",
    label: "CBO / Strategy",
    description: "Growth opportunities, BD pipeline, and strategic alignment signals.",
    icon: "◑",
    color: "border-nexus-accent/30 hover:border-nexus-accent/60",
    badge: "Commercial",
  },
  {
    key: "cto",
    label: "CTO / CDO",
    description: "Technology health, data quality, and security posture.",
    icon: "◐",
    color: "border-orange-400/30 hover:border-orange-400/60",
    badge: "Technology",
  },
];

const ROLE_ICON: Record<string, string> = {
  ceo: "◈",
  cfo: "$",
  coo: "◉",
  cro: "!",
  cco: "§",
  cbo: "◑",
  growth_officer: "↗",
  vp_performance_mktg: "%",
  brand_community: "◆",
  cmo: "◇",
  cto: "◐",
  cpo: "▣",
  chro: "◎",
  managing_partner: "◈",
  chief_medical: "+",
  vp_supply_chain: "⇄",
  project_director: "▦",
  practice_lead: "◌",
  vp_customer_success: "♥",
  chief_of_staff: "※",
  general_counsel: "¶",
  franchise_manager: "⌂",
};

const ROLE_COLOR: Record<string, string> = {
  ceo: "border-purple-400/30 hover:border-purple-400/60",
  cfo: "border-emerald-400/30 hover:border-emerald-400/60",
  coo: "border-blue-400/30 hover:border-blue-400/60",
  cro: "border-red-400/30 hover:border-red-400/60",
  cco: "border-amber-400/30 hover:border-amber-400/60",
  cbo: "border-nexus-accent/30 hover:border-nexus-accent/60",
  cto: "border-orange-400/30 hover:border-orange-400/60",
  chro: "border-pink-400/30 hover:border-pink-400/60",
};

function roleBadge(roleKey: string): string {
  if (["cro", "cco", "general_counsel"].includes(roleKey)) return "Governance";
  if (["growth_officer", "vp_performance_mktg", "brand_community", "cmo"].includes(roleKey)) return "Growth";
  if (["cto", "cpo"].includes(roleKey)) return "Technology";
  if (["cfo"].includes(roleKey)) return "Finance";
  if (["coo", "vp_supply_chain", "project_director", "franchise_manager"].includes(roleKey)) return "Operations";
  if (["chro"].includes(roleKey)) return "People";
  return "Leadership";
}

function roleDescription(roleKey: string): string {
  const scope = ROLE_REGISTRY[roleKey]?.evidenceScope;
  return scope?.length
    ? `Monitors ${scope.slice(0, 4).join(", ")} evidence.`
    : "Custom intelligence view based on governed evidence.";
}

function toWizardRole(role: SuggestedRole): WizardRole {
  return {
    key: role.roleKey,
    label: role.label,
    description: roleDescription(role.roleKey),
    icon: ROLE_ICON[role.roleKey] ?? "◇",
    color: ROLE_COLOR[role.roleKey] ?? "border-white/20 hover:border-white/40",
    badge: roleBadge(role.roleKey),
    reason: role.reason,
    state: role.state,
    locked: role.locked,
    dualHatCandidate: role.dualHatCandidate,
    stagedCondition: role.stagedCondition,
    relevanceScore: role.relevanceScore,
  };
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEPS = ["Workspace", "Discover", "Profile", "Roles", "Upload", "Preview", "Go Live"];

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="mb-10 flex items-center gap-0 overflow-x-auto pb-1">
      {STEPS.map((label, idx) => {
        const stepNum = (idx + 1) as Step;
        const done = current > stepNum;
        const active = current === stepNum;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all",
                  done
                    ? "bg-nexus-accent text-black"
                    : active
                    ? "bg-nexus-accent/20 border border-nexus-accent text-nexus-accent"
                    : "bg-white/5 border border-white/20 text-white/30",
                ].join(" ")}
              >
                {done ? "✓" : stepNum}
              </div>
              <span
                className={[
                  "text-xs whitespace-nowrap",
                  active ? "text-white/90" : done ? "text-nexus-accent/70" : "text-white/30",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={[
                  "mx-1.5 mb-4 h-px w-6 transition-all",
                  done ? "bg-nexus-accent/50" : "bg-white/10",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confidence bar
// ---------------------------------------------------------------------------

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "bg-green-400" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  const label = pct >= 70 ? "High" : pct >= 40 ? "Medium" : "Low";
  const labelColor = pct >= 70 ? "text-green-400" : pct >= 40 ? "text-amber-400" : "text-red-400";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50">Extraction confidence</span>
        <span className={labelColor}>{label} ({pct}%)</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sensitivity badge
// ---------------------------------------------------------------------------

function SensitivityBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    public: "border-green-500/40 bg-green-500/10 text-green-300",
    internal: "border-blue-400/40 bg-blue-400/10 text-blue-300",
    confidential: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    restricted: "border-red-400/40 bg-red-400/10 text-red-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${styles[value] ?? styles.internal}`}>
      {value}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Section label
// ---------------------------------------------------------------------------

function SectionLabel({ text }: { text: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">{text}</p>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Workspace provision
// ---------------------------------------------------------------------------

function Step1({ workspaceId, displayName, onNext }: {
  workspaceId: string;
  displayName: string;
  onNext: () => void;
}) {
  const [provisioning, setProvisioning] = useState(false);
  const [provisioned, setProvisioned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function provision() {
    setProvisioning(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName: displayName }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "provision_failed");
      setProvisioned(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown_error");
    } finally {
      setProvisioning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Welcome to NexusAI</h2>
        <p className="mt-2 text-white/60">
          Your executive intelligence layer. Setup takes about 3 minutes.
          NexusAI will learn your company type and tailor every insight to your business context.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/40 mb-1">Workspace</p>
            <p className="text-lg font-semibold text-white">{displayName}</p>
            <p className="text-xs text-white/40 mt-0.5 font-mono">{workspaceId}</p>
          </div>
          {provisioned ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-xs text-green-300">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              Provisioned
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white/40">
              <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
              Pending setup
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[{ label: "Tenant", value: "Isolated" }, { label: "Auth", value: "Clerk SSO" }, { label: "Mode", value: process.env.NEXT_PUBLIC_NEXUS_ENV ?? "pilot" }].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-xs text-white/40">{label}</p>
              <p className="text-sm font-medium text-white/80">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-nexus-accent/20 bg-nexus-accent/5 p-4 text-sm text-white/60">
        <p className="font-medium text-nexus-accent/80 mb-2">What NexusAI does differently:</p>
        <ul className="space-y-1 text-white/50">
          <li className="flex gap-2"><span className="text-nexus-accent">→</span> Learns your sector, roles, and goals before analysing documents</li>
          <li className="flex gap-2"><span className="text-nexus-accent">→</span> Recommends what to upload based on your company type</li>
          <li className="flex gap-2"><span className="text-nexus-accent">→</span> Generates role-specific executive intelligence from your evidence</li>
          <li className="flex gap-2"><span className="text-nexus-accent">→</span> Applies appropriate sensitivity defaults for your industry</li>
        </ul>
      </div>

      {error && <p className="rounded-lg border border-red-300/40 bg-red-300/10 px-4 py-2 text-sm text-red-300">{error}</p>}

      <div className="flex gap-3">
        {!provisioned && (
          <button onClick={provision} disabled={provisioning} className="btn-primary">
            {provisioning ? "Provisioning..." : "Provision Workspace"}
          </button>
        )}
        {provisioned && <button onClick={onNext} className="btn-primary">Continue — Describe your company →</button>}
        {!provisioned && <button onClick={onNext} className="btn-subtle text-sm text-white/50">Skip (already provisioned)</button>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — AI Discovery (free-text + sector cards)
// ---------------------------------------------------------------------------

const SECTOR_ICONS: Record<string, string> = {
  financial_services: "◈",
  professional_services: "◎",
  technology_saas: "⬡",
  manufacturing: "⬢",
  retail_commerce: "◉",
  healthcare: "⊕",
  real_estate_construction: "⊞",
  education_training: "◷",
};

function Step2({
  onDetected,
  onManual,
  onBack,
}: {
  onDetected: (profile: DetectedProfile) => void;
  onManual: (sector: string, subsector: string) => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<"describe" | "browse">("describe");
  const [description, setDescription] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState("");
  const [selectedSubsector, setSelectedSubsector] = useState("");
  const sectors = getAllSectors();
  const sectorDef = sectors.find((s) => s.key === selectedSector);

  async function handleDetect() {
    if (!description.trim() || description.trim().length < 10) return;
    setDetecting(true);
    setDetectError(null);
    try {
      const res = await fetch("/api/workspace/detect-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "detection_failed");
      const detected = payload.data as DetectedProfile;
      if (detected.confidence < 0.5) {
        setSelectedSector(detected.sector ?? "");
        setSelectedSubsector(detected.subsector ?? "");
        setTab("browse");
        setDetectError(
          "AI was not confident enough to apply this profile automatically. Please confirm the closest sector manually."
        );
        return;
      }
      onDetected(detected);
    } catch (err) {
      setDetectError(
        err instanceof Error && err.message.includes("LLM unavailable")
          ? "AI detection is unavailable. Use Browse to select your sector manually."
          : (err instanceof Error ? err.message : "Detection failed. Try the Browse tab instead.")
      );
    } finally {
      setDetecting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">Tell NexusAI about your company</h2>
        <p className="mt-2 text-white/60">
          Describe your business in plain language, or pick your sector from the list.
          NexusAI uses this to tailor every dashboard, recommendation, and AI response.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
        {(["describe", "browse"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "flex-1 rounded-md py-1.5 text-sm transition",
              tab === t
                ? "bg-nexus-accent/20 text-nexus-accent font-medium"
                : "text-white/40 hover:text-white/70",
            ].join(" ")}
          >
            {t === "describe" ? "Describe (AI)" : "Browse sectors"}
          </button>
        ))}
      </div>

      {tab === "describe" && (
        <div className="space-y-3">
          <textarea
            className="min-h-28 w-full rounded-lg border border-white/20 bg-black/20 p-3 text-sm text-white/80 placeholder-white/30 focus:border-nexus-accent focus:outline-none resize-none"
            placeholder={"Example: \"We are a B2B payments company in the GCC, serving SME merchants with a digital acquiring platform. About 80 employees, Series B.\""}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {[
              "We're a fintech startup in Pakistan focused on digital wallets",
              "B2B SaaS company providing HR software to enterprise clients in the UAE",
              "Management consulting firm with 50 people across GCC and South Asia",
            ].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setDescription(ex)}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/40 hover:border-nexus-accent/40 hover:text-white/70 transition"
              >
                {ex.length > 55 ? ex.slice(0, 55) + "…" : ex}
              </button>
            ))}
          </div>
          {detectError && (
            <p className="rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-sm text-amber-200">{detectError}</p>
          )}
          <div className="flex gap-3 items-center">
            <button
              onClick={handleDetect}
              disabled={detecting || description.trim().length < 10}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {detecting ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  Analysing your company...
                </span>
              ) : (
                "Detect with AI →"
              )}
            </button>
            <span className="text-xs text-white/30">or</span>
            <button onClick={() => setTab("browse")} className="text-xs text-white/40 hover:text-white/70 transition underline underline-offset-2">
              pick sector manually
            </button>
          </div>
          <p className="text-xs text-white/25">
            NexusAI will infer your sector, roles, recommended documents, and sensitivity defaults.
          </p>
        </div>
      )}

      {tab === "browse" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {sectors.map((sector) => {
              const isSelected = selectedSector === sector.key;
              return (
                <button
                  key={sector.key}
                  type="button"
                  onClick={() => { setSelectedSector(sector.key); setSelectedSubsector(""); }}
                  className={[
                    "rounded-xl border p-4 text-left transition-all",
                    isSelected
                      ? "border-nexus-accent/60 bg-nexus-accent/10"
                      : "border-white/10 bg-white/5 hover:border-white/30",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <span className={`text-lg ${isSelected ? "text-nexus-accent" : "text-white/30"}`}>
                      {SECTOR_ICONS[sector.key] ?? "◇"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isSelected ? "text-white" : "text-white/70"}`}>{sector.label}</p>
                      <p className="mt-0.5 text-xs text-white/40 line-clamp-2">{sector.description}</p>
                    </div>
                    {isSelected && <span className="text-nexus-accent text-sm shrink-0">✓</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* "Can't find your industry?" fallback */}
          <div className="rounded-xl border border-white/10 bg-black/20 p-3 flex items-start gap-3">
            <span className="text-white/30 text-lg mt-0.5">?</span>
            <div className="flex-1">
              <p className="text-sm text-white/60">Can&apos;t find your industry?</p>
              <p className="text-xs text-white/40 mt-0.5">
                Switch to the{" "}
                <button onClick={() => setTab("describe")} className="text-nexus-accent underline underline-offset-2 hover:no-underline">
                  Describe tab
                </button>
                {" "}and type your company description — AI will classify it for you.
              </p>
            </div>
          </div>

          {sectorDef && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
              <p className="text-sm font-medium text-white/80">Which best describes your focus?</p>
              <div className="flex flex-wrap gap-2">
                {sectorDef.subsectors.map((sub) => {
                  const isSelected = selectedSubsector === sub.key;
                  return (
                    <button
                      key={sub.key}
                      type="button"
                      onClick={() => setSelectedSubsector(isSelected ? "" : sub.key)}
                      className={[
                        "rounded-full border px-3 py-1 text-xs transition",
                        isSelected
                          ? "border-nexus-accent/60 bg-nexus-accent/15 text-nexus-accent"
                          : "border-white/20 text-white/50 hover:border-white/40",
                      ].join(" ")}
                    >
                      {sub.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3 items-center">
            <button
              onClick={() => onManual(selectedSector, selectedSubsector)}
              disabled={!selectedSector}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
            <button onClick={onBack} className="btn-subtle text-sm text-white/50">← Back</button>
            {!selectedSector && <span className="text-xs text-white/30">Select a sector to continue</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Profile Confirmation
// ---------------------------------------------------------------------------

const BUSINESS_MODEL_LABELS: Record<string, string> = {
  b2b: "B2B", b2c: "B2C", b2b2c: "B2B2C",
  marketplace: "Marketplace", services: "Services / Advisory", government: "Government",
};
const STAGE_LABELS: Record<string, string> = {
  pre_revenue: "Pre-Revenue", early_stage: "Early Stage", growth: "Growth",
  scale_up: "Scale-Up", enterprise: "Enterprise", public: "Listed / Public",
};
const GOAL_LABELS: Record<string, string> = {
  revenue_growth: "Revenue growth", cost_reduction: "Cost reduction",
  regulatory_compliance: "Regulatory compliance", market_expansion: "Market expansion",
  digital_transformation: "Digital transformation", risk_management: "Risk management",
  talent_retention: "Talent & culture", product_launch: "Product launch",
};

const DOC_ICONS: Record<string, string> = {
  pdf: "📄", docx: "📝", xlsx: "📊", txt: "📃", md: "📋", pptx: "📑",
};

function Step3({
  detected,
  workspaceId,
  onConfirmed,
  onBack,
}: {
  detected: DetectedProfile;
  workspaceId: string;
  onConfirmed: (profile: DetectedProfile) => void;
  onBack: () => void;
}) {
  const [profile, setProfile] = useState<DetectedProfile>({ ...detected });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof DetectedProfile, value: unknown) {
    setProfile((p) => ({ ...p, [field]: value }));
  }

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: profile.companyName || null,
          sector: profile.sector || null,
          subsector: profile.subsector || null,
          businessModel: profile.businessModel || null,
          companyStage: profile.companyStage || null,
          employeeBand: profile.employeeBand || null,
          region: profile.region || null,
          primaryGoals: profile.primaryGoals,
          riskProfile: profile.riskProfile || null,
          priorityRoles: profile.priorityRoles,
          companyArchetype: profile.companyArchetype,
          archetypeVersion: profile.companyArchetype ? `manual-confirmed:${new Date().toISOString()}` : null,
          briefLanguageMode: profile.companyArchetype === "sme_physical" ? "plain" : "formal",
          locationCount: 1,
          roleStates: profile.roleStates ?? {},
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "save_failed");
      onConfirmed(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown_error");
    } finally {
      setSaving(false);
    }
  }

  const confidenceColor =
    profile.confidence >= 0.8 ? "text-green-400" : profile.confidence >= 0.5 ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Here&apos;s what NexusAI detected</h2>
          <p className="mt-1.5 text-white/60 text-sm">
            Review and edit before we set up your workspace.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1">
          <span className={`text-xs font-medium ${confidenceColor}`}>
            {Math.round(profile.confidence * 100)}% confident
          </span>
        </div>
      </div>

      {profile.reasoning && (
        <div className="rounded-xl border border-nexus-accent/20 bg-nexus-accent/5 px-4 py-3 text-sm text-white/70 italic">
          {profile.reasoning}
        </div>
      )}

      {/* Core profile */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <SectionLabel text="Company classification" />
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Sector", value: profile.sectorLabel || profile.sector },
            { label: "Subsector", value: profile.subsector || "—" },
            { label: "Business model", value: BUSINESS_MODEL_LABELS[profile.businessModel] ?? profile.businessModel },
            { label: "Stage", value: STAGE_LABELS[profile.companyStage] ?? profile.companyStage },
            { label: "Region", value: profile.region || "—" },
            { label: "Sensitivity default", value: profile.sensitivityDefault },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-xs text-white/40">{label}</p>
              <p className="text-sm font-medium text-white/80 capitalize">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Goals */}
      {profile.primaryGoals.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
          <SectionLabel text="Strategic goals detected" />
          <div className="flex flex-wrap gap-2">
            {profile.primaryGoals.map((goal) => (
              <span
                key={goal}
                className="rounded-full border border-nexus-accent/40 bg-nexus-accent/10 px-2.5 py-0.5 text-xs text-nexus-accent"
              >
                {GOAL_LABELS[goal] ?? goal}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggested documents */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <SectionLabel text="Recommended first uploads for your sector" />
        <ul className="space-y-2">
          {profile.suggestedDocuments.map((doc, i) => (
            <li key={i} className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/10 px-3 py-2.5">
              <span className="text-base shrink-0">{DOC_ICONS[doc.type] ?? "📄"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-white/80 font-medium">{doc.name}</p>
                  {doc.priority === "high" && (
                    <span className="rounded-full border border-nexus-accent/40 bg-nexus-accent/10 px-1.5 py-0.5 text-xs text-nexus-accent">
                      Priority
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/40 mt-0.5">{doc.description}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-white/30">You&apos;ll upload these in the next step.</p>
      </div>

      {/* KPIs + risks compact view */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
          <SectionLabel text="Key KPIs" />
          <ul className="space-y-1">
            {profile.suggestedKPIs.slice(0, 4).map((kpi, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                <span className="text-nexus-accent shrink-0 mt-0.5">→</span>
                {kpi}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
          <SectionLabel text="Top risks" />
          <ul className="space-y-1">
            {profile.suggestedRisks.slice(0, 3).map((risk, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                <span className="text-red-400/70 shrink-0 mt-0.5">⚠</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Governance & policy defaults */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <SectionLabel text="Governance &amp; policy defaults NexusAI will apply" />
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              label: "Auto-approved",
              value: "Evidence above 75% confidence",
              color: "text-green-400",
              dot: "bg-green-400",
            },
            {
              label: "Pending review",
              value: "35–75% confidence",
              color: "text-amber-400",
              dot: "bg-amber-400",
            },
            {
              label: "Quarantined",
              value: "Below 35% confidence",
              color: "text-red-400",
              dot: "bg-red-400",
            },
            {
              label: "Sensitivity default",
              value: profile.sensitivityDefault === "confidential"
                ? "Confidential (regulated sector)"
                : "Internal",
              color: profile.sensitivityDefault === "confidential"
                ? "text-amber-300"
                : "text-blue-300",
              dot: profile.sensitivityDefault === "confidential"
                ? "bg-amber-400"
                : "bg-blue-400",
            },
          ].map(({ label, value, color, dot }) => (
            <div key={label} className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/10 px-3 py-2">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
              <div>
                <p className="text-xs text-white/40">{label}</p>
                <p className={`text-xs font-medium ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
        {(profile.sector === "financial_services" || profile.sector === "healthcare") && (
          <p className="text-xs text-amber-300/70 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">
            Regulated sector detected: board, finance, legal, and compliance documents will be classified as Confidential by default.
          </p>
        )}
      </div>

      {error && <p className="rounded-lg border border-red-300/40 bg-red-300/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      <div className="flex gap-3 items-center">
        <button onClick={handleConfirm} disabled={saving} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          {saving ? "Saving..." : "Looks right — continue →"}
        </button>
        <button onClick={onBack} className="btn-subtle text-sm text-white/50">← Back</button>
        <button onClick={() => onConfirmed(profile)} className="text-xs text-white/30 hover:text-white/60 transition">
          Skip saving
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Role selection + Add Role
// ---------------------------------------------------------------------------

function Step4({
  profile,
  workspaceId,
  onProfileUpdated,
  onNext,
  onBack,
}: {
  profile: DetectedProfile;
  workspaceId: string;
  onProfileUpdated: (profile: DetectedProfile) => void;
  onNext: (roles: WizardRole[]) => void;
  onBack: () => void;
}) {
  const profileSuggestions = suggestRolesForProfile({
    sector: profile.sector,
    companyArchetype: profile.companyArchetype,
    businessModel: profile.businessModel,
    companyStage: profile.companyStage,
    employeeBand: profile.employeeBand,
    region: profile.region,
    primaryGoals: profile.primaryGoals,
    riskProfile: profile.riskProfile,
    description: profile.reasoning,
  });
  const suggestionRoles = profileSuggestions.map(toWizardRole);
  const activeRoles = suggestionRoles.filter((role) => role.state === "active");
  const stagedRoles = suggestionRoles.filter((role) => role.state === "staged");

  const initialSelected = new Set(activeRoles.map((role) => role.key));
  initialSelected.add("ceo");

  const initialDualHat = new Set(
    Object.entries(profile.roleStates ?? {})
      .filter(([, state]) => state?.state === "dual_hat" || Boolean(state?.dualHatOf))
      .map(([key]) => key)
  );

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(initialSelected);
  const [dualHatKeys, setDualHatKeys] = useState<Set<string>>(initialDualHat);
  const [activatedStagedKeys, setActivatedStagedKeys] = useState<Set<string>>(new Set());
  const [customRoles, setCustomRoles] = useState<WizardRole[]>([]);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [fallbackMoney, setFallbackMoney] = useState("");
  const [fallbackWorries, setFallbackWorries] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleRole(role: WizardRole) {
    if (role.locked) return;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(role.key)) {
        next.delete(role.key);
      } else {
        next.add(role.key);
      }
      return next;
    });
  }

  function toggleDualHat(key: string) {
    setDualHatKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function activateStaged(role: WizardRole) {
    setActivatedStagedKeys((prev) => new Set([...prev, role.key]));
    setSelectedKeys((prev) => new Set([...prev, role.key]));
  }

  function addCustomRole() {
    if (!newRoleLabel.trim()) return;
    const key = `custom-${newRoleLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
    const role: WizardRole = {
      key,
      label: newRoleLabel.trim(),
      description: newRoleDesc.trim() || `${newRoleLabel.trim()} dashboard view`,
      icon: "◇",
      color: "border-white/20 hover:border-white/40",
      badge: "Custom",
      isCustom: true,
    };
    setCustomRoles((prev) => [...prev, role]);
    setSelectedKeys((prev) => new Set([...prev, key]));
    setNewRoleLabel("");
    setNewRoleDesc("");
    setShowAddRole(false);
  }

  function applyFallbackSignal() {
    const text = `${fallbackMoney} ${fallbackWorries}`.toLowerCase();
    const extraKeys = new Set<string>();
    if (/cash|payroll|finance|budget|margin|profit|accounts/.test(text)) extraKeys.add("cfo");
    if (/customer|complaint|sales|pipeline|renewal|churn/.test(text)) extraKeys.add("cbo");
    if (/compliance|regulator|regulated|audit|risk/.test(text)) {
      extraKeys.add("cro");
      extraKeys.add("cco");
    }
    if (/team|staff|people|hiring|culture/.test(text)) extraKeys.add("chro");
    if (/technology|platform|app|data|security|ai/.test(text)) extraKeys.add("cto");
    if (/ad|marketing|social|meta|google|tiktok|creator/.test(text)) extraKeys.add("vp_performance_mktg");
    setSelectedKeys((prev) => new Set([...prev, ...extraKeys]));
  }

  const allRoles = [...activeRoles, ...stagedRoles.filter((role) => activatedStagedKeys.has(role.key)), ...customRoles]
    .filter((role, index, roles) => roles.findIndex((item) => item.key === role.key) === index);
  const selectedRoles = allRoles
    .filter((role) => selectedKeys.has(role.key))
    .map((role) => ({
      ...role,
      state: dualHatKeys.has(role.key) ? "dual_hat" as const : "active" as const,
    }));

  async function persistAndContinue() {
    setSaving(true);
    setError(null);
    const roleStates: Record<string, WorkspaceRoleState> = {
      ...roleStatesFromSuggestions(profileSuggestions),
      ...Object.fromEntries(
        selectedRoles.map((role) => [
          role.key,
          {
            state: role.state ?? "active",
            activatedAt: role.state === "dual_hat" ? null : new Date().toISOString(),
            stagedCondition: role.stagedCondition ?? null,
            dualHatOf: role.state === "dual_hat" ? "ceo" : null,
          } satisfies WorkspaceRoleState,
        ])
      ),
      ...Object.fromEntries(
        stagedRoles
          .filter((role) => !activatedStagedKeys.has(role.key))
          .map((role) => [
            role.key,
            {
              state: "staged",
              activatedAt: null,
              stagedCondition: role.stagedCondition ?? null,
              dualHatOf: null,
            } satisfies WorkspaceRoleState,
          ])
      ),
    };
    const updatedProfile = {
      ...profile,
      priorityRoles: selectedRoles.map((role) => role.key),
      roleStates,
    };
    try {
      const res = await fetch("/api/workspace/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: updatedProfile.companyName || null,
          sector: updatedProfile.sector || null,
          subsector: updatedProfile.subsector || null,
          businessModel: updatedProfile.businessModel || null,
          companyStage: updatedProfile.companyStage || null,
          employeeBand: updatedProfile.employeeBand || null,
          region: updatedProfile.region || null,
          primaryGoals: updatedProfile.primaryGoals,
          riskProfile: updatedProfile.riskProfile || null,
          priorityRoles: updatedProfile.priorityRoles,
          companyArchetype: updatedProfile.companyArchetype,
          archetypeVersion: updatedProfile.archetypeVersion ?? `roles-confirmed:${new Date().toISOString()}`,
          briefLanguageMode: updatedProfile.companyArchetype === "sme_physical" ? "plain" : "formal",
          locationCount: updatedProfile.locationCount ?? 1,
          roleStates,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "save_roles_failed");
      onProfileUpdated(updatedProfile);
      onNext(selectedRoles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown_error");
    } finally {
      setSaving(false);
    }
  }

  function RoleCard({ role, staged = false }: { role: WizardRole; staged?: boolean }) {
    const isOn = selectedKeys.has(role.key);
    const isDualHat = dualHatKeys.has(role.key);
    return (
      <div
        className={[
          "rounded-xl border p-4 text-left transition-all relative",
          isOn
            ? `${role.color} bg-white/5`
            : staged
              ? "border-white/10 bg-black/10"
              : "border-white/10 bg-black/10 opacity-70",
        ].join(" ")}
      >
        <button type="button" onClick={() => staged ? activateStaged(role) : toggleRole(role)} className="w-full text-left">
          <div className="flex items-start gap-3 mb-2">
            <span className={`text-xl ${isOn ? "text-white/70" : "text-white/25"}`}>{role.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-sm font-medium ${isOn ? "text-white" : "text-white/55"}`}>{role.label}</p>
                <span className="rounded-full border border-white/15 px-1.5 py-0.5 text-xs text-white/30">{role.badge}</span>
                {role.locked && <span className="rounded-full border border-nexus-accent/40 bg-nexus-accent/10 px-1.5 py-0.5 text-xs text-nexus-accent">Locked</span>}
                {isDualHat && <span className="rounded-full border border-blue-300/40 bg-blue-300/10 px-1.5 py-0.5 text-xs text-blue-200">Covered by CEO</span>}
                {staged && <span className="rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-xs text-white/40">Staged</span>}
              </div>
              {typeof role.relevanceScore === "number" && (
                <p className="mt-1 text-xs text-white/30">{Math.round(role.relevanceScore * 100)}% relevance</p>
              )}
            </div>
            <div className={[
              "shrink-0 h-5 w-5 rounded-full border flex items-center justify-center transition-all",
              isOn ? "border-nexus-accent bg-nexus-accent/20" : "border-white/20 bg-transparent",
            ].join(" ")}>
              {isOn && <span className="text-nexus-accent text-xs">✓</span>}
            </div>
          </div>
          <p className={`text-xs leading-relaxed ${isOn ? "text-white/60" : "text-white/35"}`}>
            {role.reason ?? role.description}
          </p>
          {staged && role.stagedCondition && (
            <p className="mt-2 text-xs text-amber-200/60">Activation: {role.stagedCondition}</p>
          )}
        </button>
        {role.dualHatCandidate && isOn && !role.locked && (
          <button
            type="button"
            onClick={() => toggleDualHat(role.key)}
            className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/50 transition hover:border-white/25 hover:text-white/75"
          >
            {isDualHat ? "Create separate dashboard instead" : "Covered by another person / dual-hat"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">Who should NexusAI support first?</h2>
        <p className="mt-2 text-white/60">
          We translated your company profile into role-aware agent rooms. Keep the live roles,
          mark small-company dual-hats, and stage future roles for later.
        </p>
      </div>

      {profile.requiresRoleConfirmation && (
        <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-amber-100">Help NexusAI tune these roles</p>
            <p className="mt-1 text-xs text-amber-100/60">
              Your company type is a little unusual or low-confidence. Answer these and we&apos;ll adjust the recommended roles.
            </p>
          </div>
          <select className="input" value={fallbackMoney} onChange={(e) => setFallbackMoney(e.target.value)}>
            <option value="">How does the company primarily make money?</option>
            <option value="sell product directly to customers">We sell a product directly to customers</option>
            <option value="services to businesses project retainer">We provide services to businesses</option>
            <option value="services to consumers physical location">We provide services to consumers</option>
            <option value="platform marketplace buyers sellers">We run a platform or marketplace</option>
            <option value="regulated financial services compliance risk">We are regulated financial services</option>
            <option value="physical business location staff cash">We are a physical/location-based business</option>
          </select>
          <textarea
            className="input min-h-[76px]"
            value={fallbackWorries}
            onChange={(e) => setFallbackWorries(e.target.value)}
            placeholder="Who makes the most important decisions, and what do they worry about most?"
          />
          <button type="button" onClick={applyFallbackSignal} className="btn-subtle text-sm">
            Update recommended roles
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {activeRoles.map((role) => <RoleCard key={role.key} role={role} />)}

        {/* Add Role card */}
        {!showAddRole && (
          <button
            type="button"
            onClick={() => setShowAddRole(true)}
            className="rounded-xl border border-dashed border-white/20 p-4 text-left transition hover:border-white/40 hover:bg-white/5"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl text-white/20">+</span>
              <div>
                <p className="text-sm font-medium text-white/40">Add a role</p>
                <p className="text-xs text-white/25 mt-0.5">CFO, CRO, Risk/Compliance, or custom</p>
              </div>
            </div>
          </button>
        )}
      </div>

      {stagedRoles.length > 0 && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-white/80">Roles to stage for later</p>
            <p className="mt-1 text-xs text-white/40">These are likely to matter as the company grows. You can activate one now.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {stagedRoles.map((role) => <RoleCard key={role.key} role={role} staged />)}
          </div>
        </div>
      )}

      {/* Add Role form */}
      {showAddRole && (
        <div className="rounded-xl border border-nexus-accent/30 bg-nexus-accent/5 p-4 space-y-3">
          <p className="text-sm font-medium text-white/80">Add a custom role</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Role title</label>
              <input
                className="input"
                placeholder="e.g. CFO, CRO, Risk/Compliance"
                value={newRoleLabel}
                onChange={(e) => setNewRoleLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomRole()}
              />
            </div>
            <div>
              <label className="label">Short description (optional)</label>
              <input
                className="input"
                placeholder="What this role monitors"
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomRole()}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addCustomRole} disabled={!newRoleLabel.trim()} className="btn-primary text-sm disabled:opacity-40">
              Add role
            </button>
            <button onClick={() => { setShowAddRole(false); setNewRoleLabel(""); setNewRoleDesc(""); }} className="btn-subtle text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="rounded-lg border border-red-300/40 bg-red-300/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      <p className="text-xs text-white/30">
        {selectedRoles.length} role{selectedRoles.length !== 1 ? "s" : ""} selected.
        {dualHatKeys.size > 0 ? ` ${dualHatKeys.size} marked as covered by another role.` : ""}
        You can add or change roles any time from Settings.
      </p>

      <div className="flex gap-3">
        <button onClick={persistAndContinue} disabled={saving} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          {saving ? "Saving roles..." : "Continue →"}
        </button>
        <button onClick={onBack} className="btn-subtle text-sm text-white/50">← Back</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5 — Upload with AI file classification
// ---------------------------------------------------------------------------

function Step5({
  suggestedDocuments,
  sensitivityDefault,
  sector,
  workspaceId,
  onNext,
  onBack,
}: {
  suggestedDocuments: SuggestedDocument[];
  sensitivityDefault: "internal" | "confidential";
  sector: string;
  workspaceId: string;
  onNext: (results: IngestionResult[]) => void;
  onBack: () => void;
}) {
  const [filesWithMeta, setFilesWithMeta] = useState<FileWithMeta[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function applyFiles(incoming: FileList | null) {
    if (!incoming) return;
    const selected = Array.from(incoming).slice(0, MAX_ONBOARDING_FILES);
    const withMeta: FileWithMeta[] = selected.map((f) => {
      const cls = classifyFilename(f.name, sector);
      return {
        file: f,
        department: cls.department,
        sensitivity: cls.sensitivity === "internal" || cls.sensitivity === "public"
          ? sensitivityDefault
          : cls.sensitivity,
      };
    });
    setFilesWithMeta(withMeta);
    setUploadedCount(0);
    if (incoming.length > MAX_ONBOARDING_FILES) {
      setError(`Only the first ${MAX_ONBOARDING_FILES} files will be uploaded.`);
    } else {
      setError(null);
    }
  }

  function updateSensitivity(idx: number, sensitivity: FileWithMeta["sensitivity"]) {
    setFilesWithMeta((prev) => prev.map((fm, i) => i === idx ? { ...fm, sensitivity } : fm));
  }

  function updateDepartment(idx: number, department: string) {
    setFilesWithMeta((prev) => prev.map((fm, i) => i === idx ? { ...fm, department } : fm));
  }

  async function handleUpload() {
    if (filesWithMeta.length === 0) return;
    setUploading(true);
    setUploadedCount(0);
    setError(null);
    try {
      const nextResults: IngestionResult[] = [];
      for (const fm of filesWithMeta) {
        const body = new FormData();
        body.append("file", fm.file);
        body.append("workspaceId", workspaceId);
        body.append("tenantId", workspaceId);
        body.append("sensitivity", fm.sensitivity);
        body.append("sourceType", "upload");
        body.append("department", fm.department);

        const res = await fetch("/api/ingestion/status", { method: "POST", body });
        const payload = await res.json();
        if (!res.ok || !payload.ok) throw new Error(`${fm.file.name}: ${payload.error ?? "ingestion_failed"}`);
        nextResults.push(payload.data as IngestionResult);
        setUploadedCount(nextResults.length);
      }
      onNext(nextResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown_error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">Upload your first documents</h2>
        <p className="mt-2 text-white/60">
          NexusAI generates intelligence from your business documents. Start with the pack below.
          AI will suggest department labels and sensitivity settings as you select files.
        </p>
      </div>

      {/* Recommended starter pack */}
      {suggestedDocuments.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
          <SectionLabel text="Recommended for your company type" />
          <div className="grid grid-cols-1 gap-1.5">
            {suggestedDocuments.map((doc, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/10 px-3 py-2">
                <span className="text-sm shrink-0">{DOC_ICONS[doc.type] ?? "📄"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/70">{doc.name}</p>
                  <p className="text-xs text-white/35">{doc.description}</p>
                </div>
                {doc.priority === "high" && (
                  <span className="shrink-0 rounded-full border border-nexus-accent/40 bg-nexus-accent/10 px-1.5 py-0.5 text-xs text-nexus-accent">
                    Priority
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div className="rounded-xl border border-nexus-accent/30 bg-nexus-accent/5 p-5 space-y-4">
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); applyFiles(e.dataTransfer.files); }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          className={[
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-6 transition",
            uploading ? "cursor-default opacity-60 border-white/10"
              : isDragging ? "border-nexus-accent bg-nexus-accent/5"
              : filesWithMeta.length > 0 ? "border-nexus-accent/50"
              : "border-white/20 hover:border-white/40 hover:bg-white/5",
          ].join(" ")}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.docx,.pptx,.xlsx,.txt,.md"
            className="hidden"
            onChange={(e) => applyFiles(e.target.files)}
          />
          {filesWithMeta.length > 0 ? (
            <p className="text-sm font-medium text-white">
              {filesWithMeta.length} file{filesWithMeta.length === 1 ? "" : "s"} selected
            </p>
          ) : (
            <div className="text-center">
              <p className="text-2xl mb-2 text-white/30">⊕</p>
              <p className="text-sm text-white/60">Drop files here or click to browse</p>
              <p className="text-xs text-white/30 mt-1">PDF · DOCX · XLSX · PPTX · TXT · MD — up to {MAX_ONBOARDING_FILES} files</p>
            </div>
          )}
        </div>

        {/* Per-file classification rows */}
        {filesWithMeta.length > 0 && (
          <div className="space-y-2">
            <SectionLabel text="AI-suggested labels — confirm or edit" />
            {filesWithMeta.map((fm, idx) => (
              <div key={`${fm.file.name}-${idx}`} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex-1 min-w-0 truncate text-xs text-white/70 font-medium">{fm.file.name}</span>
                  <span className="text-xs text-white/30">{(fm.file.size / 1024).toFixed(1)} KB</span>

                  {/* Department selector */}
                  <select
                    value={fm.department}
                    onChange={(e) => updateDepartment(idx, e.target.value)}
                    className="rounded-md border border-white/20 bg-black/30 px-2 py-1 text-xs text-white/60 focus:outline-none focus:border-nexus-accent/50"
                  >
                    {["General", "Executive / Strategy", "Finance", "Risk & Compliance", "Commercial / Sales", "Technology", "Operations", "Marketing", "HR / People", "Strategy", "Product"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  {/* Sensitivity selector */}
                  <select
                    value={fm.sensitivity}
                    onChange={(e) => updateSensitivity(idx, e.target.value as FileWithMeta["sensitivity"])}
                    className={[
                      "rounded-md border px-2 py-1 text-xs focus:outline-none focus:border-nexus-accent/50",
                      fm.sensitivity === "confidential" ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                        : fm.sensitivity === "restricted" ? "border-red-400/40 bg-red-400/10 text-red-300"
                        : fm.sensitivity === "public" ? "border-green-500/40 bg-green-500/10 text-green-300"
                        : "border-blue-400/40 bg-blue-400/10 text-blue-300",
                    ].join(" ")}
                  >
                    <option value="public">public</option>
                    <option value="internal">internal</option>
                    <option value="confidential">confidential</option>
                    <option value="restricted">restricted</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="rounded-lg border border-red-300/40 bg-red-300/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        <button
          onClick={handleUpload}
          disabled={filesWithMeta.length === 0 || uploading}
          className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {uploading
            ? `Ingesting ${uploadedCount}/${filesWithMeta.length}...`
            : filesWithMeta.length === 0
            ? "Select files to continue"
            : filesWithMeta.length === 1
            ? "Ingest Document →"
            : `Ingest ${filesWithMeta.length} Documents →`}
        </button>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-subtle text-sm text-white/50">← Back</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 6 — Evidence preview
// ---------------------------------------------------------------------------

function Step6({ results, onNext }: { results: IngestionResult[]; onNext: () => void }) {
  const result = results[0];
  const avgConfidence = results.reduce((s, r) => s + r.extractionConfidence, 0) / results.length;
  const filename = result.sourcePath.split("/").pop() ?? result.sourcePath;
  const ext = filename.split(".").pop()?.toUpperCase() ?? "FILE";

  const processedCount = results.filter((r) => r.ingestionStatus === "processed").length;
  const pendingCount = results.filter((r) => r.ingestionStatus === "pending_approval").length;
  const quarantinedCount = results.filter((r) => r.ingestionStatus === "quarantined").length;

  const statusBadge =
    processedCount === results.length ? "border-green-500/40 bg-green-500/10 text-green-300"
      : pendingCount > 0 || quarantinedCount > 0 ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
      : "border-white/20 bg-white/5 text-white/50";

  const statusLabel =
    results.length === 1 ? result.ingestionStatus.replace(/_/g, " ")
      : processedCount === results.length ? "all processed"
      : `${processedCount} processed${pendingCount ? `, ${pendingCount} pending` : ""}${quarantinedCount ? `, ${quarantinedCount} quarantined` : ""}`;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">Intelligence extracted</h2>
        <p className="mt-2 text-white/60">
          NexusAI has processed {results.length === 1 ? "your document" : `${results.length} documents`}. Evidence is staged for LLM synthesis using your company context.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-xs font-bold text-white/60">
            {ext}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">{filename}</p>
            <p className="text-xs text-white/40 font-mono mt-0.5 truncate">{result.id}</p>
          </div>
          <span className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${statusBadge}`}>
            {statusLabel}
          </span>
        </div>
        <ConfidenceBar value={avgConfidence} />
        {results.length > 1 && (
          <div className="max-h-36 space-y-1 overflow-auto rounded-lg border border-white/10 bg-black/20 p-2">
            {results.map((item) => {
              const name = item.sourcePath.split("/").pop() ?? item.sourcePath;
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-white/70">{name}</span>
                  <span className="shrink-0 text-white/35">
                    {Math.round(item.extractionConfidence * 100)}% · {item.ingestionStatus.replace(/_/g, " ")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-white/10 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Sensitivity:</span>
            <SensitivityBadge value="internal" />
          </div>
          <span className="text-xs text-white/40">source: upload</span>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm text-amber-100 space-y-1">
          <p className="font-medium">Review required for {pendingCount} file{pendingCount !== 1 ? "s" : ""}</p>
          <p className="text-amber-100/70">
            These files need sign-off before appearing in your dashboard.{" "}
            <a href="/approvals" className="underline hover:text-amber-50">Go to Approvals</a> after setup.
          </p>
        </div>
      )}

      {avgConfidence >= 0.4 && pendingCount === 0 && (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/60 space-y-1.5">
          <p className="font-medium text-white/80">What happens next:</p>
          <ul className="space-y-1 text-white/50">
            <li className="flex gap-2"><span className="text-nexus-accent">→</span> Evidence enters LLM synthesis with your company context applied</li>
            <li className="flex gap-2"><span className="text-nexus-accent">→</span> Sector-aware recommendations generated automatically</li>
            <li className="flex gap-2"><span className="text-nexus-accent">→</span> Role dashboards populate with your first intelligence</li>
          </ul>
        </div>
      )}

      <button onClick={onNext} className="btn-primary">Continue to Dashboard →</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 7 — Go live: AI focus intent + role selection
// ---------------------------------------------------------------------------

const ROLE_FOCUS_EXAMPLES = [
  "What's blocking our growth and what risks need my attention?",
  "How is operational delivery performing right now?",
  "What's in the commercial pipeline and where are the gaps?",
];

function Step7({ selectedRoles }: { selectedRoles: WizardRole[] }) {
  const router = useRouter();
  const [navigating, setNavigating] = useState<string | null>(null);
  const [focusIntent, setFocusIntent] = useState("");
  const [mapping, setMapping] = useState<FocusMapping | null>(null);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);

  function go(roleKey: string, question?: string) {
    setNavigating(roleKey);
    const validKeys = ["ceo", "coo", "cbo", "cto"];
    const path = validKeys.includes(roleKey) ? `/dashboard/${roleKey}` : `/dashboard/ceo`;
    // Pass first suggested question as query param so Ask panel can pre-populate
    const url = question ? `${path}?q=${encodeURIComponent(question)}` : path;
    router.push(url);
  }

  async function handleMapFocus() {
    if (!focusIntent.trim() || focusIntent.trim().length < 5) return;
    setMappingLoading(true);
    setMappingError(null);
    try {
      const res = await fetch("/api/workspace/first-focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: focusIntent }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "mapping_failed");
      setMapping(payload.data as FocusMapping);
    } catch {
      setMappingError("AI mapping unavailable. Use the role cards below to get started.");
    } finally {
      setMappingLoading(false);
    }
  }

  const displayRoles = selectedRoles.length > 0 ? selectedRoles : ALL_ROLES;
  const recommendedKeys = new Set(mapping?.recommendedDashboards ?? []);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-nexus-accent/30 bg-nexus-accent/10 text-3xl text-nexus-accent">
          ◈
        </div>
        <h2 className="text-2xl font-semibold text-white">Your intelligence is ready</h2>
        <p className="mt-2 text-white/60 max-w-md mx-auto">
          Tell NexusAI what you want to focus on first — or go straight to a role dashboard.
        </p>
      </div>

      {/* AI focus intent input */}
      <div className="rounded-xl border border-nexus-accent/20 bg-nexus-accent/5 p-4 space-y-3">
        <p className="text-sm font-medium text-white/80">What do you want NexusAI to help with first?</p>
        <textarea
          className="min-h-16 w-full rounded-lg border border-white/20 bg-black/20 p-3 text-sm text-white/80 placeholder-white/30 focus:border-nexus-accent focus:outline-none resize-none"
          placeholder="e.g. What's blocking growth and what risks need my attention?"
          value={focusIntent}
          onChange={(e) => { setFocusIntent(e.target.value); setMapping(null); }}
          rows={2}
        />
        <div className="flex flex-wrap gap-2">
          {ROLE_FOCUS_EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => { setFocusIntent(ex); setMapping(null); }}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/40 hover:border-nexus-accent/40 hover:text-white/70 transition"
            >
              {ex.length > 55 ? ex.slice(0, 55) + "…" : ex}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleMapFocus}
            disabled={mappingLoading || focusIntent.trim().length < 5}
            className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {mappingLoading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                Mapping your focus...
              </span>
            ) : (
              "Map my focus with AI →"
            )}
          </button>
          {mappingError && <p className="text-xs text-amber-300/70">{mappingError}</p>}
        </div>

        {/* AI focus result */}
        {mapping && (
          <div className="rounded-lg border border-nexus-accent/30 bg-nexus-accent/10 p-3 space-y-2">
            <p className="text-xs text-nexus-accent font-medium">AI Focus Summary</p>
            <p className="text-sm text-white/70">{mapping.focusSummary}</p>
            <div className="space-y-1.5 pt-1">
              <p className="text-xs text-white/40">Suggested first questions for your Ask panel:</p>
              {mapping.suggestedQuestions.map((q, i) => (
                <p key={i} className="text-xs text-white/60 flex items-start gap-2">
                  <span className="text-nexus-accent shrink-0 mt-0.5">→</span>
                  {q}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-2 gap-4">
        {displayRoles.map((role) => {
          const isRecommended = recommendedKeys.has(role.key);
          // First suggested question for this dashboard (if AI mapped it here)
          const firstQuestion = isRecommended && mapping
            ? mapping.suggestedQuestions[0]
            : undefined;

          return (
            <button
              key={role.key}
              onClick={() => go(role.key, firstQuestion)}
              disabled={!!navigating}
              className={[
                "rounded-xl border p-5 text-left transition-all relative",
                isRecommended
                  ? `${role.color} ring-1 ring-nexus-accent/30`
                  : role.color,
                navigating === role.key ? "opacity-60 cursor-wait" : navigating ? "opacity-40" : "cursor-pointer",
              ].join(" ")}
            >
              {isRecommended && (
                <span className="absolute top-2 right-2 rounded-full border border-nexus-accent/40 bg-nexus-accent/15 px-2 py-0.5 text-xs text-nexus-accent">
                  Start here
                </span>
              )}
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl text-white/60">{role.icon}</span>
                {!isRecommended && (
                  <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-white/40">{role.badge}</span>
                )}
              </div>
              <p className="font-semibold text-white text-sm mb-1">{role.label}</p>
              <p className="text-xs text-white/50 leading-relaxed">{role.description}</p>
              {isRecommended && firstQuestion && (
                <p className="mt-2 text-xs text-nexus-accent/70 italic line-clamp-1">
                  First: &quot;{firstQuestion}&quot;
                </p>
              )}
              {navigating === role.key && <p className="mt-2 text-xs text-nexus-accent">Opening dashboard...</p>}
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-white/30">
        Switch between dashboards at any time from the side navigation. Add more roles in Settings.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root wizard — state machine
// ---------------------------------------------------------------------------

export function OnboardingWizard({ workspaceId, displayName, isAuthenticated }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [detectedProfile, setDetectedProfile] = useState<DetectedProfile | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<WizardRole[]>(ALL_ROLES.slice(0, 2));
  const [ingestionResults, setIngestionResults] = useState<IngestionResult[]>([]);

  // Fallback profile for manual sector selection (no AI detection)
  function buildManualProfile(sector: string, subsector: string): DetectedProfile {
    const sectorDef = getSector(sector);
    const subsectorLabel = sectorDef?.subsectors.find((item) => item.key === subsector)?.label ?? subsector;
    const documentTypeToExtension = (name: string): SuggestedDocument["type"] => {
      const lower = name.toLowerCase();
      if (/report|pack|submission|audit|deck|paper|review/.test(lower)) return "pdf";
      if (/model|register|forecast|schedule|statement|performance/.test(lower)) return "xlsx";
      if (/policy|notes|proposal|sow|manual|status/.test(lower)) return "docx";
      return "pdf";
    };

    return {
      companyName: null,
      sector,
      sectorLabel: sectorDef?.label ?? sector.replace(/_/g, " "),
      subsector: subsectorLabel || "",
      businessModel: "b2b",
      companyArchetype:
        sector === "professional_services"
          ? "professional_practice"
          : sector === "retail_commerce" || sector === "technology_saas"
            ? "digital_native"
            : sector === "financial_services" || sector === "healthcare"
              ? "corporate"
              : "startup_scaleup",
      companyStage: "growth",
      employeeBand: "51_200",
      region: "",
      primaryGoals: [],
      riskProfile: sector === "financial_services" || sector === "healthcare" ? "conservative" : "moderate",
      priorityRoles: sectorDef?.defaultRoles.slice(0, 6) ?? ["CEO", "COO", "CTO"],
      suggestedRoleReasons: {},
      stagedRoles: [],
      roleStates: {},
      requiresRoleConfirmation: !sectorDef,
      suggestedDocuments: (sectorDef?.documentTypes.slice(0, 5) ?? []).map((name, index) => ({
        name,
        type: documentTypeToExtension(name),
        priority: index < 3 ? "high" : "medium",
        description: `Useful starting evidence for ${sectorDef?.label ?? "this company type"}.`,
      })),
      suggestedKPIs: sectorDef?.commonKPIs.slice(0, 5) ?? [],
      suggestedRisks: sectorDef?.commonRisks.slice(0, 3) ?? [],
      sensitivityDefault: sectorDef?.sensitivityDefault ?? "internal",
      confidence: sectorDef ? 0.65 : 0.35,
      reasoning: sectorDef
        ? `Manual sector selection: NexusAI will use ${sectorDef.label} defaults for roles, KPIs, risks, documents, and sensitivity.`
        : "Manual profile with limited defaults.",
    };
  }

  const profile = detectedProfile ?? buildManualProfile("", "");

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-nexus-accent/60 mb-1">
          NexusAI Mission Control
        </p>
        <p className="text-xs text-white/30">AI-Assisted Setup</p>
      </div>

      <StepIndicator current={step} />

      <div className="rounded-xl border border-white/10 bg-[#0d1526] p-8 min-h-[380px]">
        {step === 1 && (
          <Step1
            workspaceId={workspaceId}
            displayName={displayName}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <Step2
            onDetected={(p) => { setDetectedProfile(p); setStep(3); }}
            onManual={(sector, subsector) => { setDetectedProfile(buildManualProfile(sector, subsector)); setStep(3); }}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <Step3
            detected={profile}
            workspaceId={workspaceId}
            onConfirmed={(p) => { setDetectedProfile(p); setStep(4); }}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <Step4
            profile={profile}
            workspaceId={workspaceId}
            onProfileUpdated={(p) => setDetectedProfile(p)}
            onNext={(roles) => { setSelectedRoles(roles); setStep(5); }}
            onBack={() => setStep(3)}
          />
        )}

        {step === 5 && (
          <Step5
            suggestedDocuments={profile.suggestedDocuments}
            sensitivityDefault={profile.sensitivityDefault}
            sector={profile.sector}
            workspaceId={workspaceId}
            onNext={(results) => { setIngestionResults(results); setStep(6); }}
            onBack={() => setStep(4)}
          />
        )}

        {step === 6 && ingestionResults.length > 0 && (
          <Step6
            results={ingestionResults}
            onNext={() => setStep(7)}
          />
        )}

        {step === 7 && <Step7 selectedRoles={selectedRoles} />}
      </div>
    </div>
  );
}
