import { requireWorkspaceId } from "@/lib/safe-auth";
import { PageShell } from "@/components/page-shell";
import { GovernanceTraceGraph } from "@/components/governance-trace-graph";

export default async function GovernanceTracePage() {
  await requireWorkspaceId("/governance/trace");
  return (
    <PageShell
      title="Governance Trace"
      description="How a recent brief was produced: evidence, the specialist agent that read it, any governance check raised, and the decision, action, or recommendation it led to."
    >
      <GovernanceTraceGraph />
    </PageShell>
  );
}
