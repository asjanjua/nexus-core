# Agent Run: nucleus-deep-routes

- **Agent:** claude
- **Branch:** `feat/nucleus-deep-routes` (worktree `~/Developer/nx-nucleus-wt`)
- **Base:** `660ac8f`
- **HEAD:** `413c647`
- **Status:** `locally verified`, `committed`, push pending

## Objective

Turn Nucleus "planned deep route" chips into real routes before the pilot, in
an isolated worktree.

## Built

| Route | Source of truth |
| --- | --- |
| `/nucleus/publish` | the existing `/api/nucleus/client-release` boundary |
| `/nucleus/methodologies` | `nucleusEngagementStages` + `nucleusWhiteLabelRequirements` |

**The suppression refusal is the product.** Nucleus is sold to consulting firms
on a promise that sounds too good until it is demonstrated: brand what you
like, you cannot remove the trust layer. The API has enforced that from the
start — provenance, caveats, reviewer identity and the audit label cannot be
suppressed, a named partner is mandatory, the disclosure triple must be
complete. No screen could reach it, so the guarantee could be described and
never shown.

The publish screen therefore OFFERS the suppression toggles. Removing them
would make the screen pass a naive review and destroy its purpose: a partner
evaluating Nucleus should be able to try the exact thing they are worried about
and watch it be refused and audited. For the same reason the button is not
disabled until the form is valid — client-side gating would skip the server
refusal and the audit record with it. Both pinned by test.

The caveats field distinguishes "we checked, none" from "nobody answered",
because the API distinguishes an empty array from an absent field and those
must never render the same way to a client.

Methodology Catalog reads the registry directly, so it cannot drift from the
workflow the product runs — the hub's hardcoded "4 method packs" could.

## Not built, deliberately

`engagement-intake`, `evidence-room`, `deliverable-builder`, `client-portal`.
Each needs new persistence. The hub still calls them planned.

## A test I got wrong

The first version asserted the publish component contained each protected trust
element as a string literal. That would have REQUIRED hardcoding the list in
the component and allowed it to drift from the list the API enforces — the
precise bug the test exists to prevent. Corrected to assert the component maps
over the shared constant.

## Verification

tsc 0; 1183 tests / 145 files; eslint clean. Negative controls: claimed an
unbuilt route live (failed); gated the release button client-side (failed).
Both reverted.

An intermediate full-suite run reported 3 failures. That was the negative
control's `sed` racing the run, not a real regression — confirmed by a clean
re-run.

## Next

Push `feat/nucleus-deep-routes`, open a PR, let CI run the build gate.
