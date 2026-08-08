/**
 * GET /api/admin/infrastructure-health
 *
 * Infrastructure health check: verifies R2 bucket accessibility,
 * Neon backup configuration, and general infrastructure readiness.
 *
 * This is needed for pilot readiness — backstopping the the
 * production health checklist with automated verification.
 *
 * DESCRIBES THE DEPLOYMENT, NOT A WORKSPACE. The response names the R2 endpoint
 * hostname, states whether R2 credentials are present, and reports whether
 * DATABASE_URL points at Neon. That is Pinavia infrastructure detail, so this is
 * gated by `requirePlatformAdmin` rather than `requireScope("read:admin")` —
 * the latter passes for any org-less personal workspace, i.e. any signup.
 */

import { ok } from "@/lib/api";
import { requirePlatformAdmin } from "@/lib/api-auth";
import { isOriginalStorageEnabled } from "@/lib/services/object-storage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (auth.error) return auth.error;

  const checks: Array<{ name: string; status: string; detail: string }> = [];

  // R2 bucket check — Cloudflare R2 for evidence file storage.
  //
  // Delegated to isOriginalStorageEnabled() rather than reading env vars here.
  // This route previously checked CLOUDFLARE_R2_ENDPOINT and
  // CLOUDFLARE_R2_ACCESS_KEY_ID, which are set nowhere: not in render.yaml, not
  // in .env.example, and not read by any other module. The storage client reads
  // R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET behind
  // NEXUS_R2_ORIGINALS. So the check reported "not_configured" permanently and
  // dragged `overall` to "degraded" on every call, including when R2 was
  // working perfectly. A health check that can never pass is worse than none,
  // because operators learn to ignore it.
  //
  // Asking the module that actually does the work is what keeps the two from
  // drifting apart again. tests/infrastructure-health-route.test.ts fails if a
  // future edit reintroduces a private copy of the variable names.
  const r2Enabled = process.env.NEXUS_R2_ORIGINALS === "enabled";
  if (!r2Enabled) {
    checks.push({
      name: "r2_bucket",
      status: "disabled",
      detail:
        "NEXUS_R2_ORIGINALS is not 'enabled'. Original evidence files are not retained in object storage. This is a valid configuration, not a fault.",
    });
  } else if (isOriginalStorageEnabled()) {
    checks.push({
      name: "r2_bucket",
      status: "configured",
      detail: `Bucket: ${process.env.R2_BUCKET ?? "unknown"} (account ${process.env.R2_ACCOUNT_ID ?? "unknown"}).`,
    });
  } else {
    checks.push({
      name: "r2_bucket",
      status: "not_configured",
      detail:
        "NEXUS_R2_ORIGINALS is 'enabled' but one of R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY or R2_BUCKET is missing. Originals are being dropped silently.",
    });
  }

  // Neon backup.
  //
  // This reports only what it can actually establish, which is whether
  // DATABASE_URL looks like a Neon connection. It deliberately does NOT state a
  // retention window.
  //
  // It used to claim "Point-in-Time Recovery active (30-day retention)" off
  // nothing but a substring match. Thirty days is Neon's SCALE tier. Free is a
  // 6-hour history window and Launch is up to 7 days, so on any plan Pinavia
  // has actually held, that string was wrong by one to two orders of magnitude.
  // Recovery windows travel from here into client packs and the DR sections of
  // proposals, so a figure this route cannot verify must not be asserted at
  // all. Per docs/ENGINEERING_GUARDRAILS.md, coverage understates rather than
  // overstates, and absence of a finding is not a clean bill of health.
  //
  // If this needs to report a real window later, read it from the Neon API with
  // a real credential. Do not infer it from a connection string.
  const dbUrl = process.env.DATABASE_URL ?? "";
  const isNeon = dbUrl.includes("neon.tech") || dbUrl.includes("neondb");
  checks.push({
    name: "neon_backup",
    status: isNeon ? "manual_verification_required" : "unknown",
    detail: isNeon
      ? "DATABASE_URL points at Neon. The restore window depends on the Neon plan and is NOT verified here: Free is 6 hours, Launch up to 7 days, Scale up to 30 days. Confirm the active window in the Neon console before quoting it to a client."
      : "DATABASE_URL does not appear to be a Neon connection. Verify backup configuration.",
  });

  // R2 versioning — documented requirement for original-file recovery.
  // Versioning must be enabled in the Cloudflare dashboard per bucket.
  checks.push({
    name: "r2_versioning",
    status: "manual_verification_required",
    detail:
      "R2 bucket versioning must be enabled in Cloudflare Dashboard → R2 → bucket settings. This preserves original evidence files for recovery commitments.",
  });

  const allConfigured = checks.every((c) => c.status !== "not_configured");

  return ok({
    generatedAt: new Date().toISOString(),
    overall: allConfigured ? "healthy" : "degraded",
    checks,
  });
}
