/**
 * Deploy-time check that the required production environment is complete.
 *
 * Deliberately a script rather than a module imported at server start. Next's
 * instrumentation hook is the usual place for boot-time checks, but this repo
 * removed instrumentation from the build path after it hung `next build`
 * (CLAUDE.md, "Production Build Constraints"), and re-adding a file there to
 * validate env vars is a poor trade. Run this against the deploy environment
 * instead:
 *
 *   NODE_ENV=production node scripts/check-env.mjs
 *
 * Exits non-zero and lists every missing variable, rather than surfacing them
 * one at a time in whichever request path touches one first.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(repoRoot, "apps", "mission-control");

// The check lives in TypeScript beside the app's other config; run it through
// the app's own toolchain rather than duplicating the required-variable list.
const result = spawnSync(
  "npx",
  [
    "--yes",
    "tsx",
    "--eval",
    `import { checkRequiredEnv, formatEnvReport } from "./lib/config/env.ts";
     const report = checkRequiredEnv();
     console.log(formatEnvReport(report));
     process.exit(report.ok ? 0 : 1);`,
  ],
  { cwd: appDir, stdio: "inherit", env: process.env }
);

process.exit(result.status ?? 1);
