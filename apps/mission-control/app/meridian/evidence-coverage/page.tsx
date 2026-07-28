import { PageShell } from "@/components/page-shell";
import { PilotHandoffWorkbench } from "@/components/pilot-handoff-workbench";
import { requireWorkspaceId } from "@/lib/safe-auth";

export default async function MeridianEvidenceCoveragePage() {
  await requireWorkspaceId("/meridian/evidence-coverage");
  return (
    <PageShell title="Evidence Coverage & Gap Review" description="Review requirement evidence before filing preparation. Meridian maps context and routes human follow-up; it does not determine compliance or submit anything.">
      <PilotHandoffWorkbench config={{
        product: "Meridian", accentClass: "border-[#3E7BFA]/45 bg-[#3E7BFA]/15", accentTextClass: "text-[#8FB5FF]", activeStep: 1,
        steps: ["Scope", "Evidence", "Gaps", "Filing"], eyebrow: "Requirement coverage", title: "Evidence coverage becomes owned, reviewable gaps.",
        description: "Use the current requirement pack, approved evidence sources, and a qualified reviewer before a filing narrative is trusted.", workbenchTitle: "Requirement coverage workbench",
        items: [
          { label: "Capital adequacy statement", detail: "Map the approved policy and effective date to the selected requirement.", state: "Matched", tone: "ready" },
          { label: "Director fit-and-proper record", detail: "No approved source has been attached to the selected requirement.", state: "Missing", tone: "blocked" },
          { label: "AML procedure", detail: "Existing source needs an effective-date review before it can support the pack.", state: "Stale", tone: "warning" },
          { label: "Customer funds safeguard", detail: "Evidence is present, but source quality still needs specialist confirmation.", state: "Review", tone: "review" },
        ],
        actionTitle: "Assign the critical evidence request", actionDescription: "Create a human-owned follow-up with the requirement context and reviewer note attached.", actionLabel: "Draft evidence decision",
        decisionTitle: "Resolve Meridian critical evidence gap", decisionRationale: "A Meridian evidence review identified an item that needs named ownership before the filing pack can proceed.",
        boundary: "Meridian can organize requirements, evidence, and caveats. It cannot determine legal compliance, certify readiness, submit, sign, or file.",
        inputs: ["requirement pack", "approved evidence link", "owner", "target date", "specialist note"],
      }} />
    </PageShell>
  );
}
