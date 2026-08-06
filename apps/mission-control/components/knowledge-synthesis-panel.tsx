"use client";

/**
 * Knowledge Synthesis Panel — generates a workspace synthesis brief
 * from knowledge notes, graph references, and evidence.
 * Renders on the /knowledge page.
 */

import { useState, useCallback } from "react";

interface SynthesisOutput {
  totalNotes: number;
  totalLinks: number;
  evidenceCount: number;
  brief: string;
  linkedEvidenceMap: { noteId: string; evidenceRefs: string[]; title: string }[];
  themeSummary: string[];
  followUpQuestions: string[];
  generatedAt: string;
}

export function KnowledgeSynthesisPanel() {
  const [synthesis, setSynthesis] = useState<SynthesisOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSynthesis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/knowledge/synthesis");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Synthesis failed");
      setSynthesis(json.data ?? json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Synthesis failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Knowledge Synthesis</p>
          <p className="text-xs text-white/40">
            Generate a source-backed workspace brief from your knowledge base.
          </p>
        </div>
        <button
          className="btn-subtle text-xs"
          disabled={loading}
          onClick={runSynthesis}
        >
          {synthesis ? "Re-run" : loading ? "Generating…" : "Generate"}
        </button>
      </div>

      {error && (
        <div className="rounded border border-nexus-danger/30 bg-nexus-danger/10 px-3 py-2 text-xs text-nexus-danger">
          {error}
        </div>
      )}

      {synthesis && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded border border-white/10 bg-white/[0.03] p-2 text-center">
              <p className="text-lg font-semibold text-white">{synthesis.totalNotes}</p>
              <p className="text-[9px] uppercase text-white/30">Notes</p>
            </div>
            <div className="rounded border border-white/10 bg-white/[0.03] p-2 text-center">
              <p className="text-lg font-semibold text-white">{synthesis.totalLinks}</p>
              <p className="text-[9px] uppercase text-white/30">Links</p>
            </div>
            <div className="rounded border border-white/10 bg-white/[0.03] p-2 text-center">
              <p className="text-lg font-semibold text-white">{synthesis.evidenceCount}</p>
              <p className="text-[9px] uppercase text-white/30">Evidence</p>
            </div>
          </div>

          {/* Brief */}
          <div className="rounded border border-white/10 bg-white/[0.02] p-3">
            <p className="text-xs text-white/60">{synthesis.brief}</p>
          </div>

          {/* Themes */}
          {synthesis.themeSummary.length > 0 && (
            <div className="rounded border border-white/10 bg-white/[0.02] p-3">
              <p className="mb-2 text-xs font-medium text-white/50">Top Themes</p>
              <div className="flex flex-wrap gap-1">
                {synthesis.themeSummary.map((theme) => (
                  <span
                    key={theme}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] text-white/50"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Evidence map */}
          {synthesis.linkedEvidenceMap.length > 0 && (
            <div className="rounded border border-white/10 bg-white/[0.02] p-3">
              <p className="mb-2 text-xs font-medium text-white/50">Linked Evidence Map</p>
              <div className="max-h-40 overflow-auto space-y-1">
                {synthesis.linkedEvidenceMap.map((m) => (
                  <div key={m.noteId} className="flex items-center justify-between text-[10px]">
                    <span className="text-white/60 truncate max-w-[60%]">{m.title}</span>
                    <span className="text-white/30">
                      {m.evidenceRefs.length > 0
                        ? `${m.evidenceRefs.length} refs`
                        : "no evidence"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up questions */}
          {synthesis.followUpQuestions.length > 0 && (
            <div className="rounded border border-white/10 bg-white/[0.02] p-3">
              <p className="mb-2 text-xs font-medium text-white/50">Follow-up Questions</p>
              <ul className="space-y-1">
                {synthesis.followUpQuestions.map((q, i) => (
                  <li key={i} className="text-[10px] text-white/40">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
