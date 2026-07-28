import { PageShell } from "@/components/page-shell";
import { PilotHandoffWorkbench } from "@/components/pilot-handoff-workbench";
import { requireWorkspaceId } from "@/lib/safe-auth";

export default async function QuorumMinutesDraftPage() {
  await requireWorkspaceId("/board/minutes/draft");
  return (
    <PageShell title="Minutes & Action Register" description="Prepare a reviewable draft from the agenda, attendance, conflict record, resolutions, and actions. The chair and secretary retain control of the official record.">
      <PilotHandoffWorkbench config={{
        product: "Quorum", accentClass: "border-[#C0A062]/45 bg-[#C0A062]/15", accentTextClass: "text-[#E2C887]", activeStep: 3,
        steps: ["Setup", "Pack", "Meeting", "Record"], eyebrow: "Board record", title: "Minutes become a reviewable record.",
        description: "Keep quorum, conflicts, draft resolutions, and management actions together so a named chair and secretary can review the record properly.", workbenchTitle: "Minutes and actions",
        items: [
          { label: "Attendance and quorum", detail: "Record attendance, apologies, quorum, and any attendance limitation by item.", state: "Recorded", tone: "ready" },
          { label: "Conflict declaration", detail: "Keep item-level conflicts and recusals visible in the minutes draft.", state: "Visible", tone: "warning" },
          { label: "Resolution draft", detail: "Resolution wording must be checked against the board pack and actual meeting outcome.", state: "Review", tone: "draft" },
          { label: "Management action", detail: "Every action needs an accountable human owner and due date.", state: "Owner needed", tone: "blocked" },
        ],
        actionTitle: "Route minutes for chair review", actionDescription: "Create a decision draft so the chair or secretary can review the record against the meeting materials before making it official.", actionLabel: "Draft minutes decision",
        decisionTitle: "Request Quorum minutes review", decisionRationale: "A Quorum minutes draft needs chair or secretary review before it can become an official governance record.",
        boundary: "Quorum can prepare governance records but cannot approve, sign, send, file, or make a board record final automatically.",
        inputs: ["discussion note", "motion", "vote or consensus", "action owner", "chair or secretary"],
      }} />
    </PageShell>
  );
}
