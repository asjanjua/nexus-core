/**
 * POST /api/board/delta?department=<board-pack-id>
 *
 * Board Intelligence (Quorum): runs a fresh "board" synthesis for the given
 * board pack and diffs it against the last persisted board brief for this
 * workspace. This is the "between-meetings brief" — what changed since the
 * last pack, in risks, open decisions, and financial movements.
 *
 * See lib/services/synthesis.ts synthesiseBoardDelta() for the known
 * limitation on multi-board workspaces.
 */
import { synthesiseBoardDelta } from "@/lib/services/synthesis";
import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "read:dashboard");
  if (error) return error;

  const url = new URL(request.url);
  const department = url.searchParams.get("department") ?? undefined;

  const result = await synthesiseBoardDelta(ctx.workspaceId, department);
  return ok(result, 201);
}
