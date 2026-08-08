import { PageShell } from "@/components/page-shell";
import { NucleusEngagementIntake } from "@/components/nucleus-engagement-intake";
import { requireWorkspaceId } from "@/lib/safe-auth";

export const metadata = { title: "Engagement Intake | Nucleus" };

/** Nucleus Package arc, screen 1. Primary user: engagement partner. */
export default async function NucleusEngagementIntakePage() {
  await requireWorkspaceId("/nucleus/engagement-intake");
  return (
    <PageShell
      title="Engagement Intake"
      description="Scope a client assignment under the firm's methodology. No billing or rates live here — Nucleus is not the firm's practice management system."
    >
      <NucleusEngagementIntake />
    </PageShell>
  );
}
