import { PageShell } from "@/components/page-shell";
import { PilotHandoffWorkbench } from "@/components/pilot-handoff-workbench";
import { requireWorkspaceId } from "@/lib/safe-auth";

export default async function MeridianFilingPackPage() {
  await requireWorkspaceId("/meridian/filing-pack");
  return (
    <PageShell title="Filing Pack Review" description="Prepare a reviewer-ready pack from requirement mapping, evidence, caveats, and human attestations. Export and filing stay under named human control.">
      <PilotHandoffWorkbench config={{
        product: "Meridian", accentClass: "border-[#3E7BFA]/45 bg-[#3E7BFA]/15", accentTextClass: "text-[#8FB5FF]", activeStep: 3,
        steps: ["Scope", "Evidence", "Gaps", "Filing"], eyebrow: "Reviewer-ready pack", title: "A filing pack is prepared, never automatically filed.",
        description: "The pack is only ready for reviewer consideration once requirement coverage, caveats, and attestations are visible together.", workbenchTitle: "Submission pack completeness",
        items: [
          { label: "Requirement matrix", detail: "Selected requirements and evidence links are prepared for reviewer inspection.", state: "Ready", tone: "ready" },
          { label: "Evidence index", detail: "Citations must stay traceable to the approved evidence source.", state: "Ready", tone: "ready" },
          { label: "Caveat register", detail: "Unresolved legal, evidence-quality, or management-confirmation caveats block readiness.", state: "Blocked", tone: "blocked" },
          { label: "Submission memo", detail: "Draft narrative requires qualified reviewer edits and sign-off.", state: "Draft", tone: "draft" },
        ],
        actionTitle: "Route the pack to the qualified reviewer", actionDescription: "Create a decision draft that names the reviewer and puts caveats before any export or external submission step.", actionLabel: "Draft review decision",
        decisionTitle: "Request Meridian filing-pack review", decisionRationale: "A Meridian filing pack needs qualified human review before it can be exported or used for an external submission.",
        boundary: "Meridian may prepare and organize a pack. It must not file, submit, certify, sign, or represent a conclusion to a regulator.",
        inputs: ["memo section", "evidence index", "caveat", "attestation", "qualified reviewer"],
      }} />
    </PageShell>
  );
}
