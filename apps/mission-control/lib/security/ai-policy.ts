import type { WorkspaceSettings } from "@/lib/contracts";

export function isProviderAllowed(settings: WorkspaceSettings, provider: string): boolean {
  if (settings.localOnlyMode) return provider === "local";
  return settings.allowedProviders.includes(provider as WorkspaceSettings["allowedProviders"][number]);
}

export function shouldRouteOutputToReview(settings: WorkspaceSettings, confidence: number): boolean {
  return confidence < settings.approvalRequiredThreshold;
}
