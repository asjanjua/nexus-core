#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";

const LARGE_COMMIT_LIMIT = 250;
const MASS_DELETE_LIMIT = 50;
const MIN_TREE_RATIO = 0.8;
const override = process.env.NEXUS_ALLOW_LARGE_COMMIT === "1";

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function countTree(ref) {
  if (!ref) return 0;
  const output = git(["ls-tree", "-r", "--name-only", ref]);
  return output ? output.split("\n").length : 0;
}

function stagedEntries() {
  const output = git(["diff", "--cached", "--name-status"]);
  if (!output) return [];
  return output.split("\n").map((line) => {
    const [status, ...paths] = line.split("\t");
    return { status, paths };
  });
}

const entries = stagedEntries();
if (entries.length === 0) {
  console.error("[commit-preflight] No staged changes found.");
  process.exit(1);
}

const paths = entries.flatMap((entry) => entry.paths);
const deletions = entries.filter((entry) => entry.status.startsWith("D")).length;
const headExists = spawnSync("git", ["rev-parse", "--verify", "HEAD"], { stdio: "ignore" }).status === 0;
const beforeCount = headExists ? countTree("HEAD") : 0;
const stagedTree = git(["write-tree"]);
const afterCount = countTree(stagedTree);

const forbidden = paths.filter((file) => {
  if (/(^|\/)\.env\.example$/.test(file)) return false;
  return (
    /(^|\/)\.env(?:\.|$)/.test(file) ||
    /(^|\/)(?:page|route|layout|loading|error|global-error|not-found) \d+\.(?:[jt]sx?)$/.test(file) ||
    /(^|\/)node_modules\//.test(file) ||
    /(^|\/)\.next\//.test(file) ||
    /\.(?:log|tsbuildinfo)$/.test(file) ||
    /\.(?:pem|p12|pfx|key)$/.test(file)
  );
});

const failures = [];
if (forbidden.length > 0) {
  failures.push(`Generated, secret, or conflict-copy paths are staged:\n  ${forbidden.join("\n  ")}`);
}

if (!override && entries.length > LARGE_COMMIT_LIMIT) {
  failures.push(
    `${entries.length} files are staged (limit ${LARGE_COMMIT_LIMIT}). Split the change into reviewable commits, or set NEXUS_ALLOW_LARGE_COMMIT=1 after reviewing the staged tree.`,
  );
}

if (!override && beforeCount >= 100) {
  const deletionRatio = deletions / beforeCount;
  const treeRatio = afterCount / beforeCount;
  if (deletions > MASS_DELETE_LIMIT || deletionRatio > 0.2 || treeRatio < MIN_TREE_RATIO) {
    failures.push(
      `Suspicious tree shrink detected: ${beforeCount} files before, ${afterCount} after, ${deletions} staged deletions.`,
    );
  }
}

const whitespace = spawnSync("git", ["diff", "--cached", "--check"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
if (whitespace.status !== 0) {
  failures.push(`Staged whitespace errors:\n${(whitespace.stdout || whitespace.stderr).trim()}`);
}

console.log(
  `[commit-preflight] ${entries.length} changed files; ${deletions} deletions; tree ${beforeCount || "new"} -> ${afterCount}.`,
);

if (failures.length > 0) {
  console.error(`\n[commit-preflight] BLOCKED\n\n${failures.join("\n\n")}`);
  console.error(
    "\nInspect with `git diff --cached --stat` and `git diff --cached --name-status`. Use NEXUS_ALLOW_LARGE_COMMIT=1 only for an intentional reviewed migration or recovery.",
  );
  process.exit(1);
}

console.log("[commit-preflight] Staged tree is safe to commit.");
