import { PageShell } from "@/components/page-shell";
import { repository } from "@/lib/data/repository";
import { safeAuth } from "@/lib/safe-auth";

function BoolBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={[
        "rounded-full border px-2 py-0.5 text-xs",
        enabled
          ? "border-green-400/30 bg-green-400/10 text-green-300"
          : "border-white/15 bg-white/5 text-white/40",
      ].join(" ")}
    >
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

export default async function WorkspaceSettingsPage() {
  const { orgId, userId } = await safeAuth();
  const workspaceId = orgId ?? userId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";
  const settings = await repository.getWorkspaceSettings(workspaceId);

  return (
    <PageShell title="Workspace Settings" description="Workspace identity, policy defaults, and source mapping posture.">
      <section className="panel space-y-4 text-sm text-white/80">
        <div>
          <p className="panel-title">Workspace Identity</p>
          <dl className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <dt className="text-xs uppercase tracking-[0.18em] text-white/35">Name</dt>
              <dd className="mt-1 text-white">{settings.name}</dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <dt className="text-xs uppercase tracking-[0.18em] text-white/35">Workspace ID</dt>
              <dd className="mt-1 break-all font-mono text-xs text-white/70">{workspaceId}</dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <dt className="text-xs uppercase tracking-[0.18em] text-white/35">Timezone</dt>
              <dd className="mt-1 text-white">{settings.timezone}</dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <dt className="text-xs uppercase tracking-[0.18em] text-white/35">Default sensitivity</dt>
              <dd className="mt-1 capitalize text-white">{settings.defaultSensitivity}</dd>
            </div>
          </dl>
        </div>

        <div>
          <p className="panel-title">Policy Defaults</p>
          <dl className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <dt className="text-xs uppercase tracking-[0.18em] text-white/35">Quarantine floor</dt>
              <dd className="mt-1 text-white">{Math.round(settings.quarantineThreshold * 100)}%</dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <dt className="text-xs uppercase tracking-[0.18em] text-white/35">Sensitivity ceiling</dt>
              <dd className="mt-1 capitalize text-white">{settings.sensitivityCeiling}</dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <dt className="text-xs uppercase tracking-[0.18em] text-white/35">Approval threshold</dt>
              <dd className="mt-1 text-white">{Math.round(settings.approvalRequiredThreshold * 100)}%</dd>
            </div>
          </dl>
        </div>

        <div>
          <p className="panel-title">Source Surfaces</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">Mission Control</p>
              <div className="mt-2"><BoolBadge enabled /></div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">Slack</p>
              <div className="mt-2"><BoolBadge enabled={settings.slackEnabled} /></div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">Teams</p>
              <div className="mt-2"><BoolBadge enabled={settings.teamsEnabled} /></div>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
