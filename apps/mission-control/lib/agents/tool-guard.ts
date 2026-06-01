import type { ActionRight, AgentControlProfile } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { canUseTool, type PolicyDecision } from "@/lib/agents/passport-policy";

export async function guardToolInvocation(
  workspaceId: string,
  passport: AgentControlProfile,
  tool: string,
  requestedAction: ActionRight,
  actor = passport.agentKey
): Promise<PolicyDecision> {
  const decision = canUseTool(tool, passport, requestedAction);
  if (!decision.allowed) {
    await repository.pushAudit({
      workspaceId,
      type: "agent_tool_denied",
      actor,
      payload: {
        agentKey: passport.agentKey,
        tool,
        requestedAction,
        reason: decision.reason
      }
    });
  }
  return decision;
}
