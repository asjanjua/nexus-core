import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { repository } from "@/lib/data/repository";
import { isPlatformAdmin, platformAdminConfigured } from "@/lib/platform-admin";

import { AdminRevenueDashboard } from "@/components/admin-revenue-dashboard";
import { AdminHealthWidget } from "@/components/admin-health-widget";

const RETURN_PATH = "/admin";

type ControlCard = {
  title: string;
  description: string;
  href: string;
  external?: boolean;
  status: string;
};

function configured(value: string | undefined) {
  return Boolean(value?.trim());
}

/**
 * Pinavia-only operational control point. It deliberately exposes capability
 * state rather than secret values: staff can see what needs attention without
 * making credentials, customer data, or platform-wide destructive actions a
 * browser surface.
 */
export default async function PinaviaControlPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent(RETURN_PATH)}`);

  const workspaceId = orgId ?? userId;
  if (!isPlatformAdmin({ workspaceId, userId })) {
    const detail = platformAdminConfigured()
      ? "This workspace is not authorised for Pinavia operational controls."
      : "Pinavia staff access has not been configured for this deployment.";
    return (
      <PageShell title="Pinavia Control" description="Staff-only operational controls.">
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-5 text-sm text-amber-100">
          <p className="font-medium">Access restricted</p>
          <p className="mt-1 text-amber-100/75">{detail}</p>
        </div>
      </PageShell>
    );
  }

  const database = await repository.healthCheck();
  const llmProvider = (process.env.NEXUS_LLM_PROVIDER ?? "anthropic").trim().toLowerCase();
  const llmConfigured = llmProvider === "deepseek"
    ? configured(process.env.DEEPSEEK_API_KEY)
    : llmProvider === "openai_compatible"
      ? configured(process.env.OPENAI_COMPAT_API_KEY) || configured(process.env.DEEPSEEK_API_KEY)
      : configured(process.env.ANTHROPIC_API_KEY);
  const vectorEnabled = process.env.NEXUS_VECTOR_SEARCH === "enabled";
  const vectorsConfigured = !vectorEnabled || configured(process.env.OPENAI_API_KEY);

  const controls: ControlCard[] = [
    { title: "Trial invites", description: "Issue, review, and revoke the bounded pilot-access links.", href: "/admin/invites", status: "staff gated" },
    { title: "Service health", description: `Database ${database.ok ? "healthy" : "needs attention"}; LLM route ${llmConfigured ? "configured" : "not configured"}; vectors ${vectorsConfigured ? "ready" : "need an embedding key"}.`, href: "/api/health", status: database.ok && llmConfigured && vectorsConfigured ? "healthy" : "attention" },
    { title: "AI routing", description: `Current provider: ${llmProvider}. Configure provider keys, model, rate limits, and budgets in Render; keys are never displayed here.`, href: "https://dashboard.render.com/web/srv-d8bv48jtqb8s73a95gg0/env", external: true, status: llmConfigured ? "configured" : "attention" },
    { title: "Render service", description: "Review deployments, logs, environment status, jobs, and operational health.", href: "https://dashboard.render.com/web/srv-d8bv48jtqb8s73a95gg0", external: true, status: "operator link" },
    { title: "Clerk identity", description: "Manage identity providers, domains, API keys, and staff identities. Do not add customers to the platform-admin allowlist.", href: "https://dashboard.clerk.com/apps/app_3DAWencqoOCJ0kcNWkJV2YjTLPl/instances/ins_3G8ItwAsKtd6PnVNpsPYi4VVt8O", external: true, status: "operator link" },
    { title: "Pilot paperwork", description: "Generate only evidence-bound pilot materials. Commercial terms remain pending the signed SOW.", href: "/pilot/paperwork", status: "evidence bound" },
    { title: "Quorum proof", description: "Run a controlled governance review only after named roles, permitted source material, and retention rules are recorded.", href: "/board", status: "authority required" },
  ];

  return (
    <PageShell title="Pinavia Control" description="One staff-only operational control point. Health signals and links are safe to view; credentials remain dashboard-managed and customer authority stays scoped.">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <AdminRevenueDashboard />
          </div>
          <AdminHealthWidget />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {controls.map((control) => (
          <a key={control.title} href={control.href} target={control.external ? "_blank" : undefined} rel={control.external ? "noreferrer" : undefined} className="rounded-lg border border-white/10 bg-white/[0.035] p-5 transition hover:border-nexus-accent/50 hover:bg-white/[0.06]">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-medium text-white">{control.title}</h2>
              <span className="rounded border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wide text-white/50">{control.status}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/60">{control.description}</p>
            <p className="mt-4 text-sm font-medium text-nexus-accent">Open {control.external ? "dashboard" : "control"} →</p>
          </a>
        ))}
      </div>
      </div>
    </PageShell>
  );
}
