import { AskPanel } from "@/components/ask-panel";
import { PageShell } from "@/components/page-shell";

export default function AskPage() {
  return (
    <PageShell
      title="Ask"
      description="Workspace-scoped Q&A with evidence references, confidence, freshness, and refusal handling."
    >
      <AskPanel />
    </PageShell>
  );
}
