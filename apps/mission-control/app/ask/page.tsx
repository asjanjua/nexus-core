import { AskPanel } from "@/components/ask-panel";
import { PageShell } from "@/components/page-shell";
import { requireWorkspaceId, safeAuth } from "@/lib/safe-auth";
import { repository } from "@/lib/data/repository";

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const workspaceId = await requireWorkspaceId("/ask");
  const { userId } = await safeAuth();

  const allRows = await repository.getEvidenceForWorkspace(workspaceId);
  const departments = Array.from(
    new Set(allRows.map((row) => row.department).filter((d): d is string => Boolean(d)))
  ).sort();

  return (
    <PageShell
      title="Ask"
      description="Ask questions about your business. NexusAI answers using your approved documents and data."
    >
      <AskPanel
        workspaceId={workspaceId}
        userId={userId ?? "user-demo"}
        departments={departments}
        initialQuery={params.q ?? ""}
      />
    </PageShell>
  );
}
