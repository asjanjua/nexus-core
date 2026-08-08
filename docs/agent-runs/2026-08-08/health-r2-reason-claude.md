# Agent Run: health-r2-reason

- **Agent:** claude
- **Branch:** `fix/health-r2-reason` (worktree `~/Developer/nx-health-wt`)
- **Base / HEAD:** `683e2a0` → this commit
- **Status:** `locally verified`, `committed`

## Why

Live check of `https://pinavia.io/api/health` on 2026-08-08 returned:

```
status: "degraded"
originalsStorage: { ok: false, enabled: true }
```

R2 has four settings. That payload is a four-way guess against a live service
while uploaded originals are silently not being retained — on a product whose
pitch is that nothing goes missing.

The reason was already computed. `r2ConfigProblem()` (added in `683e2a0` by
another agent, "presence was not enough") names the first structural fault:
`malformed_account_id`, `missing_bucket`, `missing_secret_access_key` and so
on. The health endpoint called `isOriginalStorageEnabled()`, which throws that
away and returns a boolean.

## What changed

`/api/health` now includes `originalsStorage.problem` when, and only when,
there is one.

- **Omitted rather than null when healthy.** A reader should never have to
  interpret `problem: null`.
- **Silent when originals storage is switched off.** Disabled is a
  configuration choice, not a fault; it must not degrade the service.
- **Safe unauthenticated.** The codes name a VARIABLE, never a value.
  `missing_secret_access_key` tells an operator where to look and an attacker
  nothing they could not infer from originals not being retained. A test
  asserts the secret's value never appears in the payload.

## Verification

tsc 0; 1204 tests / 148 files; eslint clean. Negative control: removed the
spread that adds `problem`, 2 tests failed, reverted.

Also confirmed en route: the `build.commitShort` field added earlier is live
and returned `683e2a0`, so deploys can now be verified against the running
process rather than the dashboard.

## Note for the next agent

An intermediate full-suite run reported 1 failure. That was the negative
control's `cp` racing the run, not a regression — confirmed by a clean re-run.
Second time this has happened today: do not run a negative control and the full
suite concurrently.

## Still open, and NOT fixed by this

This makes the fault legible; it does not repair it. Someone with Render
access must read `originalsStorage.problem` after this deploys and correct the
named variable. Most likely a pasted quote or stray whitespace — `683e2a0`
added the quote check precisely because that is how the bug arrived.
