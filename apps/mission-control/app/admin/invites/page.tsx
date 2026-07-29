import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import TrialInvitePortal from "@/components/trial-invite-portal";
import { PageShell } from "@/components/page-shell";
import { isPlatformAdmin, platformAdminConfigured } from "@/lib/platform-admin";

const RETURN_PATH = "/admin/invites";

/**
 * Keep the staff-only boundary on the route, not just the fetch client.
 * The API repeats the same check because route rendering is never authorization.
 */
export default async function TrialInvitePortalPage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(RETURN_PATH)}`);
  }

  const workspaceId = orgId ?? userId;
  if (!isPlatformAdmin({ workspaceId, userId })) {
    const detail = platformAdminConfigured()
      ? "This workspace is not authorised to issue Pinavia trial invites."
      : "Staff trial-invite access has not been configured for this deployment.";

    return (
      <PageShell title="Trial invites" description="Pinavia staff access only.">
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-5 text-sm text-amber-100">
          <p className="font-medium">Access restricted</p>
          <p className="mt-1 text-amber-100/75">{detail}</p>
        </div>
      </PageShell>
    );
  }

  return <TrialInvitePortal />;
}
