"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EvidenceDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    const confirmed = window.confirm(
      "Delete this evidence record from NexusAI? This is intended for bad test uploads and cannot be undone."
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/evidence/${id}`, { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "delete_failed");
      router.push("/sources");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown_error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={onDelete}
        disabled={deleting}
      >
        {deleting ? "Deleting..." : "Delete bad/test evidence"}
      </button>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
