import { Suspense } from "react";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { DashboardPanel } from "@/components/dashboard-panel";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { PageShell } from "@/components/page-shell";
import { roleSchema } from "@/lib/contracts";

const PAGE_META: Record<string, { title: string; description: string }> = {
  ceo: {
    title: "CEO Command Brief",
    description: "Strategic priorities, cross-functional risks, and open decisions.",
  },
  coo: {
    title: "COO Execution View",
    description: "Operational health, delivery pipeline status, and execution blockers.",
  },
  cbo: {
    title: "CBO / Strategy",
    description: "Growth opportunities, BD pipeline, and strategic alignment signals.",
  },
  cto: {
    title: "CTO / CDO",
    description: "Technology health, data quality, and security posture.",
  },
};

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) notFound();

  const { orgId, userId } = await auth();
  const workspaceId = orgId ?? userId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";
  const meta = PAGE_META[parsed.data];

  return (
    <PageShell title={meta.title} description={meta.description}>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardPanel role={parsed.data} workspaceId={workspaceId} />
      </Suspense>
    </PageShell>
  );
}
