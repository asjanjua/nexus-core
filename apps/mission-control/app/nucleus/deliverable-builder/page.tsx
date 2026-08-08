import { PageShell } from "@/components/page-shell";
import { NucleusDeliverableBuilder } from "@/components/nucleus-deliverable-builder";
import { requireWorkspaceId } from "@/lib/safe-auth";

export const metadata = { title: "Deliverable Builder | Nucleus" };

/** Nucleus Delivery arc, screen 2. Primary user: engagement manager. */
export default async function NucleusDeliverableBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ engagement?: string }>;
}) {
  await requireWorkspaceId("/nucleus/deliverable-builder");
  const { engagement } = await searchParams;
  return (
    <PageShell
      title="Deliverable Builder"
      description="Prepare what a client will see, with its disclosure attached. Drafts may be incomplete; release may not, and this screen says exactly what is still missing."
    >
      <NucleusDeliverableBuilder initialEngagementId={engagement} />
    </PageShell>
  );
}
