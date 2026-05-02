import { PageShell } from "@/components/page-shell";

export default function WorkspaceSettingsPage() {
  return (
    <PageShell title="Workspace Settings" description="Tenant/workspace identity and source mapping policy.">
      <section className="panel text-sm text-white/80">
        <p>workspace: workspace-demo</p>
        <p>tenant: tenant-demo</p>
        <p>default surfaces: Mission Control, Slack</p>
        <p>source bundles: Google Drive, Slack threads, uploads</p>
      </section>
    </PageShell>
  );
}

