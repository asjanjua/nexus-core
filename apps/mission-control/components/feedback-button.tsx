"use client";

/**
 * FeedbackButton — persistent button on the dashboard shell.
 * Opens a modal for pilot clients to submit feedback without leaving the app.
 * Routes to POST /api/feedback (which writes to audit log and optionally emails support).
 */

import { useState } from "react";

type State = "idle" | "open" | "submitting" | "done" | "error";

export function FeedbackButton() {
  const [state, setState] = useState<State>("idle");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setState("submitting");
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject: subject.trim() || "General feedback", message: message.trim() }),
      });
      if (!res.ok) throw new Error("Submission failed");
      setState("done");
      setSubject("");
      setMessage("");
      setTimeout(() => setState("idle"), 3000);
    } catch {
      setState("error");
      setError("Could not send feedback. Please email support@nexusai.io directly.");
    }
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setState("open")}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-white/20 bg-[#101a2f] px-4 py-2 text-xs text-white/70 shadow-lg hover:border-white/40 hover:text-white transition-colors"
        aria-label="Send feedback"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Feedback
      </button>

      {/* Modal */}
      {(state === "open" || state === "submitting" || state === "error") && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end p-5 sm:items-center sm:justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setState("idle"); }}
        >
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0d1526] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Send Feedback</h2>
              <button
                onClick={() => setState("idle")}
                className="text-white/40 hover:text-white"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-white/60">Subject (optional)</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Ask panel is slow"
                  maxLength={120}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What did you notice or need?"
                  required
                  rows={4}
                  maxLength={2000}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none resize-none"
                />
              </div>
              {error && (
                <p className="text-xs text-red-300">{error}</p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setState("idle")}
                  className="rounded-lg px-3 py-1.5 text-xs text-white/50 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={state === "submitting" || !message.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {state === "submitting" ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success toast */}
      {state === "done" && (
        <div className="fixed bottom-16 right-5 z-50 rounded-lg border border-green-400/30 bg-green-400/10 px-4 py-2 text-xs text-green-200 shadow-lg">
          Feedback sent. Thank you.
        </div>
      )}
    </>
  );
}
