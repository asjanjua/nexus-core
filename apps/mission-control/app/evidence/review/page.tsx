import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { repository } from "@/lib/data/repository";
import { requireWorkspaceId } from "@/lib/safe-auth";
import { resolveDocumentTypes } from "@/lib/domain/document-type-classifier";
import { buildReviewQueue, type QueueCandidate } from "@/lib/evidence-review-queue";
import {
  coverageForSubmission,
  requirementsFor,
  type LicenseStatus,
} from "@/lib/domain/regulatory-requirement-library";
import { librarySetsFor } from "@/lib/meridian-requirement-selection";

export const metadata = { title: "Documents needing a type | Pinavia" };

/**
 * Documents the classifier could not place, ordered by what each would unblock.
 *
 * Thirty unidentified files is a wall a reviewer bounces off. "This one
 * unblocks three critical requirements" is a next action, which is why the
 * ordering — not the list — is the feature here. See lib/evidence-review-queue.
 */
export default async function EvidenceReviewQueuePage() {
  const workspaceId = await requireWorkspaceId("/evidence/review");

  const [evidence, overrides, scope] = await Promise.all([
    repository.getEvidenceForWorkspace(workspaceId).catch(() => []),
    repository.getEvidenceTypeOverrides(workspaceId).catch(() => new Map()),
    repository.getMeridianScope(workspaceId).catch(() => null),
  ]);

  // Restricted records are excluded everywhere else in coverage; a document
  // the reviewer may not read is not one they can be asked to type.
  const usable = evidence.filter((record) => record.sensitivity !== "restricted");

  const candidates: QueueCandidate[] = usable.map((record) => ({
    evidenceId: record.id,
    sourcePath: record.sourcePath,
    extractionConfidence: record.extractionConfidence,
    hasText: Boolean(record.text && record.text.trim()),
    text: record.text,
    resolved: resolveDocumentTypes(
      { sourcePath: record.sourcePath, text: record.text },
      overrides.get(record.id) ?? null
    ),
  }));

  // Which requirements are still uncovered, so the queue can say what typing a
  // document would actually buy. Without a licence pack selected there is
  // nothing to score against, and the queue degrades to "these need a look"
  // rather than pretending to rank them.
  const documentTypes = [...new Set(candidates.flatMap((c) => c.resolved.types))];
  let uncovered: Array<{ severity: "critical" | "high" | "medium"; evidenceTags: string[] }> = [];
  if (scope?.licenseTypeKey) {
    const sets: LicenseStatus[] = librarySetsFor(scope.licenseStatus);
    const openIds = new Set<string>();
    for (const set of sets) {
      for (const row of coverageForSubmission(scope.licenseTypeKey, set, documentTypes)) {
        if (!row.covered) openIds.add(row.itemId);
      }
    }
    const byId = new Map<string, { severity: "critical" | "high" | "medium"; evidenceTags: string[] }>();
    for (const set of sets) {
      for (const item of requirementsFor(scope.licenseTypeKey, set)) {
        if (openIds.has(item.id)) byId.set(item.id, { severity: item.severity, evidenceTags: item.evidenceTags });
      }
    }
    uncovered = [...byId.values()];
  }

  const queue = buildReviewQueue(candidates, uncovered);

  const counts = {
    unidentified: queue.length,
    inferred: candidates.filter((c) => c.resolved.source === "content").length,
    confirmed: candidates.filter((c) => c.resolved.reviewed && c.resolved.types.length > 0).length,
    unusable: candidates.filter((c) => c.resolved.reviewed && c.resolved.types.length === 0).length,
  };

  return (
    <PageShell
      title="Documents needing a type"
      description="Ordered by how many requirements each one would unblock, so the first correction is the most valuable."
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat value={counts.unidentified} label="unidentified" tone="text-nexus-warn" />
        <Stat value={counts.inferred} label="typed from contents only" tone="text-nexus-sky" />
        <Stat value={counts.confirmed} label="confirmed by a reviewer" tone="text-nexus-accent" />
        <Stat value={counts.unusable} label="reviewed as unusable" tone="text-white/60" />
      </section>

      {!scope?.licenseTypeKey && queue.length > 0 && (
        <p className="mt-4 rounded-lg border border-nexus-sky/25 bg-nexus-sky/5 px-3 py-2 text-xs leading-5 text-nexus-sky">
          No licence pack is selected, so these cannot be ranked by what they would unblock. Set the
          regulatory scope to prioritise this list.
        </p>
      )}

      <section className="mt-4 space-y-2">
        {queue.length === 0 ? (
          <div className="panel border-nexus-accent/25">
            <p className="panel-title text-nexus-accent">Nothing is waiting for a type</p>
            <p className="mt-2 text-xs leading-5 text-white/60">
              Every readable document has been identified or reviewed. That is not a finding that
              the evidence is sufficient — only that nothing is unaccounted for.
            </p>
          </div>
        ) : (
          queue.map((item) => (
            <div
              key={item.evidenceId}
              className="flex flex-wrap items-center gap-4 rounded-lg border border-nexus-border bg-nexus-panel px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{item.fileName}</p>
                <p className="mt-0.5 text-[11px] text-white/45">{item.reason}</p>
              </div>

              {item.unblocks.total > 0 && (
                <span className="shrink-0 rounded-full border border-nexus-warn/30 bg-nexus-warn/10 px-2.5 py-1 text-[11px] font-medium text-nexus-warn">
                  {describeUnblocks(item.unblocks)}
                </span>
              )}

              <Link
                href={`/evidence/${item.evidenceId}`}
                prefetch={false}
                className="shrink-0 rounded-lg border border-nexus-border px-3 py-2 text-xs text-white/60 transition hover:text-white"
              >
                {/* A suggestion, never applied. It survives only because the
                    classifier rejected it as too weak to act on. */}
                {item.suggestion ? `Set type · try ${item.suggestion}` : "Set type"}
              </Link>
            </div>
          ))
        )}
      </section>

      <section className="panel mt-4 border-nexus-warn/30">
        <p className="mt-0 text-xs leading-5 text-nexus-warn">
          Typing a document says what it is. It does not say the requirement is satisfied — a
          qualified reviewer still reads the source before coverage means anything.
        </p>
      </section>
    </PageShell>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className="panel">
      <p className={`text-3xl font-bold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-white/40">{label}</p>
    </div>
  );
}

/** Leads with the most severe band, because that is what decides the order. */
function describeUnblocks(u: { critical: number; high: number; medium: number }): string {
  if (u.critical > 0) return `${u.critical} critical requirement${u.critical === 1 ? "" : "s"}`;
  if (u.high > 0) return `${u.high} high requirement${u.high === 1 ? "" : "s"}`;
  return `${u.medium} medium requirement${u.medium === 1 ? "" : "s"}`;
}
