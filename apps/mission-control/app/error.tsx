"use client";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="panel max-w-2xl">
      <p className="panel-title">Mission Control Error</p>
      <p className="mt-2 text-sm text-white/80">{error.message}</p>
      <button className="btn-primary mt-3" onClick={reset}>
        Retry
      </button>
    </div>
  );
}

