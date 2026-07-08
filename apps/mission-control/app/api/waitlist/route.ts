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

  return ok(entry);
}
