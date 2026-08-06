import { PageShell } from "@/components/page-shell";
import { KnowledgeWorkspace } from "@/components/knowledge-workspace";
import { KnowledgeAuditPanel } from "@/components/knowledge-audit-panel";

export default function KnowledgePage() {
  return (
    <PageShell
      title="Knowledge Workspace"
      description="Write, link, search, graph, import, export, and sync the governed Nexus vault."
    >
      <KnowledgeWorkspace />
      <KnowledgeAuditPanel />
    </PageShell>
  );
}
