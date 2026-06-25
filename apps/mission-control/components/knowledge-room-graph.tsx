import Link from "next/link";
import type { KnowledgeGraph, Role } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";

const NODE_LIMIT = 12;

const ROOM_COPY: Partial<Record<Role, { title: string; body: string }>> = {
  ceo: {
    title: "Executive Wiki Map",
    body: "Reusable notes, decisions, entities, and evidence context that shape this command room."
  },
  coo: {
    title: "Operating Wiki Map",
    body: "Workflow notes, blockers, source context, and operating memory connected across the vault."
  },
  cbo: {
    title: "Growth Wiki Map",
    body: "Market, proposal, pipeline, and recommendation notes connected to governed Nexus objects."
  },
  cto: {
    title: "Technology Wiki Map",
    body: "Systems, data, architecture, security, and AI governance notes connected to source evidence."
  },
  cfo: {
    title: "Finance Wiki Map",
    body: "Financial, budget, runway, pricing, and value-proof notes connected to source evidence."
  },
  chro: {
    title: "People Wiki Map",
    body: "People, hiring, operating rhythm, and accountability notes connected across the workspace."
  },
  cro: {
    title: "Risk Wiki Map",
    body: "Risk, compliance, audit, policy, and control notes connected to source evidence."
  }
};

function nodeTone(type: string) {
  if (type === "note") return { fill: "#22c55e", stroke: "rgba(34,197,94,0.35)" };
  if (type === "evidence") return { fill: "#60a5fa", stroke: "rgba(96,165,250,0.35)" };
  if (type === "entity") return { fill: "#a78bfa", stroke: "rgba(167,139,250,0.35)" };
  if (type === "workflow_twin") return { fill: "#f59e0b", stroke: "rgba(245,158,11,0.35)" };
  return { fill: "#94a3b8", stroke: "rgba(148,163,184,0.35)" };
}

function positions(nodes: KnowledgeGraph["nodes"]) {
  const centerX = 240;
  const centerY = 122;
  const radius = nodes.length > 7 ? 92 : 72;
  return new Map(
    nodes.map((node, index) => {
      if (nodes.length === 1) return [node.id, { x: centerX, y: centerY }];
      const angle = (index / nodes.length) * Math.PI * 2 - Math.PI / 2;
      return [node.id, { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius }];
    })
  );
}

function graphSummary(graph: KnowledgeGraph) {
  const noteCount = graph.nodes.filter((node) => node.type === "note").length;
  const evidenceCount = graph.nodes.filter((node) => node.type === "evidence").length;
  const entityCount = graph.nodes.filter((node) => node.type === "entity").length;
  return { noteCount, evidenceCount, entityCount, edgeCount: graph.edges.length };
}

export async function KnowledgeRoomGraph({
  workspaceId,
  role
}: {
  workspaceId: string;
  role: Role;
}) {
  const graph = await repository.getKnowledgeGraph(workspaceId).catch(() => ({ nodes: [], edges: [] } satisfies KnowledgeGraph));
  const visibleNodes = graph.nodes.slice(0, NODE_LIMIT);
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = graph.edges
    .filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))
    .slice(0, 18);
  const pos = positions(visibleNodes);
  const summary = graphSummary(graph);
  const copy = ROOM_COPY[role] ?? {
    title: "Knowledge Wiki Map",
    body: "Reusable notes and Nexus object links connected across the workspace."
  };

  return (
    <section className="panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-nexus-accent/70">Knowledge Workspace</p>
          <h2 className="mt-1 text-xl font-semibold text-white">{copy.title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-white/55">{copy.body}</p>
        </div>
        <Link href="/knowledge" className="btn-subtle">
          Open Knowledge
        </Link>
      </div>

      {visibleNodes.length ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <svg viewBox="0 0 480 244" role="img" aria-label="Knowledge graph preview" className="h-64 w-full">
              {visibleEdges.map((edge) => {
                const source = pos.get(edge.source);
                const target = pos.get(edge.target);
                if (!source || !target) return null;
                return (
                  <line
                    key={edge.id}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="rgba(255,255,255,0.16)"
                    strokeWidth="1.4"
                  />
                );
              })}
              {visibleNodes.map((node) => {
                const point = pos.get(node.id) ?? { x: 240, y: 122 };
                const tone = nodeTone(node.type);
                return (
                  <g key={node.id}>
                    <circle cx={point.x} cy={point.y} r={node.type === "note" ? 13 : 10} fill={tone.fill} fillOpacity="0.82" stroke={tone.stroke} strokeWidth="8" />
                    <text
                      x={point.x}
                      y={point.y + 24}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.72)"
                      fontSize="10"
                      fontFamily="Inter, system-ui, sans-serif"
                    >
                      {node.label.length > 18 ? `${node.label.slice(0, 17)}...` : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                <p className="text-2xl font-semibold text-white">{summary.noteCount}</p>
                <p className="text-xs text-white/40">notes</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                <p className="text-2xl font-semibold text-white">{summary.edgeCount}</p>
                <p className="text-xs text-white/40">links</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                <p className="text-2xl font-semibold text-white">{summary.evidenceCount}</p>
                <p className="text-xs text-white/40">evidence refs</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                <p className="text-2xl font-semibold text-white">{summary.entityCount}</p>
                <p className="text-xs text-white/40">entities</p>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
              <p className="text-xs uppercase tracking-wide text-white/35">Visible preview</p>
              <p className="mt-1 text-sm text-white/60">
                Showing {visibleNodes.length} of {graph.nodes.length} nodes. Open the full workspace to edit notes, inspect backlinks, import/export Markdown, or sync a local vault.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-5">
          <p className="text-sm font-medium text-white/75">No knowledge graph yet.</p>
          <p className="mt-1 text-sm leading-6 text-white/45">
            Create notes in Knowledge Workspace with wikilinks, tags, or refs like `evidence:...`, `entity:...`, and `workflow:...`; the room map will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
