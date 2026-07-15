#!/usr/bin/env node

import { rmSync } from "node:fs";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const appRoot = join(root, "apps/mission-control");
const nodeMajor = Number(process.versions.node.split(".")[0]);

if (nodeMajor !== 24) {
  console.warn(
    `[verify-build] Node ${process.versions.node} detected; Node 24 is the Render/primary CI baseline. ` +
      "Node 22.12+ is compatibility-only; run `nvm use` for production parity.",
  );
}

function diagnostics(label) {
  console.error(`[verify-build] ${label} timed out. Capturing process state...`);
  const result = spawnSync("ps", ["-ax", "-o", "pid=,ppid=,%cpu=,%mem=,stat=,etime=,command="], {
    encoding: "utf8",
  });
  const relevant = (result.stdout ?? "")
    .split("\n")
    .filter((line) => /(?:tsc|next build|vitest|npm)/.test(line))
    .join("\n");
  if (relevant) console.error(relevant);
  console.error(
    "[verify-build] Check for apps/mission-control/node_modules/.pnpm, stale .next/tsconfig.tsbuildinfo, duplicate `page 2.tsx` or `route 2.ts`, and Git *.lock files.",
  );
}

async function runStep({ label, command, args, cwd = root, timeoutMs }) {
  console.log(`\n[verify-build] START ${label} (timeout ${Math.round(timeoutMs / 1000)}s)`);
  const started = Date.now();
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: "inherit",
      detached: process.platform !== "win32",
    });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      diagnostics(label);
      try {
        if (process.platform === "win32") child.kill("SIGTERM");
        else process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
    }, timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      if (timedOut) reject(new Error(`${label} timed out`));
      else if (code !== 0) reject(new Error(`${label} failed with code ${code ?? signal}`));
      else resolve();
    });
  });
  console.log(`[verify-build] PASS ${label} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
}

const steps = [
  {
    label: "build boundaries",
    command: process.execPath,
    args: ["scripts/check-build-boundaries.mjs"],
    timeoutMs: 30_000,
  },
  {
    label: "TypeScript",
    command: "npm",
    args: ["exec", "-w", "@nexus/mission-control", "tsc", "--", "--noEmit", "--incremental", "false"],
    timeoutMs: Number(process.env.NEXUS_TYPECHECK_TIMEOUT_MS ?? 120_000),
  },
  {
    label: "Vitest",
    command: "npm",
    args: ["test", "-w", "@nexus/mission-control"],
    timeoutMs: Number(process.env.NEXUS_TEST_TIMEOUT_MS ?? 180_000),
  },
];

try {
  for (const step of steps) await runStep(step);

  console.log("\n[verify-build] Clearing generated Next.js and TypeScript caches before production build.");
  rmSync(join(appRoot, ".next"), { recursive: true, force: true });
  rmSync(join(appRoot, "tsconfig.tsbuildinfo"), { force: true });

  await runStep({
    label: "Next.js production build",
    command: "npm",
    args: ["run", "build", "-w", "@nexus/mission-control"],
    timeoutMs: Number(process.env.NEXUS_BUILD_TIMEOUT_MS ?? 360_000),
  });
  console.log("\n[verify-build] RELEASE GATE PASSED");
} catch (error) {
  console.error(`\n[verify-build] RELEASE GATE FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
