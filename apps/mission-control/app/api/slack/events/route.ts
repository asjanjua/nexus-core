import crypto from "crypto";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { handleSlackAsk } from "@/lib/slack/adapter";

export const runtime = "nodejs";

const eventSchema = z.object({
  type: z.string(),
  challenge: z.string().optional(),
  event: z
    .object({
      type: z.string().optional(),
      user: z.string().optional(),
      text: z.string().optional(),
      thread_ts: z.string().optional(),
      channel: z.string().optional()
    })
    .optional()
});

/**
 * Verify Slack request signature per
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
async function verifySlackSignature(request: Request, rawBody: string): Promise<boolean> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    // No secret configured — allow in dev, block in production
    return process.env.NODE_ENV !== "production";
  }

  const timestamp = request.headers.get("x-slack-request-timestamp");
  const slackSig = request.headers.get("x-slack-signature");
  if (!timestamp || !slackSig) return false;

  // Reject requests older than 5 minutes to prevent replay attacks
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (age > 300) return false;

  const baseString = `v0:${timestamp}:${rawBody}`;
  const computed =
    "v0=" +
    crypto
      .createHmac("sha256", signingSecret)
      .update(baseString)
      .digest("hex");

  // Timing-safe comparison
  const left = Buffer.from(computed, "utf-8");
  const right = Buffer.from(slackSig, "utf-8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  const isValid = await verifySlackSignature(request, rawBody);
  if (!isValid) return fail("invalid_slack_signature", 401);

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return fail("invalid_slack_payload", 400);
  }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_slack_payload", 400);

  // Slack URL verification handshake
  if (parsed.data.type === "url_verification" && parsed.data.challenge) {
    return ok({ challenge: parsed.data.challenge });
  }

  const text = parsed.data.event?.text?.trim();
  if (!text) return ok({ accepted: true, ignored: "missing_text" });

  const response = await handleSlackAsk({
    workspaceId: process.env.NEXUS_SLACK_WORKSPACE ?? "workspace-demo",
    userId: parsed.data.event?.user ?? "slack-user",
    threadId: parsed.data.event?.thread_ts ?? parsed.data.event?.channel ?? "unknown-thread",
    text
  });

  return ok(response);
}
