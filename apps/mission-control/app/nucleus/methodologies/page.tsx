import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { requireWorkspaceId } from "@/lib/safe-auth";
import {
  nucleusEngagementStages,
  nucleusEngagementScreens,
  nucleusWhiteLabelRequirements,
} from "@/lib/nucleus-engagement-workflow";

export const metadata = { title: "Methodology Catalog | Nucleus" };

/**
 * Nucleus Profile arc, screen 2. Primary user: engagement partner.
 *
 * The firm's delivery method, rendered from the engagement registry rather
 * than described. Every stage, the objects it needs, and the screens that
 * carry it are already defined in lib/nucleus-engagement-workflow — the hub
 * showed a hardcoded "4 method packs" instead of reading it.
 *
 * Server-rendered from the registry, so this page cannot drift from the
 * workflow the product actually runs. If a stage is added to the registry it
 * appears here; if the number changes, the number here changes with it.
 */
export default async function NucleusMethodologiesPage() {
  await requireWorkspaceId("/nucleus/methodologies");

  const screensById = new Map(nucleusEngagementScreens.map((s) => [s.id, s]));

  return (
    <PageShell
      title="Methodology Catalog"
      description="The delivery method as the platform actually runs it: each stage, what it needs before it can start, and which screen carries it. Read from the engagement registry, not written by hand."
    >
      <div className="space-y-4">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="panel">
            <p className="text-xs uppercase tracking-wide text-nexus-muted">Stages</p>
            <p className="mt-2 text-[32px] font-bold leading-none text-nexus-text">
              {nucleusEngagementStages.length}
            </p>
            <p className="mt-2 text-xs text-nexus-muted">profile, package, delivery, assurance</p>
          </div>
          <div className="panel">
            <p className="text-xs uppercase tracking-wide text-nexus-muted">Screens defined</p>
            <p className="mt-2 text-[32px] font-bold leading-none text-nexus-text">
              {nucleusEngagementScreens.length}
            </p>
            <p className="mt-2 text-xs text-nexus-muted">across the engagement arc</p>
          </div>
          <div className="panel">
            <p className="text-xs uppercase tracking-wide text-nexus-muted">White-label rules</p>
            <p className="mt-2 text-[32px] font-bold leading-none text-nexus-text">
              {nucleusWhiteLabelRequirements.length}
            </p>
            <p className="mt-2 text-xs text-nexus-muted">
              <Link href="/nucleus/publish" className="text-nexus-sky hover:underline" prefetch={false}>
                enforced at release
              </Link>
            </p>
          </div>
        </section>

        <section className="panel">
          <p className="panel-title">Delivery stages</p>
          <div className="mt-3 space-y-3">
            {nucleusEngagementStages.map((stage, i) => (
              <div key={stage.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-nexus-muted">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-nexus-text">{stage.title}</p>
                    <p className="mt-1 text-xs leading-5 text-nexus-muted">{stage.purpose}</p>
                    <p className="mt-2 text-xs leading-5 text-nexus-sky">{stage.userOutcome}</p>

                    <p className="mt-3 text-[11px] uppercase tracking-wide text-nexus-muted">
                      Needed before this stage can start
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {stage.requiredObjects.map((o) => (
                        <span key={o} className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-nexus-muted">
                          {o}
                        </span>
                      ))}
                    </div>

                    <p className="mt-3 text-[11px] uppercase tracking-wide text-nexus-muted">Screens</p>
                    <ul className="mt-1 space-y-1">
                      {stage.screenIds.map((id) => {
                        const screen = screensById.get(id);
                        if (!screen) return null;
                        return (
                          <li key={id} className="text-xs text-nexus-muted">
                            · {screen.title}{" "}
                            <span className="text-white/30">{screen.routeCandidate}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel border-nexus-warn/30">
          <p className="panel-title text-nexus-warn">What a partner may not change</p>
          <p className="mt-1 text-xs leading-5 text-nexus-muted">
            The method is the firm&apos;s. These requirements are not, and they are enforced when a
            deliverable is released rather than stated in a contract nobody reads.
          </p>
          <ul className="mt-3 space-y-2">
            {nucleusWhiteLabelRequirements.map((r) => (
              <li key={r.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-semibold text-nexus-text">{r.title}</p>
                <p className="mt-1 text-xs leading-5 text-nexus-muted">{r.whyItMatters}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
