/**
 * `isExplicitDevRuntime` exists twice on purpose.
 *
 * lib/security.ts holds the real one. lib/security-headers.ts re-declares it
 * because that module runs in edge middleware and cannot import lib/security,
 * which pulls in node:crypto. The duplication is documented at both sites.
 *
 * What was missing is anything stopping the two from drifting. They gate
 * different things — one decides whether to fall back to the shared dev signing
 * secret, the other whether to echo an arbitrary Origin back on /api/* — so a
 * divergence would be a security difference, silently, with both files still
 * looking correct in isolation.
 *
 * This suite is the guard. It pins the exact contract both must satisfy:
 * "development" and "test" are dev; everything else, INCLUDING an unset
 * NODE_ENV, is not. The unset case is the one that matters — a container
 * entrypoint or worker started outside `next start` must fail closed.
 *
 * See docs/PR_REVIEW_2026-08-08.md §6.5.
 */
import { afterEach, describe, expect, it } from "vitest";
import { isExplicitDevRuntime } from "@/lib/security";
import { __isExplicitDevRuntimeForTests as edgeIsExplicitDevRuntime } from "@/lib/security-headers";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

function setNodeEnv(value: string | undefined): void {
  // NODE_ENV is readonly in the Next type surface; the runtime value is what
  // both implementations actually read.
  if (value === undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV;
  else (process.env as Record<string, string>).NODE_ENV = value;
}

afterEach(() => {
  setNodeEnv(ORIGINAL_NODE_ENV);
});

const CASES: Array<[string | undefined, boolean]> = [
  ["development", true],
  ["test", true],
  ["production", false],
  // The dangerous one. `NODE_ENV !== "production"` — the pattern both of these
  // replaced — returns true here.
  [undefined, false],
  ["", false],
  ["staging", false],
  ["Development", false],
  ["DEVELOPMENT", false],
  ["dev", false],
];

describe("isExplicitDevRuntime", () => {
  it.each(CASES)("lib/security: NODE_ENV=%s → %s", (env, expected) => {
    setNodeEnv(env);
    expect(isExplicitDevRuntime()).toBe(expected);
  });

  it.each(CASES)("lib/security-headers: NODE_ENV=%s → %s", (env, expected) => {
    setNodeEnv(env);
    expect(edgeIsExplicitDevRuntime()).toBe(expected);
  });

  it("the two implementations agree on every case", () => {
    for (const [env] of CASES) {
      setNodeEnv(env);
      expect(edgeIsExplicitDevRuntime()).toBe(isExplicitDevRuntime());
    }
  });
});
