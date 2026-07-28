import { PageShell } from "@/components/page-shell";
import { NucleusFirmProfile } from "@/components/nucleus-firm-profile";
import { requireWorkspaceId } from "@/lib/safe-auth";

/** Nucleus profile arc, screen 1. Primary user: managing partner. */
export default async function NucleusFirmProfilePage() {
  await requireWorkspaceId("/nucleus/profile");

  return (
    <PageShell
      title="Firm Profile & Brand"
      description="Set the partner-facing identity for a Nucleus workspace. Brand can change; evidence provenance, status meaning, and human authority remain fixed."
    >
      <NucleusFirmProfile />
    </PageShell>
  );
}
