import { PageShell } from "@/components/page-shell";
import { MeridianScopeForm } from "@/components/meridian-scope-form";
import { requireWorkspaceId } from "@/lib/safe-auth";

/** Meridian Scope arc, screen 2. Primary user: founder or CFO. */
export default async function MeridianLicenseProfilePage() {
  await requireWorkspaceId("/meridian/license-profile");

  return (
    <PageShell
      title="Licence Profile"
      description="Applicant details, ownership posture, directors and sponsors, and the regulated activities in scope. These appear in the submission memo and must match the entity named on the filing."
    >
      <MeridianScopeForm screen="license-profile" />
    </PageShell>
  );
}
