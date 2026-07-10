#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const appRoot = join(root, "apps/mission-control");
const scanRoots = [join(appRoot, "app"), join(appRoot, "components")];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const clientForbidden = [
  "@clerk/nextjs",
  "@sentry/nextjs",
  "react-force-graph-2d",
  "force-graph",
  "pg",
  "drizzle-orm",
  "fs",
  "path",
  "child_process",
];
const globallyForbidden = ["react-force-graph-2d", "force-graph"];
const failures = [];

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}

function importsFrom(source) {
  const imports = [];
  const pattern = /(?:from\s+|import\s*\(|import\s+)["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) imports.push(match[1]);
  return imports;
}

function moduleMatches(source, blocked) {
  return source === blocked || source.startsWith(`${blocked}/`);
}

for (const scanRoot of scanRoots) {
  for (const file of walk(scanRoot)) {
    if (!sourceExtensions.has(extname(file))) continue;

    const name = basename(file);
    const display = relative(root, file);
    if (/^(?:page|route|layout|loading|error|global-error|not-found) \d+\.(?:[jt]sx?)$/.test(name)) {
      failures.push(`${display}: conflict-copy route filename`);
    }

    const source = readFileSync(file, "utf8");
    const imports = importsFrom(source);
    const isClient = /^\s*["']use client["'];?/m.test(source.slice(0, 500));

    for (const imported of imports) {
      if (globallyForbidden.some((blocked) => moduleMatches(imported, blocked))) {
        failures.push(`${display}: ${imported} is excluded from the production bundle`);
      }
      if (
        isClient &&
        (clientForbidden.some((blocked) => moduleMatches(imported, blocked)) || imported.startsWith("node:"))
      ) {
        failures.push(`${display}: client component imports server/heavy module ${imported}`);
      }
    }
  }
}

for (const marker of [join(appRoot, "node_modules/.pnpm"), join(appRoot, "node_modules/.modules.yaml")]) {
  if (existsSync(marker)) {
    failures.push(
      `${relative(root, marker)}: stale pnpm-style nested install shadows the root npm workspace; move/remove apps/mission-control/node_modules and run npm ci at repo root`,
    );
  }
}

for (const instrumentation of ["instrumentation.ts", "instrumentation-client.ts"]) {
  const path = join(appRoot, instrumentation);
  if (existsSync(path)) failures.push(`${relative(root, path)}: runtime instrumentation requires a fresh build review`);
}

const nextConfig = readFileSync(join(appRoot, "next.config.mjs"), "utf8");
if (!nextConfig.includes("outputFileTracingExcludes")) {
  failures.push("apps/mission-control/next.config.mjs: outputFileTracingExcludes guard is missing");
}
if (!nextConfig.includes('process.env.NEXUS_ENABLE_SENTRY === "true"')) {
  failures.push("apps/mission-control/next.config.mjs: Sentry build must remain explicit opt-in");
}

if (failures.length > 0) {
  console.error(`[build-boundaries] BLOCKED (${failures.length})\n\n${failures.map((item) => `- ${item}`).join("\n")}`);
  process.exit(1);
}

console.log("[build-boundaries] Client/server imports, conflict copies, dependency layout, tracing, and Sentry gates are clean.");
