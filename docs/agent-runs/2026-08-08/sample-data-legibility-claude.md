# Agent Run: sample-data-legibility

- **Started:** 2026-08-08T19:49:43+05:00
- **Agent:** claude
- **Branch:** `main`
- **Starting HEAD:** `a1a9bdd44aed71de88967033eaecc366665d62cb`
- **Status:** `in_progress`

## Objective

Pilot readiness: make worked-example figures on the Meridian, Vantage and Nucleus hubs unmistakable, so a regulated buyer can never read an invented number as their own data.

## Acceptance Criteria

- [ ] Every example KPI carries a per-value marker, not just a banner; real values stay visually dominant; gates green; pinned by test.

## Claimed Files

- `apps/mission-control/components/ui/nexus-primitives.tsx`

## Starting Worktree State

```text
M .githooks/pre-commit
 M CHANGELOG.md
 M HANDOVER.md
 M TASKS.md
 M apps/mission-control/app/api/connectors/github/callback/route.ts
 M apps/mission-control/app/api/connectors/github/install/route.ts
 M apps/mission-control/app/api/connectors/gmail/callback/route.ts
 M apps/mission-control/app/api/connectors/gmail/install/route.ts
 M apps/mission-control/app/api/connectors/google-drive/callback/route.ts
 M apps/mission-control/app/api/connectors/google-drive/ingest/route.ts
 M apps/mission-control/app/api/connectors/google-drive/install/route.ts
 M apps/mission-control/app/api/connectors/hubspot/callback/route.ts
 M apps/mission-control/app/api/connectors/hubspot/install/route.ts
 M apps/mission-control/app/api/connectors/jira/callback/route.ts
 M apps/mission-control/app/api/connectors/jira/install/route.ts
 M apps/mission-control/app/api/connectors/linkedin/callback/route.ts
 M apps/mission-control/app/api/connectors/linkedin/install/route.ts
 M apps/mission-control/app/api/connectors/outlook-mail/callback/route.ts
 M apps/mission-control/app/api/connectors/outlook-mail/install/route.ts
 M apps/mission-control/app/api/connectors/quickbooks/callback/route.ts
 M apps/mission-control/app/api/connectors/quickbooks/install/route.ts
 M apps/mission-control/app/api/connectors/sharepoint/callback/route.ts
 M apps/mission-control/app/api/connectors/sharepoint/ingest/route.ts
 M apps/mission-control/app/api/connectors/sharepoint/install/route.ts
 M apps/mission-control/app/api/connectors/slack/callback/route.ts
 M apps/mission-control/app/api/connectors/slack/install/route.ts
 M apps/mission-control/app/api/knowledge/import/route.ts
 M apps/mission-control/lib/api-auth.ts
 M apps/mission-control/lib/connectors/outlook-mail.ts
 M apps/mission-control/lib/connectors/shared/access-token.ts
 M apps/mission-control/lib/connectors/shared/ingest.ts
 M apps/mission-control/lib/connectors/shared/oauth-callback.ts
 M apps/mission-control/lib/connectors/shared/oauth-state.ts
 M apps/mission-control/lib/connectors/sharepoint.ts
 M apps/mission-control/lib/data/repository.ts
 M apps/mission-control/lib/email/resend.ts
 M apps/mission-control/lib/observability/sentry.ts
 M apps/mission-control/lib/security-headers.ts
 M apps/mission-control/lib/security.ts
 M apps/mission-control/lib/services/knowledge.ts
 M apps/mission-control/package.json
 M apps/mission-control/scripts/db-check.mjs
 M apps/mission-control/scripts/db-migrate.mjs
 M apps/mission-control/tests/approval-policy-resolver-full.test.ts
 M apps/mission-control/tests/approval-policy-resolver.test.ts
 M apps/mission-control/tests/connector-shared.test.ts
 M apps/mission-control/tests/db-check.test.ts
 M apps/mission-control/tests/knowledge.test.ts
 M apps/mission-control/tests/unsubscribe-token.test.ts
 M docs/ENGINEERING_GUARDRAILS.md
?? apps/mission-control/app/api/admin/trial-invites/.fuse_hidden0000000e00000001
?? apps/mission-control/lib/connectors/shared/microsoft-graph-oauth.ts
?? apps/mission-control/lib/connectors/shared/oauth-callback-state.ts
?? apps/mission-control/lib/observability/report.ts
?? apps/mission-control/scripts/migration-state.mjs
?? apps/mission-control/tests/approval-terminal-gate.test.ts
?? apps/mission-control/tests/daily-brief.test.ts
?? apps/mission-control/tests/dev-runtime-drift.test.ts
?? apps/mission-control/tests/github-connector.test.ts
?? apps/mission-control/tests/governance-trace.test.ts
?? apps/mission-control/tests/jira-connector.test.ts
?? apps/mission-control/tests/microsoft-graph-oauth.test.ts
?? apps/mission-control/tests/observability-report.test.ts
?? apps/mission-control/tests/synthesis-cron.test.ts
?? docs/PR_REVIEW_2026-08-08.md
?? scripts/lint-staged.mjs
```

## Checkpoints

### 2026-08-08T19:49:43+05:00 — slice opened

- **Completed:** Orientation and durable ledger creation.
- **Verification:** Not started.
- **Pushed SHA:** Not pushed.
- **Deployed SHA:** Not verified.
- **Blockers:** None recorded.
- **Next exact action:** Inspect the governing code and tests, then implement the first coherent change.

### 2026-08-08 — what the audit actually found

Started as "add cold-start empty states to seven hubs". The audit changed the
job. `GuidedActionCard` already exists and `/meridian` and `/ask` already use
it — the live `/meridian` page I earlier called "indistinguishable from a
broken page" was in fact rendering a correct, guided cold start. My original
reading of it was wrong.

The real problem on the hub screens is the opposite of emptiness.

**Meridian, Vantage and Nucleus render invented figures as headline KPIs.**
- Meridian: 72% completeness, 12 outstanding requirements, 6/9 memo sections —
  plus a fabricated client name, "Qasr Pay".
- Vantage: 68% coverage, 9 critical gaps, 4 red flags, 12 days to IC.
- Nucleus: 4 method packs, 6 partner reviewers, 5 brand overrides, 6 fixed
  controls — hardcoded literals matching no registry.

Each screen already carried an honest banner. **The banner was not enough.** It
is 12px muted text sitting above a 30px bold number: the invented value
dominates and the caveat whispers. On a product sold on provenance, a regulated
buyer who reads "72% completeness" as their own figure and later learns it was
fabricated does not lose confidence in one number — they lose confidence in the
evidence claim that is the whole pitch. With a pilot imminent this outranked
empty-state polish.

**Fix: the marker travels with the value.** New `SampleTag` and `SampleKpi`
primitives — muted value weight, dashed border, and the literal word "Sample"
against the number. Two non-colour signals, so it survives the grayscale gate.

`SampleKpi` is deliberately a SEPARATE component rather than a boolean prop on
the real KPI: a developer must choose "this number is invented" explicitly, and
every fabricated figure in the product can be found by grepping one name.

**The detail that justifies per-value marking.** Three of Meridian's four KPIs
are invented, but the regulator deadline is derived from the scope the
workspace actually set. Marking the section would have tarred the one genuine
figure with the same brush and left the worked figures reading as live. That
KPI keeps full weight and is asserted unmarked by test.

**Deliberately not done:** wiring the Nucleus counts to real registries. Two of
the four plausibly map to `nucleusWhiteLabelRequirements` (5) and
`nucleusEngagementBoundaries` (3), but "brand overrides" versus "white-label
requirements" could as easily be opposites. Guessing the semantics to turn a
fake number into a wrong real one would be worse than marking it. Follow-up.

**Pinned:** `tests/sample-data-marking.test.ts`, 8 assertions. Negative
control: reverted one Vantage KPI to a bare `text-3xl` EXAMPLE value, the
bare-display-value test failed, reverted. One test was itself wrong on first
run — a fixed 400-character window ran into the next KPI — and was bounded to
the enclosing `</div>` instead.

**Verification:** tsc 0; 1446 tests / 153 files; boundaries clean; eslint clean
on all four touched files.

**Build NOT verified locally, and not claimed.** `next build` compiles
successfully (11.4s) but prerender dies with `EMFILE: too many open files`
reading its own freshly written `.next` output — a different route each run
(outlook-mail, then slack/events), with the files present, `@smithy/util-utf8`
installed, `@aws-sdk/client-s3` declared, and `ulimit -n` at 524288. That
signature is the sandbox/File-Provider mount, not the code. Render CI is the
authority for this gate.

**Status:** `locally verified` except the production build; `committed`.
