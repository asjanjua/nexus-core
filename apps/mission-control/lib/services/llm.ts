/**
 * Lightweight LLM client using native fetch.
 * Anthropic remains the default Nexus V1 provider. DeepSeek and other
 * OpenAI-compatible providers can be selected with NEXUS_LLM_PROVIDER.
 *
 * Falls back gracefully when the key is absent (dev / offline mode).
 */

const ANTHROPIC_BASE_URL = (
  process.env.ANTHROPIC_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://api.anthropic.com"
);
const ANTHROPIC_API = `${ANTHROPIC_BASE_URL}/v1/messages`;
const ANTHROPIC_VERSION = "2023-06-01";
const LLM_PROVIDER = (process.env.NEXUS_LLM_PROVIDER ?? "anthropic").trim().toLowerCase();
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

export type LLMMessage = { role: "user" | "assistant"; content: string };

export type LLMOptions = {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
};

export type LLMResponse = {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  fromFallback: boolean;
};

function apiKey(): string | null {
  if (LLM_PROVIDER === "deepseek") {
    return process.env.DEEPSEEK_API_KEY ?? null;
  }

  if (LLM_PROVIDER === "openai_compatible") {
    return process.env.OPENAI_COMPAT_API_KEY ?? process.env.DEEPSEEK_API_KEY ?? null;
  }

  return process.env.ANTHROPIC_API_KEY ?? null;
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
  const key = apiKey();

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

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: buildOpenAICompatibleHeaders(key),
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? MAX_TOKENS,
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

  return {
    text: (json.choices?.[0]?.message?.content ?? "").trim(),
    model: json.model ?? model,
    inputTokens: json.usage?.prompt_tokens ?? 0,
    outputTokens: json.usage?.completion_tokens ?? 0,
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
  if (LLM_PROVIDER === "deepseek" || LLM_PROVIDER === "openai_compatible") {
    return callOpenAICompatible(messages, opts, LLM_PROVIDER);
  }

  const key = apiKey();

  if (!key) {
    return {
      text: "[LLM unavailable – set ANTHROPIC_API_KEY to enable AI synthesis]",
      model: "none",
      inputTokens: 0,
      outputTokens: 0,
      fromFallback: true
    };
  }

  const body = {
    model: opts.model ?? DEFAULT_MODEL,
    max_tokens: opts.maxTokens ?? MAX_TOKENS,
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
