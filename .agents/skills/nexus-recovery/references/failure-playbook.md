# Failure Playbook

## TypeScript stall

Signal: `tsc` sleeps at low/zero CPU until the verifier timeout while focused tests may work.

Actions:

1. capture process diagnostics;
2. confirm Node 24 primary or Node 22.12+ compatibility and verify that `node_modules` points to the matching major-specific cache;
3. check nested pnpm-style `apps/mission-control/node_modules` markers and generated caches;
4. retry only after a relevant environment change;
5. run tests and production build separately;
6. require CI for the inconclusive typecheck gate;
7. never call the local release gate green.

## npm/Vitest collection stall under File Provider

Signal: npm or Vitest discovers files but sleeps at zero CPU before collecting tests; a process sample shows libuv workers blocked in kernel `read()`.

Actions:

1. confirm Node 24 primary or Node 22.12+ compatibility;
2. run `npm run deps:check` instead of repeating the hanging command;
3. on macOS, count `dataless` files and confirm whether the checkout is under iCloud/File Provider;
4. run `npm run deps:repair` to install/reuse the matching major-specific hydrated external cache and replace root `node_modules` with its symlink;
5. verify `npm ls`, one representative test, full `npm test`, standalone TypeScript, and a fresh production build;
6. do not weaken worker counts, test timeouts, or coverage—the stall is dependency materialization, not a test assertion.

## Production build hang/failure

Inspect:

- Clerk client imports;
- Sentry/tracing instrumentation;
- force-graph dependencies;
- Chokidar/fsevents bundling;
- conflict-copy pages/routes, including untracked files;
- stale `.next` or `tsconfig.tsbuildinfo`;
- nested foreign dependency layouts;
- Next config build exclusions.

Run the boundary checker before and after correction.

## Git lock/index/tree incident

1. identify live Git processes;
2. preserve stale locks or malformed refs outside active paths before changing them;
3. inspect `git fsck`, HEAD/parent tree counts, staged tree, and status;
4. recover in a dedicated, reviewable slice;
5. run staged-tree preflight and compare file counts;
6. avoid force operations without explicit authority.

## Destructive handoff rewrite

Signal: a helper removes large portions of `HANDOVER.md`.

Actions:

1. do not commit;
2. inspect diff and recover the tracked history;
3. append the intended dated section with a small patch;
4. verify diff statistics and surrounding context;
5. run `python3 -m unittest discover -s tests -p 'test_relay.py'` before re-enabling the helper; the suite must prove exact-prefix preservation, duplicate rejection, no-write modes, and serialized concurrent writes.

## Clerk/auth smoke failure

Separate:

- missing hosted URL configuration;
- relative versus absolute return URL;
- missing/mismatched middleware;
- stale browser session;
- stale active organization after switching;
- permission/operator policy;
- wrong deployed SHA.

Use fresh login state and Render logs before concluding the app is broken.

## Retry rule

For every retry, state what changed. If nothing relevant changed, investigate instead of repeating the command.
