"use client";

import { useEffect, useState } from "react";

type IngestionResult = {
  id: string;
  ingestionStatus: string;
  extractionConfidence: number;
  sourcePath: string;
};

export function IngestionUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<IngestionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string>("workspace-demo");

  // Resolve the real workspaceId from the session on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((p) => { if (p.ok && p.data?.workspaceId) setWorkspaceId(p.data.workspaceId); })
      .catch(() => { /* fall back to default */ });
  }, []);

  async function upload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    body.append("workspaceId", workspaceId);
    body.append("tenantId", workspaceId);
    body.append("sensitivity", "internal");
    try {
      const res = await fetch("/api/ingestion/status", { method: "POST", body });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "ingestion_failed");
      setResult(payload.data as IngestionResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown_error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel space-y-3">
      <p className="panel-title">Upload and Ingest</p>
      <input
        type="file"
        accept=".pdf,.docx,.pptx,.xlsx,.txt,.md"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm"
      />
      <div className="flex items-center gap-2">
        <button className="btn-primary" onClick={upload} disabled={!file || loading}>
          {loading ? "Processing..." : "Ingest File"}
        </button>
        <span className="text-xs text-white/60">Low confidence or missing provenance will be quarantined.</span>
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {result ? (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
          <p>Evidence ID: {result.id}</p>
          <p>Status: {result.ingestionStatus}</p>
          <p>Confidence: {Math.round(result.extractionConfidence * 100)}%</p>
          <p>Source: {result.sourcePath}</p>
        </div>
      ) : null}
    </section>
  );
}

