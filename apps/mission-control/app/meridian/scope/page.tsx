import { PageShell } from "@/components/page-shell";
import { MeridianScopeForm } from "@/components/meridian-scope-form";
import { requireWorkspaceId } from "@/lib/safe-auth";

/** Meridian Scope arc, screen 1. Primary user: compliance lead. */
export default async function MeridianScopePage() {
  await requireWorkspaceId("/meridian/scope");

  return (
    <PageShell
      title="Regulatory Scope"
      description="Choose the jurisdiction, regulator, licence type, and status this workspace is testing. Everything downstream in the submission arc reads its requirement set from here."
    >
      <MeridianScopeForm screen="scope" />
    </PageShell>
  );
}
