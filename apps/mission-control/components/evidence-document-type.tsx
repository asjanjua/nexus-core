"use client";

/**
 * Reviewer control for a document's type.
 *
 * Coverage identifies a document from its filename, or from its text when the
 * filename says nothing. On a real data room that is often wrong or silent —
 * a scan has no text, and "Project Falcon - Annex 4.pdf" could be anything.
 * This is where a human corrects it.
 *
 * THREE ACTIONS, AND TWO OF THEM LOOK ALIKE BUT ARE OPPOSITES.
 *
 *   Save              records the types the reviewer chose.
 *   Supports nothing  records an EMPTY answer. A human looked and found
 *                     nothing citable. This closes the question.
 *   Revert            deletes the override entirely and hands the document
 *                     back to the classifier, reopening the question.
 *
 * Collapsing the last two would make a reviewer's negative finding
 * indistinguishable from never having looked, and coverage would quietly
 * resume counting a document the reviewer had already rejected. They are
 * deliberately separate, and "Supports nothing" is styled quietly because it
 * is a closed question, not an achievement.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type DocumentTypeState = {
  evidenceId: string;
  types: string[];
  source: "reviewer" | "filename" | "content" | "none";
  reviewed: boolean;
  setBy?: string | null;
  note?: string | null;
};

const SOURCE_LABEL: Record<DocumentTypeState["source"], string> = {
  reviewer: "Confirmed by a reviewer",
  filename: "Identified from the filename",
  content: "Identified from the document's contents",
  none: "Not identified",
};

/** Mint for a human decision, sky for an inference, amber for nothing. */
function toneFor(state: DocumentTypeState) {
  if (state.source === "reviewer") {
    return state.types.length > 0
      ? { text: "text-nexus-accent", border: "border-nexus-accent/40", bg: "bg-nexus-accent/10" }
      : { text: "text-white/55", border: "border-white/15", bg: "bg-white/5" };
  }
  if (state.source === "none") {
    return { text: "text-nexus-warn", border: "border-nexus-warn/40", bg: "bg-nexus-warn/10" };
  }
  return { text: "text-nexus-sky", border: "border-nexus-sky/40", bg: "bg-nexus-sky/10" };
}

export function EvidenceDocumentType({
  initial,
  vocabulary,
}: {
  initial: DocumentTypeState;
  vocabulary: string[];
}) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [draft, setDraft] = useState<string[]>(initial.types);
  const [note, setNote] = useState(initial.note ?? "");
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<null | "save" | "empty" | "revert">(null);
  const [error, setError] = useState<string | null>(null);

  const tone = toneFor(state);
  const dirty = useMemo(
    () => JSON.stringify([...draft].sort()) !== JSON.stringify([...state.types].sort()),
    [draft, state.types]
  );

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = q ? vocabulary.filter((t) => t.toLowerCase().includes(q)) : vocabulary;
    return all.slice(0, 40);
  }, [search, vocabulary]);

  async function write(types: string[], mode: "save" | "empty") {
    setBusy(mode);
    setError(null);
    try {
      const res = await fetch(`/api/evidence/${state.evidenceId}/document-type`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ types, note: note.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "save_failed");
      setState({ ...state, types, source: "reviewer", reviewed: true, note: note.trim() || null });
      setDraft(types);
      // Coverage counts change as a result, so the surrounding server data has
      // to be refetched rather than left stale.
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "save_failed");
    } finally {
      setBusy(null);
    }
  }

  async function revert() {
    setBusy("revert");
    setError(null);
    try {
      const res = await fetch(`/api/evidence/${state.evidenceId}/document-type`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "revert_failed");
      // The classifier's answer is only known server-side, so reload rather
      // than guessing what it will say.
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "revert_failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-lg border border-nexus-border bg-nexus-bg p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
        Document type
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${tone.border} ${tone.bg} ${tone.text}`}
        >
          {state.types.length > 0 ? state.types.join(" · ") : "Supports nothing"}
        </span>
        <span className="text-xs text-white/45">{SOURCE_LABEL[state.source]}</span>
      </div>

      {state.source === "reviewer" && state.setBy && (
        <p className="mt-2 text-xs text-white/40">
          Set by {state.setBy}
          {state.note ? ` — “${state.note}”` : ""}
        </p>
      )}

      {state.source === "none" && (
        <p className="mt-2 text-xs leading-5 text-white/50">
          This document supports no requirement until someone says what it is. Nothing in the
          filename matched, and there was no usable text to read.
        </p>
      )}

      <div className="mt-4 border-t border-white/10 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
          Set the type
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {draft.map((type) => (
            <span
              key={type}
              className="inline-flex items-center gap-2 rounded-md border border-nexus-sky/40 bg-nexus-sky/10 px-2.5 py-1.5 text-xs text-nexus-sky"
            >
              {type}
              <button
                type="button"
                aria-label={`Remove ${type}`}
                onClick={() => setDraft(draft.filter((t) => t !== type))}
                className="text-nexus-sky/70 transition hover:text-nexus-sky"
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setPicking((v) => !v)}
            className="rounded-md border border-nexus-border px-2.5 py-1.5 text-xs text-white/55 transition hover:text-white"
          >
            {picking ? "Close" : "+ Add type"}
          </button>
        </div>

        {picking && (
          <div className="mt-3 rounded-lg border border-nexus-border bg-nexus-panel p-3">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search document types"
              className="input w-full text-sm"
              aria-label="Search document types"
            />
            <ul className="mt-2 max-h-56 overflow-auto">
              {results.map((type) => {
                const chosen = draft.includes(type);
                return (
                  <li key={type}>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft(chosen ? draft.filter((t) => t !== type) : [...draft, type])
                      }
                      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-white/[0.04] ${
                        chosen ? "text-nexus-accent" : "text-white/80"
                      }`}
                    >
                      <span className="w-3">{chosen ? "✓" : ""}</span>
                      {type}
                    </button>
                  </li>
                );
              })}
              {results.length === 0 && (
                <li className="px-2.5 py-3 text-xs text-white/45">
                  No type matches “{search}”. Only types a requirement can match are offered.
                </li>
              )}
            </ul>
          </div>
        )}

        <p className="mt-2 text-xs leading-5 text-white/40">
          Only types the requirement packs can match. A free-text label would look accepted and
          satisfy nothing.
        </p>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reviewer note, e.g. scanned, confirmed by opening it"
          className="input mt-3 w-full text-sm"
          aria-label="Reviewer note"
          maxLength={500}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => write(draft, "save")}
            disabled={busy !== null || (!dirty && state.source === "reviewer")}
            className="btn-primary text-sm disabled:opacity-40"
          >
            {busy === "save" ? "Saving..." : "Save type"}
          </button>
          <button
            type="button"
            onClick={() => write([], "empty")}
            disabled={busy !== null}
            className="btn-subtle text-sm disabled:opacity-40"
          >
            {busy === "empty" ? "Recording..." : "Supports nothing"}
          </button>
          {state.source === "reviewer" && (
            <button
              type="button"
              onClick={revert}
              disabled={busy !== null}
              className="btn-subtle text-sm disabled:opacity-40"
            >
              {busy === "revert" ? "Reverting..." : "Revert to automatic"}
            </button>
          )}
        </div>

        <p className="mt-3 text-xs leading-5 text-nexus-warn">
          “Supports nothing” is a finding, not a reset. It records that a human looked and found
          nothing citable, and stops this document being counted as unread. Reverting hands it back
          to the classifier and reopens the question.
        </p>

        {error && (
          <p className="mt-2 text-xs text-nexus-danger">
            Could not save: {error}. Nothing has changed.
          </p>
        )}
      </div>
    </div>
  );
}
