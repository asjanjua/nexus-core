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
