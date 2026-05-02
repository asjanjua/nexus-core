"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/page-shell";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConnectorRecord = {
  id: string;
  workspaceId: string;
  type: string;
  status: string;
  installedBy: string;
  installedAt: string;
  lastSyncAt?: string;
  syncError?: string;
  config: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Static connector catalogue
// ---------------------------------------------------------------------------

type ConnectorDef = {
  type: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  installHref: string;
  available: boolean;
  lane: "saas" | "warehouse" | "private";
};

const CONNECTOR_CATALOGUE: ConnectorDef[] = [
  {
    type: "slack",
    name: "Slack",
    description: "Ingest messages, threads, and files from your team workspace.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
      </svg>
    ),
    installHref: "/api/connectors/slack/install",
    available: true,
    lane: "saas",
  },
  {
    type: "google-drive",
    name: "Google Drive",
    description: "Pull Docs, Sheets, Slides, and PDFs from shared drives.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M4.433 22.396L0 15.047l4.433-7.676h15.135L24 15.047l-4.432 7.349H4.433zm4.051-14.72L4.05 15.047l4.433 7.349h7.036l4.432-7.349-4.432-7.372H8.484zM12 0l4.432 7.676H7.568L12 0z" />
      </svg>
    ),
    installHref: "/api/connectors/google-drive/install",
    available: false,
    lane: "saas",
  },
  {
    type: "sharepoint",
    name: "SharePoint / Teams",
    description: "Ingest documents and wikis from Microsoft 365 environments.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M11.5 0A5.5 5.5 0 0 0 6 5.5a5.5 5.5 0 0 0 5.5 5.5A5.5 5.5 0 0 0 17 5.5 5.5 5.5 0 0 0 11.5 0zm0 2A3.5 3.5 0 0 1 15 5.5a3.5 3.5 0 0 1-3.5 3.5A3.5 3.5 0 0 1 8 5.5 3.5 3.5 0 0 1 11.5 2zM6.5 12A4.5 4.5 0 0 0 2 16.5V22h2v-5.5A2.5 2.5 0 0 1 6.5 14H13a2.5 2.5 0 0 1 2.5 2.5V22h2v-5.5A4.5 4.5 0 0 0 13 12z" />
      </svg>
    ),
    installHref: "/api/connectors/sharepoint/install",
    available: false,
    lane: "saas",
  },
  {
    type: "snowflake",
    name: "Snowflake",
    description: "Query tables directly via warehouse connector for structured data ingest.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M11 0v3.35L8.5 1.4 7.1 2.8 11 6.64V11H6.64L2.8 7.1 1.4 8.5 3.35 11H0v2h3.35L1.4 15.5l1.4 1.4L6.64 13H11v4.36L7.1 21.2l1.4 1.4 2.5-1.95V24h2v-3.35l2.5 1.95 1.4-1.4L17.36 17H22v-2h-4.64L21.2 10.9l-1.4-1.4-3.8 3.86V9h-2V7.1l3.8-3.86-1.4-1.4L13 3.79V0z" />
      </svg>
    ),
    installHref: "/api/connectors/snowflake/install",
    available: false,
    lane: "warehouse",
  },
  {
    type: "bigquery",
    name: "BigQuery",
    description: "Connect Google BigQuery datasets for analytics data ingestion.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M3.2 4.8L0 12l3.2 7.2h17.6L24 12l-3.2-7.2H3.2zm1.6 2.4h13.6L21.2 12l-2.8 4.8H5.6L2.8 12l2-4.8z" />
      </svg>
    ),
    installHref: "/api/connectors/bigquery/install",
    available: false,
    lane: "warehouse",
  },
  {
    type: "private",
    name: "Private Connector",
    description: "Docker/K8s sidecar for internal databases and proprietary systems.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-7 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 7c2.67 0 8 1.34 8 4v1H4v-1c0-2.66 5.33-4 8-4z" />
      </svg>
    ),
    installHref: "/api/connectors/private/install",
    available: false,
    lane: "private",
  },
];

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "border-green-500/40 bg-green-500/10 text-green-300",
    revoked: "border-red-400/40 bg-red-400/10 text-red-300",
    error: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    pending: "border-white/20 bg-white/5 text-white/40",
  };
  const style = styles[status] ?? styles.pending;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${style}`}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Connector row
// ---------------------------------------------------------------------------

function ConnectorRow({
  def,
  record,
  onRevoke,
  revoking,
}: {
  def: ConnectorDef;
  record?: ConnectorRecord;
  onRevoke: (type: string) => void;
  revoking: string | null;
}) {
  const isActive = record?.status === "active";
  const isRevoked = record?.status === "revoked";
  const isInstalled = !!record && !isRevoked;

  return (
    <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
      {/* Icon */}
      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
          isActive
            ? "border-nexus-accent/30 bg-nexus-accent/10 text-nexus-accent"
            : "border-white/10 bg-white/5 text-white/40",
        ].join(" ")}
      >
        {def.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-white">{def.name}</p>
          {record && <StatusBadge status={record.status} />}
          {!def.available && !record && (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/30">
              Coming soon
            </span>
          )}
        </div>
        <p className="text-xs text-white/50 mt-0.5">{def.description}</p>

        {isActive && record && (
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/40">
            <span>Installed: {new Date(record.installedAt).toLocaleDateString()}</span>
            {typeof record.config?.teamName === "string" && (
              <span>Team: {record.config.teamName}</span>
            )}
            {record.lastSyncAt && (
              <span>Last sync: {new Date(record.lastSyncAt).toLocaleDateString()}</span>
            )}
          </div>
        )}

        {record?.syncError && (
          <p className="mt-1 text-xs text-red-300">{record.syncError}</p>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0">
        {!isInstalled && def.available && (
          <a href={def.installHref} className="btn-primary text-xs">
            Install →
          </a>
        )}
        {isActive && (
          <button
            onClick={() => onRevoke(def.type)}
            disabled={revoking === def.type}
            className="btn-subtle text-xs text-red-300 border-red-400/20 hover:bg-red-400/10"
          >
            {revoking === def.type ? "Revoking..." : "Revoke"}
          </button>
        )}
        {isRevoked && def.available && (
          <a href={def.installHref} className="btn-subtle text-xs">
            Reinstall
          </a>
        )}
        {!def.available && (
          <span className="text-xs text-white/20">—</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lane section
// ---------------------------------------------------------------------------

const LANE_LABELS: Record<ConnectorDef["lane"], string> = {
  saas: "SaaS Connectors",
  warehouse: "Data Warehouse Connectors",
  private: "Private / On-Premises",
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ConnectorsPage() {
  const searchParams = useSearchParams();
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Handle redirect params from OAuth callback
  useEffect(() => {
    const installed = searchParams.get("installed");
    const error = searchParams.get("error");
    if (installed) {
      setToast({ type: "success", message: `${installed} connected successfully.` });
    } else if (error) {
      const messages: Record<string, string> = {
        access_denied: "You declined the Slack install request.",
        invalid_state: "OAuth state mismatch — please try again.",
        token_exchange_failed: "Slack token exchange failed. Check your Slack app credentials.",
        connector_store_failed: "Connector installed but failed to save credentials. Contact support.",
        slack_not_configured: "Slack OAuth is not configured on this instance.",
      };
      setToast({ type: "error", message: messages[error] ?? `Install failed: ${error}` });
    }
  }, [searchParams]);

  const fetchConnectors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/connectors");
      const payload = await res.json();
      if (payload.ok) setConnectors(payload.data.connectors ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  async function handleRevoke(type: string) {
    setRevoking(type);
    try {
      const res = await fetch(`/api/connectors/${type}`, { method: "DELETE" });
      const payload = await res.json();
      if (payload.ok) {
        setToast({ type: "success", message: `${type} connector revoked.` });
        await fetchConnectors();
      } else {
        setToast({ type: "error", message: payload.error ?? "Revoke failed." });
      }
    } finally {
      setRevoking(null);
    }
  }

  // Build record lookup by type
  const recordByType = Object.fromEntries(connectors.map((c) => [c.type, c]));

  // Group catalogue by lane
  const lanes: ConnectorDef["lane"][] = ["saas", "warehouse", "private"];

  return (
    <PageShell title="Connectors" description="Manage data source integrations for your workspace.">
      {/* Toast notification */}
      {toast && (
        <div
          className={[
            "mb-6 flex items-center justify-between rounded-xl border px-4 py-3 text-sm",
            toast.type === "success"
              ? "border-green-500/40 bg-green-500/10 text-green-200"
              : "border-red-400/40 bg-red-400/10 text-red-200",
          ].join(" ")}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-4 text-current opacity-60 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-white/40">Loading connectors...</div>
      ) : (
        <div className="space-y-8">
          {lanes.map((lane) => {
            const defs = CONNECTOR_CATALOGUE.filter((c) => c.lane === lane);
            return (
              <section key={lane}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  {LANE_LABELS[lane]}
                </p>
                <div className="space-y-3">
                  {defs.map((def) => (
                    <ConnectorRow
                      key={def.type}
                      def={def}
                      record={recordByType[def.type]}
                      onRevoke={handleRevoke}
                      revoking={revoking}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Env-var hint for admins */}
      <div className="mt-8 rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-white/40 space-y-1">
        <p className="font-medium text-white/60">To enable Slack:</p>
        <p>Set <code className="text-nexus-accent/70">SLACK_CLIENT_ID</code>, <code className="text-nexus-accent/70">SLACK_CLIENT_SECRET</code>, and <code className="text-nexus-accent/70">NEXT_PUBLIC_APP_URL</code> in your environment, then add your redirect URI to the Slack app manifest.</p>
        <p className="mt-1">Redirect URI: <code className="text-white/50">{"{NEXT_PUBLIC_APP_URL}"}/api/connectors/slack/callback</code></p>
      </div>
    </PageShell>
  );
}
