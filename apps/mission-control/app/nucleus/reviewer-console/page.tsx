import { PageShell } from "@/components/page-shell";
import { PilotHandoffWorkbench } from "@/components/pilot-handoff-workbench";
import { requireWorkspaceId } from "@/lib/safe-auth";

export default async function NucleusReviewerConsolePage() {
  await requireWorkspaceId("/nucleus/reviewer-console");
  return (
    <PageShell title="Reviewer Console & Client Preview" description="Route a branded deliverable through partner review, preserve source coverage and caveats, then preview what a client may see.">
      <PilotHandoffWorkbench config={{
        product: "Nucleus", accentClass: "border-[#9AA6B8]/45 bg-[#9AA6B8]/15", accentTextClass: "text-[#C8D1DE]", activeStep: 2,
        steps: ["Profile", "Package", "Delivery", "Assurance"], eyebrow: "Controlled client delivery", title: "A polished deliverable still shows what needs review.",
        description: "A partner can shape the client experience, but provenance, reviewer ownership, caveats, and status semantics remain visible.", workbenchTitle: "Partner review queue",
        items: [
          { label: "Client deliverable", detail: "Draft sections need partner-owned conclusions and citation review.", state: "Draft", tone: "draft" },
          { label: "Evidence appendix", detail: "Source links are prepared for the client-facing version.", state: "Ready", tone: "ready" },
          { label: "Commercial data", detail: "An internal or client interview input is still missing.", state: "Request", tone: "blocked" },
          { label: "Trust contract", detail: "Provenance, status meaning, approval boundary, and audit labels stay fixed.", state: "Locked", tone: "review" },
        ],
        actionTitle: "Route the draft for partner review", actionDescription: "Create a review decision that keeps client-facing caveats, source coverage, and the named partner accountable.", actionLabel: "Draft partner decision",
        decisionTitle: "Request Nucleus partner review", decisionRationale: "A Nucleus client deliverable needs named partner review before a client preview or publication step.",
        boundary: "Nucleus can draft and package client work. The advisory firm owns conclusions, approvals, and client-facing advice; fixed trust controls cannot be re-skinned away.",
        inputs: ["draft section", "citation", "partner reviewer", "caveat", "client visibility"],
      }} />
    </PageShell>
  );
}
