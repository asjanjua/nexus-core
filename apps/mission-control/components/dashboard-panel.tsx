import { cardsForRole } from "@/lib/services/dashboard";
import { synthesiseForRole } from "@/lib/services/synthesis";
import type { EvidenceRecord, Role } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { DashboardCharts } from "@/components/dashboard-charts";
import { EvidenceSourceList } from "@/components/evidence-source-list";
import { ExecutiveSynthesisBrief, AgentDetailSection } from "@/components/synthesis-brief";
import { KnowledgeRoomGraph } from "@/components/knowledge-room-graph";
import { AGENT_ROOMS, agentBriefIdsForRoleContext, agentForId, roomForRole } from "@/lib/agents/agent-library";
import { labelForRole } from "@/lib/domain/role-registry";
import {
  AiPanel,
  EmptyLine,
  KpiHero,
  MetaChip,
  RouteRow,
  SecondaryLink,
  TrustCard,
  type RoomStatus,
  type RouteStatus,
} from "@/components/ui/nexus-primitives";
import { HelpLabel } from "@/components/ui/help-dialog";
import { EvidenceTrustLink } from "@/components/ui/trust-drawer-trigger";
import { SourceCoverageMap } from "@/components/source-coverage-map";

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
  const [evidence, connectorsInstalled] = await Promise.all([
    repository.getEvidenceForWorkspace(workspaceId),
    repository.listConnectors(workspaceId).catch(() => []),
  ]);

  // First-class empty state: no evidence at all. Do not render zeroed KPIs and
  // low-value AI briefs — show the guided connect state instead (design system:
  // "no evidence connected" is a designed screen, not an error message).
  if (evidence.length === 0) {
    return (
      <NoEvidenceState
        connectorCount={connectorsInstalled.length}
      />
    );
  }

  const [cards, recs, profile] = await Promise.all([
    cardsForRole(role, workspaceId, { department, agentId }),
    repository.getRecommendations(workspaceId),
    repository.getWorkspaceProfile(workspaceId).catch(() => null),
  ]);
  const [decisions, actions] = await Promise.all([
    repository.listDecisions(workspaceId).catch(() => []),
    repository.listActions(workspaceId).catch(() => []),
  ]);

  const synthesis = agentId
    ? null
    : await synthesiseForRole(role, workspaceId, { department, cards });

  const activeRoom = roomForRole(role);
  const roleAgents = agentBriefIdsForRoleContext(role, profile?.companyArchetype).map(agentForId);
  const roomLabel =
    profile?.companyArchetype === "sme_physical"
      ? `${labelForRole(role, profile.companyArchetype)} Brief`
      : activeRoom.label;
  const departments = Array.from(
    new Set(evidence.map((item) => item.department).filter((item): item is string => Boolean(item)))
  ).sort();
  const processedEvidence = evidence.filter((item) => item.ingestionStatus === "processed");
  const avgEvidenceConfidence = evidence.length
    ? Math.round((evidence.reduce((sum, item) => sum + item.extractionConfidence, 0) / evidence.length) * 100)
    : 0;
  const openDecisionCount = decisions.filter((item) => item.status === "open").length;
  const blockerCount = actions.filter((item) => item.status !== "done" && item.isBlocker).length;
  const estimatedHoursReturned = Math.max(4, Math.min(126, processedEvidence.length * 2 + cards.length * 8));
  const commandPrimaryHref = blockerCount > 0 ? "/decisions" : "/workflows";
  const commandPrimaryLabel =
    blockerCount > 0 ? `Review ${blockerCount} blocker${blockerCount === 1 ? "" : "s"}` : "Start workflow twin";

  // ---- Derived, real-data inputs for the guided command center -------------
  const blockerActions = actions.filter((a) => a.status !== "done" && a.isBlocker);
  const openDecisions = decisions.filter((d) => d.status === "open");
  const topRec = recs[0];
  const routeItems: { label: string; context: string; status: RouteStatus }[] = [
    ...blockerActions.slice(0, 2).map((a) => ({ label: a.actionText, context: a.owner, status: "blocked" as const })),
    ...openDecisions.slice(0, 2).map((d) => ({ label: d.title, context: d.owner, status: "next" as const })),
    ...(topRec ? [{ label: topRec.title, context: topRec.owner, status: "now" as const }] : []),
  ].slice(0, 4);

  const confReady = avgEvidenceConfidence >= 70;
  const missionRooms: { name: string; signal: string; status: RoomStatus }[] = [
    { name: "Executive", signal: confReady ? "strong evidence" : "needs review", status: confReady ? "ready" : "weak" },
    { name: "Risk", signal: blockerCount > 0 ? "open blockers" : "clear", status: blockerCount > 0 ? "weak" : "ready" },
    {
      name: "Finance",
      signal: `${processedEvidence.length}/${evidence.length || 0} cleared`,
      status: processedEvidence.length > 0 ? "ready" : "weak",
    },
  ];
  const guidedOwner = openDecisions[0]?.owner ?? "CEO";
  const guidedText =
    blockerCount > 0
      ? `Resolve ${blockerCount} blocker${blockerCount === 1 ? "" : "s"} before relying on new synthesis or exporting an audit pack. Rooms stay available as drill-down inside this route.`
      : "Approve the next evidence gate, then move the top open decision forward. Each room is a destination inside this route, not the route itself.";

  return (
    <div className="space-y-6">
      {/* ================================================================= */}
      {/* GUIDED EXECUTIVE ROOM — command center (night mode operator cockpit) */}
      {/* ================================================================= */}
      <section className="rounded-xl border border-nexus-border bg-nexus-surface p-5 sm:p-6">
        {/* Header: exactly one primary action */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-nexus-accent/80">
              NexusAI Mission Control · {activeRoom.label}
            </p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight text-nexus-text">
              {labelForRole(role, profile?.companyArchetype)} Command Brief
            </h2>
            <p className="mt-2 max-w-2xl text-base leading-6 text-nexus-muted">
              The command center sits above the rooms and tells you what to do next, with evidence and owner visible.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={commandPrimaryHref}
              className="inline-flex items-center justify-center rounded-lg bg-nexus-accent px-4 py-2 text-sm font-semibold text-[#04100d] transition hover:brightness-110"
            >
              {commandPrimaryLabel}
            </a>
          </div>
        </div>

        {/* KPI hero row */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <KpiHero
              label="Confidence"
              value={evidence.length ? `${avgEvidenceConfidence}%` : "0%"}
              barPct={evidence.length ? avgEvidenceConfidence : 0}
              tone="accent"
              helper={`${processedEvidence.length}/${evidence.length || 0} sources cleared`}
              help={{
                title: "Evidence confidence",
                body: "This is the average confidence score across the evidence in this workspace. Higher confidence means Nexus has cleaner, more usable sources. Use it to decide whether the brief is ready to trust or whether evidence needs review first.",
              }}
            />
            {evidence.length > 0 && (
              <div className="mt-2">
                <EvidenceTrustLink
                  label="View evidence"
                  title="Executive Room — overall confidence"
                  confidence={avgEvidenceConfidence / 100}
                  records={evidence}
                />
              </div>
            )}
          </div>
          <KpiHero
            label="Open decisions"
            value={String(openDecisionCount)}
            barPct={Math.min(100, openDecisionCount * 20)}
            tone="sky"
            helper="Human-owned decision records"
            help={{
              title: "Open decisions",
              body: "These are decisions that still need a human owner to resolve them. Nexus can draft and suggest, but the decision stays human-owned.",
            }}
          />
          <KpiHero
            label="Blockers"
            value={String(blockerCount)}
            barPct={Math.min(100, blockerCount * 25)}
            tone={blockerCount > 0 ? "danger" : "accent"}
            helper={blockerCount > 0 ? "Needs executive attention" : "None flagged"}
            help={{
              title: "Blockers",
              body: "Blockers are open actions marked as preventing progress. Treat these first because new synthesis or exports may be less useful until the blocker is cleared.",
            }}
          />
          <KpiHero
            label="Hours back"
            value={`${estimatedHoursReturned}h`}
            barPct={Math.min(100, Math.round((estimatedHoursReturned / 126) * 100))}
            tone="sky"
            helper="Estimated from evidence and active agents"
            help={{
              title: "Hours back",
              body: "This is a directional estimate of time returned by using approved evidence and active agent briefs. It is not a billing number; use it as a pilot value signal.",
            }}
          />
        </div>

        {/* Three primary panels */}
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {/* Today's executive route */}
          <div className="rounded-lg border border-nexus-border bg-nexus-panel p-4">
            <p className="text-sm font-semibold text-nexus-text">
              <HelpLabel
                title="Today's executive route"
                help="This is the short list of work Nexus thinks matters next. It combines blockers, open decisions, and recommendations so executives do not need to inspect every room first."
              >
                Today&apos;s executive route
              </HelpLabel>
            </p>
            <p className="mt-1 text-xs leading-5 text-nexus-muted">
              Prioritised by business consequence, evidence strength, and approval readiness.
            </p>
            <div className="mt-4 space-y-1">
              {routeItems.length ? (
                routeItems.map((item, i) => (
                  <RouteRow key={i} label={item.label} context={item.context} status={item.status} />
                ))
              ) : (
                <EmptyLine text="No routed work yet. Ingest and process evidence to populate the route." />
              )}
            </div>
            <div className="mt-4">
              <SecondaryLink href="/decisions" label="Open route" />
            </div>
          </div>

          {/* Mission health */}
          <div className="rounded-lg border border-nexus-border bg-nexus-panel p-4">
            <p className="text-sm font-semibold text-nexus-text">
              <HelpLabel
                title="Mission health"
                help="Mission health shows whether each room has enough cleared evidence and whether there are visible blockers. Use it as a scan before drilling into a room."
              >
                Mission health
              </HelpLabel>
            </p>
            <p className="mt-1 text-xs leading-5 text-nexus-muted">
              Rooms remain available, but the executive sees one route through them.
            </p>
            <div className="mt-4 space-y-1">
              {missionRooms.map((room) => (
                <RouteRow key={room.name} label={room.name} context={room.signal} status={room.status} />
              ))}
            </div>
            <div className="mt-4">
              <SecondaryLink href={`/dashboard/${role}`} label="Open room map" />
            </div>
          </div>

          {/* Guided next action — AI-generated, marked in violet */}
          <AiPanel>
            <p className="text-sm font-semibold text-nexus-text">
              <HelpLabel
                title="Guided next action"
                help="This is an AI-generated suggestion for the next practical step. It should guide attention, not replace judgment. The owner and audit chips show who should act and how it is tracked."
              >
                Guided next action
              </HelpLabel>
            </p>
            <p className="mt-1 text-xs leading-5 text-nexus-muted">{guidedText}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <MetaChip label={`Owner: ${guidedOwner}`} tone="sky" />
              <MetaChip label="Evidence gate" tone="accent" />
              <MetaChip label="Audit logged" tone="accent" />
            </div>
            <div className="mt-4">
              <SecondaryLink href={commandPrimaryHref} label="Open action" />
            </div>
          </AiPanel>
        </div>

        {/* Trust and governance row */}
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <TrustCard
            title="Trust drawer preview"
            body="Sources, freshness, sensitivity, confidence, model route, and reviewer status are one click from every output."
            href="/sources"
            cta="Inspect trust"
          />
          <TrustCard
            title="Approval consequence"
            body="Before any approval, Nexus explains what unlocks, who is notified, and whether anything external is sent."
            href="/approvals"
            cta="Preview impact"
          />
          <TrustCard
            title="Source coverage"
            body="Required source types are mapped as found, weak, missing, stale, or quarantined before recommendations are trusted."
            href="#source-coverage"
            cta="Resolve gaps"
          />
        </div>

        {/* Live source coverage map — gaps are visible BEFORE weak outputs */}
        <div className="mt-3">
          <SourceCoverageMap evidence={evidence} />
        </div>
      </section>

      {/* Room navigation header */}
      <section className="panel space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-nexus-accent/70">Agent Room</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{roomLabel}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-white/60">
              NexusAI staffs this room with evidence-backed specialist agents. Each agent reads approved evidence only, drafts source-backed briefs, and routes high-impact actions through human approval.
            </p>
          </div>
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

      {/* Department filter */}
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

      {/* ----------------------------------------------------------------- */}
      {/* PRIMARY: Executive Synthesis Brief                                  */}
      {/* ----------------------------------------------------------------- */}
      {synthesis && (
        <ExecutiveSynthesisBrief synthesis={synthesis} roleLabel={roomLabel} department={department} />
      )}

      {/* Single-agent view header when filtered */}
      {agentId && (
        <section className="panel flex flex-wrap items-center gap-2 text-sm">
          <span className="text-white/45">Filtered to agent:</span>
          <span className="badge badge-green">{cards[0]?.agentName ?? agentId}</span>
          <a
            href={`/dashboard/${role}${department ? `?department=${encodeURIComponent(department)}` : ""}`}
            className="badge badge-muted"
          >
            Clear filter
          </a>
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SECONDARY: Specialist Agent Detail (collapsible unless filtered)    */}
      {/* ----------------------------------------------------------------- */}
      {synthesis ? (
        <AgentDetailSection cardCount={cards.length}>
          {/* Agent filter — inside the collapsible */}
          {roleAgents.length > 1 && (
            <div className="panel flex flex-wrap items-center gap-2 text-sm">
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
            </div>
          )}
          <AgentCards cards={cards} evidence={evidence} />
        </AgentDetailSection>
      ) : (
        /* Agent filter bar — visible when not in synthesis mode */
        <>
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
          <AgentCards cards={cards} evidence={evidence} />
        </>
      )}

      {/* Recommendations */}
      <section className="panel">
        <p className="panel-title">
          <HelpLabel
            title="Active recommendations"
            help="Recommendations are AI-drafted suggestions based on approved evidence. They are not actions until a human approves, rejects, or turns them into a decision."
          >
            Active Recommendations
          </HelpLabel>
        </p>
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

      {/* Analytics */}
      <section>
        <p className="text-xs uppercase tracking-wide text-white/40 mb-4">Analytics</p>
        <DashboardCharts role={role} workspaceId={workspaceId} />
      </section>

      {/* Room wiki map */}
      <KnowledgeRoomGraph role={role} workspaceId={workspaceId} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// No-evidence state — a designed first screen, not an error message
// ---------------------------------------------------------------------------

function NoEvidenceState({ connectorCount }: { connectorCount: number }) {
  const hasConnectors = connectorCount > 0;
  return (
    <section className="rounded-xl border border-nexus-border bg-nexus-surface p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-nexus-accent/80">
        NexusAI Mission Control
      </p>
      <h2 className="mt-1 text-3xl font-semibold tracking-tight text-nexus-text">
        No evidence connected yet
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-6 text-nexus-muted">
        {hasConnectors
          ? `${connectorCount} connector${connectorCount === 1 ? " is" : "s are"} configured, but nothing has been ingested and cleared yet. Nexus refuses to brief without evidence — that refusal is the product working, not failing.`
          : "Nexus only ever briefs from evidence you connect and approve. Until the first documents are ingested, there is nothing to synthesise — and Nexus will not guess."}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a
          href="/ingestion"
          className="inline-flex items-center justify-center rounded-lg bg-nexus-accent px-4 py-2 text-sm font-semibold text-[#04100d] transition hover:brightness-110"
        >
          Upload first documents
        </a>
        <SecondaryLink href="/settings/connectors" label={hasConnectors ? "Check connector status" : "Configure connectors"} />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <TrustCard
          title="1. Connect"
          body="Upload documents or configure a connector. Every source is fingerprinted and classified before anything reads it."
          href="/ingestion"
          cta="Open ingestion"
        />
        <TrustCard
          title="2. Clear"
          body="Low-confidence or unprovenanced material is quarantined. Only cleared evidence ever reaches an agent."
          href="/sources"
          cta="View sources"
        />
        <TrustCard
          title="3. Brief"
          body="Specialist agents then draft source-backed briefs, with confidence, freshness, and evidence one click away."
          href="/approvals"
          cta="See approvals"
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Agent card grid — extracted to avoid duplication above
// ---------------------------------------------------------------------------

function AgentCards({
  cards,
  evidence,
}: {
  cards: Awaited<ReturnType<typeof cardsForRole>>;
  evidence: EvidenceRecord[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => {
        const gate = card.gateStatus ?? "ok";
        const gateMeta =
          gate === "blocked" || gate === "suspended"
            ? { tone: "danger" as const, label: gate === "blocked" ? "Output blocked" : "Agent suspended" }
            : gate === "held"
              ? { tone: "warn" as const, label: "Held for review" }
              : null;
        return (
        <article
          key={card.id}
          className={`panel ${gateMeta ? (gateMeta.tone === "danger" ? "border-nexus-danger/40" : "border-nexus-warn/40") : ""}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/35">Agent Brief</p>
              <p className="mt-1 text-base font-semibold text-white">{card.agentName ?? card.title}</p>
            </div>
            {gateMeta ? (
              <MetaChip label={gateMeta.label} tone={gateMeta.tone} />
            ) : (
              <span className="badge badge-muted">{card.outputType ?? "brief"}</span>
            )}
          </div>
          {card.mandate && (
            <p className="mt-2 text-xs leading-5 text-white/45">{card.mandate}</p>
          )}
          {gateMeta ? (
            <div
              className={`mt-2 rounded-md border px-3 py-2 text-sm leading-6 ${
                gateMeta.tone === "danger"
                  ? "border-nexus-danger/30 bg-nexus-danger/10 text-nexus-text/90"
                  : "border-nexus-warn/30 bg-nexus-warn/10 text-nexus-text/90"
              }`}
            >
              <p>{card.summary}</p>
              <p className="mt-1 text-xs text-nexus-muted">
                {gate === "held"
                  ? "A human reviewer can release this brief from the approvals queue."
                  : gate === "suspended"
                    ? "Reactivate or review this agent's control profile in settings."
                    : "The blocked output and its trigger are recorded in the audit log."}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-white/80 line-clamp-6">{card.summary}</p>
          )}
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
              Skills: {card.skillHints.slice(0, 4).join(", ")}
            </p>
          ) : null}
        </article>
        );
      })}
    </div>
  );
}
