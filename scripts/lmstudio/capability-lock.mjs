#!/usr/bin/env node

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..", "..");
const resultsDir = join(rootDir, "docs", "lmstudio", "results");
const outputJson = join(resultsDir, "capability-lock.json");
const outputMd = join(resultsDir, "capability-lock.md");

const LM_BASE_URL = process.env.LM_STUDIO_BASE_URL ?? "http://127.0.0.1:1234";

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch (error) {
    return `ERROR: ${error?.stderr?.toString()?.trim() || error?.message || "unknown_error"}`;
  }
}

async function api(path, init = {}) {
  const response = await fetch(`${LM_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { ok: response.ok, status: response.status, body };
}

function firstLlmModel(modelsJson) {
  if (!Array.isArray(modelsJson)) return null;
  return modelsJson.find((entry) => entry?.model?.type === "llm")?.model?.modelKey ?? null;
}

async function main() {
  mkdirSync(resultsDir, { recursive: true });

  const appVersion = run("defaults read '/Applications/LM Studio.app/Contents/Info' CFBundleShortVersionString");
  const appBuild = run("defaults read '/Applications/LM Studio.app/Contents/Info' CFBundleVersion");
  const lmsPath = run("which lms || true");
  const lmsCliCommit = run("lms --version || true");
  const runtimeLs = run("lms runtime ls || true");
  const runtimeSurvey = run("lms runtime survey || true");
  const serverStatus = run("lms server status 2>&1 || true");
  const hardware = run("system_profiler SPHardwareDataType | sed -n '1,40p' || true");

  const modelsLocalRaw = run("lms ls --llm --variants --json || true");
  let modelsLocal = [];
  try {
    modelsLocal = JSON.parse(modelsLocalRaw);
  } catch {
    modelsLocal = [];
  }

  const probeModel = firstLlmModel(modelsLocal);

  const v1Models = await api("/v1/models");
  const nativeModels = await api("/api/v1/models");

  let loadProbe = {
    attempted: false,
    model: probeModel,
    strictRequest: null,
    strictResponse: null,
    compatibilityRequest: null,
    compatibilityResponse: null,
  };

  if (probeModel) {
    const strictRequest = {
      model: probeModel,
      context_length: 8192,
      echo_load_config: true,
      flash_attention: true,
      num_experts: 8,
      keep_model_in_memory: true,
      llama_k_cache_quantization_type: "q4_0",
      llama_v_cache_quantization_type: "q4_0",
      try_mmap: true,
    };

    const strictResponse = await api("/api/v1/models/load", {
      method: "POST",
      body: JSON.stringify(strictRequest),
    });

    const compatibilityRequest = {
      model: probeModel,
      context_length: 8192,
      echo_load_config: true,
      flash_attention: true,
      num_experts: 8,
    };
    const compatibilityResponse = await api("/api/v1/models/load", {
      method: "POST",
      body: JSON.stringify(compatibilityRequest),
    });

    loadProbe = {
      attempted: true,
      model: probeModel,
      strictRequest,
      strictResponse,
      compatibilityRequest,
      compatibilityResponse,
    };

    run(`lms unload "${probeModel}" || true`);
  }

  const result = {
    generatedAt: new Date().toISOString(),
    baseUrl: LM_BASE_URL,
    runtimeFacts: {
      appVersion,
      appBuild,
      lmsPath,
      lmsCliCommit,
      runtimeLs,
      runtimeSurvey,
      serverStatus,
      hardware,
    },
    modelInventory: {
      localLlmCount: modelsLocal.length,
      localLlms: modelsLocal.map((entry) => ({
        key: entry?.model?.modelKey ?? null,
        format: entry?.model?.format ?? null,
        params: entry?.model?.paramsString ?? null,
        maxContextLength: entry?.model?.maxContextLength ?? null,
      })),
    },
    apiProbes: {
      openaiModels: v1Models,
      nativeModels,
      loadProbe,
    },
  };

  writeFileSync(outputJson, JSON.stringify(result, null, 2));

  const md = `# LM Studio Capability Lock

Generated: ${result.generatedAt}
Base URL: \`${LM_BASE_URL}\`

## Locked Runtime Facts
- LM Studio app version: \`${appVersion}\` (build \`${appBuild}\`)
- LMS CLI: \`${lmsPath}\`
- CLI commit: \`${lmsCliCommit}\`
- Server status: \`${serverStatus}\`

## Runtime Engines
\`\`\`
${runtimeLs}
\`\`\`

## Hardware Survey
\`\`\`
${runtimeSurvey}
\`\`\`

## Local LLM Inventory
- Count: **${result.modelInventory.localLlmCount}**
${result.modelInventory.localLlms
  .map(
    (m) =>
      `- \`${m.key}\` | format=\`${m.format}\` | params=\`${m.params}\` | max_ctx=\`${m.maxContextLength}\``
  )
  .join("\n")}

## MoE/Advanced Load Option Probe
- Probe model: \`${probeModel ?? "none"}\`
- Load attempted: **${loadProbe.attempted ? "yes" : "no"}**
- This probe checks what LM Studio accepts/echoes for keys related to:
  - expert control (\`num_experts\`)
  - KV cache quantization
  - mmap and memory residency behavior

\`\`\`json
${JSON.stringify(loadProbe, null, 2)}
\`\`\`

See machine-readable output: \`docs/lmstudio/results/capability-lock.json\`
`;

  writeFileSync(outputMd, md);
  console.log(`Wrote ${outputJson}`);
  console.log(`Wrote ${outputMd}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
