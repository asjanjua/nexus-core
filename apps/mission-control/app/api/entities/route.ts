import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { entityTypeSchema } from "@/lib/contracts";

const querySchema = z.object({
  type: entityTypeSchema.optional(),
  q: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(250).default(100)
});

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:evidence");
  if (error) return error;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    type: url.searchParams.get("type") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined
  });
  if (!parsed.success) return fail("invalid_query", 400);

  const entities = await repository.listEntities(ctx.workspaceId, {
    type: parsed.data.type,
    query: parsed.data.q,
    limit: parsed.data.limit
  });

  const byType = entities.reduce<Record<string, number>>((acc, entity) => {
    acc[entity.type] = (acc[entity.type] ?? 0) + 1;
    return acc;
  }, {});

  return ok({ entities, total: entities.length, byType });
}
