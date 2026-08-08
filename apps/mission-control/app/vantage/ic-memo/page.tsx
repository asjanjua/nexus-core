import { PageShell } from "@/components/page-shell";
import { VantageIcMemoBuilder } from "@/components/vantage-ic-memo-builder";
import { requireWorkspaceId } from "@/lib/safe-auth";

export const metadata = { title: "IC Memo Builder | Vantage" };

/**
 * Vantage Memo arc, screen 1. Primary user: deal advisor.
 *
 * The diligence runner has been drafting these sections on every run and
 * discarding them, while the Deal Room hub displayed an invented "5/8 memo
 * sections" in their place. This surfaces the real drafts.
 */
export default async function VantageIcMemoPage() {
  await requireWorkspaceId("/vantage/ic-memo");

  return (
    <PageShell
      title="IC Memo Builder"
      description="Memo sections drafted from cited evidence, with the judgment sections left deliberately empty for the named author. Vantage drafts; it does not recommend, approve, or reject."
    >
      <VantageIcMemoBuilder />
    </PageShell>
  );
}
