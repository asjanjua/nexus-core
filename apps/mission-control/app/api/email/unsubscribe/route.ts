/**
 * GET /api/email/unsubscribe?token=...
 *
 * Decodes the unsubscribe token, audits the event, and shows a confirmation page.
 * This is a public route — no auth required.
 */
import { decodeUnsubscribeToken } from "@/lib/email/resend";
import { repository } from "@/lib/data/repository";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Missing unsubscribe token.", { status: 400 });
  }

  const decoded = decodeUnsubscribeToken(token);
  if (!decoded) {
    return new Response(
      "Invalid or expired unsubscribe token. Please contact support if you continue to receive emails.",
      { status: 400 }
    );
  }

  const [workspaceId, email] = decoded;

  // Audit the unsubscribe
  await repository.pushAudit({
    workspaceId,
    type: "synthesis_email_unsubscribed",
    actor: "system",
    payload: { email, unsubscribedAt: new Date().toISOString() },
  }).catch(() => {});

  // Return a friendly confirmation page
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="text-align:center;max-width:400px;padding:32px;">
    <h1 style="font-size:24px;margin:0 0 12px 0;">Unsubscribed</h1>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;">
      ${email} has been unsubscribed from synthesis brief emails for this workspace.
      You will no longer receive scheduled briefs by email.
    </p>
  </div>
</body>
</html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}
