import { PageShell } from "@/components/page-shell";
import { KnowledgeWorkspace } from "@/components/knowledge-workspace";
import { KnowledgeAuditPanel } from "@/components/knowledge-audit-panel";
import { DailyBriefPanel } from "@/components/daily-brief-panel";
import { KnowledgeSynthesisPanel } from "@/components/knowledge-synthesis-panel";

export default function KnowledgePage() {
  return (
    <PageShell
      title="Knowledge Workspace"
      description="Write, link, search, graph, import, export, and sync the governed Nexus vault."
    >
      <KnowledgeWorkspace />
      <DailyBriefPanel />
      <KnowledgeAuditPanel />
      <KnowledgeSynthesisPanel />
    </PageShell>
  );
}
