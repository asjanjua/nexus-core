#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const NODE_MODULES = path.join(REPO_ROOT, "node_modules");
const CACHE_SCHEMA_VERSION = 2;
const SUPPORTED_NODE_RUNTIMES = new Map([
  [22, { minimumMinor: 12, role: "compatibility" }],
  [24, { minimumMinor: 0, role: "primary" }],
]);
const SUPPORTED_NODE_DESCRIPTION = "Node 24 (primary) or Node 22.12+ (compatibility)";
const CACHE_ROOT = process.env.NEXUS_DEPS_CACHE_ROOT
  ? path.resolve(process.env.NEXUS_DEPS_CACHE_ROOT)
  : path.join(homedir(), ".cache", "nexus-core-deps");

function fail(message) {
  console.error(`[deps] ${message}`);
  process.exitCode = 1;
}

export function classifyNodeRuntime(version) {
  const [major, minor] = version.split(".").map((part) => Number.parseInt(part, 10));
  const policy = SUPPORTED_NODE_RUNTIMES.get(major);
  if (!policy || minor < policy.minimumMinor) {
    throw new Error(
      `Node ${version} is unsupported. Nexus requires ${SUPPORTED_NODE_DESCRIPTION}.`,
    );
  }
  return { major, role: policy.role };
}

function activeNodeRuntime() {
  return classifyNodeRuntime(process.versions.node);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function countDatalessFiles(directory) {
  if (process.platform !== "darwin" || !existsSync(directory)) {
    return 0;
  }

  const target = realpathSync(directory);
  const result = spawnSync(
    "/usr/bin/find",
    [target, "-type", "f", "-flags", "+dataless", "-print"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    throw new Error(`could not inspect dependency hydration: ${result.stderr.trim()}`);
  }
  return result.stdout.split("\n").filter(Boolean).length;
}

function workspaceNodeModulesPaths({ existingOnly = true } = {}) {
  const appsRoot = path.join(REPO_ROOT, "apps");
  if (!existsSync(appsRoot)) {
    return [];
  }
  const paths = readdirSync(appsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(appsRoot, entry.name, "node_modules"));
  return existingOnly ? paths.filter((entry) => lstatSafe(entry)) : paths;
}

function expectedWorkspaceNodeModules(
  rootNodeModulesTarget,
  repoWorkspaceNodeModules,
  repoRoot = REPO_ROOT,
) {
  return path.join(
    path.dirname(rootNodeModulesTarget),
    path.relative(repoRoot, repoWorkspaceNodeModules),
  );
}

export function workspaceDependencyStateIsInvalid({
  rootNodeModulesTarget,
  workspaceNodeModules,
  managedCache,
  repoRoot = REPO_ROOT,
}) {
  const stat = lstatSafe(workspaceNodeModules);
  if (!rootNodeModulesTarget) {
    return true;
  }
  if (
    existsSync(path.join(workspaceNodeModules, ".pnpm")) ||
    existsSync(path.join(workspaceNodeModules, ".modules.yaml"))
  ) {
    return true;
  }
  if (!managedCache) {
    return false;
  }
  if (!stat?.isSymbolicLink()) {
    return true;
  }
  const expected = expectedWorkspaceNodeModules(
    rootNodeModulesTarget,
    workspaceNodeModules,
    repoRoot,
  );
  return !existsSync(expected) || realpathSync(workspaceNodeModules) !== realpathSync(expected);
}

function invalidWorkspaceNodeModules(rootNodeModulesTarget, managedCache) {
  return workspaceNodeModulesPaths().filter((entry) =>
    workspaceDependencyStateIsInvalid({
      rootNodeModulesTarget,
      workspaceNodeModules: entry,
      managedCache,
    }),
  );
}

function linkManagedWorkspaceDependencies(installRoot) {
  for (const repoNodeModules of workspaceNodeModulesPaths({ existingOnly: false })) {
    const cachedNodeModules = path.join(installRoot, path.relative(REPO_ROOT, repoNodeModules));
    if (!existsSync(cachedNodeModules)) {
      continue;
    }
    rmSync(repoNodeModules, { recursive: true, force: true });
    symlinkSync(cachedNodeModules, repoNodeModules, "dir");
    console.log(
      `[deps] linked managed workspace dependencies: ${path.relative(REPO_ROOT, repoNodeModules)}`,
    );
  }
}

function dependencyHealth() {
  if (!existsSync(NODE_MODULES)) {
    return {
      target: null,
      cacheNodeMajor: null,
      cacheSchemaVersion: null,
      dataless: 0,
      invalidNested: invalidWorkspaceNodeModules(null, false),
    };
  }
  const target = realpathSync(NODE_MODULES);
  const cacheMetadata = dependencyCacheMetadata(target);
  return {
    target,
    cacheNodeMajor: cacheMetadata?.nodeMajor ?? null,
    cacheSchemaVersion: cacheMetadata?.schemaVersion ?? null,
    dataless: countDatalessFiles(NODE_MODULES),
    invalidNested: invalidWorkspaceNodeModules(target, Boolean(cacheMetadata)),
  };
}

export function dependencyCacheMetadata(nodeModulesTarget) {
  const marker = path.join(path.dirname(nodeModulesTarget), ".nexus-deps.json");
  if (!existsSync(marker)) {
    return null;
  }
  try {
    const metadata = JSON.parse(readFileSync(marker, "utf8"));
    const nodeMajor = Number.isInteger(metadata.nodeMajor)
      ? metadata.nodeMajor
      : Number.parseInt(String(metadata.node ?? "").split(".")[0], 10) || null;
    return {
      nodeMajor,
      schemaVersion: Number.isInteger(metadata.schemaVersion) ? metadata.schemaVersion : 1,
    };
  } catch {
    throw new Error(`dependency cache metadata is malformed: ${marker}`);
  }
}

export function dependencyCacheNodeMajor(nodeModulesTarget) {
  return dependencyCacheMetadata(nodeModulesTarget)?.nodeMajor ?? null;
}

function assertWorkspaceDependencyVersions() {
  const lock = JSON.parse(readFileSync(path.join(REPO_ROOT, "package-lock.json"), "utf8"));
  for (const workspace of readdirSync(path.join(REPO_ROOT, "apps"), { withFileTypes: true })) {
    if (!workspace.isDirectory()) {
      continue;
    }
    const workspaceRelative = `apps/${workspace.name}`;
    const workspaceRoot = path.join(REPO_ROOT, workspaceRelative);
    const manifestPath = path.join(workspaceRoot, "package.json");
    if (!existsSync(manifestPath)) {
      continue;
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const dependencyNames = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.devDependencies ?? {}),
    ]);
    for (const dependency of dependencyNames) {
      const nestedLockKey = `${workspaceRelative}/node_modules/${dependency}`;
      const rootLockKey = `node_modules/${dependency}`;
      const expected = lock.packages?.[nestedLockKey] ?? lock.packages?.[rootLockKey];
      const nestedManifest = path.join(workspaceRoot, "node_modules", dependency, "package.json");
      const rootManifest = path.join(NODE_MODULES, dependency, "package.json");
      const resolvedManifest = existsSync(nestedManifest) ? nestedManifest : rootManifest;
      if (!expected?.version || !existsSync(resolvedManifest)) {
        throw new Error(`could not resolve locked workspace dependency ${dependency}`);
      }
      const actual = JSON.parse(readFileSync(resolvedManifest, "utf8"));
      if (actual.version !== expected.version) {
        throw new Error(
          `workspace dependency ${dependency} resolved to ${actual.version}, expected locked ${expected.version}`,
        );
      }
    }
  }
}

function checkDependencies() {
  const runtime = activeNodeRuntime();
  const health = dependencyHealth();
  if (!health.target) {
    throw new Error(`node_modules is missing. Run \`npm run deps:repair\` with ${SUPPORTED_NODE_DESCRIPTION}.`);
  }
  if (health.cacheNodeMajor !== null && health.cacheNodeMajor !== runtime.major) {
    throw new Error(
      `dependency cache was built with Node ${health.cacheNodeMajor}, but Node ${runtime.major} is active. ` +
        "Run `npm run deps:repair` to select the matching major-specific cache.",
    );
  }
  if (
    health.cacheSchemaVersion !== null &&
    health.cacheSchemaVersion !== CACHE_SCHEMA_VERSION
  ) {
    throw new Error(
      `dependency cache schema ${health.cacheSchemaVersion} is obsolete; expected ${CACHE_SCHEMA_VERSION}. ` +
        "Run `npm run deps:repair` to create the current workspace layout.",
    );
  }
  if (health.dataless > 0) {
    throw new Error(
      `${health.dataless} dependency files are dataless File Provider stubs. ` +
        `Run \`npm run deps:repair\` with ${SUPPORTED_NODE_DESCRIPTION} instead of waiting for npm/Vitest to hang.`,
    );
  }
  if (health.invalidNested.length > 0) {
    throw new Error(
      `nested workspace dependency state is invalid: ${health.invalidNested
        .map((entry) => path.relative(REPO_ROOT, entry))
        .join(", ")}. Run \`npm run deps:repair\` with ${SUPPORTED_NODE_DESCRIPTION}.`,
    );
  }
  assertWorkspaceDependencyVersions();
  console.log(`[deps] healthy Node ${runtime.major} ${runtime.role} dependency tree: ${health.target}`);
}

function npmInvocation() {
  if (process.env.npm_execpath && existsSync(process.env.npm_execpath)) {
    return {
      command: process.execPath,
      args: [process.env.npm_execpath],
    };
  }
  return { command: "npm", args: [] };
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return Boolean(error && error.code === "EPERM");
  }
}

function acquireRepairLock(repoKey) {
  const lockDirectory = path.join(CACHE_ROOT, `${repoKey}.repair.lock`);
  const ownerFile = path.join(lockDirectory, "owner.json");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      mkdirSync(lockDirectory);
      writeFileSync(
        ownerFile,
        `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString(), repo: REPO_ROOT }, null, 2)}\n`,
      );
      return () => rmSync(lockDirectory, { recursive: true, force: true });
    } catch (error) {
      if (!error || error.code !== "EEXIST") {
        throw error;
      }

      let owner = null;
      try {
        owner = JSON.parse(readFileSync(ownerFile, "utf8"));
      } catch {
        // A missing or malformed owner marker is treated as a stale interrupted repair.
      }
      if (owner && processIsAlive(owner.pid)) {
        throw new Error(`dependency repair is already running under PID ${owner.pid}`);
      }
      rmSync(lockDirectory, { recursive: true, force: true });
    }
  }
  throw new Error("could not acquire the dependency repair lock");
}

function installExternalDependencies(installRoot, runtime) {
  const temporaryRoot = `${installRoot}.tmp-${process.pid}`;
  rmSync(temporaryRoot, { recursive: true, force: true });
  mkdirSync(path.join(temporaryRoot, "apps", "mission-control"), { recursive: true });
  copyFileSync(path.join(REPO_ROOT, "package.json"), path.join(temporaryRoot, "package.json"));
  copyFileSync(path.join(REPO_ROOT, "package-lock.json"), path.join(temporaryRoot, "package-lock.json"));
  copyFileSync(
    path.join(REPO_ROOT, "apps", "mission-control", "package.json"),
    path.join(temporaryRoot, "apps", "mission-control", "package.json"),
  );

  const npm = npmInvocation();
  console.log(`[deps] installing hydrated dependencies outside File Provider: ${installRoot}`);
  const result = spawnSync(npm.command, [...npm.args, "ci", "--no-audit", "--no-fund"], {
    cwd: temporaryRoot,
    env: { ...process.env, npm_config_update_notifier: "false" },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    rmSync(temporaryRoot, { recursive: true, force: true });
    throw new Error(`external npm ci failed with exit ${result.status ?? "unknown"}`);
  }

  const installedModules = path.join(temporaryRoot, "node_modules");
  if (!existsSync(installedModules)) {
    throw new Error("external npm ci completed without creating node_modules");
  }
  const dataless = countDatalessFiles(installedModules);
  if (dataless > 0) {
    throw new Error(`external dependency cache unexpectedly contains ${dataless} dataless files`);
  }

  writeFileSync(
    path.join(temporaryRoot, ".nexus-deps.json"),
    `${JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        schemaVersion: CACHE_SCHEMA_VERSION,
        node: process.versions.node,
        nodeMajor: runtime.major,
        runtimeRole: runtime.role,
        repo: REPO_ROOT,
      },
      null,
      2,
    )}\n`,
  );
  rmSync(installRoot, { recursive: true, force: true });
  renameSync(temporaryRoot, installRoot);
}

function repairDependencies() {
  const runtime = activeNodeRuntime();
  const lockContents = readFileSync(path.join(REPO_ROOT, "package-lock.json"));
  const repoKey = sha256(REPO_ROOT).slice(0, 12);
  const lockKey = sha256(lockContents).slice(0, 20);
  const installRoot = path.join(
    CACHE_ROOT,
    `${repoKey}-${lockKey}-node${runtime.major}-v${CACHE_SCHEMA_VERSION}`,
  );
  const installedModules = path.join(installRoot, "node_modules");

  mkdirSync(CACHE_ROOT, { recursive: true });
  const releaseLock = acquireRepairLock(repoKey);
  try {
    if (!existsSync(installedModules) || countDatalessFiles(installedModules) > 0) {
      installExternalDependencies(installRoot, runtime);
    } else {
      console.log(`[deps] reusing hydrated dependency cache: ${installRoot}`);
    }

    for (const nested of workspaceNodeModulesPaths()) {
      console.log(`[deps] replacing workspace dependency state: ${path.relative(REPO_ROOT, nested)}`);
      rmSync(nested, { recursive: true, force: true });
    }

    if (existsSync(NODE_MODULES) || lstatSafe(NODE_MODULES)) {
      console.log("[deps] replacing File Provider-managed node_modules");
      rmSync(NODE_MODULES, { recursive: true, force: true });
    }
    symlinkSync(installedModules, NODE_MODULES, "dir");
    linkManagedWorkspaceDependencies(installRoot);
    checkDependencies();
  } finally {
    releaseLock();
  }
}

function lstatSafe(target) {
  try {
    return lstatSync(target);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function usage() {
  console.error("Usage: node scripts/file-provider-deps.mjs <check|repair>");
  process.exitCode = 2;
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  try {
    const command = process.argv[2];
    if (command === "check") {
      checkDependencies();
    } else if (command === "repair") {
      repairDependencies();
    } else {
      usage();
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}
