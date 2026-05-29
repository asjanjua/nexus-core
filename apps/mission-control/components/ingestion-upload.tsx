"use client";

import { useEffect, useState } from "react";

type IngestionResult = {
  id: string;
  ingestionStatus: string;
  extractionConfidence: number;
  sourcePath: string;
};

const MAX_FILES = 10;

export function IngestionUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<IngestionResult[]>([]);
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
    if (!files.length) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const uploaded: IngestionResult[] = [];
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        body.append("workspaceId", workspaceId);
        body.append("tenantId", workspaceId);
        body.append("sensitivity", "internal");
        body.append("sourceType", "upload");

        const res = await fetch("/api/ingestion/status", { method: "POST", body });
        const payload = await res.json();
        if (!res.ok || !payload.ok) {
          throw new Error(`${file.name}: ${payload.error ?? "ingestion_failed"}`);
        }
        uploaded.push(payload.data as IngestionResult);
        setResults([...uploaded]);
      }
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
        multiple
        onChange={(e) => {
          const selected = Array.from(e.target.files ?? []).slice(0, MAX_FILES);
          setFiles(selected);
          setResults([]);
          setError((e.target.files?.length ?? 0) > MAX_FILES ? `Only the first ${MAX_FILES} files will be uploaded.` : null);
        }}
        className="block w-full text-sm"
      />
      {files.length ? (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/70">
          <p className="mb-2 font-medium text-white/80">
            Selected {files.length} of {MAX_FILES} maximum files
          </p>
          <ul className="space-y-1">
            {files.map((item) => (
              <li key={`${item.name}-${item.size}`}>{item.name}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <button className="btn-primary" onClick={upload} disabled={!files.length || loading}>
          {loading ? "Processing..." : files.length > 1 ? `Ingest ${files.length} Files` : "Ingest File"}
        </button>
        <span className="text-xs text-white/60">Low confidence or missing provenance will be quarantined.</span>
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {results.length ? (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
          <p className="mb-2 font-medium">Ingested {results.length} file{results.length === 1 ? "" : "s"}</p>
          <ul className="space-y-3">
            {results.map((result) => (
              <li key={result.id}>
                <p>Evidence ID: {result.id}</p>
                <p>Status: {result.ingestionStatus}</p>
                <p>Confidence: {Math.round(result.extractionConfidence * 100)}%</p>
                <p>Source: {result.sourcePath}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
