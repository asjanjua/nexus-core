# Agent Run: pricing-design-pass

- **Started:** 2026-08-08T19:12:10+05:00
- **Agent:** claude
- **Branch:** `main`
- **Starting HEAD:** `87ef01d2d80f1ef2a1c2602cd54c870c8ba694c4`
- **Status:** `in_progress`

## Objective

Design pass on /pricing against the locked design system. It publishes 49/499/2500 and drives checkout, and shipped straight to code with no design review.

## Acceptance Criteria

- [ ] Passes the pre-ship checklist; tokens and scales only; grayscale gate; degraded states; gates green.

## Claimed Files

- `apps/mission-control/app/pricing/page.tsx`

## Starting Worktree State

```text
M apps/mission-control/app/api/connectors/github/callback/route.ts
 M apps/mission-control/app/api/connectors/github/install/route.ts
 M apps/mission-control/app/api/connectors/gmail/callback/route.ts
 M apps/mission-control/app/api/connectors/gmail/install/route.ts
 M apps/mission-control/app/api/connectors/google-drive/callback/route.ts
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
?? apps/mission-control/app/api/admin/trial-invites/.fuse_hidden0000000e00000001
?? apps/mission-control/lib/connectors/shared/microsoft-graph-oauth.ts
?? apps/mission-control/lib/connectors/shared/oauth-callback-state.ts
?? apps/mission-control/lib/observability/report.ts
?? apps/mission-control/scripts/migration-state.mjs
?? apps/mission-control/tests/daily-brief.test.ts
?? apps/mission-control/tests/github-connector.test.ts
?? apps/mission-control/tests/governance-trace.test.ts
?? apps/mission-control/tests/jira-connector.test.ts
?? apps/mission-control/tests/microsoft-graph-oauth.test.ts
?? apps/mission-control/tests/observability-report.test.ts
?? apps/mission-control/tests/synthesis-cron.test.ts
?? docs/PR_REVIEW_2026-08-08.md
```

## Checkpoints

### 2026-08-08T19:12:10+05:00 — slice opened

- **Completed:** Orientation and durable ledger creation.
- **Verification:** Not started.
- **Pushed SHA:** Not pushed.
- **Deployed SHA:** Not verified.
- **Blockers:** None recorded.
- **Next exact action:** Inspect the governing code and tests, then implement the first coherent change.

### 2026-08-08 — Figma reached; my earlier claim was wrong

**Correction first.** I reported that the live Figma file could not be read. It
could. I tried one MCP server — the Dev Mode one, which needs the desktop app —
got its setup message, and stopped. A second Figma server was connected and
working the entire time. Ali pushed back; he was right.

**What reading it actually found.** `figma.root.children` returns **38 pages**,
not the one that `get_metadata` reports. Every page the alignment worklist
recorded as missing is present: `01 Nexus System` (`0:1`),
`08 Quorum UI UX Build` (`78:2`), `09 Quorum Governance Workflow V0.2` (`80:2`),
`11 Vertical Input Action Screens V0.2` (`87:2`). Frames spot-checked intact:
`213:2`, `182:2` (73 children), `222:3` with all 17 Quorum sub-frames.

The cause is lazy page loading — `get_metadata` with no nodeId returns only the
loaded page, and unloaded pages report `children: 0`. The worklist's
"VERIFIED LIVE" was that artefact, and my debt doc repeated it. Both documents
are now corrected, and OPEN #0 is closed.

Two pages the repo never recorded also exist:
`33 Evidence / Document type override / 2026-08-05` and
`34 Vertical Trust + Failure States / 2026-07-29`.

### 2026-08-08 — /pricing designed and reconciled

**Figma:** new page `35 Pricing / 2026-08-08`, frame `246:3`
`Pricing / Public page / 1440`. Conventions taken from the file rather than
invented: Inter, dark top bar, authority-boundary strip at the foot, matching
the Launch Cockpit frames.

**Build incident worth recording.** `figma.createAutoLayout()` applies a default
**white fill**. Nine containers rendered as white boxes over the dark frame.
Caught by screenshotting rather than trusting the script's success return, then
fixed by clearing only pure-white fills and leaving the explicitly painted
panels alone. A successful `use_figma` return says the script ran, not that the
result is right.

**Code:** `app/pricing/page.tsx` brought in line in the same pass — one primary
action instead of two, type on the 12/14/16/20/24/32/40 ramp, spacing on scale,
`nexus-muted` in place of five ad-hoc white opacities (one of which,
`text-white/40` at 12px, was under the AA floor), and a "Most teams start here"
chip plus a raised surface so the recommended tier survives the grayscale gate.

**Pinned:** `tests/pricing-page-design.test.ts`, seven assertions covering only
the rules that were actually broken. Negative control: each violation
reintroduced, five tests failed, reverted.

**Verification:** tsc 0; 1425 tests / 151 files; eslint clean on the route.

**Status:** `locally verified`, `committed but unpushed`.
