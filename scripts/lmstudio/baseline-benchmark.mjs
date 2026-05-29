#!/usr/bin/env node

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..", "..");
const resultsDir = join(rootDir, "docs", "lmstudio", "results");
const outputJson = join(resultsDir, "baseline-benchmark.json");
const outputMd = join(resultsDir, "baseline-benchmark.md");
const LM_BASE_URL = process.env.LM_STUDIO_BASE_URL ?? "http://127.0.0.1:1234";
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS ?? "90000");

const DEFAULT_MODELS = ["qwen/qwen3-14b", "google/gemma-3-12b"];
const CONTEXT_LADDER = (process.env.CONTEXT_LADDER ?? "8192,16384,32768")
  .split(",")
  .map((v) => Number(v.trim()))
  .filter((v) => Number.isFinite(v) && v > 0);
const STABILITY_MINUTES = Number(process.env.STABILITY_MINUTES ?? "20");
const STABILITY_MODEL = process.env.STABILITY_MODEL ?? "qwen/qwen3-14b";

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch (error) {
    return `ERROR: ${error?.stderr?.toString()?.trim() || error?.message || "unknown_error"}`;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseSwapUsedMB(swapRaw) {
  // Example:
  // vm.swapusage: total = 4096.00M  used = 433.31M  free = 3662.69M
  const match = /used = ([0-9.]+)([MG])/i.exec(swapRaw);
  if (!match) return null;
  const value = Number(match[1]);
  return match[2].toUpperCase() === "G" ? value * 1024 : value;
}

function snapshotMemory() {
  const swapRaw = run("sysctl -n vm.swapusage");
  const vmStat = run("vm_stat");
  return {
    timestamp: new Date().toISOString(),
    swapRaw,
    swapUsedMB: parseSwapUsedMB(swapRaw),
    vmStat,
  };
}

async function api(path, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${LM_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { ok: response.ok, status: response.status, body };
}

async function loadModel(model, contextLength) {
  const body = {
    model,
    context_length: contextLength,
    parallel: 1,
    flash_attention: true,
    echo_load_config: true,
  };
  return api("/api/v1/models/load", { method: "POST", body: JSON.stringify(body) });
}

function completionRequest(model, maxTokens, stream = false) {
  return {
    model,
    stream,
    temperature: 0.2,
    top_p: 0.95,
    max_tokens: maxTokens,
    messages: [
      {
        role: "system",
        content:
          "You are a concise enterprise analyst. Answer with short, factual bullet points.",
      },
      {
        role: "user",
        content:
          "Summarize top execution risks, owners, and one mitigation per risk for a weekly operating review.",
      },
    ],
  };
}

async function measureTTFT(model) {
  const payload = completionRequest(model, 140, true);
  const start = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${LM_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    return { ok: false, error: `stream_exception:${error?.message || "unknown_error"}` };
  }
  clearTimeout(timeout);
  if (!response.ok || !response.body) {
    return { ok: false, error: `stream_failed_status_${response.status}` };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let ttftMs = null;
  let generatedChars = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const obj = JSON.parse(raw);
        const delta = obj?.choices?.[0]?.delta?.content ?? "";
        if (delta && ttftMs === null) {
          ttftMs = performance.now() - start;
        }
        if (delta) generatedChars += delta.length;
      } catch {
        // ignore parse line issues
      }
    }
  }

  return {
    ok: true,
    ttftMs: ttftMs === null ? null : Number(ttftMs.toFixed(1)),
    streamChars: generatedChars,
  };
}

async function measureThroughput(model) {
  const payload = completionRequest(model, 220, false);
  const start = performance.now();
  let response;
  try {
    response = await api("/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return { ok: false, error: `nonstream_exception:${error?.message || "unknown_error"}` };
  }
  const elapsedMs = performance.now() - start;

  if (!response.ok) {
    return { ok: false, error: `nonstream_failed_status_${response.status}`, raw: response.body };
  }

  const completionTokens = Number(response.body?.usage?.completion_tokens ?? 0);
  const tps =
    elapsedMs > 0 ? Number(((completionTokens * 1000) / elapsedMs).toFixed(2)) : null;

  return {
    ok: true,
    elapsedMs: Number(elapsedMs.toFixed(1)),
    completionTokens,
    promptTokens: Number(response.body?.usage?.prompt_tokens ?? 0),
    tokensPerSecond: tps,
  };
}

async function warmup(model) {
  await api("/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify(completionRequest(model, 48, false)),
  });
}

async function getModelCatalog() {
  const raw = run("lms ls --llm --variants --json || true");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function runStability(model, minutes) {
  const deadline = Date.now() + minutes * 60_000;
  const samples = [];
  let failures = 0;
  let loop = 0;

  while (Date.now() < deadline) {
    loop += 1;
    const start = performance.now();
    let response;
    try {
      response = await api("/v1/chat/completions", {
        method: "POST",
        body: JSON.stringify(completionRequest(model, 100, false)),
      });
    } catch (error) {
      response = { ok: false, status: 599, body: `exception:${error?.message || "unknown_error"}` };
    }
    const elapsedMs = Number((performance.now() - start).toFixed(1));
    if (!response.ok) failures += 1;

    samples.push({
      loop,
      timestamp: new Date().toISOString(),
      ok: response.ok,
      elapsedMs,
      completionTokens: Number(response.body?.usage?.completion_tokens ?? 0),
      swapUsedMB: snapshotMemory().swapUsedMB,
    });

    await sleep(15_000);
  }

  const successRate = samples.length ? (samples.length - failures) / samples.length : 0;
  return {
    model,
    minutes,
    requests: samples.length,
    failures,
    successRate: Number((successRate * 100).toFixed(2)),
    samples,
  };
}

async function main() {
  mkdirSync(resultsDir, { recursive: true });

  const catalog = await getModelCatalog();
  const availableKeys = new Set(
    catalog.map((entry) => entry?.model?.modelKey).filter(Boolean)
  );
  const candidateModels = DEFAULT_MODELS.filter((m) => availableKeys.has(m));

  if (candidateModels.length === 0) {
    throw new Error("No default benchmark models are available locally.");
  }

  const benchmarkRows = [];
  const startSnapshot = snapshotMemory();

  for (const model of candidateModels) {
    const entry = catalog.find((x) => x?.model?.modelKey === model);
    const maxCtx = Number(entry?.model?.maxContextLength ?? 8192);

    for (const contextLength of CONTEXT_LADDER) {
      if (contextLength > maxCtx) continue;

      const load = await loadModel(model, contextLength);
      if (!load.ok) {
        benchmarkRows.push({
          model,
          contextLength,
          loadOk: false,
          loadError: load.body,
        });
        continue;
      }

      let ttft;
      let throughput;
      let benchError = null;
      const before = snapshotMemory();
      try {
        await warmup(model);
        ttft = await measureTTFT(model);
        throughput = await measureThroughput(model);
      } catch (error) {
        benchError = error?.message || "unknown_benchmark_error";
        ttft = { ok: false, error: benchError };
        throughput = { ok: false, error: benchError };
      }
      const after = snapshotMemory();

      benchmarkRows.push({
        model,
        contextLength,
        loadOk: true,
        loadConfigEcho: load.body?.load_config ?? null,
        ttft,
        throughput,
        benchError,
        memory: {
          beforeSwapMB: before.swapUsedMB,
          afterSwapMB: after.swapUsedMB,
          deltaSwapMB:
            before.swapUsedMB != null && after.swapUsedMB != null
              ? Number((after.swapUsedMB - before.swapUsedMB).toFixed(2))
              : null,
        },
      });
    }

    run(`lms unload "${model}" || true`);
  }

  // Stability gate on one chosen model, fallback to first benchmark model.
  const stabilityModel = availableKeys.has(STABILITY_MODEL)
    ? STABILITY_MODEL
    : candidateModels[0];

  const stabilityLoad = await loadModel(stabilityModel, 8192);
  const stability = stabilityLoad.ok
    ? await runStability(stabilityModel, STABILITY_MINUTES)
    : {
        model: stabilityModel,
        minutes: STABILITY_MINUTES,
        requests: 0,
        failures: 0,
        successRate: 0,
        error: "failed_to_load_stability_model",
        loadError: stabilityLoad.body,
      };
  run(`lms unload "${stabilityModel}" || true`);

  const endSnapshot = snapshotMemory();

  const result = {
    generatedAt: new Date().toISOString(),
    baseUrl: LM_BASE_URL,
    baselinePolicy: {
      flashAttention: true,
      kvCacheQuantization: "probe-only in LM Studio native load (model/runtime dependent)",
      speculativeDecoding: "disabled",
      contextLadder: CONTEXT_LADDER,
    },
    modelsBenchmarked: candidateModels,
    benchmarkRows,
    stability,
    memoryGate: {
      startSwapMB: startSnapshot.swapUsedMB,
      endSwapMB: endSnapshot.swapUsedMB,
      totalDeltaSwapMB:
        startSnapshot.swapUsedMB != null && endSnapshot.swapUsedMB != null
          ? Number((endSnapshot.swapUsedMB - startSnapshot.swapUsedMB).toFixed(2))
          : null,
      note: "No sustained swap-thrashing target means swap should not continually climb with repeated requests.",
    },
  };

  writeFileSync(outputJson, JSON.stringify(result, null, 2));

  const rowsMd = result.benchmarkRows
    .map((r) => {
      if (!r.loadOk) return `| ${r.model} | ${r.contextLength} | load_failed | - | - | - |`;
      return `| ${r.model} | ${r.contextLength} | ${r.ttft?.ttftMs ?? "n/a"} | ${
        r.throughput?.tokensPerSecond ?? "n/a"
      } | ${r.memory?.beforeSwapMB ?? "n/a"} | ${r.memory?.afterSwapMB ?? "n/a"} |`;
    })
    .join("\n");

  const md = `# LM Studio Baseline Benchmark

Generated: ${result.generatedAt}
Base URL: \`${LM_BASE_URL}\`

## Baseline Policy
- Flash Attention: enabled
- Speculative decoding: disabled
- Context ladder: ${CONTEXT_LADDER.join(" -> ")}

## Benchmark Table
| Model | Context | TTFT (ms) | Tokens/sec | Swap Before (MB) | Swap After (MB) |
|---|---:|---:|---:|---:|---:|
${rowsMd}

## Stability Gate
- Model: \`${result.stability.model}\`
- Duration: ${result.stability.minutes} minutes
- Requests: ${result.stability.requests}
- Failures: ${result.stability.failures}
- Success rate: ${result.stability.successRate}%

## Memory Gate
- Start swap: ${result.memoryGate.startSwapMB ?? "n/a"} MB
- End swap: ${result.memoryGate.endSwapMB ?? "n/a"} MB
- Delta swap: ${result.memoryGate.totalDeltaSwapMB ?? "n/a"} MB

See machine-readable output: \`docs/lmstudio/results/baseline-benchmark.json\`
`;

  writeFileSync(outputMd, md);
  console.log(`Wrote ${outputJson}`);
  console.log(`Wrote ${outputMd}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
