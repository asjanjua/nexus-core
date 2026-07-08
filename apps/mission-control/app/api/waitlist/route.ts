/**
 * Pro waitlist (migration 0037).
 *
 * GET  /api/waitlist  — has the caller's workspace registered Pro intent?
 * POST /api/waitlist  — record/update Pro intent (email + optional name/note).
 *
 * Launch model: the product is free at launch, pricing is shown, and Pro intent
 * is captured here instead of a Stripe checkout (checkout follows post-launch).
 * Authenticated so intent is tied to a real workspace, not spammable anonymously.
 */

import { randomUUID } from "crypto";
import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { resolveAuth } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { buildProWaitlistEmailHtml, resendConfigured, sendEmail } from "@/lib/email/resend";

export async function GET(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return fail("unauthorized", 401);
  const entry = await repository.getProWaitlistEntry(auth.workspaceId);
  return ok({ joined: Boolean(entry), entry });
}

const joinSchema = z.object({
  email: z.string().email(),
  name: z.string().max(160).optional(),
  note: z.string().max(1200).optional(),
});

export async function POST(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return fail("unauthorized", 401);

  const parsed = joinSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("invalid_request", 400);

  const entry = await repository.addProWaitlistEntry({
    id: `pw_${randomUUID()}`,
    workspaceId: auth.workspaceId,
    email: parsed.data.email,
    name: parsed.data.name ?? null,
    note: parsed.data.note ?? null,
    createdBy: auth.userId,
  });

  void repository.pushAudit({
    workspaceId: auth.workspaceId,
    type: "pro_waitlist.joined",
    actor: auth.userId,
    payload: { email: entry.email },
  }).catch(() => {});

  // Confirm to the joiner and notify ops. Best-effort: never fail the request
  // if email is unconfigured or a send errors — the intent is already recorded.
  let emailSent = false;
  if (resendConfigured()) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || new URL(request.url).origin;
    try {
      await sendEmail({
        to: entry.email,
        subject: "You are on the Nexus Pro waitlist",
        html: buildProWaitlistEmailHtml({ name: entry.name, appUrl: `${appUrl}/pro-waitlist` }),
      });
      emailSent = true;
    } catch {
      /* recorded regardless */
    }
    const ops = process.env.NEXUS_OPS_EMAIL?.trim();
    if (ops) {
      try {
        await sendEmail({
          to: ops,
          subject: `Pro waitlist: ${entry.email}`,
          html: `<p>New Pro-plan intent.</p><ul><li>Email: ${entry.email}</li><li>Name: ${entry.name ?? "—"}</li><li>Workspace: ${entry.workspaceId}</li><li>Note: ${entry.note ?? "—"}</li></ul>`,
        });
      } catch {
        /* best-effort ops notify */
      }
    }
  }

  return ok({ ...entry, emailSent });
}
