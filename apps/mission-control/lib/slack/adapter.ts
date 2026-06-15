import crypto from "crypto";
import { repository } from "@/lib/data/repository";
import { store } from "@/lib/data/store";
import type { Sensitivity } from "@/lib/contracts";
import { ingestEvidence } from "@/lib/services/ingestion";
import { answerWithEvidence } from "@/lib/services/retrieval";

type SlackEventInput = {
  workspaceId: string;
  userId: string;
  threadId: string;
  text: string;
};

export type SlackConnectorEventInput = SlackEventInput & {
  type?: string;
  subtype?: string;
  channel?: string;
  channelType?: string;
  timestamp?: string;
};

const SKIPPED_SUBTYPES = new Set([
  "bot_message",
  "channel_join",
  "channel_leave",
  "message_changed",
  "message_deleted"
]);

const SENSITIVITY_RANK: Record<Sensitivity, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
};

function allowedSlackChannels(): Set<string> {
  return new Set(
    (process.env.SLACK_INGEST_CHANNELS ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function isIngestAllEnabled(): boolean {
  return process.env.NEXUS_SLACK_INGEST_ALL === "enabled";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function asSensitivity(value: unknown): Sensitivity | null {
  return value === "public" ||
    value === "internal" ||
    value === "confidential" ||
    value === "restricted"
    ? value
    : null;
}

async function slackConnectorPolicy(workspaceId: string) {
  const connector = (await repository.listConnectors(workspaceId)).find(
    (item) => item.type === "slack" && item.status === "active"
  );
  const config = connector?.config ?? {};
  return {
    allowedChannels: asStringArray(config.allowedChannels),
    ingestAllPublicChannels: config.ingestAllPublicChannels === true,
    defaultSensitivity: asSensitivity(config.defaultSensitivity),
    maxSensitivity: asSensitivity(config.maxSensitivity) ?? "confidential",
    sourcePolicy: typeof config.sourcePolicy === "string" ? config.sourcePolicy : "read_only",
  };
}

function slackTimestampToIso(timestamp?: string): string {
  const seconds = Number(timestamp?.split(".")[0]);
  if (!Number.isFinite(seconds) || seconds <= 0) return new Date().toISOString();
  return new Date(seconds * 1000).toISOString();
}

function confidenceForSlackText(text: string): number {
  const normalized = text.replace(/<[^>]+>/g, " ").trim();
  if (normalized.length >= 80) return 0.86;
  if (normalized.length >= 24) return 0.78;
  return 0.58;
}

function departmentForSlack(channel?: string, text = ""): string | undefined {
  const haystack = `${channel ?? ""} ${text}`.toLowerCase();
  if (/(finance|budget|pricing|revenue|margin|cfo)/.test(haystack)) return "finance";
  if (/(sales|growth|pipeline|proposal|partnership|customer)/.test(haystack)) return "growth";
  if (/(ops|operations|delivery|blocker|process|handoff|workflow)/.test(haystack)) return "operations";
  if (/(risk|audit|policy|compliance|regulatory|legal)/.test(haystack)) return "risk";
  if (/(tech|data|security|engineering|platform|infra)/.test(haystack)) return "technology";
  return undefined;
}

function defaultSensitivityForSlack(text: string): Sensitivity {
  const lower = text.toLowerCase();
  if (/(password|secret|token|api key|private key|ssn|cnic|passport)/.test(lower)) {
    return "restricted";
  }
  if (/(confidential|board|legal|regulatory|pricing|budget|payroll)/.test(lower)) {
    return "confidential";
  }
  return "internal";
}

function applySensitivityPolicy(detected: Sensitivity, fallback: Sensitivity | null, ceiling: Sensitivity): Sensitivity {
  const withDefault = detected === "internal" && fallback ? fallback : detected;
  if (SENSITIVITY_RANK[withDefault] > SENSITIVITY_RANK[ceiling]) return ceiling;
  return withDefault;
}

async function auditSlackSkip(
  workspaceId: string,
  reason: string,
  event: Pick<SlackConnectorEventInput, "channel" | "threadId" | "timestamp" | "type" | "subtype">
) {
  await repository.pushAudit({
    workspaceId,
    type: "slack_message_skipped",
    actor: "slack_connector",
    payload: {
      reason,
      channel: event.channel ?? null,
      threadId: event.threadId,
      timestamp: event.timestamp ?? null,
      eventType: event.type ?? null,
      subtype: event.subtype ?? null
    }
  });
}

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

export async function handleSlackConnectorEvent(event: SlackConnectorEventInput) {
  const text = event.text.trim();
  if (!text) {
    await auditSlackSkip(event.workspaceId, "missing_text", event);
    return { ok: true, mode: "ignored", reason: "missing_text" };
  }

  if (event.type === "app_mention") {
    const response = await handleSlackAsk(event);
    return { ...response, mode: "ask" };
  }

  if (event.type !== "message") {
    await auditSlackSkip(event.workspaceId, "unsupported_event_type", event);
    return { ok: true, mode: "ignored", reason: "unsupported_event_type" };
  }

  if (event.channelType === "im" || event.channelType === "mpim") {
    await auditSlackSkip(event.workspaceId, "direct_messages_not_ingested", event);
    return { ok: true, mode: "ignored", reason: "direct_messages_not_ingested" };
  }

  if (event.subtype && SKIPPED_SUBTYPES.has(event.subtype)) {
    await auditSlackSkip(event.workspaceId, `subtype_${event.subtype}_ignored`, event);
    return { ok: true, mode: "ignored", reason: `subtype_${event.subtype}_ignored` };
  }

  const policy = await slackConnectorPolicy(event.workspaceId);
  if (policy.sourcePolicy === "disabled") {
    await auditSlackSkip(event.workspaceId, "connector_disabled_by_policy", event);
    return { ok: true, mode: "ignored", reason: "connector_disabled_by_policy" };
  }

  const configuredAllowed = policy.allowedChannels.length
    ? new Set(policy.allowedChannels)
    : allowedSlackChannels();
  const envIngestAll = isIngestAllEnabled();
  const channelAllowed =
    Boolean(event.channel) &&
    (configuredAllowed.has(event.channel!) ||
      (configuredAllowed.size === 0 && (policy.ingestAllPublicChannels || envIngestAll)));
  if (!channelAllowed) {
    await auditSlackSkip(event.workspaceId, "channel_not_allowlisted", event);
    return { ok: true, mode: "ignored", reason: "channel_not_allowlisted" };
  }

  const sourceTimestamp = slackTimestampToIso(event.timestamp);
  const sourcePath = `slack://${event.channel}/${event.threadId || event.timestamp || "message"}`;
  const hash = `sha256:${crypto
    .createHash("sha256")
    .update(`${event.workspaceId}:${event.channel}:${event.timestamp}:${text}`)
    .digest("hex")}`;

  const record = await ingestEvidence({
    workspaceId: event.workspaceId,
    tenantId: event.workspaceId,
    sourceType: "slack",
    department: departmentForSlack(event.channel, text),
    connectorInstanceId: `slack:${event.channel}`,
    sourcePath,
    sourceUri: sourcePath,
    sourceTimestamp,
    hash,
    sensitivity: applySensitivityPolicy(
      defaultSensitivityForSlack(text),
      policy.defaultSensitivity,
      policy.maxSensitivity
    ),
    extractionConfidence: confidenceForSlackText(text),
    text
  });

  await repository.pushAudit({
    workspaceId: event.workspaceId,
    type: "slack_message_ingested",
    actor: "slack_connector",
    payload: {
      evidenceId: record.id,
      channel: event.channel ?? null,
      threadId: event.threadId,
      timestamp: event.timestamp ?? null,
      ingestionStatus: record.ingestionStatus,
      sensitivity: record.sensitivity
    }
  });

  return {
    ok: true,
    mode: "ingested",
    evidenceId: record.id,
    ingestionStatus: record.ingestionStatus
  };
}
