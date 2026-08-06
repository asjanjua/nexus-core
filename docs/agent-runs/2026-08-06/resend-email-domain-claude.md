# Agent Run: resend-email-domain

- **Started:** 2026-08-06T09:21:10+05:00
- **Agent:** claude
- **Branch:** `main`
- **Starting HEAD:** `1353a6d481a0677994e9809c8d5f601ebb5a1c68`
- **Status:** `in_progress`

## Objective

Stand up Resend so NexusAI can send reviewer invites, synthesis briefs and pilot email, and make the code default match the domain actually verified.

## Acceptance Criteria

- [ ] Verified sending domain in Resend; From default on that domain; DNS records recorded exactly; gates green.

## Claimed Files

- `apps/mission-control/lib/email/resend.ts`

## Starting Worktree State

```text
M apps/mission-control/lib/email/resend.ts
```

## Checkpoints

### 2026-08-06T09:21:10+05:00 — slice opened

- **Completed:** Orientation and durable ledger creation.
- **Verification:** Not started.
- **Pushed SHA:** Not pushed.
- **Deployed SHA:** Not verified.
- **Blockers:** None recorded.
- **Next exact action:** Inspect the governing code and tests, then implement the first coherent change.

### 2026-08-06 — re-orientation before work

Another agent has been committing. `HEAD` is `1353a6d` and in sync with
`origin/main`. Two items this agent had queued are already delivered and must
not be redone:

- `ef640ad` — `maxTeam` enforced via a Clerk `organizationMembership.created`
  webhook. This was the "cannot use the ingest chokepoint" gap recorded
  yesterday.
- `f4e92f8` — `matchesEvidenceTags` reconciled with reviewer overrides, closing
  the disagreement between the four native engines and the Meridian coverage
  API.
- The postcss lockfile drift is also resolved (`bbd1e93`, `891d581`).

Commit `b850545` (migration-promotion guardrail) is no longer in history — it
was rebased during that work. Verified that every artifact survived rather than
assuming: `ENGINEERING_GUARDRAILS.md` §9 present, the `render.yaml` build-time
comment present, `db-check` drift detection present (and since extended by
another agent, with `db-check.test.ts` added). Nothing lost; only the SHA
changed.

### 2026-08-06 — Resend domain created

- **Created `send.pinavia.io`, region Ireland (eu-west-1).** Region chosen by
  Ali: closer to GCC and Pakistan recipients than the US, and it supports the
  data-residency answer regulated buyers ask for.
- **Subdomain, not the apex, deliberately.** Verifying `pinavia.io` itself would
  put Resend's SPF alongside whatever already handles corporate mail on the
  apex and would tie transactional sending reputation to it. A dedicated
  sending subdomain isolates both.
- **Manual DNS setup chosen over Resend's "Auto configure".** Auto configure
  grants Resend OAuth write access to the entire Cloudflare account. The
  records needed are three; the access requested is not proportionate.
- **Code change:** `NEXUS_FROM_EMAIL` now defaults to
  `NexusAI <briefs@send.pinavia.io>`. The previous default,
  `briefs@pinavia.io`, is on no verified domain — Resend rejects a From outside
  a verified domain, so that default could only ever fail, at send time, per
  email, with nothing in the repository explaining why.
- **DKIM value reconstruction, and why it is trustworthy.** Resend's UI
  truncates the public key in both the visible text and the copy button's
  accessible label, and page scripting was blocked. The value was reassembled
  from two independent renderings and then validated rather than trusted: 216
  base64 characters decoding to exactly 162 DER bytes, the correct size for a
  1024-bit RSA SubjectPublicKeyInfo, with the reassembly's first 100 characters
  matching the copy label byte for byte. Resend's own verification is still the
  authority and will reject a bad transcription.
- **Blocked:** Cloudflare requires sign-in, and entering credentials is out of
  bounds for this agent. DNS records are handed to Ali below.
- **Deliberately NOT set: the apex `_dmarc` record.** Resend offers it as
  optional at `_dmarc` (apex, not `_dmarc.send`). A DMARC policy at the apex
  governs all `@pinavia.io` mail including existing corporate email, and
  publishing one without auditing what already sends from that domain risks
  quarantining legitimate mail. Ali's call, separately.
- **Verification:** tsc 0; 1049 tests / 131 files; boundaries clean; build 197
  pages.
- **Note on suite size:** earlier runs today reported 129 files. 131 is the
  true count on disk; the difference is the two test files added by the other
  agent, not a collection failure. Confirmed with `vitest list` against a
  filesystem listing — zero discrepancy.
- **Sandbox incident:** the rolldown native binding disappeared mid-session
  again and vitest exited 1 with a module-resolution error, not a test failure.
  Reinstalled `@rolldown/binding-linux-arm64-gnu@1.1.3`. Recorded so the next
  agent reads exit 1 correctly.
- **Next exact action:** Ali signs in to Cloudflare and adds the three records;
  then click verify in Resend; then set `NEXUS_RESEND_API_KEY` and
  `NEXUS_FROM_EMAIL` in Render.

### 2026-08-06T09:34 — domain VERIFIED

- **`send.pinavia.io` status: Verified.** Resend reports "ready to send
  emails". Region Ireland (eu-west-1), provider Cloudflare.
- **The DKIM reconstruction was correct.** Resend's own check reported "DNS
  verified" at 09:31 and completed domain verification at 09:33. This is the
  point that mattered: the key had been reassembled from two truncated
  renderings, and Resend's verification — not the reassembly — is what
  establishes it is right.
- **Records added to the `pinavia.io` zone**, all DNS-only, TTL Auto:
  - `TXT resend._domainkey.send` — DKIM public key
  - `MX  send.send` → `feedback-smtp.eu-west-1.amazonses.com`, priority 10
  - `TXT send.send` → `v=spf1 include:amazonses.com ~all`
- **Checked for conflicts before writing.** All 13 pre-existing records were
  CNAMEs — Clerk (`clerk`, `clkmail`, `clk._domainkey`, `clk2._domainkey`,
  `accounts`) and the product hostnames. No TXT, MX, SPF or DMARC existed, so
  nothing was overwritten and no SPF merge was needed. Cloudflare's own
  recommendation panel confirms no mail is currently received at `@pinavia.io`.
- **Still not set: apex DMARC.** Resend offers it at `_dmarc`, which governs
  all `@pinavia.io` mail. Clerk sends on this domain. Publishing a policy
  without first confirming Clerk's mail aligns under SPF or DKIM risks
  quarantining sign-in and invite email. The right sequence is `p=none` with
  an `rua` reporting address, observe, then tighten — a separate deliberate
  step, not a checkbox during setup.
- **Remaining before email actually sends:** `NEXUS_RESEND_API_KEY` in Render.
  Ali sets this; this agent does not handle credentials.
- **Status:** domain `operationally verified`; application email
  `blocked on user` for the API key.
