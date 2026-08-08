/**
 * Lint the staged TypeScript files in apps/mission-control.
 *
 * Called by .githooks/pre-commit. Scoped to staged files so a normal commit
 * pays a fraction of a second rather than a full-tree lint, and exits non-zero
 * on any eslint ERROR (warnings stay visible without blocking, matching how the
 * CI job is configured).
 *
 * Deliberately not a substitute for the CI lint job: this catches the common
 * case at the point it is cheapest to fix, while CI remains the check that
 * cannot be skipped with `--no-verify`.
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";

const APP_DIR = "apps/mission-control";

function stagedFiles() {
  const out = execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACMR"],
    { encoding: "utf8" }
  );
  return out.split("\n").filter(Boolean);
}

const candidates = stagedFiles().filter(
  (f) =>
    f.startsWith(`${APP_DIR}/`) &&
    /\.(ts|tsx)$/.test(f) &&
    // A staged deletion that git still reports, or a path that moved after
    // staging. Linting a missing file is a crash, not a finding.
    existsSync(f)
);

if (candidates.length === 0) {
  process.exit(0);
}

// eslint resolves its flat config relative to cwd, so run from the app root and
// pass paths relative to it.
const relative = candidates.map((f) => path.relative(APP_DIR, f));

try {
  execFileSync("npx", ["--no-install", "eslint", ...relative], {
    cwd: APP_DIR,
    stdio: "inherit",
  });
} catch {
  console.error(
    "\npre-commit: eslint reported errors in staged files.\n" +
      "Fix them, or commit with --no-verify if you are deliberately deferring " +
      "(CI will still fail).\n"
  );
  process.exit(1);
}
