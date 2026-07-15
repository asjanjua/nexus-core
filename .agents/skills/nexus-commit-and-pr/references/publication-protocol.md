# Publication Protocol

## Authorization levels

Treat each level independently:

1. create/switch branch;
2. stage files;
3. create commits;
4. push branch;
5. open/update PR;
6. merge;
7. deploy or mutate production.

Authorization for a lower level does not grant a higher one.

## Commit boundaries

| Commit | Include | Exclude |
| --- | --- | --- |
| Runtime | implementation, compatible migration, tests, required config template | broad paperwork cleanup, unrelated refactors |
| Papertrail | TASKS/BACKLOG/HANDOVER/CHANGELOG, governing spec/runbook, settled evidence | speculative product work |
| CI repair | smallest correction for the observed failure, tests | opportunistic cleanup |

## Staged-tree red flags

- `.env*` other than intentional `.env.example` changes;
- keys/certificates/tokens;
- `.next`, `node_modules`, logs, tsbuildinfo;
- `page 2.tsx`, `route 2.ts`, or other conflict copies;
- unexplained mass deletions or tree shrink;
- another agent's files;
- local recovery artifacts;
- screenshots or generated reports not required by the slice.

## PR readiness

A PR may be draft with local verification and declared external gaps. A ready PR requires:

- reviewed coherent diff;
- required tests and production build;
- CI green;
- migration order documented;
- no secret/generated/unrelated files;
- paperwork truth aligned with actual state.

Operational live smoke may remain post-merge/deploy, but must stay explicitly `deployment pending` rather than `verified`.
