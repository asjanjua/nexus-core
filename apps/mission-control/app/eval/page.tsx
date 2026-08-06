import { PageShell } from "@/components/page-shell";
import { EvalScorecard } from "@/components/eval-scorecard";

/**
 * /eval — Trusted eval scorecard. Displays golden-set agent quality metrics
 * across groundedness, keyword accuracy, confidence, and latency.
 * Powered by the eval harness (lib/eval/harness.ts) and golden set.
 */
export default function EvalPage() {
  return (
    <PageShell
      title="Trusted Eval Scorecard"
      description="Golden-set agent quality: groundedness, keyword accuracy, confidence, and latency across eval cases."
    >
      <EvalScorecard />
    </PageShell>
  );
}
