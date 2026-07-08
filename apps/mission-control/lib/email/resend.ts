/**
 * Resend email integration — pure fetch, no SDK dependency.
 *
 * Implements the subset of the Resend API needed for NexusAI:
 *   - Send transactional email (synthesis briefs, pilot communications)
 *   - Unsubscribe link handling
 *
 * All functions throw on error so callers can wrap in try/catch.
 *
 * Environment variables required:
 *   NEXUS_RESEND_API_KEY    — re_... API key from resend.com
 *   NEXT_PUBLIC_APP_URL     — used for unsubscribe links
 *   NEXUS_FROM_EMAIL        — optional, defaults to "NexusAI <briefs@pinavia.io>"
 *   NEXUS_ENV               — production boundary: sends to arbitrary recipients
 *                             only when "pilot" or "production". In any other
 *                             environment, recipients must match
 *                             NEXUS_EMAIL_ALLOWLIST (comma-separated addresses
 *                             or @domains), otherwise the send is refused.
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const RESEND_API_BASE = "https://api.resend.com";

function resendKey(): string {
  const key = process.env.NEXUS_RESEND_API_KEY?.trim();
  if (!key) throw new Error("NEXUS_RESEND_API_KEY is not set");
  return key;
}

export function resendConfigured(): boolean {
  return Boolean(process.env.NEXUS_RESEND_API_KEY?.trim());
}

function fromEmail(): string {
  return process.env.NEXUS_FROM_EMAIL?.trim() ?? "NexusAI <briefs@pinavia.io>";
}

/**
 * Production email boundary. Real recipients are only reachable from the
 * pilot/production environment. Everywhere else (local dev, preview deploys),
 * a recipient must match NEXUS_EMAIL_ALLOWLIST — e.g.
 * "ali.janjua@live.com,@pinavia.io" — or the send is refused before any
 * network call. This prevents a dev deploy with a live API key from emailing
 * real pilot users.
 */
export function emailSendAllowed(to: string | string[]): { allowed: boolean; blocked: string[] } {
  const env = process.env.NEXUS_ENV?.trim().toLowerCase();
  if (env === "pilot" || env === "production") return { allowed: true, blocked: [] };

  const allowlist = (process.env.NEXUS_EMAIL_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const recipients = Array.isArray(to) ? to : [to];
  const blocked = recipients.filter((r) => {
    const addr = r.trim().toLowerCase();
    return !allowlist.some((rule) =>
      rule.startsWith("@") ? addr.endsWith(rule) : addr === rule
    );
  });
  return { allowed: blocked.length === 0, blocked };
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResendResponse {
  id: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  /** Optional plain-text fallback. Auto-generated from HTML if omitted. */
  text?: string;
  /** Reply-To address. Defaults to from address. */
  replyTo?: string;
  /** Custom headers, e.g. for unsubscribe */
  headers?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function resendPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${RESEND_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as T & { error?: { message: string } };
  if (!res.ok) {
    const msg = json.error?.message ?? `Resend error ${res.status}`;
    throw new Error(`resend_error: ${msg}`);
  }
  return json;
}

// ---------------------------------------------------------------------------
// Send email
// ---------------------------------------------------------------------------

/**
 * Send a transactional email via Resend.
 */
export async function sendEmail(opts: EmailOptions): Promise<ResendResponse> {
  const boundary = emailSendAllowed(opts.to);
  if (!boundary.allowed) {
    throw new Error(
      `email_blocked_nonproduction: refusing to send to [${boundary.blocked.join(", ")}] outside pilot/production. Add to NEXUS_EMAIL_ALLOWLIST for testing.`
    );
  }

  const payload = {
    from: fromEmail(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    reply_to: opts.replyTo,
    headers: opts.headers,
  };

  // Remove undefined fields
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined) delete (payload as Record<string, unknown>)[k];
  }

  return resendPost<ResendResponse>("/emails", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Synthesis brief email
// ---------------------------------------------------------------------------

export interface SynthesisEmailContext {
  /** The role the brief was generated for (e.g. "CEO", "CFO") */
  role: string;
  /** Display name of the workspace */
  workspaceName: string;
  /** ISO timestamp of synthesis generation */
  generatedAt: string;
  /** The synthesis questions and answers — at most 3 for email readability */
  questions: Array<{
    question: string;
    answer: string;
    confidence: number;
    evidenceCount: number;
  }>;
  /** URL to view the full brief in-app */
  briefUrl: string;
  /** Per-recipient unsubscribe token (workspaceId + email hash) */
  unsubscribeToken: string;
}

export interface ReadinessClaimEmailContext {
  email: string;
  claimUrl: string;
  lane: string;
  laneConfidence: string;
  band: string;
  expiresAt: string;
}

export function buildReadinessClaimEmailHtml(ctx: ReadinessClaimEmailContext): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#0f172a;">
    <tr>
      <td style="padding:32px 24px;">
        <h1 style="color:#e2e8f0;font-size:20px;margin:0 0 8px 0;">Your NexusAI readiness result is ready</h1>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 20px 0;">
          Your readiness band is <strong style="color:#e2e8f0;">${escapeHtml(ctx.band)}</strong>. NexusAI routed this to
          <strong style="color:#e2e8f0;">${escapeHtml(ctx.lane.replace(/_/g, " "))}</strong>
          with ${escapeHtml(ctx.laneConfidence)} confidence.
        </p>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
          Continue with this link so signup can inherit your readiness context, lane, and first-pilot guidance.
        </p>
        <a href="${escapeHtml(ctx.claimUrl)}" style="display:inline-block;padding:11px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
          Continue to NexusAI
        </a>
        <p style="color:#64748b;font-size:12px;line-height:1.6;margin:24px 0 0 0;">
          This claim link expires ${escapeHtml(new Date(ctx.expiresAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }))}.
          The result is directional readiness guidance only, not a regulatory, financial, legal, or operational opinion.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export interface ReviewerInviteEmailContext {
  /** Display name of the invited reviewer, if provided at invite time. */
  reviewerName?: string | null;
  /** Name of the workspace the reviewer is being invited to review for. */
  workspaceName: string;
  /** Name/email of the person who sent the invite. */
  invitedBy: string;
  /** Absolute URL that redeems the single-use invite code. */
  acceptUrl: string;
  /** ISO timestamp the invite expires. */
  expiresAt: string;
}

export function buildReviewerInviteEmailHtml(ctx: ReviewerInviteEmailContext): string {
  const greeting = ctx.reviewerName ? `Hi ${escapeHtml(ctx.reviewerName)},` : "Hi,";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#0f172a;">
    <tr>
      <td style="padding:32px 24px;">
        <h1 style="color:#e2e8f0;font-size:20px;margin:0 0 8px 0;">You have been invited as a reviewer</h1>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 20px 0;">
          ${greeting} <strong style="color:#e2e8f0;">${escapeHtml(ctx.invitedBy)}</strong> invited you to be the
          named reviewer for <strong style="color:#e2e8f0;">${escapeHtml(ctx.workspaceName)}</strong> on NexusAI.
          As the reviewer you hold the approval authority for pilot recommendations, bound to your own identity.
        </p>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
          Accept the invite below to bind this reviewer seat to your account. You will be asked to sign in first.
        </p>
        <a href="${escapeHtml(ctx.acceptUrl)}" style="display:inline-block;padding:11px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
          Accept reviewer invite
        </a>
        <p style="color:#64748b;font-size:12px;line-height:1.6;margin:24px 0 0 0;">
          This invite is single-use and expires ${escapeHtml(new Date(ctx.expiresAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }))}.
          If you were not expecting this, you can ignore this email and the seat will never be bound to you.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

/**
 * Build an HTML email for a synthesis brief.
 */
export function buildSynthesisBriefHtml(ctx: SynthesisEmailContext): string {
  const confidencePct = (confidence: number) => `${Math.round(confidence * 100)}%`;
  const appName = "NexusAI Mission Control";

  const questionsHtml = ctx.questions
    .slice(0, 5)
    .map(
      (q) => `
    <div style="margin-bottom: 20px; padding: 16px; background: #1e293b; border-radius: 8px;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">
        ${ctx.role} Brief
      </p>
      <p style="color: #e2e8f0; font-size: 15px; font-weight: 600; margin: 0 0 10px 0;">
        ${escapeHtml(q.question)}
      </p>
      <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        ${q.answer}
      </div>
      <div style="margin-top: 12px; font-size: 12px; color: #64748b;">
        Confidence: ${confidencePct(q.confidence)} &middot; Evidence refs: ${q.evidenceCount}
      </div>
    </div>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#0f172a;">
    <tr>
      <td style="padding:32px 24px;">
        <h1 style="color:#e2e8f0;font-size:20px;margin:0 0 8px 0;">${appName}</h1>
        <p style="color:#64748b;font-size:13px;margin:0 0 24px 0;">
          ${escapeHtml(ctx.workspaceName)} &middot; ${escapeHtml(ctx.role)} Brief &middot; ${new Date(ctx.generatedAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        ${questionsHtml}
        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #1e293b;">
          <a href="${escapeHtml(ctx.briefUrl)}" style="display:inline-block;padding:10px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">
            View Full Brief →
          </a>
        </div>
        <p style="color:#475569;font-size:11px;margin:24px 0 0 0;">
          You received this because your workspace has scheduled synthesis briefs enabled.
          <a href="${escapeHtml(appUrl())}/api/email/unsubscribe?token=${encodeURIComponent(ctx.unsubscribeToken)}" style="color:#64748b;">Unsubscribe</a>.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

/** Build an unsubscribe token: base64(workspaceId:email). Not cryptographic — just an opaque id. */
export function buildUnsubscribeToken(workspaceId: string, email: string): string {
  return Buffer.from(`${workspaceId}:${email}`).toString("base64url");
}

/** Decode an unsubscribe token back to [workspaceId, email]. */
export function decodeUnsubscribeToken(token: string): [string, string] | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const idx = decoded.indexOf(":");
    if (idx <= 0) return null;
    return [decoded.slice(0, idx), decoded.slice(idx + 1)];
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
