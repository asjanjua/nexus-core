import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireScope(request, "read:settings");
  if (auth.error) return auth.error;

  try {
    const seats = await repository.getAcceptedReviewerSeats(auth.ctx.workspaceId);
    const members = seats.map((s) => ({
      id: s.id,
      email: s.email,
      name: s.name,
      clerkUserId: s.clerkUserId,
      memberRole: s.memberRole ?? "reviewer",
      acceptedAt: s.acceptedAt,
      approvalRole: s.role,
      departmentAccess: s.departmentAccess ?? [],
      sensitivityCeiling: s.sensitivityCeiling ?? null,
    }));
    return ok(members);
  } catch (_err) {
    return fail("list_members_failed", 500);
  }
}
