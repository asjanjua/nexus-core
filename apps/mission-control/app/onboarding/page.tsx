import { auth } from "@clerk/nextjs/server";
import { OnboardingWizard } from "./wizard";

export default async function OnboardingPage() {
  const { userId, orgId, orgSlug } = await auth();

  // Use orgId as workspaceId (same mapping as the rest of the app)
  const workspaceId = orgId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";
  const displayName = orgSlug ?? orgId ?? "Your Workspace";

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-start justify-center pt-6">
      <OnboardingWizard
        workspaceId={workspaceId}
        displayName={displayName}
        isAuthenticated={!!userId}
      />
    </div>
  );
}
