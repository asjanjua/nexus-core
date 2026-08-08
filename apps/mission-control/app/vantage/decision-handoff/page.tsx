import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { requireWorkspaceId } from "@/lib/safe-auth";
import { VantageDecisionHandoff } from "@/components/vantage-decision-handoff";

export const metadata = { title: "Decision Handoff | Vantage" };

/**
 * Vantage Memo arc, screen 2. Primary user: deal advisor.
 *
 * The enforcement for this screen shipped before the screen did:
 * POST /api/vantage/decision-handoff already refuses to package a committee
 * packet that carries a recommendation posture without a named human behind
 * it. Until now there was no way to exercise that from the product, so the
 * boundary existed and could not be demonstrated.
 *
 * That is the whole point of the screen. It is not a form for approving a
 * deal — Vantage cannot approve one. It is where a machine-assisted posture
 * gets a human's name attached before it reaches an investment committee, and
 * where the refusal is visible when it does not.
 */
export default async function VantageDecisionHandoffPage() {
  await requireWorkspaceId("/vantage/decision-handoff");

  return (
    <PageShell
      title="Decision Handoff"
      description="Package the diligence work for the investment committee. A posture cannot leave without the human who owns it, which the API enforces rather than the form."
    >
      <div className="space-y-4">
        <VantageDecisionHandoff />
        <section className="panel">
          <p className="panel-title">Before you hand off</p>
          <ul className="mt-3 space-y-2 text-sm leading-5 text-nexus-muted">
            <li>
              ·{" "}
              <Link href="/vantage/evidence-depth" className="text-nexus-sky hover:underline" prefetch={false}>
                Check evidence depth
              </Link>{" "}
              — covered is not the same as well-supported.
            </li>
            <li>
              ·{" "}
              <Link href="/vantage/red-flags" className="text-nexus-sky hover:underline" prefetch={false}>
                Resolve or accept red flags
              </Link>{" "}
              — each one needs an owner or an explicit acceptance.
            </li>
            <li>
              ·{" "}
              <Link href="/vantage/ic-memo" className="text-nexus-sky hover:underline" prefetch={false}>
                Write the author sections
              </Link>{" "}
              — judgment sections stay empty until a human writes them.
            </li>
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
