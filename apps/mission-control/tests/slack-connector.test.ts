import { afterEach, describe, expect, it, vi } from "vitest";
import { repository } from "@/lib/data/repository";
import { handleSlackConnectorEvent } from "@/lib/slack/adapter";

describe("Slack connector ingestion", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips direct messages instead of ingesting private Slack content", async () => {
    vi.stubEnv("NEXUS_SLACK_INGEST_ALL", "enabled");
    const workspaceId = `workspace-slack-dm-${Date.now()}`;

    const response = await handleSlackConnectorEvent({
      workspaceId,
      userId: "U123",
      threadId: "1744.1001",
      type: "message",
      channel: "D123",
      channelType: "im",
      timestamp: "1744.1001",
      text: "Private message that must not enter Nexus evidence."
    });

    expect(response).toMatchObject({
      ok: true,
      mode: "ignored",
      reason: "direct_messages_not_ingested"
    });
    const evidence = await repository.getEvidenceForWorkspace(workspaceId);
    expect(evidence).toHaveLength(0);
  });

  it("skips channel messages when Slack ingestion is not explicitly enabled or allowlisted", async () => {
    const workspaceId = `workspace-slack-off-${Date.now()}`;

    const response = await handleSlackConnectorEvent({
      workspaceId,
      userId: "U123",
      threadId: "1744.1002",
      type: "message",
      channel: "C123",
      channelType: "channel",
      timestamp: "1744.1002",
      text: "Ops blocker: onboarding handoffs are delayed this week."
    });

    expect(response).toMatchObject({
      ok: true,
      mode: "ignored",
      reason: "channel_not_allowlisted"
    });
    const evidence = await repository.getEvidenceForWorkspace(workspaceId);
    expect(evidence).toHaveLength(0);
  });

  it("ingests allowlisted channel messages as governed evidence", async () => {
    vi.stubEnv("SLACK_INGEST_CHANNELS", "C-OPS");
    const workspaceId = `workspace-slack-ingest-${Date.now()}`;

    const response = await handleSlackConnectorEvent({
      workspaceId,
      userId: "U123",
      threadId: "1744.1003",
      type: "message",
      channel: "C-OPS",
      channelType: "channel",
      timestamp: "1744.1003",
      text: "Operations blocker: KYC handoff delays are causing onboarding risk and need owner follow-up."
    });

    expect(response).toMatchObject({
      ok: true,
      mode: "ingested",
      ingestionStatus: "processed"
    });

    const evidence = await repository.getEvidenceForWorkspace(workspaceId);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      sourceType: "slack",
      sourcePath: "slack://C-OPS/1744.1003",
      sourceUri: "slack://C-OPS/1744.1003",
      connectorInstanceId: "slack:C-OPS",
      department: "operations",
      sensitivity: "confidential",
      ingestionStatus: "processed"
    });
    expect(evidence[0]?.hash).toMatch(/^sha256:/);
  });

  it("uses connector policy allowlists and sensitivity ceilings before environment defaults", async () => {
    vi.stubEnv("SLACK_INGEST_CHANNELS", "C-OTHER");
    const workspaceId = `workspace-slack-policy-${Date.now()}`;
    await repository.upsertConnector({
      workspaceId,
      type: "slack",
      installedBy: "tester",
      config: {
        allowedChannels: ["C-POLICY"],
        defaultSensitivity: "confidential",
        maxSensitivity: "internal",
        sourcePolicy: "read_only"
      }
    });

    const response = await handleSlackConnectorEvent({
      workspaceId,
      userId: "U123",
      threadId: "1744.1005",
      type: "message",
      channel: "C-POLICY",
      channelType: "channel",
      timestamp: "1744.1005",
      text: "Board risk: budget pressure and vendor contract changes need leadership attention."
    });

    expect(response).toMatchObject({
      ok: true,
      mode: "ingested",
      ingestionStatus: "processed"
    });
    const evidence = await repository.getEvidenceForWorkspace(workspaceId);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]?.sensitivity).toBe("internal");
  });

  it("blocks Slack ingestion when the connector source policy is disabled", async () => {
    vi.stubEnv("NEXUS_SLACK_INGEST_ALL", "enabled");
    const workspaceId = `workspace-slack-disabled-${Date.now()}`;
    await repository.upsertConnector({
      workspaceId,
      type: "slack",
      installedBy: "tester",
      config: {
        allowedChannels: ["C-DISABLED"],
        sourcePolicy: "disabled"
      }
    });

    const response = await handleSlackConnectorEvent({
      workspaceId,
      userId: "U123",
      threadId: "1744.1006",
      type: "message",
      channel: "C-DISABLED",
      channelType: "channel",
      timestamp: "1744.1006",
      text: "This should be blocked by connector policy."
    });

    expect(response).toMatchObject({
      ok: true,
      mode: "ignored",
      reason: "connector_disabled_by_policy"
    });
    const evidence = await repository.getEvidenceForWorkspace(workspaceId);
    expect(evidence).toHaveLength(0);
  });

  it("keeps app mentions on the Ask path instead of storing them as source evidence", async () => {
    const workspaceId = "workspace-demo";
    const before = await repository.getEvidenceForWorkspace(workspaceId);

    const response = await handleSlackConnectorEvent({
      workspaceId,
      userId: "U123",
      threadId: "1744.1004",
      type: "app_mention",
      channel: "C-OPS",
      channelType: "channel",
      timestamp: "1744.1004",
      text: "top risks pricing"
    });

    expect(response.mode).toBe("ask");
    const after = await repository.getEvidenceForWorkspace(workspaceId);
    expect(after).toHaveLength(before.length);
  });
});
