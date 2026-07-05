"use client";

import { useRef, useState, useCallback } from "react";
import { HelpLabel } from "@/components/ui/help-dialog";

type IngestionResult = {
  id: string;
  ingestionStatus: string;
  extractionConfidence: number;
  sourcePath: string;
};

type FileResult = {
  fileName: string;
  result?: IngestionResult;
  error?: string;
};

const MAX_FILES = 10;
const ACCEPT = ".pdf,.docx,.pptx,.xlsx,.txt,.md";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    processed: "border-green-500/40 bg-green-500/10 text-green-300",
    pending_approval: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    quarantined: "border-red-400/40 bg-red-400/10 text-red-300",
  };
  const style = map[status] ?? "border-white/20 bg-white/5 text-white/50";
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "bg-green-400" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  const label = pct >= 70 ? "High" : pct >= 40 ? "Medium" : "Low";
  const labelColor = pct >= 70 ? "text-green-400" : pct >= 40 ? "text-amber-400" : "text-red-400";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/40">
          <HelpLabel
            title="Extraction confidence"
            help="This estimates how reliably Nexus understood the file text and metadata. High confidence can enter synthesis automatically; medium confidence needs review; low confidence is quarantined."
          >
            Extraction confidence
          </HelpLabel>
        </span>
        <span className={labelColor}>{label} ({pct}%)</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function FileExtBadge({ fileName }: { fileName: string }) {
  const ext = (fileName.split(".").pop() ?? "FILE").toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs font-bold text-white/50">
      {ext.slice(0, 4)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props: workspaceId optionally passed from the server component. If absent,
// the upload route derives it from the Clerk session (same result, extra fetch
// is just avoided).
// ---------------------------------------------------------------------------
export function IngestionUpload({ workspaceId }: { workspaceId?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [fileResults, setFileResults] = useState<FileResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function pickFiles(incoming: FileList | null) {
    if (!incoming) return;
    const selected = Array.from(incoming).slice(0, MAX_FILES);
    setFiles(selected);
    setFileResults([]);
    setError(null);
    if (incoming.length > MAX_FILES) {
      setError(`Only the first ${MAX_FILES} files will be uploaded.`);
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    pickFiles(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  async function upload() {
    if (!files.length) return;
    setLoading(true);
    setProcessed(0);
    setFileResults([]);
    setError(null);

    const accumulated: FileResult[] = [];

    for (const file of files) {
      const body = new FormData();
      body.append("file", file);
      if (workspaceId) {
        body.append("workspaceId", workspaceId);
        body.append("tenantId", workspaceId);
      }
      body.append("sensitivity", "internal");
      body.append("sourceType", "upload");

      try {
        const res = await fetch("/api/ingestion/status", { method: "POST", body });
        const payload = await res.json();
        if (!res.ok || !payload.ok) {
          accumulated.push({ fileName: file.name, error: payload.error ?? "ingestion_failed" });
        } else {
          accumulated.push({ fileName: file.name, result: payload.data as IngestionResult });
        }
      } catch {
        accumulated.push({ fileName: file.name, error: "network_error" });
      }

      setProcessed(accumulated.length);
      setFileResults([...accumulated]);
    }

    setLoading(false);
  }

  const successCount = fileResults.filter((r) => r.result).length;
  const errorCount = fileResults.filter((r) => r.error).length;
  const hasQuarantined = fileResults.some((r) => r.result?.ingestionStatus === "quarantined");

  return (
    <section className="panel space-y-4">
      <div className="flex items-center justify-between">
        <p className="panel-title">
          <HelpLabel
            title="Upload and ingest"
            help="Upload adds files to Nexus as evidence. Nexus extracts text, checks confidence and provenance, then either clears the source, sends it to approval, or quarantines it."
          >
            Upload and Ingest
          </HelpLabel>
        </p>
        <span className="text-xs text-white/30">Up to {MAX_FILES} files · 50 MB each</span>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !loading && fileRef.current?.click()}
        className={[
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-all",
          loading
            ? "cursor-default border-white/10 opacity-60"
            : isDragging
            ? "border-nexus-accent bg-nexus-accent/5"
            : files.length > 0
            ? "border-nexus-accent/40 bg-nexus-accent/5"
            : "border-white/20 hover:border-white/40 hover:bg-white/5",
        ].join(" ")}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => pickFiles(e.target.files)}
        />

        {files.length > 0 && !loading ? (
          <div className="w-full space-y-2">
            <p className="text-center text-sm font-medium text-white">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </p>
            <div className="max-h-36 space-y-1 overflow-auto rounded-lg border border-white/10 bg-black/20 p-2">
              {files.map((f) => (
                <div
                  key={`${f.name}-${f.lastModified}`}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="truncate text-white/70">{f.name}</span>
                  <span className="shrink-0 text-white/35">{(f.size / 1024).toFixed(0)} KB</span>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-white/40">Click to change selection</p>
          </div>
        ) : loading ? (
          <div className="text-center space-y-2">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-nexus-accent border-t-transparent" />
            <p className="text-sm text-white/70">
              Processing {processed} of {files.length}...
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="mb-2 text-2xl text-white/20">⊕</p>
            <p className="text-sm text-white/60">
              Drop files here or click to select
            </p>
            <p className="mt-1 text-xs text-white/30">PDF · DOCX · PPTX · XLSX · TXT · MD</p>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-sm text-amber-200">
          {error}
        </p>
      )}

      {/* Action row */}
      <div className="flex items-center gap-3">
        <button
          className="btn-primary"
          onClick={upload}
          disabled={!files.length || loading}
        >
          {loading
            ? `Ingesting ${processed}/${files.length}...`
            : files.length > 1
            ? `Ingest ${files.length} Files`
            : files.length === 1
            ? "Ingest File"
            : "Select files above"}
        </button>
        {files.length > 0 && !loading && (
          <button
            className="text-xs text-white/30 hover:text-white/60 transition"
            onClick={() => {
              setFiles([]);
              setFileResults([]);
              setError(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
          >
            Clear
          </button>
        )}
        <span className="text-xs text-white/40">
          <HelpLabel
            title="Quarantine"
            help="Quarantine means Nexus will not use the file in answers or briefs. This protects the workspace when a source is unclear, incomplete, or missing reliable provenance."
          >
            Low confidence or missing provenance is quarantined for review.
          </HelpLabel>
        </span>
      </div>

      {/* Results */}
      {fileResults.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white/80">
              {loading ? "Ingesting..." : `Done — ${successCount} ingested${errorCount ? `, ${errorCount} failed` : ""}`}
            </p>
            {!loading && (
              <button
                className="text-xs text-white/30 hover:text-white/60 transition"
                onClick={() => {
                  setFiles([]);
                  setFileResults([]);
                  setError(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              >
                Upload another batch
              </button>
            )}
          </div>

          <div className="space-y-2">
            {fileResults.map((fr) => (
              <div
                key={fr.fileName}
                className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2"
              >
                <div className="flex items-center gap-3">
                  <FileExtBadge fileName={fr.fileName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{fr.fileName}</p>
                    {fr.result && (
                      <p className="text-xs text-white/30 font-mono mt-0.5 truncate">
                        {fr.result.id}
                      </p>
                    )}
                  </div>
                  {fr.result ? (
                    <StatusBadge status={fr.result.ingestionStatus} />
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-red-400/40 bg-red-400/10 px-2 py-0.5 text-xs text-red-300">
                      failed
                    </span>
                  )}
                </div>

                {fr.result && (
                  <ConfidenceBar value={fr.result.extractionConfidence} />
                )}

                {fr.error && (
                  <p className="text-xs text-red-300">{fr.error}</p>
                )}

                {fr.result?.ingestionStatus === "pending_approval" && (
                  <p className="text-xs text-amber-200/70">
                    Staged for review —{" "}
                    <a href="/approvals" className="underline hover:text-amber-200 transition">
                      go to Approvals
                    </a>{" "}
                    to approve before synthesis.
                  </p>
                )}
                {fr.result?.ingestionStatus === "quarantined" && (
                  <p className="text-xs text-red-200/70">
                    Quarantined — low confidence or missing provenance. Check the Quarantine Queue below.
                  </p>
                )}
                {fr.result?.ingestionStatus === "processed" && (
                  <p className="text-xs text-green-200/70">
                    Cleared for LLM synthesis —{" "}
                    <a href="/dashboard/ceo" className="underline hover:text-green-200 transition">
                      view your dashboard
                    </a>.
                  </p>
                )}
              </div>
            ))}
          </div>

          {hasQuarantined && !loading && (
            <p className="text-xs text-white/40">
              Quarantined items were added.{" "}
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="underline transition hover:text-white/70"
              >
                Refresh to update the queue
              </button>
              .
            </p>
          )}
        </div>
      )}
    </section>
  );
}
