import { cardsForRole } from "@/lib/services/dashboard";
import type { Role } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { DashboardCharts } from "@/components/dashboard-charts";
import { EvidenceSourceList } from "@/components/evidence-source-list";
import { AGENT_ROOMS, agentBriefIdsForRoleContext, agentForId, roomForRole } from "@/lib/agents/agent-library";
import { labelForRole } from "@/lib/domain/role-registry";

export async function DashboardPanel({
  role,
  workspaceId,
  department,
  agentId,
}: {
  role: Role;
  workspaceId: string;
  department?: string;
  agentId?: string;
}) {
  const cards = await cardsForRole(role, workspaceId, { department, agentId });
  const activeRoom = roomForRole(role);
  const [recs, evidence, profile] = await Promise.all([
    repository.getRecommendations(workspaceId),
    repository.getEvidenceForWorkspace(workspaceId),
    repository.getWorkspaceProfile(workspaceId).catch(() => null),
  ]);
  const roleAgents = agentBriefIdsForRoleContext(role, profile?.companyArchetype).map(agentForId);
  const roomLabel =
    profile?.companyArchetype === "sme_physical"
      ? `${labelForRole(role, profile.companyArchetype)} Brief`
      : activeRoom.label;
  const departments = Array.from(
    new Set(evidence.map((item) => item.department).filter((item): item is string => Boolean(item)))
  ).sort();

  return (
    <div className="space-y-4">
      <section className="panel space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-nexus-accent/70">Agent Room</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{roomLabel}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-white/60">
              NexusAI staffs this room with evidence-backed specialist agents. Each agent reads approved evidence only, drafts source-backed briefs, and routes high-impact actions through human approval.
            </p>
          </div>
          <span className="badge badge-green">Human-approved actions only</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {AGENT_ROOMS.map((room) => (
            <a
              key={room.id}
              href={room.path}
              className={`badge ${room.id === activeRoom.id ? "badge-green" : "badge-muted"}`}
              title={room.description}
            >
              {room.label}
            </a>
          ))}
        </div>
      </section>

      {departments.length > 0 && (
        <section className="panel flex flex-wrap items-center gap-2 text-sm">
          <span className="text-white/45">Department:</span>
          <a href={`/dashboard/${role}`} className={`badge ${!department ? "badge-green" : "badge-muted"}`}>
            All
          </a>
          {departments.map((item) => (
            <a
              key={item}
              href={`/dashboard/${role}?department=${encodeURIComponent(item)}`}
              className={`badge ${department === item ? "badge-green" : "badge-muted"}`}
            >
              {item}
            </a>
          ))}
        </section>
      )}
      {roleAgents.length > 1 && (
        <section className="panel flex flex-wrap items-center gap-2 text-sm">
          <span className="text-white/45">Agent:</span>
          <a
            href={`/dashboard/${role}${department ? `?department=${encodeURIComponent(department)}` : ""}`}
            className={`badge ${!agentId ? "badge-green" : "badge-muted"}`}
          >
            All
          </a>
          {roleAgents.map((agent) => {
            const params = new URLSearchParams();
            if (department) params.set("department", department);
            params.set("agent", agent.id);
            return (
              <a
                key={agent.id}
                href={`/dashboard/${role}?${params.toString()}`}
                className={`badge ${agentId === agent.id ? "badge-green" : "badge-muted"}`}
                title={agent.mandate}
              >
                {agent.name}
              </a>
            );
          })}
        </section>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <article key={card.id} className="panel">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/35">Agent Brief</p>
                <p className="mt-1 text-base font-semibold text-white">{card.agentName ?? card.title}</p>
              </div>
              <span className="badge badge-muted">{card.outputType ?? "brief"}</span>
            </div>
            {card.mandate && (
              <p className="mt-2 text-xs leading-5 text-white/45">{card.mandate}</p>
            )}
            <p className="mt-2 text-sm text-white/80 line-clamp-6">{card.summary}</p>
            <div className="mt-3 flex gap-2">
              <span className="badge">confidence {Math.round(card.confidence * 100)}%</span>
              <span className="badge">freshness {card.freshnessHours}h</span>
              <span className="badge">{card.approvalPolicy?.replace(/_/g, " ") ?? "read only"}</span>
            </div>
            {card.suggestedNextAction && (
              <p className="mt-3 rounded-lg border border-nexus-accent/20 bg-nexus-accent/5 px-3 py-2 text-xs text-nexus-accent/80">
                Suggested next action: {card.suggestedNextAction}
              </p>
            )}
            <EvidenceSourceList records={evidence} ids={card.evidenceRefs} compact />
            {card.skillHints?.length ? (
              <p className="mt-2 text-xs text-white/30">
                Future skills: {card.skillHints.slice(0, 3).join(", ")}
              </p>
            ) : null}
          </article>
        ))}
      </div>
      <section className="panel">
        <p className="panel-title">Active Recommendations</p>
        <ul className="mt-3 space-y-2 text-sm text-white/80">
          {recs.length ? (
            recs.map((rec) => {
              const confPct = Math.round(rec.confidence * 100);
              const confColor =
                confPct >= 70 ? "text-green-300" : confPct >= 40 ? "text-amber-300" : "text-red-300";
              return (
                <li
                  key={rec.id}
                  className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/90 leading-snug">{rec.title}</p>
                    <p className="mt-0.5 text-xs text-white/40">{rec.owner}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-xs font-medium ${confColor}`}>{confPct}%</p>
                    <p className="text-xs text-white/30">{rec.status}</p>
                  </div>
                </li>
              );
            })
          ) : (
            <li className="py-4 text-center text-sm text-white/40">
              No recommendations yet. Ingest and process documents to generate AI-driven recommendations.
            </li>
          )}
        </ul>
      </section>

      {/* Role-specific chart analytics */}
      <section>
        <p className="text-xs uppercase tracking-wide text-white/40 mb-4">Analytics</p>
        <DashboardCharts role={role} workspaceId={workspaceId} />
      </section>
    </div>
  );
}
