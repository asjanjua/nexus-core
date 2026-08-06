# Agent Run: lint-warning-taxonomy

- **Started:** 2026-08-06T09:53:46+05:00
- **Agent:** claude
- **Branch:** `main`
- **Starting HEAD:** `c6a3e09330b1e4c035c7d5984f48c128b106ed49`
- **Status:** `in_progress`

## Objective

Turn the 15 build-log warnings into durable guidance, and fix the one that is a real defect rather than a style note.

## Acceptance Criteria

- [ ] Guardrail documents the three-way triage with evidence; drag-and-drop dedupe/cap bug fixed and tested; remaining warnings either resolved or suppressed with a written reason.

## Claimed Files

- `apps/mission-control/components/ingestion-upload.tsx`
- `docs/ENGINEERING_GUARDRAILS.md`

## Starting Worktree State

```text
(clean)
```

## Checkpoints

### 2026-08-06T09:53:46+05:00 — slice opened

- **Completed:** Orientation and durable ledger creation.
- **Verification:** Not started.
- **Pushed SHA:** Not pushed.
- **Deployed SHA:** Not verified.
- **Blockers:** None recorded.
- **Next exact action:** Inspect the governing code and tests, then implement the first coherent change.

### 2026-08-06T10:00 — triage complete

Reading all 15 warnings individually found **one live defect, two false alarms,
and twelve that must never be "fixed"**. Both bulk responses would have been
wrong, and bulk-fixing would have introduced a fetch loop.

**The defect: drag-and-drop upload had two dead guards.**
`components/ingestion-upload.tsx` wrapped `handleDrop` in
`useCallback(..., [])`. It called `pickFiles`, which is redefined each render
and closes over `files`, so the handler kept render one's copy forever and
every drop ran against `files === []`. The duplicate check compared against an
empty list, and `MAX_FILES - files.length` was always 10. **Dropped files could
be queued twice and the ten-file cap did not apply.**

Two things hid it, and both are the general lesson:

- `setFiles` uses the functional form, so the queue still accumulated
  correctly. The visible behaviour was right; only the guards were inert.
- The sibling `<input onChange={(e) => pickFiles(e.target.files)}>` uses an
  inline arrow recreated each render, so the file-picker path was always
  correct. One path worked and one did not.

Fixed by removing the memoisation, not by adding `files` to the dependency
array — the element it is attached to is not memoised, so `useCallback` bought
nothing and cost a bug.

**The two false alarms, each needing a different treatment:**

- `settings/page.tsx` mount effect calling `load()`. Adding `load` to the deps
  would re-run the effect after every load: a fetch loop. Suppressed with
  `eslint-disable-next-line` **and a written reason**. The rule is wrong about
  the intent here.
- `getAllSectors()` called during render returned a fresh array identity every
  time from a static module table. Nothing misbehaved, but the warning was
  accurate. Hoisted to module scope as `SECTORS`, which removes the cause
  rather than silencing the report — the only one of the three where the
  warning goes away because the code improved.

**The twelve that stay.** Nine `no-html-link-for-pages` are required by the
hosted-Clerk handoff; `next/link` would break session pickup. Three
`import/no-anonymous-default-export` are in config files. The reason the rule
is `warn` rather than `off` is already recorded beside it in
`eslint.config.mjs`.

**Made testable, then tested.** `selectQueueAdditions` extracted to
`lib/ingestion-queue.ts` — pure, out of the `.tsx` so it can be imported
without JSX transform — with 9 tests including the precise failure (nine
queued plus three dropped must admit one) and two cases guarding against a
misleading error message. Negative control: reinstated the stale-closure
behaviour, 4 tests failed, reverted.

**Documented.** `docs/ENGINEERING_GUARDRAILS.md` §10: the three-way
`exhaustive-deps` triage with this evidence; the rule that any downgraded rule
carries its reason beside it; and the instruction to quote
`npx eslint .`'s summary line before escalating a build log, since warnings and
errors look identical in Render's viewer. `CLAUDE.md` Development Standards now
points at it, so it is read before code rather than after.

**Verification:** tsc 0; 1058 tests / 132 files; eslint 12 problems, 0 errors,
down from 15; boundaries clean; build 197 pages.

**Status:** `locally verified`, `committed but unpushed`.
**Next exact action:** push; the three commits ahead of origin are 86cf327,
c6a3e09 and this one.
