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

## 2026-08-08 — the four deferred routes, now built

`engagement-intake`, `deliverable-builder`, `client-portal` and
`evidence-room`. Two needed persistence; two did not and were built as derived
views rather than given tables they do not need.

**Migrations 0057 and 0058 — numbered to avoid a silent collision.** The
sibling branch `feat/vantage-deep-routes` adds 0055 and 0056 concurrently. Two
branches claiming one number is a conflict that gets resolved by renaming under
time pressure, and the migration runner tracks filenames. Left a gap on
purpose, and pinned it by test.

**The load-bearing detail is three-valued caveats**, preserved from radio
button to JSONB column:

- `null` — nobody has answered
- `[]` — checked, none outstanding
- `[...]` — these are outstanding

Collapsing `null` into `[]` anywhere in that chain converts an unreviewed
deliverable into a positive assurance to a client. It is the most dangerous
thing this record could misstate and the easiest invisible "tidy-up" for a
future developer, so it is guarded at four layers: no column default, a
nullable contract, an `!== undefined` check in the repository, and a mapper
that will not coerce. The UI asks with a radio rather than a checkbox, because
an unchecked box silently asserts the second value.

**nucleus_engagements holds no billing, rates or utilisation.** The moment it
does, Nucleus becomes the firm's system of record, and a governance platform
that also owns the commercial record has a conflict when a caveat is
inconvenient.

**Partner is optional at intake, mandatory at release.** Work starts before a
reviewing partner is assigned; forcing a name early produces a placeholder that
later looks like accountability. The release endpoint closes the gap where it
matters.

**Evidence Room reports "likely match", never coverage.** A stage declares
required objects in the firm's language; the classifier types documents in its
own. Those are not one controlled list, so the page says so rather than
implying readiness.

**Client Portal renders the fixed layer from `PROTECTED_TRUST_ELEMENTS`**, the
same constant the release API enforces, so the preview cannot drift from what
is actually refused.

**Verified against real Postgres** via PGlite: 52/55 applied (3 pgvector-only
skips), 6 assertions including that an unanswered deliverable stores NULL and
not `[]`, an explicit "none" stores `[]`, and there are no billing columns.

**Verification:** tsc 0; 1197 tests / 146 files; eslint clean. Negative
controls: added `NOT NULL DEFAULT '[]'` to the column and made the mapper
coerce null to `[]` — both guards failed, both reverted.

One test was wrong on first run: it scanned the whole migration for `DEFAULT`
and matched the header comment explaining why the column is *not* defaulted — a
test failing on its own rationale. Narrowed to the DDL with comment lines
stripped.

All eight Nucleus screens now exist.
