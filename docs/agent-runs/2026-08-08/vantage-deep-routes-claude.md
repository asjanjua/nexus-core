# Agent Run: vantage-deep-routes

- **Agent:** claude
- **Branch:** `feat/vantage-deep-routes` (worktree `~/Developer/nx-vantage-wt`)
- **Base:** `660ac8f`
- **HEAD:** `fc15c06`
- **Status:** `locally verified`, `committed`, push pending

## Objective

Turn the Vantage "planned deep route" chips into real routes before the pilot,
in an isolated worktree so nothing collides with the other agents on `main`.

## What the audit changed

Eight screens were labelled planned. Four of them were not waiting on
capability: the native diligence runner has been computing `modelTieOuts` and
`icMemoSections` on every run and discarding them, while the hub displayed
hand-written numbers in their place.

So this is not new capability. It surfaces work the engine already did, which
matters for a pilot — everything on these screens derives from the workspace's
own evidence and carries citations.

## Built

| Route | Source of truth |
| --- | --- |
| `/vantage/data-room` | workspace evidence, server-rendered |
| `/vantage/evidence-depth` | citation count and mean confidence per covered item |
| `/vantage/ic-memo` | `icMemoSections` from the runner |
| `/vantage/decision-handoff` | the existing `/api/vantage/decision-handoff` boundary |

**Evidence Depth is the one that earns its place.** Coverage is binary. That
flatters a deal where every requirement rests on a single document scraping
past the 0.6 threshold. `thin` is deliberately not called "low": one source at
61% clears the runner and still must not carry a critical requirement into
committee alone.

**Decision Handoff ships the refusals, not a form.** The button is not disabled
until the fields are filled — client-side gating would hide the governance and
skip the audit record of a blocked attempt. The request goes and the refusal is
rendered in the reviewer's language.

## Not built, deliberately

`/vantage/dealroom` and `/vantage/judgment-log`. Both need new persistence — a
deal entity and an advisor judgment log — which is a migration plus a data
layer, not an afternoon. Shipping them with hardcoded figures is exactly what
`8371d63` removed two hours ago. The hub still calls them planned.

## Verification

tsc 0; 1186 tests / 145 files; eslint clean on every touched file. Negative
control: added an unbuilt route to `BUILT_ROUTES`, the guard failed, reverted.

Production build not run in the sandbox — `next build` prerender dies with
EMFILE on the File Provider mount, unrelated to this change. CI decides.

## Process note

The first two worktrees were created inside the sandbox-only mount root, not
under `Developer/`, so they were invisible to the user's Mac and the file tools
wrote to a bare directory beside them instead. A `tsc` run passed against a
tree that did not contain the new files, which is exactly the kind of green
that means nothing. Recreated under `~/Developer/nx-vantage-wt` and re-verified.

## Next

Push `feat/vantage-deep-routes`, open a PR, let CI run the build gate.

## 2026-08-08 — the two deferred routes, now built

`/vantage/dealroom` and `/vantage/judgment-log` needed persistence, which is
why the first pass deferred them. Built properly rather than faked.

**Migrations 0055 and 0056**, one table each per the repo's rollback-granularity
convention.

Two boundaries are encoded in the SHAPE of the data, not in a check somewhere:

**`vantage_deals` has no status column.** The obvious field is
approved / rejected / on hold, and that is precisely the investment decision
the registry forbids. A column that cannot legally hold the value everyone
expects is a trap for the next developer, so it does not exist. Archive is a
filing action; lifecycle belongs to the committee, off-system.

**`vantage_judgments` is append-only, with `advisor NOT NULL`.** An editable
log cannot answer "what did the committee see", which is the entire point of
recording advisor judgment. A changed view supersedes its predecessor inside a
transaction — a superseded pointer with no successor, or a successor that never
marked its predecessor, would both misrepresent the sequence. The superseded
entry stays on screen, struck through: the change of mind is usually the most
informative thing in the log.

The advisor field is never seeded from the signed-in user. The person typing is
frequently not the person whose judgment it is, and the audit payload records
`advisor` separately from `actor` for the same reason.

Position is free text, not an enum. proceed / hold / stop in a dropdown is the
investment decision wearing a UI control.

**Verified against real Postgres** via PGlite, 52/55 migrations applied (the 3
skips are pgvector-only), 7 assertions: the new tables exist, no approval
column is present, a duplicate live deal name is rejected case-insensitively,
the name becomes reusable after archive, a judgment against a non-existent deal
is rejected by the foreign key, and an unattributed judgment is rejected by the
database rather than only by the API.

**Verification:** tsc 0; 1199 tests / 146 files; eslint clean. Negative
controls: added a `status` column to the migration and a `DELETE` handler to
the judgment API — both guards failed, both reverted.

One test was wrong on first run: it banned every `setAdvisor(` call, which also
banned the correct behaviour of carrying the original advisor forward when
revising. Narrowed to assert the initial state is empty and no session identity
is read.

All eight Vantage screens now exist. The hub claims six... then eight; the
route-parity test covers both directions.
