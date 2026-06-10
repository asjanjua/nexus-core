/**
 * Lightweight LLM client using native fetch.
 * Anthropic remains the default Nexus V1 provider. DeepSeek and other
 * OpenAI-compatible providers can be selected with NEXUS_LLM_PROVIDER.
 *
 * Falls back gracefully when the key is absent (dev / offline mode).
 *
 * Every successful call fires a non-blocking write to llm_usage via
 * repository.recordLLMUsage(). This drives the cost monitoring dashboard.
 */

import { repository } from "@/lib/data/repository";
import { isProviderAllowed } from "@/lib/security/ai-policy";

const ANTHROPIC_BASE_URL = (
  process.env.ANTHROPIC_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://api.anthropic.com"
);
const ANTHROPIC_API = `${ANTHROPIC_BASE_URL}/v1/messages`;
const ANTHROPIC_VERSION = "2023-06-01";
type LLMProvider = "anthropic" | "deepseek" | "openai_compatible";

const LLM_PROVIDER = (process.env.NEXUS_LLM_PROVIDER ?? "anthropic").trim().toLowerCase() as LLMProvider;
const DEFAULT_MODEL =
  process.env.NEXUS_LLM_MODEL ??
  (LLM_PROVIDER === "deepseek" ? "deepseek-chat" : "claude-opus-4-6");
const DEEPSEEK_BASE_URL = (
  process.env.DEEPSEEK_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://api.deepseek.com"
);
const OPENAI_COMPAT_BASE_URL = (
  process.env.OPENAI_COMPAT_BASE_URL?.trim().replace(/\/+$/, "") ||
  DEEPSEEK_BASE_URL
);
const MAX_TOKENS = 1024;
const REQUEST_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = Math.max(
  1,
  Number(process.env.NEXUS_LLM_MAX_REQUESTS_PER_MINUTE ?? 30)
);
const DAILY_TOKEN_BUDGET = Math.max(
  1_000,
  Number(process.env.NEXUS_LLM_DAILY_TOKEN_BUDGET ?? 250_000)
);
const MAX_PROMPT_CHARS = Math.max(
  2_000,
  Number(process.env.NEXUS_LLM_MAX_PROMPT_CHARS ?? 80_000)
);

type UsageState = {
  requestWindowStart: number;
  requestCount: number;
  day: string;
  tokenCount: number;
};

// Per-workspace usage tracking. Key "_global_" is used when no workspaceId is provided.
const workspaceUsage = new Map<string, UsageState>();

function getUsageState(workspaceId: string): UsageState {
  if (!workspaceUsage.has(workspaceId)) {
    workspaceUsage.set(workspaceId, {
      requestWindowStart: Date.now(),
      requestCount: 0,
      day: new Date().toISOString().slice(0, 10),
      tokenCount: 0,
    });
  }
  return workspaceUsage.get(workspaceId)!;
}

export type LLMMessage = { role: "user" | "assistant"; content: string };

export type LLMOptions = {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  /** Workspace ID used for per-workspace rate-limiting. Falls back to "_global_" when absent. */
  workspaceId?: string;
  /** API route or call-site label for cost attribution (e.g. "dashboard", "ask", "ingestion"). */
  route?: string;
};

export type LLMResponse = {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  fromFallback: boolean;
};

function normalizeProvider(value: string | undefined | null): LLMProvider {
  const provider = (value ?? "anthropic").trim().toLowerCase();
  if (provider === "deepseek") return "deepseek";
  if (provider === "openai_compatible" || provider === "openai") return "openai_compatible";
  return "anthropic";
}

function apiKey(provider: LLMProvider): string | null {
  if (provider === "deepseek") {
    return process.env.DEEPSEEK_API_KEY ?? null;
  }

  if (provider === "openai_compatible") {
    return process.env.OPENAI_COMPAT_API_KEY ?? process.env.DEEPSEEK_API_KEY ?? null;
  }

  return process.env.ANTHROPIC_API_KEY ?? null;
}

async function resolveProviderForWorkspace(opts: LLMOptions): Promise<LLMProvider> {
  const provider = normalizeProvider(process.env.NEXUS_LLM_PROVIDER);
  if (!opts.workspaceId || opts.workspaceId === "_global_") return provider;
  const settings = await repository.getWorkspaceSettings(opts.workspaceId).catch(() => null);
  if (!settings) return provider;
  if (settings.localOnlyMode) {
    throw new Error(`llm_policy_blocked: workspace ${opts.workspaceId} is in local-only mode`);
  }
  if (!isProviderAllowed(settings, provider)) {
    throw new Error(`llm_provider_denied: ${provider} is not allowed for workspace ${opts.workspaceId}`);
  }
  return provider;
}

function estimateTokens(messages: LLMMessage[], systemPrompt?: string): number {
  const text = `${systemPrompt ?? ""}\n${messages.map((message) => message.content).join("\n")}`;
  return Math.ceil(text.length / 4);
}

function enforceLlmGuardrails(messages: LLMMessage[], opts: LLMOptions): void {
  const workspaceId = opts.workspaceId ?? "_global_";
  const state = getUsageState(workspaceId);

  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  if (state.day !== today) {
    state.day = today;
    state.tokenCount = 0;
  }
  if (now - state.requestWindowStart > REQUEST_WINDOW_MS) {
    state.requestWindowStart = now;
    state.requestCount = 0;
  }

  const promptChars = `${opts.systemPrompt ?? ""}\n${messages.map((message) => message.content).join("\n")}`.length;
  if (promptChars > MAX_PROMPT_CHARS) {
    throw new Error(`llm_prompt_too_large: ${promptChars} chars exceeds ${MAX_PROMPT_CHARS}`);
  }

  const estimatedTokens = estimateTokens(messages, opts.systemPrompt) + (opts.maxTokens ?? MAX_TOKENS);
  if (state.requestCount >= MAX_REQUESTS_PER_WINDOW) {
    throw new Error(`llm_rate_limited: workspace ${workspaceId} reached ${MAX_REQUESTS_PER_WINDOW} requests/minute`);
  }
  if (state.tokenCount + estimatedTokens > DAILY_TOKEN_BUDGET) {
    throw new Error(`llm_budget_exceeded: workspace ${workspaceId} reached daily token budget ${DAILY_TOKEN_BUDGET}`);
  }

  state.requestCount += 1;
  state.tokenCount += estimatedTokens;
}

function reconcileUsage(estimatedMaxTokens: number, actualInput: number, actualOutput: number, workspaceId: string): void {
  const state = getUsageState(workspaceId);
  const actual = actualInput + actualOutput;
  if (actual > 0) {
    state.tokenCount += actual - estimatedMaxTokens;
    if (state.tokenCount < 0) state.tokenCount = 0;
  }
}

/**
 * Estimate cost in micro-USD (millionths of a dollar).
 * Prices are approximate and updated manually. For Anthropic claude-opus-4-6:
 *   Input:  $15/M tokens = 15 micro-USD per token
 *   Output: $75/M tokens = 75 micro-USD per token
 * For DeepSeek-chat the rates are ~10x cheaper. We use a conservative flat rate
 * when the model is unknown to avoid under-counting.
 */
function estimateCostMicro(model: string, inputTokens: number, outputTokens: number): number {
  const m = model.toLowerCase();
  if (m.includes("opus")) {
    return Math.round(inputTokens * 15 + outputTokens * 75);
  }
  if (m.includes("sonnet")) {
    return Math.round(inputTokens * 3 + outputTokens * 15);
  }
  if (m.includes("haiku")) {
    return Math.round(inputTokens * 0.25 + outputTokens * 1.25);
  }
  if (m.includes("deepseek")) {
    return Math.round(inputTokens * 0.14 + outputTokens * 0.28);
  }
  // Unknown model — use a mid-range conservative estimate
  return Math.round(inputTokens * 3 + outputTokens * 15);
}

function persistUsage(
  model: string,
  inputTokens: number,
  outputTokens: number,
  workspaceId: string,
  route: string
): void {
  if (inputTokens === 0 && outputTokens === 0) return;
  const costUsdMicro = estimateCostMicro(model, inputTokens, outputTokens);
  // Fire-and-forget — never let cost tracking block the LLM response
  repository.recordLLMUsage({
    workspaceId,
    model,
    route: route || "unknown",
    inputTokens,
    outputTokens,
    costUsdMicro,
  }).catch(() => undefined);
}

function buildHeaders(key: string): Record<string, string> {
  const headers: Record<string, string> = {
    "x-api-key": key,
    "anthropic-version": ANTHROPIC_VERSION,
    "content-type": "application/json"
  };

  const gatewayToken = process.env.CLOUDFLARE_AI_GATEWAY_TOKEN?.trim();
  if (gatewayToken) {
    // Cloudflare AI Gateway supports authenticated gateways with this header.
    headers["cf-aig-authorization"] = `Bearer ${gatewayToken}`;
  }

  return headers;
}

function buildOpenAICompatibleHeaders(key: string): Record<string, string> {
  return {
    authorization: `Bearer ${key}`,
    "content-type": "application/json"
  };
}

async function callOpenAICompatible(
  messages: LLMMessage[],
  opts: LLMOptions,
  provider: "deepseek" | "openai_compatible"
): Promise<LLMResponse> {
  const key = apiKey(provider);

  if (!key) {
    return {
      text: `[LLM unavailable - set ${provider === "deepseek" ? "DEEPSEEK_API_KEY" : "OPENAI_COMPAT_API_KEY"} to enable AI synthesis]`,
      model: "none",
      inputTokens: 0,
      outputTokens: 0,
      fromFallback: true
    };
  }

  const baseUrl = provider === "deepseek" ? DEEPSEEK_BASE_URL : OPENAI_COMPAT_BASE_URL;
  const model = opts.model ?? DEFAULT_MODEL ?? (provider === "deepseek" ? "deepseek-chat" : "");
  const requestMessages = [
    ...(opts.systemPrompt ? [{ role: "system", content: opts.systemPrompt }] : []),
    ...messages.map((m) => ({ role: m.role, content: m.content }))
  ];

  const maxTokens = opts.maxTokens ?? MAX_TOKENS;
  const estimatedMaxTokens = estimateTokens(messages, opts.systemPrompt) + maxTokens;
  enforceLlmGuardrails(messages, opts);

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: buildOpenAICompatibleHeaders(key),
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: opts.temperature ?? 0.2,
      messages: requestMessages
    })
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`${provider} API error ${res.status}: ${err}`);
  }

  const json = (await res.json()) as {
    model?: string;
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const inputTok = json.usage?.prompt_tokens ?? 0;
  const outputTok = json.usage?.completion_tokens ?? 0;
  const resolvedModel = json.model ?? model;
  reconcileUsage(estimatedMaxTokens, inputTok, outputTok, opts.workspaceId ?? "_global_");
  persistUsage(resolvedModel, inputTok, outputTok, opts.workspaceId ?? "_global_", opts.route ?? "unknown");

  return {
    text: (json.choices?.[0]?.message?.content ?? "").trim(),
    model: resolvedModel,
    inputTokens: inputTok,
    outputTokens: outputTok,
    fromFallback: false
  };
}

/**
 * Call Claude with a system prompt + user messages.
 * Returns a fallback marker when the key is missing so callers
 * can degrade gracefully rather than throw.
 */
export async function callLLM(
  messages: LLMMessage[],
  opts: LLMOptions = {}
): Promise<LLMResponse> {
  const provider = await resolveProviderForWorkspace(opts);
  if (provider === "deepseek" || provider === "openai_compatible") {
    return callOpenAICompatible(messages, opts, provider);
  }

  const key = apiKey(provider);

  if (!key) {
    return {
      text: "[LLM unavailable – set ANTHROPIC_API_KEY to enable AI synthesis]",
      model: "none",
      inputTokens: 0,
      outputTokens: 0,
      fromFallback: true
    };
  }

  const maxTokens = opts.maxTokens ?? MAX_TOKENS;
  const estimatedMaxTokens = estimateTokens(messages, opts.systemPrompt) + maxTokens;
  enforceLlmGuardrails(messages, opts);

  const body = {
    model: opts.model ?? DEFAULT_MODEL,
    max_tokens: maxTokens,
    temperature: opts.temperature ?? 0.2,
    ...(opts.systemPrompt ? { system: opts.systemPrompt } : {}),
    messages: messages.map((m) => ({ role: m.role, content: m.content }))
  };

  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: buildHeaders(key),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const json = (await res.json()) as {
    content: Array<{ type: string; text: string }>;
    model: string;
    usage: { input_tokens: number; output_tokens: number };
  };

  const text = json.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  reconcileUsage(estimatedMaxTokens, json.usage.input_tokens, json.usage.output_tokens, opts.workspaceId ?? "_global_");
  persistUsage(json.model, json.usage.input_tokens, json.usage.output_tokens, opts.workspaceId ?? "_global_", opts.route ?? "unknown");

  return {
    text,
    model: json.model,
    inputTokens: json.usage.input_tokens,
    outputTokens: json.usage.output_tokens,
    fromFallback: false
  };
}

/**
 * Convenience: single-turn ask with a system prompt.
 */
export async function ask(
  userPrompt: string,
  systemPrompt: string,
  opts: Omit<LLMOptions, "systemPrompt"> = {}
): Promise<string> {
  const r = await callLLM([{ role: "user", content: userPrompt }], {
    ...opts,
    systemPrompt
  });
  return r.text;
}
