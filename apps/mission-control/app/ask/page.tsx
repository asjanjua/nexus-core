import { AskPanel } from "@/components/ask-panel";
import { PageShell } from "@/components/page-shell";
import { auth } from "@clerk/nextjs/server";

export default async function AskPage() {
  const { orgId, userId } = await auth();
  const workspaceId = orgId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";

  return (
    <PageShell
      title="Ask"
      description="Workspace-scoped Q&A with evidence references, confidence, freshness, and refusal handling."
    >
      <AskPanel workspaceId={workspaceId} userId={userId ?? "user-demo"} />
    </PageShell>
  );
}
