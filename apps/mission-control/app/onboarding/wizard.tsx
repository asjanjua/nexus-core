"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IngestionResult = {
  id: string;
  ingestionStatus: string;
  extractionConfidence: number;
  sourcePath: string;
};

type Props = {
  workspaceId: string;
  displayName: string;
  isAuthenticated: boolean;
};

type Step = 1 | 2 | 3 | 4;

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEPS = ["Workspace", "Data Source", "Preview", "Go Live"];

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="mb-10 flex items-center gap-0">
      {STEPS.map((label, idx) => {
        const stepNum = (idx + 1) as Step;
        const done = current > stepNum;
        const active = current === stepNum;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all",
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
                  "mx-2 mb-4 h-px w-12 transition-all",
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
// Confidence bar helper
// ---------------------------------------------------------------------------

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 70 ? "bg-green-400" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  const label =
    pct >= 70 ? "High" : pct >= 40 ? "Medium" : "Low";
  const labelColor =
    pct >= 70 ? "text-green-400" : pct >= 40 ? "text-amber-400" : "text-red-400";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50">Extraction confidence</span>
        <span className={labelColor}>
          {label} ({pct}%)
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
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
  const style = styles[value] ?? styles["internal"];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${style}`}>
      {value}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Role cards (Step 4)
// ---------------------------------------------------------------------------

const ROLES = [
  {
    key: "ceo",
    title: "CEO Command Brief",
    icon: "◈",
    description: "Strategic priorities, cross-functional risks, and open decisions requiring executive attention.",
    color: "border-purple-400/30 hover:border-purple-400/60 hover:bg-purple-400/5",
    badge: "Strategic",
  },
  {
    key: "coo",
    title: "COO Execution View",
    icon: "◉",
    description: "Operational health, delivery pipeline status, and freshness of ingested evidence.",
    color: "border-blue-400/30 hover:border-blue-400/60 hover:bg-blue-400/5",
    badge: "Operational",
  },
  {
    key: "cbo",
    title: "CBO / Strategy",
    icon: "◑",
    description: "Decision pipeline confidence, evidence quality signals, and recommendation throughput.",
    color: "border-nexus-accent/30 hover:border-nexus-accent/60 hover:bg-nexus-accent/5",
    badge: "Commercial",
  },
  {
    key: "cto",
    title: "CTO / CDO",
    icon: "◐",
    description: "Data quality scores, ingestion health, extraction confidence distribution, and pipeline reliability.",
    color: "border-orange-400/30 hover:border-orange-400/60 hover:bg-orange-400/5",
    badge: "Technical",
  },
];

// ---------------------------------------------------------------------------
// Step 1 — Workspace confirmation
// ---------------------------------------------------------------------------

function Step1({
  workspaceId,
  displayName,
  onNext,
}: {
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
          Your executive intelligence layer is ready to configure. This takes about 3 minutes.
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
              <span className="h-1.5 w-1.5 rounded-full bg-green-400"></span>
              Provisioned
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white/40">
              <span className="h-1.5 w-1.5 rounded-full bg-white/30"></span>
              Pending setup
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 pt-1">
          {[
            { label: "Tenant", value: "Isolated" },
            { label: "Auth", value: "Clerk SSO" },
            { label: "Mode", value: process.env.NEXT_PUBLIC_NEXUS_ENV ?? "pilot" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-xs text-white/40">{label}</p>
              <p className="text-sm text-white/80 font-medium">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/60 space-y-1.5">
        <p className="font-medium text-white/80">What happens when you provision:</p>
        <ul className="space-y-1 text-white/50">
          <li className="flex items-center gap-2"><span className="text-nexus-accent">→</span> Isolated tenant and workspace created</li>
          <li className="flex items-center gap-2"><span className="text-nexus-accent">→</span> Default data policies applied</li>
          <li className="flex items-center gap-2"><span className="text-nexus-accent">→</span> Evidence ingestion pipeline activated</li>
          <li className="flex items-center gap-2"><span className="text-nexus-accent">→</span> LLM synthesis enabled for your org</li>
        </ul>
      </div>

      {error && (
        <p className="rounded-lg border border-red-300/40 bg-red-300/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        {!provisioned && (
          <button
            onClick={provision}
            disabled={provisioning}
            className="btn-primary"
          >
            {provisioning ? "Provisioning..." : "Provision Workspace"}
          </button>
        )}
        {provisioned && (
          <button onClick={onNext} className="btn-primary">
            Continue to Data Sources →
          </button>
        )}
        {!provisioned && (
          <button onClick={onNext} className="btn-subtle text-sm text-white/50">
            Skip (already provisioned)
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Pick first data source
// ---------------------------------------------------------------------------

function Step2({
  workspaceId,
  onNext,
}: {
  workspaceId: string;
  onNext: (result: IngestionResult) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    body.append("workspaceId", workspaceId);
    body.append("tenantId", workspaceId);
    body.append("sensitivity", "internal");
    body.append("sourceType", "upload");
    try {
      const res = await fetch("/api/ingestion/status", { method: "POST", body });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "ingestion_failed");
      onNext(payload.data as IngestionResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown_error");
    } finally {
      setUploading(false);
    }
  }

  const connectorCards = [
    {
      key: "slack",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
        </svg>
      ),
      name: "Slack Workspace",
      description: "Ingest messages, threads, and channel archives from your team Slack.",
      available: false,
    },
    {
      key: "drive",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
          <path d="M4.433 22.396L0 15.047l4.433-7.676h15.135L24 15.047l-4.432 7.349H4.433zm4.051-14.72L4.05 15.047l4.433 7.349h7.036l4.432-7.349-4.432-7.372H8.484zM12 0l4.432 7.676H7.568L12 0z" />
        </svg>
      ),
      name: "Google Drive",
      description: "Pull documents, presentations, and spreadsheets from shared drives.",
      available: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Add your first data source</h2>
        <p className="mt-2 text-white/60">
          NexusAI generates intelligence from your existing documents and communications. Upload a sample to see it in action.
        </p>
      </div>

      {/* Upload card — active */}
      <div className="rounded-xl border border-nexus-accent/30 bg-nexus-accent/5 p-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-nexus-accent/30 bg-nexus-accent/10 text-nexus-accent text-lg">
            ↑
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-white">Upload Document</p>
              <span className="rounded-full border border-nexus-accent/40 bg-nexus-accent/10 px-2 py-0.5 text-xs text-nexus-accent">
                Active
              </span>
            </div>
            <p className="text-sm text-white/50 mt-0.5">
              PDF, DOCX, PPTX, XLSX, TXT, or Markdown — up to 50MB.
            </p>
          </div>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          className={[
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition",
            file
              ? "border-nexus-accent/50 bg-nexus-accent/5"
              : "border-white/20 hover:border-white/40 hover:bg-white/5",
          ].join(" ")}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.pptx,.xlsx,.txt,.md"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="text-center">
              <p className="text-sm font-medium text-white">{file.name}</p>
              <p className="text-xs text-white/40 mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-2xl mb-2 text-white/30">⊕</p>
              <p className="text-sm text-white/60">Click to select a file</p>
              <p className="text-xs text-white/30 mt-1">or drag and drop</p>
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-red-300/40 bg-red-300/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="btn-primary w-full"
        >
          {uploading ? "Extracting and indexing..." : "Ingest Document →"}
        </button>
      </div>

      {/* Coming soon connectors */}
      <div className="grid grid-cols-2 gap-4">
        {connectorCards.map((card) => (
          <div
            key={card.key}
            className="relative rounded-xl border border-white/10 bg-white/5 p-4 opacity-60"
          >
            <div className="absolute right-3 top-3">
              <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-white/40">
                Task 22
              </span>
            </div>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/40">
              {card.icon}
            </div>
            <p className="text-sm font-medium text-white/70">{card.name}</p>
            <p className="mt-1 text-xs text-white/40">{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Evidence preview
// ---------------------------------------------------------------------------

function Step3({
  result,
  onNext,
}: {
  result: IngestionResult;
  onNext: () => void;
}) {
  const filename = result.sourcePath.split("/").pop() ?? result.sourcePath;
  const ext = filename.split(".").pop()?.toUpperCase() ?? "FILE";

  const statusBadge =
    result.ingestionStatus === "processed"
      ? "border-green-500/40 bg-green-500/10 text-green-300"
      : result.ingestionStatus === "pending_approval"
      ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
      : "border-white/20 bg-white/5 text-white/50";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Intelligence extracted</h2>
        <p className="mt-2 text-white/60">
          NexusAI has parsed your document and staged it for LLM synthesis.
          Review the evidence record before generating your first dashboard.
        </p>
      </div>

      {/* Evidence record card */}
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
            {result.ingestionStatus.replace(/_/g, " ")}
          </span>
        </div>

        <ConfidenceBar value={result.extractionConfidence} />

        <div className="flex items-center justify-between border-t border-white/10 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Sensitivity:</span>
            <SensitivityBadge value="internal" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Source:</span>
            <span className="text-xs text-white/60">upload</span>
          </div>
        </div>
      </div>

      {/* Confidence guidance */}
      {result.extractionConfidence < 0.4 && (
        <div className="rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm text-amber-100 space-y-1">
          <p className="font-medium">Low extraction confidence</p>
          <p className="text-amber-100/70">
            This record may have scanned text, poor formatting, or limited content.
            It will be flagged for human review before entering the LLM synthesis pipeline.
          </p>
        </div>
      )}

      {result.extractionConfidence >= 0.4 && (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/60 space-y-1.5">
          <p className="font-medium text-white/80">What happens next:</p>
          <ul className="space-y-1 text-white/50">
            <li className="flex items-center gap-2"><span className="text-nexus-accent">→</span> Evidence enters the LLM synthesis queue</li>
            <li className="flex items-center gap-2"><span className="text-nexus-accent">→</span> Recommendations are generated from extracted text</li>
            <li className="flex items-center gap-2"><span className="text-nexus-accent">→</span> Confidence scoring applied to all output signals</li>
            <li className="flex items-center gap-2"><span className="text-nexus-accent">→</span> Dashboard views populate with your first intelligence</li>
          </ul>
        </div>
      )}

      <button onClick={onNext} className="btn-primary">
        Approve Evidence and Continue →
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Go live: role selection
// ---------------------------------------------------------------------------

function Step4() {
  const router = useRouter();
  const [navigating, setNavigating] = useState<string | null>(null);

  function go(roleKey: string) {
    setNavigating(roleKey);
    router.push(`/dashboard/${roleKey}`);
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-nexus-accent/30 bg-nexus-accent/10 text-3xl text-nexus-accent">
          ◈
        </div>
        <h2 className="text-2xl font-semibold text-white">Your intelligence is ready</h2>
        <p className="mt-2 text-white/60 max-w-md mx-auto">
          Select your dashboard view. Each role surfaces a different lens over the same evidence,
          tuned to your decision-making context.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {ROLES.map((role) => (
          <button
            key={role.key}
            onClick={() => go(role.key)}
            disabled={!!navigating}
            className={[
              "rounded-xl border p-5 text-left transition-all",
              role.color,
              navigating === role.key
                ? "opacity-60 cursor-wait"
                : navigating
                ? "opacity-40"
                : "cursor-pointer",
            ].join(" ")}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl text-white/60">{role.icon}</span>
              <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-white/40">
                {role.badge}
              </span>
            </div>
            <p className="font-semibold text-white text-sm mb-1">{role.title}</p>
            <p className="text-xs text-white/50 leading-relaxed">{role.description}</p>
            {navigating === role.key && (
              <p className="mt-2 text-xs text-nexus-accent">Opening dashboard...</p>
            )}
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-white/30">
        You can switch between all dashboard views at any time from the side navigation.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root wizard
// ---------------------------------------------------------------------------

export function OnboardingWizard({ workspaceId, displayName, isAuthenticated }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [ingestionResult, setIngestionResult] = useState<IngestionResult | null>(null);

  function handleIngestionComplete(result: IngestionResult) {
    setIngestionResult(result);
    setStep(3);
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-nexus-accent/60 mb-1">
          NexusAI Mission Control
        </p>
        <p className="text-xs text-white/30">Setup Wizard</p>
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
            workspaceId={workspaceId}
            onNext={handleIngestionComplete}
          />
        )}

        {step === 3 && ingestionResult && (
          <Step3
            result={ingestionResult}
            onNext={() => setStep(4)}
          />
        )}

        {step === 4 && <Step4 />}
      </div>

      {/* Bottom nav — back button where sensible */}
      {step > 1 && step < 4 && (
        <div className="mt-4 flex justify-start">
          <button
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="text-xs text-white/30 hover:text-white/60 transition"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
