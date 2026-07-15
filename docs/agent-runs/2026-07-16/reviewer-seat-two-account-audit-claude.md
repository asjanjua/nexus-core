# Agent Run: reviewer-seat-two-account-audit

- **Started:** 2026-07-16T00:40:08+05:00
- **Agent:** claude
- **Branch:** `main`
- **Starting HEAD:** `df9a0b595fd51a86127dac6cccb4ced934c03fa7`
- **Status:** `blocked on user decision`

## Objective

Audit the current reviewer-seat invite/accept/approval flow (API, tests, migration, UI) and produce a mutation-safe execution packet for the two-account rehearsal named as the top residual gate in HANDOVER.md 2026-07-15 and the God Loop continuation prompt. Read-only: no invitation sent, no test data invented.

## Acceptance Criteria

- [x] Execution packet defines exact starting state, mutation boundary, test-identity requirement, acceptance criteria, rollback, and proof plan

## Claimed Files

- `docs/agent-runs/2026-07-16/reviewer-seat-two-account-audit-claude.md`
- `HANDOVER.md`

## Starting Worktree State

```text
M .claude/skills/BUILDEROS_LICENSE.txt
 M .claude/skills/build-loop-codex/SKILL.md
 M .learnings/FEATURE_REQUESTS.md
 M apps/mission-control/public/.well-known/security.txt
```

## Checkpoints

### 2026-07-16T00:40:08+05:00 — slice opened

- **Completed:** Orientation and durable ledger creation.
- **Verification:** Not started.
- **Pushed SHA:** Not pushed.
- **Deployed SHA:** Not verified.
- **Blockers:** None recorded.
- **Next exact action:** Inspect the governing code and tests, then implement the first coherent change.

### 2026-07-16T00:46:53+05:00 — code audit + live starting-state read, packet drafted

**Status:** `code complete` (feature), `operationally verified` (live read-only check), `blocked on user decision` (the one real mutation).

**Completed this checkpoint:**

- Read in full, read-only, no edits: `apps/mission-control/db/migrations/0035_reviewer_seats.sql`, `app/api/reviewer-seat/route.ts` (GET/POST/DELETE), `app/api/reviewer-seat/accept/route.ts`, `app/api/reviewer-seat/resend/route.ts`, `tests/reviewer-seat.test.ts` (8 passing cases at repository layer), `app/reviewer-seat/page.tsx` (388-line admin UI), `app/reviewer-seat/accept/page.tsx` (126-line redemption UI).
- Checked live production state via authenticated browser session: `https://app.pinavia.co/reviewer-seat` (Render cold start observed and waited out, confirmed rendered).

**Live starting state (read-only, confirmed by screenshot at 00:46 PKT):**

- Organization workspace `org_3GD34ZknrHc7...`, mode: pilot, environment badge: Cloud / DEMO.
- Current reviewer: **"No reviewer is bound yet."** Workspace is explicitly marked not pilot-ready; approvals fall back to break-glass only.
- Seat history: **"No seats yet."** — zero prior invites, accepts, or revocations exist for this workspace.
- Unrelated pre-existing banner present: "One or more evidence records are older than 7 days" (ingestion staleness, not related to this slice — not touched).

**Code-level findings (no gaps found; feature is complete):**

- POST `/api/reviewer-seat` generates a `randomBytes(24)` base64url invite code, stores only its sha256 hash, blocks a second invite once a seat is `accepted` (409 `reviewer_seat_already_accepted`), and writes a full audit event.
- If Resend is not configured (`resendConfigured()` false), the API still succeeds and returns `acceptUrl` directly in the response instead of emailing it; the admin UI (`page.tsx`) already renders this as a copy-link button with explicit "share manually" copy. No code work is needed to support a manual-link rehearsal.
- Acceptance is identity-bound: `accept/route.ts` validates the code (zod, 16-128 chars), hashes it, and binds the seat to the accepting user's actual Clerk `userId` — this is what makes the rehearsal meaningful (it proves cross-account binding, not just a UI click-through).
- One-accepted-seat-per-workspace is enforced at the DB layer (partial unique index in migration 0035), not just in application code.

**Mutation boundary (the only write this rehearsal requires):**

- Exactly one real mutating call: `POST /api/reviewer-seat` with a real second-account email, made from the admin UI by Ali (or by me with Ali's explicit go-ahead and a real email he supplies).
- Everything else in the rehearsal (opening the accept link, signing in as the second identity, confirming the bound state, confirming the UI reflects "reviewer bound") is a read or an identity-bound accept — no schema or infra changes required.

**Test-identity requirement (blocking, per God Loop protocol's own rule "do not invent a reviewer email"):**

- Need a real, working second email address distinct from Ali's primary account, that Ali can access to click the accept link and sign in as a second Clerk identity.
- Options: (a) an email alias Ali already controls (e.g., a `+reviewer` Gmail alias, a second personal address), or (b) a real teammate's email if Ali wants a genuine second person to test the seat. Either is fine technically; the choice is Ali's, not mine.

**Acceptance criteria for the rehearsal:**

1. Admin sends invite from `/reviewer-seat` to the supplied test email → UI shows the seat in "Seat history" as `invited`.
2. Second identity opens the accept link (or the manually-copied URL if Resend isn't configured), signs in with their own Clerk account, submits the code.
3. `/reviewer-seat` admin view now shows "Current reviewer" bound to that identity's name/email, and seat history shows one `accepted` entry with a timestamp.
4. A second invite attempt while the seat is accepted returns the 409 `reviewer_seat_already_accepted` (proves the one-seat DB constraint holds in production, not just in the 8 repository-layer tests).
5. No unrelated record mutated; the pre-existing "evidence records older than 7 days" banner and all other workspace data unchanged.

**Rollback:**

- Revoke via DELETE (already-built admin action) returns the seat to a revocable/re-inviteable state; this is non-destructive and reversible by design, so no manual DB cleanup should be needed.
- If a mistaken email is used, revoke immediately, and do not re-use that seat's history for the "official" rehearsal record — note in this ledger which entries were test noise if that happens.

**Proof plan:**

- Local: existing 8-case `tests/reviewer-seat.test.ts` already passing (repository layer) — no code changed, no re-run needed unless code changes.
- Live: screenshots of admin view before invite (captured this checkpoint, shows "No reviewer is bound yet" / "No seats yet"), after invite sent, after accept, and after the duplicate-invite 409 — each appended to this ledger as it happens.
- Paperwork: once the rehearsal completes, `HANDOVER.md` gets one new dated section stating the reviewer-seat gate is `operationally verified` with the seat-history evidence; `TASKS.md` checkbox for this item marked complete; `BACKLOG.md` cross-reference updated if the item moves out of "top residual gate."

**Blockers:**

- **Blocked on user decision**: a real second-account email address, and explicit authorization to send the one real invite. Per the protocol's own constraint ("Do not invent a reviewer email. Do not send an invitation without user authorization.") and the standing safety rule on this account, I will not fabricate an address or trigger the send without that.

**Next exact action:** Present this packet to Ali and ask for (a) the real second-account email to use, and (b) go-ahead to click "Send invite" — nothing further proceeds automatically.
