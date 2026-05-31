import { Suspense } from "react";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { DashboardPanel } from "@/components/dashboard-panel";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { PageShell } from "@/components/page-shell";
import { roleSchema } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { labelForRole } from "@/lib/domain/role-registry";
import { roomForRole } from "@/lib/agents/agent-library";

const PAGE_META: Record<string, { title: string; description: string }> = {
  ceo: {
    title: "Executive Command Room",
    description: "Strategy, risk, decisions, and executive attention from specialist agent briefs.",
  },
  coo: {
    title: "Operating Room",
    description: "Execution, process, blockers, owners, and operating cadence from specialist agent briefs.",
  },
  cbo: {
    title: "Growth Room",
    description: "Market, pipeline, partnerships, proposals, and strategic alignment from specialist agent briefs.",
  },
  cto: {
    title: "Technology and Data Room",
    description: "Technology health, data quality, security, architecture, and AI governance from specialist agent briefs.",
  },
};

function titleForCustomRole(role: string): string {
  return role
    .split(/[_:-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ department?: string; agent?: string }>;
}) {
  const { role } = await params;
  const { department, agent } = await searchParams;
  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) notFound();

  const { orgId, userId } = await auth();
  const workspaceId = orgId ?? userId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";
  const profile = await repository.getWorkspaceProfile(workspaceId).catch(() => null);
  const archetype = profile?.companyArchetype ?? null;
  const room = roomForRole(parsed.data);
  const meta =
    archetype === "sme_physical"
      ? {
          title: `${labelForRole(parsed.data, archetype)} Brief`,
          description: "Plain-language owner brief from specialist agents using your approved evidence only.",
        }
      : PAGE_META[parsed.data] ?? {
          title: room?.label ?? `${titleForCustomRole(parsed.data)} Room`,
          description: room?.description ?? "Specialist agent briefs using the best available governed evidence for this role.",
        };

  return (
    <PageShell title={meta.title} description={meta.description}>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardPanel role={parsed.data} workspaceId={workspaceId} department={department} agentId={agent} />
      </Suspense>
    </PageShell>
  );
}
