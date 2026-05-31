"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteEvidenceButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/evidence/${id}`, { method: "DELETE" });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "delete_failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown_error");
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (deleting) {
    return <span className="text-xs text-white/30">Removing...</span>;
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-xs text-white/50 truncate max-w-[120px]">Remove &quot;{name}&quot;?</span>
        <button
          onClick={handleDelete}
          className="text-xs text-red-400 hover:text-red-300 transition font-medium"
        >
          Yes, remove
        </button>
        <button
          onClick={() => { setConfirming(false); setError(null); }}
          className="text-xs text-white/30 hover:text-white/60 transition"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-red-300">{error}</span>}
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-white/25 hover:text-red-400/80 transition"
      title="Remove this evidence record"
    >
      Remove
    </button>
  );
}
