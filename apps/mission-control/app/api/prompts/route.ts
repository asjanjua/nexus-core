/**
 * GET /api/prompts — read-only prompt manifest.
 *
 * Deliberately CUSTOMER-FACING. The Prompts tab in /settings renders this so a
 * client can see which prompts drive the AI, at what version, owned by whom,
 * with what changelog. Template bodies are stripped from the response; this is
 * for versioning, ownership and regression control, not prompt disclosure.
 * That transparency is a governance feature for regulated buyers, so this is
 * correctly NOT gated behind requirePlatformAdmin — unlike the /api/admin/*
 * routes, nothing here describes the platform's own commercial position.
 *
 * The response is built from the in-memory, code-defined registry. It does not
 * read the database and must not write to it — see below.
 */
import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { listPromptRegistry } from "@/lib/prompts/registry";

export async function GET(request: Request) {
  const { error } = await requireScope(request, "admin");
  if (error) return error;

  // NO syncPromptRegistry() HERE.
  //
  // This handler used to call it, which made a plain GET perform a
  // platform-wide `upsertPromptRegistry` on the shared prompt_registry table.
  // Every customer admin opening the Prompts tab wrote to it, so tenant page
  // traffic drove writes to a table none of them own — and a GET that mutates
  // state is a free write-amplification lever for anyone with a session.
  //
  // The call was also pointless. The response below comes from the in-memory
  // registry, not the table, so the sync never affected what a caller sees, and
  // `repository.listPromptRegistry()` — the only reader of that table — is not
  // called anywhere in the codebase. The write fed nothing.
  //
  // syncPromptRegistry() is still exported and still correct. If the table is
  // ever actually consumed, call it from a deploy step or an explicit admin
  // POST. Not from a page load.
  return ok({
    prompts: listPromptRegistry().map(({ template: _template, ...entry }) => entry)
  });
}
