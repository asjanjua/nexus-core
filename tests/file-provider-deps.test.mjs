import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  classifyNodeRuntime,
  dependencyCacheMetadata,
  dependencyCacheNodeMajor,
  workspaceDependencyStateIsInvalid,
} from "../scripts/file-provider-deps.mjs";

test("classifies the Node 22 compatibility rung and Node 24 primary runtime", () => {
  assert.deepEqual(classifyNodeRuntime("22.12.0"), { major: 22, role: "compatibility" });
  assert.deepEqual(classifyNodeRuntime("22.22.3"), { major: 22, role: "compatibility" });
  assert.deepEqual(classifyNodeRuntime("24.14.1"), { major: 24, role: "primary" });
});

test("rejects EOL, too-old, non-LTS, and unapproved Node runtimes", () => {
  for (const version of ["20.20.2", "22.11.0", "23.11.0", "25.9.0"]) {
    assert.throws(() => classifyNodeRuntime(version), /is unsupported/);
  }
});

test("reads current and legacy dependency-cache runtime markers", () => {
  const root = mkdtempSync(path.join(tmpdir(), "nexus-deps-test-"));
  const nodeModules = path.join(root, "node_modules");
  mkdirSync(nodeModules);
  try {
    writeFileSync(
      path.join(root, ".nexus-deps.json"),
      '{"schemaVersion":2,"nodeMajor":24,"node":"24.14.1"}\n',
    );
    assert.equal(dependencyCacheNodeMajor(nodeModules), 24);
    assert.deepEqual(dependencyCacheMetadata(nodeModules), { nodeMajor: 24, schemaVersion: 2 });

    writeFileSync(path.join(root, ".nexus-deps.json"), '{"node":"22.22.3"}\n');
    assert.equal(dependencyCacheNodeMajor(nodeModules), 22);
    assert.deepEqual(dependencyCacheMetadata(nodeModules), { nodeMajor: 22, schemaVersion: 1 });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("treats a normal dependency tree as unversioned and rejects malformed cache metadata", () => {
  const root = mkdtempSync(path.join(tmpdir(), "nexus-deps-test-"));
  const nodeModules = path.join(root, "node_modules");
  mkdirSync(nodeModules);
  try {
    assert.equal(dependencyCacheNodeMajor(nodeModules), null);
    writeFileSync(path.join(root, ".nexus-deps.json"), "not-json\n");
    assert.throws(() => dependencyCacheNodeMajor(nodeModules), /metadata is malformed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("allows normal npm workspace nesting but requires exact managed-cache links", () => {
  const repoRoot = mkdtempSync(path.join(tmpdir(), "nexus-repo-test-"));
  const cacheRoot = mkdtempSync(path.join(tmpdir(), "nexus-cache-test-"));
  const rootNodeModules = path.join(cacheRoot, "node_modules");
  const workspaceNodeModules = path.join(repoRoot, "apps", "mission-control", "node_modules");
  const cachedWorkspaceNodeModules = path.join(
    cacheRoot,
    "apps",
    "mission-control",
    "node_modules",
  );
  mkdirSync(rootNodeModules);
  mkdirSync(workspaceNodeModules, { recursive: true });
  mkdirSync(cachedWorkspaceNodeModules, { recursive: true });
  try {
    assert.equal(
      workspaceDependencyStateIsInvalid({
        rootNodeModulesTarget: rootNodeModules,
        workspaceNodeModules,
        managedCache: false,
        repoRoot,
      }),
      false,
    );
    assert.equal(
      workspaceDependencyStateIsInvalid({
        rootNodeModulesTarget: rootNodeModules,
        workspaceNodeModules,
        managedCache: true,
        repoRoot,
      }),
      true,
    );

    rmSync(workspaceNodeModules, { recursive: true, force: true });
    symlinkSync(cachedWorkspaceNodeModules, workspaceNodeModules, "dir");
    assert.equal(
      workspaceDependencyStateIsInvalid({
        rootNodeModulesTarget: rootNodeModules,
        workspaceNodeModules,
        managedCache: true,
        repoRoot,
      }),
      false,
    );

    mkdirSync(path.join(cachedWorkspaceNodeModules, ".pnpm"));
    assert.equal(
      workspaceDependencyStateIsInvalid({
        rootNodeModulesTarget: rootNodeModules,
        workspaceNodeModules,
        managedCache: true,
        repoRoot,
      }),
      true,
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
    rmSync(cacheRoot, { recursive: true, force: true });
  }
});
