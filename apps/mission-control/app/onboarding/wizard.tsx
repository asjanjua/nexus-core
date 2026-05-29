"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAllSectors, getSector } from "@/lib/domain/sector-library";
import type { DetectedProfile, SuggestedDocument } from "@/lib/services/company-detection";
import { classifyFilename } from "@/lib/services/company-detection";

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
      onDetected(payload.data as DetectedProfile);
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
  suggestedRoles,
  onNext,
  onBack,
}: {
  suggestedRoles: string[];
  onNext: (roles: WizardRole[]) => void;
  onBack: () => void;
}) {
  // Pre-select roles that match AI suggestions
  const initialSelected = new Set(
    ALL_ROLES
      .filter((r) => suggestedRoles.some((sr) => sr.toLowerCase().includes(r.key) || r.key.includes(sr.toLowerCase())))
      .map((r) => r.key)
  );
  // Always include CEO
  initialSelected.add("ceo");

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(initialSelected);
  const [customRoles, setCustomRoles] = useState<WizardRole[]>([]);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");

  function toggleRole(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev; // keep at least one
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function addCustomRole() {
    if (!newRoleLabel.trim()) return;
    const key = `custom-${newRoleLabel.toLowerCase().replace(/\s+/g, "-")}`;
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

  const allRoles = [...ALL_ROLES, ...customRoles];
  const selectedRoles = allRoles.filter((r) => selectedKeys.has(r.key));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">Which dashboards do you need?</h2>
        <p className="mt-2 text-white/60">
          NexusAI surfaces different intelligence for each role. Pre-selected based on your company profile.
          Toggle off roles you don&apos;t need.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {allRoles.map((role) => {
          const isOn = selectedKeys.has(role.key);
          const isAISuggested = suggestedRoles.some((sr) => sr.toLowerCase().includes(role.key.split("-")[0]) || role.key.includes(sr.toLowerCase().replace(/\//g, "").replace(/\s+/g, "")));
          return (
            <button
              key={role.key}
              type="button"
              onClick={() => toggleRole(role.key)}
              className={[
                "rounded-xl border p-4 text-left transition-all relative",
                isOn
                  ? `${role.color} bg-white/5`
                  : "border-white/10 bg-black/10 opacity-50",
              ].join(" ")}
            >
              {isAISuggested && isOn && (
                <span className="absolute top-2 right-2 rounded-full border border-nexus-accent/40 bg-nexus-accent/10 px-1.5 py-0.5 text-xs text-nexus-accent/80">
                  AI
                </span>
              )}
              <div className="flex items-start gap-3 mb-2">
                <span className={`text-xl ${isOn ? "text-white/70" : "text-white/20"}`}>{role.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${isOn ? "text-white" : "text-white/40"}`}>{role.label}</p>
                    <span className="rounded-full border border-white/15 px-1.5 py-0.5 text-xs text-white/30">{role.badge}</span>
                  </div>
                </div>
                <div className={[
                  "shrink-0 h-5 w-5 rounded-full border flex items-center justify-center transition-all",
                  isOn ? "border-nexus-accent bg-nexus-accent/20" : "border-white/20 bg-transparent",
                ].join(" ")}>
                  {isOn && <span className="text-nexus-accent text-xs">✓</span>}
                </div>
              </div>
              <p className={`text-xs leading-relaxed ${isOn ? "text-white/50" : "text-white/25"}`}>
                {role.description}
              </p>
            </button>
          );
        })}

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

      <p className="text-xs text-white/30">
        {selectedRoles.length} role{selectedRoles.length !== 1 ? "s" : ""} selected.
        You can add or change roles any time from Settings.
      </p>

      <div className="flex gap-3">
        <button onClick={() => onNext(selectedRoles)} className="btn-primary">
          Continue →
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
  workspaceId,
  onNext,
  onBack,
}: {
  suggestedDocuments: SuggestedDocument[];
  sensitivityDefault: "internal" | "confidential";
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
      const cls = classifyFilename(f.name, "");
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
// Step 7 — Go live: role selection
// ---------------------------------------------------------------------------

function Step7({ selectedRoles }: { selectedRoles: WizardRole[] }) {
  const router = useRouter();
  const [navigating, setNavigating] = useState<string | null>(null);

  function go(roleKey: string) {
    setNavigating(roleKey);
    // Custom roles fall back to CEO dashboard since they don't have a dedicated page yet
    const path = ["ceo", "coo", "cbo", "cto"].includes(roleKey)
      ? `/dashboard/${roleKey}`
      : `/dashboard/ceo`;
    router.push(path);
  }

  const displayRoles = selectedRoles.length > 0 ? selectedRoles : ALL_ROLES;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-nexus-accent/30 bg-nexus-accent/10 text-3xl text-nexus-accent">
          ◈
        </div>
        <h2 className="text-2xl font-semibold text-white">Your intelligence is ready</h2>
        <p className="mt-2 text-white/60 max-w-md mx-auto">
          NexusAI is configured with your company context. Select your first dashboard view.
          Each role surfaces a different lens tuned to your decision-making context.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {displayRoles.map((role) => (
          <button
            key={role.key}
            onClick={() => go(role.key)}
            disabled={!!navigating}
            className={[
              "rounded-xl border p-5 text-left transition-all",
              role.color,
              navigating === role.key ? "opacity-60 cursor-wait" : navigating ? "opacity-40" : "cursor-pointer",
            ].join(" ")}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl text-white/60">{role.icon}</span>
              <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-white/40">{role.badge}</span>
            </div>
            <p className="font-semibold text-white text-sm mb-1">{role.label}</p>
            <p className="text-xs text-white/50 leading-relaxed">{role.description}</p>
            {navigating === role.key && <p className="mt-2 text-xs text-nexus-accent">Opening dashboard...</p>}
          </button>
        ))}
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
      companyStage: "growth",
      employeeBand: "51_200",
      region: "",
      primaryGoals: [],
      riskProfile: sector === "financial_services" || sector === "healthcare" ? "conservative" : "moderate",
      priorityRoles: sectorDef?.defaultRoles.slice(0, 6) ?? ["CEO", "COO", "CTO"],
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
            suggestedRoles={profile.priorityRoles}
            onNext={(roles) => { setSelectedRoles(roles); setStep(5); }}
            onBack={() => setStep(3)}
          />
        )}

        {step === 5 && (
          <Step5
            suggestedDocuments={profile.suggestedDocuments}
            sensitivityDefault={profile.sensitivityDefault}
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
