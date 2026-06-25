"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

type KnowledgeNote = {
  id: string;
  title: string;
  path: string;
  body: string;
  tags: string[];
  sensitivity: "public" | "internal" | "confidential" | "restricted";
  status: "active" | "archived" | "deleted";
  sourceKind: string;
  evidenceRefs: string[];
  entityRefs: string[];
  workflowRefs: string[];
  decisionRefs: string[];
  recommendationRefs: string[];
  updatedAt: string;
};

type KnowledgeGraph = {
  nodes: Array<{ id: string; label: string; type: string }>;
  edges: Array<{ id: string; source: string; target: string; type: string; label?: string }>;
};

type SyncStatus = {
  mode: string;
  enabled: boolean;
  vaultPath: string | null;
  watcherActive: boolean;
  events: Array<{ id: string; type: string; status: string; message?: string | null; createdAt: string }>;
};

const ROOTS = ["_Inbox", "Daily", "Projects", "Workflows", "Entities", "Sources"];

function folderFor(path: string) {
  return path.split("/")[0] || "_Inbox";
}

function extRefs(note: KnowledgeNote) {
  return [
    ...note.evidenceRefs.map((id) => ({ type: "evidence", id, href: `/evidence/${id}` })),
    ...note.entityRefs.map((id) => ({ type: "entity", id, href: `/entities/${id}` })),
    ...note.workflowRefs.map((id) => ({ type: "workflow", id, href: `/workflows` })),
    ...note.decisionRefs.map((id) => ({ type: "decision", id, href: `/decisions` })),
    ...note.recommendationRefs.map((id) => ({ type: "recommendation", id, href: `/recommendations` }))
  ];
}

export function KnowledgeWorkspace() {
  const [notes, setNotes] = useState<KnowledgeNote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<KnowledgeNote | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"edit" | "preview" | "graph">("edit");
  const [graph, setGraph] = useState<KnowledgeGraph>({ nodes: [], edges: [] });
  const [sync, setSync] = useState<SyncStatus | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [entitySearch, setEntitySearch] = useState("");
  const [entityResults, setEntityResults] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [entitySearching, setEntitySearching] = useState(false);

  async function refresh() {
    const res = await fetch(`/api/knowledge/notes${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error ?? "knowledge_load_failed");
    const next = json.data.notes as KnowledgeNote[];
    setNotes(next);
    if (!selectedId && next[0]) {
      setSelectedId(next[0].id);
      setDraft(next[0]);
    } else if (selectedId) {
      const current = next.find((note) => note.id === selectedId);
      if (current) setDraft(current);
    }
  }

  async function refreshGraph() {
    const res = await fetch("/api/knowledge/graph");
    const json = await res.json();
    if (json.ok) setGraph(json.data as KnowledgeGraph);
  }

  async function refreshSync() {
    const res = await fetch("/api/knowledge/sync");
    const json = await res.json();
    if (json.ok) setSync(json.data as SyncStatus);
  }

  useEffect(() => {
    void refresh().catch((err) => setMessage(err instanceof Error ? err.message : "Could not load knowledge notes."));
    void refreshGraph();
    void refreshSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, KnowledgeNote[]>();
    for (const root of ROOTS) map.set(root, []);
    for (const note of notes) {
      const folder = folderFor(note.path);
      map.set(folder, [...(map.get(folder) ?? []), note]);
    }
    return map;
  }, [notes]);

  const backlinks = useMemo(() => {
    if (!draft) return [];
    const needle = `[[${draft.title}]]`.toLowerCase();
    return notes.filter((note) => note.id !== draft.id && note.body.toLowerCase().includes(needle));
  }, [draft, notes]);

  async function selectNote(note: KnowledgeNote) {
    setSelectedId(note.id);
    const res = await fetch(`/api/knowledge/notes/${note.id}`);
    const json = await res.json();
    if (json.ok) setDraft(json.data.note as KnowledgeNote);
  }

  async function createNote() {
    setBusy(true);
    setMessage("");
    try {
      const title = `Untitled ${notes.length + 1}`;
      const res = await fetch("/api/knowledge/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, path: `_Inbox/untitled-${Date.now()}.md`, body: `# ${title}\n\n`, tags: [] })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "create_failed");
      await refresh();
      await refreshGraph();
      await selectNote(json.data.note as KnowledgeNote);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not create note.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!draft) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/knowledge/notes/${draft.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft)
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "save_failed");
      setDraft(json.data.note as KnowledgeNote);
      await refresh();
      await refreshGraph();
      setMessage("Note saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save note.");
    } finally {
      setBusy(false);
    }
  }

  async function exportVault() {
    const res = await fetch("/api/knowledge/export", { method: "POST" });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexus-vault.zip";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importVault(file: File) {
    const form = new FormData();
    form.append("file", file);
    setBusy(true);
    try {
      const res = await fetch("/api/knowledge/import", { method: "POST", body: form });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "import_failed");
      setMessage(`Imported ${json.data.imported} note${json.data.imported === 1 ? "" : "s"}.`);
      await refresh();
      await refreshGraph();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not import vault.");
    } finally {
      setBusy(false);
    }
  }

  async function runPost(endpoint: string, body?: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "request_failed");
      setMessage("Done.");
      await refresh();
      await refreshGraph();
      await refreshSync();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function searchEntities(q: string) {
    if (!q.trim()) { setEntityResults([]); return; }
    setEntitySearching(true);
    try {
      const res = await fetch(`/api/entities?search=${encodeURIComponent(q)}&limit=6`);
      const json = await res.json();
      if (json.ok) {
        setEntityResults((json.data?.entities ?? []).map((e: { id: string; name: string; type: string }) => ({
          id: e.id, name: e.name, type: e.type
        })));
      }
    } catch { /* search failure is non-fatal */ }
    finally { setEntitySearching(false); }
  }

  function linkEntity(entity: { id: string; name: string; type: string }) {
    if (!draft) return;
    if (draft.entityRefs.includes(entity.id)) return;
    setDraft({ ...draft, entityRefs: [...draft.entityRefs, entity.id] });
    setEntitySearch("");
    setEntityResults([]);
    setMessage(`Linked to ${entity.name}. Save to persist.`);
  }

  function unlinkEntity(id: string) {
    if (!draft) return;
    setDraft({ ...draft, entityRefs: draft.entityRefs.filter((ref) => ref !== id) });
  }

  return (
    <div className="grid min-h-[74vh] gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_20rem]">
      <aside className="panel flex min-h-[20rem] flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="panel-title">Vault</p>
            <p className="mt-1 text-xs text-white/45">{notes.length} note{notes.length === 1 ? "" : "s"}</p>
          </div>
          <button className="btn-subtle" disabled={busy} onClick={createNote}>New</button>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void refresh();
          }}
        >
          <input className="input min-w-0" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Quick search..." />
          <button className="btn-subtle" type="submit">Go</button>
        </form>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {Array.from(grouped.entries()).map(([folder, items]) => (
            <div key={folder}>
              <p className="mb-1 text-xs uppercase tracking-[0.16em] text-white/30">{folder}</p>
              <div className="space-y-1">
                {items.length ? items.map((note) => (
                  <button
                    key={note.id}
                    className={[
                      "w-full rounded-md border px-3 py-2 text-left text-sm transition",
                      selectedId === note.id
                        ? "border-nexus-accent/40 bg-nexus-accent/10 text-white"
                        : "border-white/10 bg-white/[0.025] text-white/65 hover:text-white"
                    ].join(" ")}
                    onClick={() => void selectNote(note)}
                  >
                    <span className="block truncate font-medium">{note.title}</span>
                    <span className="block truncate text-xs text-white/35">{note.path}</span>
                  </button>
                )) : <p className="rounded-md border border-white/10 px-3 py-2 text-xs text-white/35">Empty</p>}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="panel min-w-0 space-y-4">
        {draft ? (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="grid flex-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <input className="input" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
                <input className="input" value={draft.path} onChange={(event) => setDraft({ ...draft, path: event.target.value })} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={`badge ${view === "edit" ? "badge-green" : "badge-muted"}`} onClick={() => setView("edit")}>Edit</button>
                <button className={`badge ${view === "preview" ? "badge-green" : "badge-muted"}`} onClick={() => setView("preview")}>Preview</button>
                <button className={`badge ${view === "graph" ? "badge-green" : "badge-muted"}`} onClick={() => setView("graph")}>Graph</button>
                <button className="btn-primary" disabled={busy} onClick={() => void saveDraft()}>Save</button>
              </div>
            </div>
            {view === "edit" && (
              <div className="overflow-hidden rounded-lg border border-white/10 bg-[#060a12]">
                <CodeMirror
                  value={draft.body}
                  height="56vh"
                  theme="dark"
                  extensions={[markdown()]}
                  onChange={(value) => setDraft({ ...draft, body: value })}
                />
              </div>
            )}
            {view === "preview" && (
              <article className="min-h-[56vh] whitespace-pre-wrap rounded-lg border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/75">
                {draft.body}
              </article>
            )}
            {view === "graph" && (
              <div className="h-[56vh] overflow-hidden rounded-lg border border-white/10 bg-black/20">
                <ForceGraph2D
                  graphData={{ nodes: graph.nodes, links: graph.edges.map((edge) => ({ ...edge, source: edge.source, target: edge.target })) }}
                  nodeLabel={(node) => String((node as { label?: string }).label ?? "")}
                  nodeCanvasObject={(node, ctx) => {
                    const typedNode = node as { x?: number; y?: number; label?: string; type?: string };
                    const label = typedNode.label ?? "";
                    const color = typedNode.type === "note" ? "#7dd3fc" : typedNode.type === "evidence" ? "#86efac" : "#c4b5fd";
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(typedNode.x ?? 0, typedNode.y ?? 0, 5, 0, 2 * Math.PI, false);
                    ctx.fill();
                    ctx.fillStyle = "rgba(255,255,255,0.78)";
                    ctx.font = "10px sans-serif";
                    ctx.fillText(label.slice(0, 32), (typedNode.x ?? 0) + 8, (typedNode.y ?? 0) + 3);
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex min-h-[56vh] items-center justify-center rounded-lg border border-white/10 bg-black/20 text-sm text-white/50">
            Create or import a note to start your Nexus vault.
          </div>
        )}
      </main>

      <aside className="panel space-y-4">
        <div>
          <p className="panel-title">Backlinks</p>
          <div className="mt-2 space-y-2">
            {backlinks.length ? backlinks.map((note) => (
              <button key={note.id} className="block w-full rounded-md border border-white/10 px-3 py-2 text-left text-sm text-white/65 hover:text-white" onClick={() => void selectNote(note)}>
                {note.title}
              </button>
            )) : <p className="text-sm text-white/45">No backlinks yet.</p>}
          </div>
        </div>
        <div>
          <p className="panel-title">Nexus Links</p>
          <div className="mt-2 space-y-2">
            {draft && extRefs(draft).length ? extRefs(draft).map((ref) => (
              <div key={`${ref.type}:${ref.id}`} className="flex items-center gap-1 rounded-md border border-white/10 px-3 py-2 text-xs">
                <a className="flex-1 text-white/65 hover:text-white truncate" href={ref.href}>
                  {ref.type}: {ref.id}
                </a>
                {ref.type === "entity" && (
                  <button
                    className="text-white/30 hover:text-red-400 text-xs px-1"
                    title="Unlink entity"
                    onClick={() => unlinkEntity(ref.id)}
                  >
                    ×
                  </button>
                )}
              </div>
            )) : <p className="text-sm text-white/45">Use refs like evidence:ev-001 or workflow:wt-123.</p>}
          </div>
        </div>
        {draft && (
          <div>
            <p className="panel-title">Link Entity</p>
            <div className="mt-2 space-y-2">
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void searchEntities(entitySearch);
                }}
              >
                <input
                  className="input min-w-0"
                  value={entitySearch}
                  onChange={(event) => {
                    setEntitySearch(event.target.value);
                    void searchEntities(event.target.value);
                  }}
                  placeholder="Search entities..."
                />
              </form>
              {entitySearching && <p className="text-xs text-white/30">Searching…</p>}
              {entityResults.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {entityResults.map((entity) => (
                    <button
                      key={entity.id}
                      className="block w-full rounded-md border border-white/10 px-3 py-2 text-left text-xs text-white/65 hover:text-white hover:border-nexus-accent/40"
                      onClick={() => linkEntity(entity)}
                    >
                      <span className="block truncate font-medium">{entity.name}</span>
                      <span className="block text-white/35">{entity.type}</span>
                    </button>
                  ))}
                </div>
              )}
              {entitySearch && !entitySearching && entityResults.length === 0 && (
                <p className="text-xs text-white/40">No entities found. Try a different name.</p>
              )}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <p className="panel-title">Portability</p>
          <button className="btn-subtle w-full" onClick={() => void exportVault()}>Export ZIP</button>
          <label className="btn-subtle block w-full cursor-pointer text-center">
            Import ZIP
            <input className="hidden" type="file" accept=".zip" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importVault(file);
            }} />
          </label>
          <button className="btn-subtle w-full" disabled={busy} onClick={() => void runPost("/api/knowledge/triage")}>Triage Inbox</button>
        </div>
        <div className="space-y-2">
          <p className="panel-title">Local Sync</p>
          <p className="text-xs text-white/45">
            {sync?.enabled ? `${sync.mode}: ${sync.vaultPath}` : "Disabled. Set NEXUS_VAULT_SYNC and NEXUS_LOCAL_VAULT_PATH locally."}
          </p>
          <button className="btn-subtle w-full" disabled={busy || !sync?.enabled} onClick={() => void runPost("/api/knowledge/sync")}>Sync Now</button>
          <button className="btn-subtle w-full" disabled={busy || !sync?.enabled} onClick={() => void runPost("/api/knowledge/sync", { watch: true })}>Start Watcher</button>
        </div>
        {message ? <p className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-white/60">{message}</p> : null}
      </aside>
    </div>
  );
}
