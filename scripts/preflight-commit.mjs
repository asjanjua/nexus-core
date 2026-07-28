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
    timeout: 15_000,
    killSignal: "SIGTERM",
  }).trim();
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
const additions = entries.filter(
  (entry) => entry.status.startsWith("A") || entry.status.startsWith("C"),
).length;
// `-- :/` makes the count repo-wide rather than relative to the current
// directory: CLAUDE.md tells agents to run `commit:check` from
// apps/mission-control, where a bare `ls-files` would count only that subtree
// and compute the mass-delete and tree-shrink gates against the wrong
// denominator. `--deduplicate` stops a conflicted path being counted once per
// merge stage, which inflates both counts during exactly the conflict
// resolution where these gates matter most.
const trackedPaths = git(["ls-files", "-z", "--deduplicate", "--", ":/"]);
const afterCount = trackedPaths ? trackedPaths.split("\0").filter(Boolean).length : 0;
const beforeCount = Math.max(0, afterCount - additions + deletions);

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
  timeout: 15_000,
  killSignal: "SIGTERM",
});
if (whitespace.error) {
  failures.push(`Staged whitespace check could not complete: ${whitespace.error.message}`);
} else if (whitespace.status !== 0) {
  failures.push(`Staged whitespace errors:\n${(whitespace.stdout || whitespace.stderr).trim()}`);
}

// A NUL byte in a source file makes Git treat it as binary: `git diff` reports
// only "Bin N -> M bytes" and shows no content at all. lib/crypto.ts shipped
// that way, so an AES-GCM key-derivation and rotation change went to review
// undiffable on GitHub. Escapes (backslash-u-0000) are identical at runtime and keep the
// file text, so there is never a reason to stage a literal one.
const TEXT_EXTENSIONS = /\.(?:[cm]?[jt]sx?|json|md|ya?ml|css|sql|sh|mjs|cjs)$/;
const binaryText = paths.filter((file) => {
  if (!TEXT_EXTENSIONS.test(file)) return false;
  const staged = spawnSync("git", ["show", `:${file}`], {
    encoding: "buffer",
    timeout: 15_000,
  });
  // Deleted or unreadable staged blobs are not this check's problem.
  if (staged.error || staged.status !== 0 || !staged.stdout) return false;
  return staged.stdout.includes(0);
});

if (binaryText.length > 0) {
  failures.push(
    `Staged text files contain a NUL byte, which makes Git treat them as binary and hides the diff:\n${binaryText
      .map((file) => `  ${file}`)
      .join("\n")}\n\nReplace the literal with the \\u0000 escape (identical at runtime).`,
  );
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
