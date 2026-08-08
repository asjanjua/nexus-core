/**
 * GET  /api/workspace/board-profile
 * PATCH /api/workspace/board-profile
 *
 * Board governance profile for the Quorum product line.
 * Single board per workspace (unique index).
 */

import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export const runtime = "nodejs";

/**
 * Bounds mirror db/schema.ts `boardProfiles` exactly. Where a column is
 * varchar(n), the max here is n; where it is integer, the value must be an
 * integer. Without this the route passed raw body fields straight into the
 * upsert, so a 200-character jurisdiction or a string where an integer belongs
 * reached Postgres, threw, and surfaced as a blanket 500
 * `board_profile_update_failed` — an error that tells the caller nothing about
 * which field was wrong.
 *
 * Values are NOT constrained to an enum. `boardType` and `jurisdiction` are
 * free-text varchars in the schema and the UI renders whatever is stored
 * (`{profile.boardType} board`), so there is no allowed-value list to enforce.
 * Inventing one here would be a product decision made in the wrong place, and
 * would silently break any workspace already holding a value outside it.
 *
 * `.strict()` rejects unknown keys rather than ignoring them. The route already
 * picks fields explicitly, so an unknown key cannot reach the database — but a
 * caller sending `workspaceId` or `id` should be told it was refused, not left
 * believing it took effect.
 */
const boardProfilePatchSchema = z
  .object({
    boardType: z.string().trim().min(1).max(32),
    jurisdiction: z.string().trim().min(1).max(64),
    meetingSchedule: z.string().trim().min(1).max(64).nullable(),
    // A board cannot reach quorum with nobody in the room. The upper bound is
    // a sanity rail, not a governance rule.
    quorumRequirement: z.number().int().min(1).max(1000),
    // Zero notice is legitimate for an emergency board; a year is the rail.
    noticePeriodDays: z.number().int().min(0).max(365),
    chairpersonName: z.string().trim().min(1).max(200).nullable(),
    secretaryName: z.string().trim().min(1).max(200).nullable(),
    // Stored as timestamptz. Accepting an arbitrary string meant `new Date(x)`
    // produced Invalid Date and Postgres rejected the write.
    nextMeetingAt: z.string().datetime({ offset: true }).nullable(),
  })
  .partial()
  .strict();

export async function GET(request: Request) {
  const auth = await requireScope(request, "read:settings");
  if (auth.error) return auth.error;

  try {
    const profile = await repository.getBoardProfile(auth.ctx.workspaceId);
    if (!profile) return fail("board_not_configured", 404);
    return ok(profile);
  } catch (_err) {
    return fail("board_profile_failed", 500);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireScope(request, "write:settings");
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  if (body === null) return fail("invalid_json", 400);

  const parsed = boardProfilePatchSchema.safeParse(body);
  if (!parsed.success) {
    // Name the offending fields. A 400 that does not say which field failed
    // costs the same round trip as the 500 it replaces.
    return fail("invalid_request", 400, {
      fields: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  // PATCH semantics: only the keys actually sent are forwarded. Previously the
  // route built an object containing all eight keys, so any field the caller
  // omitted arrived as `undefined`. That relied on Drizzle skipping undefined
  // in `.set()` to avoid clobbering stored values — correct today, but an
  // implicit dependency on ORM behaviour for something the caller can observe.
  if (Object.keys(parsed.data).length === 0) {
    return fail("no_fields_to_update", 400);
  }

  try {
    const profile = await repository.upsertBoardProfile(auth.ctx.workspaceId, parsed.data);
    return ok(profile);
  } catch (_err) {
    return fail("board_profile_update_failed", 500);
  }
}
