/**
 * Lightweight Anthropic Claude client using native fetch.
 * No SDK required - calls the Messages API directly.
 * Set ANTHROPIC_API_KEY in your environment.
 *
 * Falls back gracefully when the key is absent (dev / offline mode).
 */

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = process.env.NEXUS_LLM_MODEL ?? "claude-opus-4-6";
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
  return process.env.ANTHROPIC_API_KEY ?? null;
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
    headers: {
      "x-api-key": key,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json"
    },
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
