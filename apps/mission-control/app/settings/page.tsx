/**
 * Main Settings page — replaces the stub pages that existed before.
 * Client component with tab navigation across:
 *   Workspace | LLM Provider | Sources | Policies | API Keys | Roles
 */
"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/page-shell";

// ---------------------------------------------------------------------------
// Types (mirrored from contracts for client-side use)
// ---------------------------------------------------------------------------

type WorkspaceSettings = {
  workspaceId: string;
  name: string;
  timezone: string;
  llmProvider: "anthropic" | "openai" | "azure_openai";
  llmModel: string;
  quarantineThreshold: number;
  defaultSensitivity: string;
  slackEnabled: boolean;
  teamsEnabled: boolean;
  updatedAt: string;
};

type AgentKey = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  active: boolean;
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
};

type NewKeyResult = AgentKey & { secret: string };

const TABS = [
  { id: "workspace", label: "Workspace" },
  { id: "llm", label: "LLM Provider" },
  { id: "sources", label: "Sources" },
  { id: "policies", label: "Policies" },
  { id: "apikeys", label: "API Keys" },
  { id: "roles", label: "Roles" }
] as const;

type TabId = (typeof TABS)[number]["id"];

const SCOPE_OPTIONS = [
  { value: "read:dashboard", label: "Read dashboards" },
  { value: "read:evidence", label: "Read evidence" },
  { value: "read:recommendations", label: "Read recommendations" },
  { value: "write:ingest", label: "Ingest documents" },
  { value: "write:approvals", label: "Approve recommendations" },
  { value: "admin", label: "Full admin access" }
];

// ---------------------------------------------------------------------------
// Workspace tab
// ---------------------------------------------------------------------------

function WorkspaceTab({ workspaceId }: { workspaceId: string }) {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/settings/workspace?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((j) => j.ok && setSettings(j.data));
  }, [workspaceId]);

  if (!settings) return <p className="text-white/50 text-sm">Loading...</p>;

  async function save() {
    setSaving(true);
    await fetch("/api/settings/workspace", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, name: settings!.name, timezone: settings!.timezone })
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <label className="label">Workspace Name</label>
        <input
          className="input"
          value={settings.name}
          onChange={(e) => setSettings({ ...settings, name: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Timezone</label>
        <select
          className="input"
          value={settings.timezone}
          onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
        >
          {["UTC", "Asia/Riyadh", "Asia/Dubai", "Asia/Karachi", "Europe/London", "America/New_York"].map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Workspace ID</label>
        <p className="text-white/50 text-xs font-mono mt-1">{settings.workspaceId}</p>
      </div>
      <div>
        <label className="label">Last Updated</label>
        <p className="text-white/50 text-xs mt-1">{new Date(settings.updatedAt).toLocaleString()}</p>
      </div>
      <button className="btn-primary" onClick={save} disabled={saving}>
        {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LLM Provider tab
// ---------------------------------------------------------------------------

function LLMTab({ workspaceId }: { workspaceId: string }) {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/settings/workspace?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((j) => j.ok && setSettings(j.data));
  }, [workspaceId]);

  if (!settings) return <p className="text-white/50 text-sm">Loading...</p>;

  const modelOptions: Record<string, string[]> = {
    anthropic: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
    openai: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
    azure_openai: ["gpt-4o", "gpt-4-turbo"]
  };

  async function save() {
    setSaving(true);
    await fetch("/api/settings/workspace", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        llmProvider: settings!.llmProvider,
        llmModel: settings!.llmModel
      })
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div className="panel text-sm text-white/70">
        Set the AI provider and model used for dashboard synthesis and Ask queries.
        Switching providers requires the corresponding API key to be set as an environment variable.
      </div>
      <div>
        <label className="label">Provider</label>
        <select
          className="input"
          value={settings.llmProvider}
          onChange={(e) =>
            setSettings({
              ...settings,
              llmProvider: e.target.value as WorkspaceSettings["llmProvider"],
              llmModel: modelOptions[e.target.value][0]
            })
          }
        >
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="openai">OpenAI (GPT)</option>
          <option value="azure_openai">Azure OpenAI</option>
        </select>
      </div>
      <div>
        <label className="label">Model</label>
        <select
          className="input"
          value={settings.llmModel}
          onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
        >
          {(modelOptions[settings.llmProvider] ?? []).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Environment Variable Required</label>
        <p className="text-white/50 text-xs font-mono mt-1">
          {settings.llmProvider === "anthropic" && "ANTHROPIC_API_KEY"}
          {settings.llmProvider === "openai" && "OPENAI_API_KEY"}
          {settings.llmProvider === "azure_openai" && "AZURE_OPENAI_API_KEY + AZURE_OPENAI_ENDPOINT"}
        </p>
      </div>
      <button className="btn-primary" onClick={save} disabled={saving}>
        {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sources tab
// ---------------------------------------------------------------------------

function SourcesTab() {
  const connectors = [
    { name: "Google Drive", status: "configured", icon: "G" },
    { name: "Slack", status: "configured", icon: "S" },
    { name: "Microsoft Teams", status: "deferred", icon: "T" },
    { name: "SharePoint", status: "deferred", icon: "SP" },
    { name: "Confluence", status: "deferred", icon: "C" },
    { name: "Notion", status: "deferred", icon: "N" }
  ];

  return (
    <div className="space-y-4 max-w-lg">
      <div className="panel text-sm text-white/70">
        Connector status for v1 pilot. Docs and Comms connectors are active.
        Additional connectors are on the roadmap.
      </div>
      {connectors.map((c) => (
        <div key={c.name} className="panel flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
            {c.icon}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{c.name}</p>
          </div>
          <span
            className={`badge ${c.status === "configured" ? "badge-green" : "badge-muted"}`}
          >
            {c.status}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Policies tab
// ---------------------------------------------------------------------------

function PoliciesTab({ workspaceId }: { workspaceId: string }) {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/settings/workspace?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((j) => j.ok && setSettings(j.data));
  }, [workspaceId]);

  if (!settings) return <p className="text-white/50 text-sm">Loading...</p>;

  async function save() {
    setSaving(true);
    await fetch("/api/settings/workspace", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        quarantineThreshold: settings!.quarantineThreshold,
        defaultSensitivity: settings!.defaultSensitivity
      })
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div className="panel text-sm text-white/70">
        Ingestion and sensitivity policies. Evidence below the quarantine threshold
        is excluded from all executive outputs.
      </div>
      <div>
        <label className="label">Quarantine Threshold</label>
        <p className="text-white/50 text-xs mb-2">
          Evidence with extraction confidence below this value is quarantined.
          Current: {Math.round(settings.quarantineThreshold * 100)}%
        </p>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(settings.quarantineThreshold * 100)}
          onChange={(e) =>
            setSettings({ ...settings, quarantineThreshold: Number(e.target.value) / 100 })
          }
          className="w-full accent-blue-400"
        />
        <div className="flex justify-between text-xs text-white/40 mt-1">
          <span>0% (accept all)</span>
          <span>100% (quarantine all)</span>
        </div>
      </div>
      <div>
        <label className="label">Default Upload Sensitivity</label>
        <select
          className="input"
          value={settings.defaultSensitivity}
          onChange={(e) => setSettings({ ...settings, defaultSensitivity: e.target.value })}
        >
          <option value="public">Public</option>
          <option value="internal">Internal</option>
          <option value="confidential">Confidential</option>
          <option value="restricted">Restricted</option>
        </select>
      </div>
      <div>
        <label className="label">Slack Integration</label>
        <label className="flex items-center gap-2 mt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.slackEnabled}
            onChange={(e) => setSettings({ ...settings, slackEnabled: e.target.checked })}
          />
          <span className="text-sm">Enable Slack event listener</span>
        </label>
      </div>
      <button className="btn-primary" onClick={save} disabled={saving}>
        {saving ? "Saving..." : saved ? "Saved" : "Save Policies"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// API Keys tab
// ---------------------------------------------------------------------------

function APIKeysTab({ workspaceId }: { workspaceId: string }) {
  const [keys, setKeys] = useState<AgentKey[]>([]);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState<string[]>(["read:dashboard", "read:evidence"]);
  const [creating, setCreating] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<NewKeyResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/agent-keys?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((j) => j.ok && setKeys(j.data));
  }, [workspaceId]);

  function toggleScope(scope: string) {
    setNewScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  async function createKey() {
    if (!newName.trim() || !newScopes.length) return;
    setCreating(true);
    const res = await fetch("/api/agent-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, name: newName.trim(), scopes: newScopes })
    });
    const json = await res.json();
    if (json.ok) {
      setNewKeyResult(json.data);
      setKeys((prev) => [json.data, ...prev]);
      setNewName("");
    }
    setCreating(false);
  }

  async function revokeKey(id: string) {
    await fetch(`/api/agent-keys/${id}`, { method: "DELETE" });
    setKeys((prev) => prev.map((k) => k.id === id ? { ...k, active: false } : k));
  }

  function copySecret() {
    if (newKeyResult?.secret) {
      navigator.clipboard.writeText(newKeyResult.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="panel text-sm text-white/70">
        API keys allow external agents (Codex, Claude tools, custom scripts) to authenticate
        against NexusAI using OAuth2 client credentials or direct Bearer tokens.
        The secret is shown only once on creation.
      </div>

      {newKeyResult && (
        <div className="panel border border-yellow-500/40 bg-yellow-500/5">
          <p className="text-sm font-medium text-yellow-300 mb-2">New key created - copy the secret now</p>
          <p className="text-xs text-white/50 mb-2">This will not be shown again.</p>
          <div className="flex gap-2 items-center">
            <code className="text-xs bg-black/40 rounded px-2 py-1 flex-1 break-all">{newKeyResult.secret}</code>
            <button className="btn-secondary text-xs" onClick={copySecret}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            className="text-xs text-white/40 mt-3 hover:text-white/60"
            onClick={() => setNewKeyResult(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="panel space-y-4">
        <p className="text-sm font-semibold">Create New Key</p>
        <div>
          <label className="label">Key Name</label>
          <input
            className="input"
            placeholder="e.g. Codex Agent, Weekly Brief Script"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Scopes</label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {SCOPE_OPTIONS.map((s) => (
              <label key={s.value} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={newScopes.includes(s.value)}
                  onChange={() => toggleScope(s.value)}
                />
                <span>{s.label}</span>
              </label>
            ))}
          </div>
        </div>
        <button className="btn-primary" onClick={createKey} disabled={creating || !newName.trim()}>
          {creating ? "Creating..." : "Create Key"}
        </button>
      </div>

      <div>
        <p className="text-sm font-semibold mb-3">Existing Keys ({keys.length})</p>
        {!keys.length && <p className="text-white/40 text-sm">No keys created yet.</p>}
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="panel flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{k.name}</p>
                <p className="text-xs text-white/50 font-mono">{k.prefix}••••••••</p>
                <p className="text-xs text-white/40 mt-1">
                  Scopes: {k.scopes.join(", ")}
                </p>
                <p className="text-xs text-white/30 mt-1">
                  Created {new Date(k.createdAt).toLocaleDateString()}
                  {k.lastUsedAt && ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`badge ${k.active ? "badge-green" : "badge-muted"}`}>
                  {k.active ? "active" : "revoked"}
                </span>
                {k.active && (
                  <button
                    className="text-xs text-red-400 hover:text-red-300"
                    onClick={() => revokeKey(k.id)}
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel text-sm text-white/60">
        <p className="font-semibold mb-2">How to authenticate (OAuth2 client credentials)</p>
        <pre className="text-xs bg-black/40 rounded p-3 overflow-x-auto whitespace-pre-wrap">{`POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=<workspaceId>
&client_secret=<your-api-key-secret>
&scope=read:dashboard read:evidence

→ { access_token: "...", token_type: "Bearer", expires_in: 3600 }

Then use: Authorization: Bearer <access_token>`}</pre>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Roles tab
// ---------------------------------------------------------------------------

function RolesTab() {
  const roles = [
    {
      id: "ceo",
      label: "CEO",
      description: "Strategic priorities, cross-functional risks, open decisions.",
      path: "/dashboard/ceo"
    },
    {
      id: "coo",
      label: "COO",
      description: "Execution status, process issues, overdue items, owner map.",
      path: "/dashboard/coo"
    },
    {
      id: "cbo",
      label: "CBO / Strategy",
      description: "Growth opportunities, partner pipeline, strategic alignment.",
      path: "/dashboard/cbo"
    },
    {
      id: "cto",
      label: "CTO / CDO",
      description: "Technology health, data governance, security and AI pipeline status.",
      path: "/dashboard/cto"
    }
  ];

  return (
    <div className="space-y-4 max-w-lg">
      <div className="panel text-sm text-white/70">
        Each role maps to a dedicated dashboard synthesized from the same evidence base.
        User-to-role mapping is managed through the database users and roles tables.
      </div>
      {roles.map((r) => (
        <div key={r.id} className="panel">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold">{r.label}</p>
              <p className="text-xs text-white/60 mt-1">{r.description}</p>
            </div>
            <a href={r.path} className="btn-secondary text-xs">View</a>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main settings page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("workspace");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Resolve the real workspace from the session/token rather than hardcoding.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.data?.workspaceId) setWorkspaceId(j.data.workspaceId);
      })
      .catch(() => setWorkspaceId("workspace-demo")); // fallback for dev
  }, []);

  if (!workspaceId) {
    return (
      <PageShell title="Settings" description="Configure workspace, LLM provider, sources, policies, and API access.">
        <p className="text-white/40 text-sm">Loading...</p>
      </PageShell>
    );
  }

  return (
    <PageShell title="Settings" description="Configure workspace, LLM provider, sources, policies, and API access.">
      <div className="flex gap-1 mb-6 border-b border-white/10 pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab === tab.id
                ? "text-white border-b-2 border-blue-400"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "workspace" && <WorkspaceTab workspaceId={workspaceId} />}
        {activeTab === "llm" && <LLMTab workspaceId={workspaceId} />}
        {activeTab === "sources" && <SourcesTab />}
        {activeTab === "policies" && <PoliciesTab workspaceId={workspaceId} />}
        {activeTab === "apikeys" && <APIKeysTab workspaceId={workspaceId} />}
        {activeTab === "roles" && <RolesTab />}
      </div>
    </PageShell>
  );
}
