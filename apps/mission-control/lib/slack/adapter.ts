import { store } from "@/lib/data/store";
import { answerWithEvidence } from "@/lib/services/retrieval";

type SlackEventInput = {
  workspaceId: string;
  userId: string;
  threadId: string;
  text: string;
};

export async function handleSlackAsk(event: SlackEventInput) {
  const response = await answerWithEvidence(event.text, event.workspaceId);

  const safety = store.checkSlackSafety(response.answer, response.evidenceRefs);
  if (!safety.safe) {
    store.pushAudit({
      workspaceId: event.workspaceId,
      type: "slack_blocked_by_policy",
      actor: "slack_adapter",
      payload: { threadId: event.threadId, reason: safety.reason }
    });

    return {
      ok: false,
      message: "Sensitive or restricted evidence detected. Please review in Mission Control.",
      link: "/review"
    };
  }

  store.pushAudit({
    workspaceId: event.workspaceId,
    type: "slack_reply_sent",
    actor: "slack_adapter",
    payload: { threadId: event.threadId, evidenceRefs: response.evidenceRefs }
  });

  return {
    ok: true,
    message: response.answer,
    evidenceRefs: response.evidenceRefs,
    link: "/ask"
  };
}
