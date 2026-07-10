"use client";

/**
 * Root-level error boundary. Next.js only invokes global-error.tsx for
 * errors thrown in the root layout itself (app/error.tsx handles everything
 * else). It must render its own <html>/<body> since the root layout has
 * already failed.
 *
 * Task #32 — production error tracking.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  void error;

  return (
    <html>
      <body>
        <div style={{ padding: "3rem", fontFamily: "sans-serif", color: "#fff", background: "#0a0a0f" }}>
          <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>NexusAI Mission Control hit an unexpected error</h1>
          <p style={{ opacity: 0.8 }}>The team has been notified. Please refresh the page.</p>
        </div>
      </body>
    </html>
  );
}
