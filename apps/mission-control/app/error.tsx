"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

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

