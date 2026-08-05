import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Engines compute internal summary fields that read like verdicts:
 *
 *   VantageDiligenceResult.summary.recommendation  "proceed" | "do_not_proceed"
 *   QuorumGovernanceResult.summary.recordReady     boolean
 *
 * Rendering either as a verdict is a forbidden action wearing a UI costume.
 * A green "proceed" badge beside deal evidence IS marking a deal investable;
 * a green "record ready" badge IS declaring a board record fit to finalise.
 *
 * Both shipped that way in the Agent Governance settings tab while the product
 * screens deliberately avoided them — the rule was understood and applied
 * inconsistently, which is worse than not knowing it.
 *
 * Reading the fields is allowed; operators need to inspect a run. Binding them
 * to a success colour is not.
 *
 * NARROW ON PURPOSE. "recommendation" is also a first-class product entity
 * (recommendation register, read:recommendations scope, recommendation_generated
 * audit event). Matching the bare word flagged three unrelated places. Only
 * `summary.recommendation` and `summary.recordReady` are the verdict fields.
 */

const APP = process.cwd();
const VERDICT_ACCESSORS = ["summary.recommendation", "summary.recordReady"];
const SUCCESS_CLASSES = ["badge-green", "text-nexus-accent", "bg-green", "text-green"];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/**
 * Comments explaining WHY a verdict must not be rendered necessarily quote the
 * forbidden wording. Stripping them keeps the guard from flagging its own
 * rationale.
 */
function withoutComments(source: string): string {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const files = [...walk(join(APP, "app")), ...walk(join(APP, "components"))];

describe("engine verdict fields are never rendered as verdicts", () => {
  it("finds files to check", () => {
    // Guards against the walk silently returning nothing and every assertion
    // below passing vacuously.
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(VERDICT_ACCESSORS)("never binds %s to a success colour", (accessor) => {
    const offenders: string[] = [];
    for (const file of files) {
      for (const line of withoutComments(readFileSync(file, "utf8")).split("\n")) {
        if (!line.includes(accessor)) continue;
        if (SUCCESS_CLASSES.some((cls) => line.includes(cls))) {
          offenders.push(`${file.replace(APP + "/", "")}: ${line.trim().slice(0, 110)}`);
        }
      }
    }
    expect(offenders, `verdict field styled as success:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("never prints a bare 'record ready' label", () => {
    // Colour is half the problem; wording is the other half. "record ready" as
    // a standalone label asserts exactly what Quorum must not assert.
    const offenders: string[] = [];
    for (const file of files) {
      const src = withoutComments(readFileSync(file, "utf8"));
      if (/["'>]\s*record ready\s*["'<]/i.test(src)) {
        offenders.push(file.replace(APP + "/", ""));
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("labels the surviving reads as engine signals", () => {
    // The fields are still shown in the Agent Governance tab. Whatever renders
    // them must say what they are, so an operator does not read a raw field as
    // advice.
    const settings = readFileSync(join(APP, "app/settings/page.tsx"), "utf8");
    for (const accessor of VERDICT_ACCESSORS) {
      if (!settings.includes(accessor)) continue;
      expect(settings, `${accessor} is rendered without an "engine signal" label`).toContain(
        "engine signal"
      );
    }
  });
});
