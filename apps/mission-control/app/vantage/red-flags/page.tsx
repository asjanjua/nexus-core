import { PageShell } from "@/components/page-shell";
import { PilotHandoffWorkbench } from "@/components/pilot-handoff-workbench";
import { requireWorkspaceId } from "@/lib/safe-auth";

export default async function VantageRedFlagsPage() {
  await requireWorkspaceId("/vantage/red-flags");
  return (
    <PageShell title="Red Flags & IC Handoff" description="Separate missing proof from material risk, capture advisor judgment, and frame the investment committee question without making an investment decision.">
      <PilotHandoffWorkbench config={{
        product: "Vantage", accentClass: "border-[#D9834A]/45 bg-[#D9834A]/15", accentTextClass: "text-[#F1B084]", activeStep: 2,
        steps: ["Deal room", "Coverage", "Red flags", "IC memo"], eyebrow: "Diligence judgment", title: "Distinguish missing proof from material risk.",
        description: "Use evidence, materiality, mitigation, and named advisor judgment to prepare the question the investment committee must decide.", workbenchTitle: "Red flag workbench",
        items: [
          { label: "Revenue concentration", detail: "Assess the cited customer concentration and required commercial mitigation.", state: "Escalate", tone: "blocked" },
          { label: "Data residency", detail: "Request the signed processor or data-transfer schedule from the deal room owner.", state: "Request", tone: "warning" },
          { label: "Working capital", detail: "Quantify the missing forecast period before treating it as a decision-useful conclusion.", state: "Review", tone: "review" },
          { label: "Advisor posture", detail: "Record the named advisor's caveat and mitigation view before preparing the IC memo.", state: "Draft", tone: "draft" },
        ],
        actionTitle: "Frame the IC approval question", actionDescription: "Create a human-owned decision draft with evidence, mitigations, and the unresolved point presented to the committee.", actionLabel: "Draft IC decision",
        decisionTitle: "Frame Vantage IC approval question", decisionRationale: "A Vantage diligence review needs an investment-committee question that is grounded in cited evidence and named advisor judgment.",
        boundary: "Vantage can organize evidence, surface risk, and draft IC material. It must not mark a deal approved, investable, or rejected on behalf of an advisor or committee.",
        inputs: ["red flag", "materiality", "citation", "mitigation", "advisor judgment"],
      }} />
    </PageShell>
  );
}
