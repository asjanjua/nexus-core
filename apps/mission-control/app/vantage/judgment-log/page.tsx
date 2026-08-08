import { PageShell } from "@/components/page-shell";
import { VantageJudgmentLog } from "@/components/vantage-judgment-log";
import { requireWorkspaceId } from "@/lib/safe-auth";

export const metadata = { title: "Advisor Judgment Log | Vantage" };

/** Vantage Red Flag arc, screen 2. Primary user: deal advisor. */
export default async function VantageJudgmentLogPage({
  searchParams,
}: {
  searchParams: Promise<{ deal?: string }>;
}) {
  await requireWorkspaceId("/vantage/judgment-log");
  const { deal } = await searchParams;

  return (
    <PageShell
      title="Advisor Judgment Log"
      description="Who concluded what, when, and on what basis. Append-only: a changed view supersedes its predecessor rather than replacing it, so the sequence survives for the committee."
    >
      <VantageJudgmentLog initialDealId={deal} />
    </PageShell>
  );
}
