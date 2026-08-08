/**
 * GET /api/admin/email-config
 *
 * Verifies production email boundary: Resend API key presence,
 * sender domain configuration, and email readiness for pilot.
 *
 * DESCRIBES THE DEPLOYMENT, NOT A WORKSPACE. It echoes NEXUS_FROM_EMAIL and
 * reports whether the Resend key is set, so it is gated by
 * `requirePlatformAdmin` rather than `requireScope("read:admin")` — the latter
 * passes for any org-less personal workspace, i.e. any signup.
 */

import { ok } from "@/lib/api";
import { requirePlatformAdmin } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (auth.error) return auth.error;

  const checks: Array<{ name: string; status: string; detail: string }> = [];

  // Resend API key
  if (process.env.NEXUS_RESEND_API_KEY) {
    checks.push({ name: "resend_api_key", status: "configured", detail: "NEXUS_RESEND_API_KEY is set." });
  } else {
    checks.push({ name: "resend_api_key", status: "missing", detail: "Set NEXUS_RESEND_API_KEY in Render environment. Obtain from resend.com → API Keys." });
  }

  // From email
  const fromEmail = process.env.NEXUS_FROM_EMAIL ?? "";
  if (fromEmail) {
    checks.push({ name: "from_email", status: "configured", detail: `NEXUS_FROM_EMAIL = ${fromEmail}` });
  } else {
    checks.push({ name: "from_email", status: "missing", detail: "Set NEXUS_FROM_EMAIL in Render (e.g., nexus@pinavia.io). Must be verified in Resend dashboard." });
  }

  // Sender domain
  const fromDomain = fromEmail.split("@")[1] ?? "";
  if (fromDomain === "pinavia.io") {
    checks.push({ name: "sender_domain", status: "verified", detail: "pinavia.io — verify domain in Resend dashboard (DNS TXT record required)." });
  } else if (fromDomain) {
    checks.push({ name: "sender_domain", status: "pending_verification", detail: `${fromDomain} — verify domain ownership in Resend dashboard.` });
  } else {
    checks.push({ name: "sender_domain", status: "not_configured", detail: "Set NEXUS_FROM_EMAIL to a pinavia.io address." });
  }

  const allReady = checks.every((c) => c.status === "configured" || c.status === "verified");

  return ok({
    generatedAt: new Date().toISOString(),
    ready: allReady,
    note: allReady
      ? "Email boundary is configured and ready for production."
      : "Email boundary is not fully configured. Complete the missing checks before sending pilot emails.",
    checks,
  });
}
