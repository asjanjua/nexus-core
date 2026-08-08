import { PageShell } from "@/components/page-shell";
import { NucleusClientRelease } from "@/components/nucleus-client-release";
import { requireWorkspaceId } from "@/lib/safe-auth";

export const metadata = { title: "Operating Pack Publish | Nucleus" };

/**
 * Nucleus Assurance arc, screen 2. Primary user: engagement partner.
 *
 * The enforcement shipped before the screen: /api/nucleus/client-release
 * already refuses to release client output that hides provenance, caveats,
 * reviewer identity or the audit label, and already requires a named partner
 * plus the full disclosure triple. There was no way to exercise any of that
 * from the product, so the guarantee Nucleus is sold on could be described but
 * not demonstrated.
 */
export default async function NucleusPublishPage() {
  await requireWorkspaceId("/nucleus/publish");

  return (
    <PageShell
      title="Operating Pack Publish"
      description="Release a deliverable under the firm's brand. The brand layer is yours to change; provenance, caveats, reviewer identity and the audit label are not, and the release is refused if you ask to hide them."
    >
      <NucleusClientRelease />
    </PageShell>
  );
}
