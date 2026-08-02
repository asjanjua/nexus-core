# August–September 2026 Milestone Decision Packet

**Status:** decision-ready; no partner, identity, authority, or source pack has been nominated in this document.

## Purpose and sequence

This packet records the two external nominations needed by 2026-08-05 and
protects the delivery sequence:

1. NexusAI governance proof.
2. A controlled Quorum board-cycle proof only when a qualified design partner
   authorises it.
3. Truthful public launch claims.
4. A commercial SOW only after the relevant evidence exists.

NexusAI prepares evidence-backed drafts and human approval loops; it does not
execute autonomously. Quorum supports board-process preparation and records;
it is not a board-portal replacement, company secretary of record, lawyer, or
statutory filing authority.

## Decision A — NexusAI pilot nomination

**Decision owner:** `<commercial owner>`

**Decision due:** 2026-08-05
**Status:** `pending nomination`

| Required decision field | Confirmed value | Evidence / authority record |
| --- | --- | --- |
| Named buyer or executive sponsor | `<name and title>` | `<written confirmation or meeting record>` |
| Operational owner | `<name and title>` | `<written confirmation>` |
| Separate Clerk reviewer | `<name and controlled identity>` | `<identity is distinct from sponsor/admin>` |
| Governed workflow | `Evidence-backed decision and approval loop for one material operating or risk decision` unless a buyer selects a stronger documented use case | `<workflow selection record>` |
| Approved or synthetic source bundle | `<source list and sensitivity>` | `<owner authorisation>` |
| Human-authority boundary | `<what remains draft/review/approval only>` | `<sponsor acknowledgement>` |
| Success metric | `<baseline, target, collection owner>` | `<scorecard>` |
| Commercial owner | `<name>` | `<internal owner record>` |

### NexusAI proof acceptance

Do not mark Decision A proven until all of the following are captured:

- The staff-only trial invitation has been issued to an authorised disposable or
  test email, redeemed by the named separate identity, and is single-use.
- The workspace trial state and expiry are visible to the controlled invitee.
- A deliberately narrow, approved source bundle supports one material decision
  or risk workflow.
- The reviewer, not the workspace administrator, can review the relevant draft
  and approval boundary.
- Evidence, audit, and approval outcomes are recorded without exposing an
  invite URL, token, sensitive source data, or credentials.
- The baseline and shadow-ROI measure are captured before commercial value is
  claimed.

## Decision B — Quorum design-partner nomination

**Decision owner:** `<commercial owner>`

**Decision due:** 2026-08-05
**Status:** `pending nomination`

| Required decision field | Confirmed value | Evidence / authority record |
| --- | --- | --- |
| Secretary or governance lead | `<name and title>` | `<written confirmation>` |
| Chair or director reviewer | `<name and title>` | `<written confirmation>` |
| Authorised or synthetic board pack | `<pack name / synthetic provenance>` | `<permission and retention rule>` |
| Permission to draft delta/action/minutes material | `<scope>` | `<explicit authorisation>` |
| Retention and counsel rule | `<rule, owner, counsel/secretary>` | `<written record>` |
| One controlled board-cycle date | `<YYYY-MM-DD>` | `<calendar confirmation>` |
| Scorecard owner | `<name>` | `<owner confirmation>` |

### Quorum proof acceptance

Only after Decision B is complete, run one controlled cycle:

1. Configure the jurisdiction/entity/policy assumptions as draft inputs.
2. Ingest the authorised or clearly labelled synthetic pack.
3. Produce draft evidence coverage, decision deltas, action register, and
   minutes material.
4. Have the nominated human reviewer accept, reject, or request changes.
5. Record the result as a draft governance artifact. Do not sign, file, send,
   or present it as statutory-compliant without the required human authority.

If no qualified design partner is nominated by the due date, retain Quorum as
design-partner discovery and keep NexusAI as the specialist pilot. Do not fill
the gap with speculative board-portal implementation.

## Commercial SOW release gate

The template in `docs/PILOT_SOW_TEMPLATE.md` may be prepared with placeholders,
but it is not signable until:

- Decision A is recorded with a named sponsor, operational owner, separate
  reviewer, workflow, source bundle, authority boundary, metric, and commercial
  owner.
- The NexusAI proof acceptance above is backed by an evidence ledger.
- The named client approves scope, data handling, success metric, commercial
  terms, and signatories.

Use `docs/PILOT_ONBOARDING_CHECKLIST.md`, `docs/PILOT_SUCCESS_SCORECARD.md`,
and `docs/PILOT_BILLING_TRIGGERS.md` as the attached operating artifacts. Keep
external identities, invite bearer links, raw tokens, credentials, and
restricted source material out of this packet and version control.

## Current factual state — 2026-08-02

- Production `app.pinavia.io` is live on commit
  `1252263ca521c460a99fb27898019ccc402048ec` and passed the canonical public
  smoke.
- The Render `PINAVIA_ADMIN_PRINCIPALS` allowlist contains only the confirmed
  Pinavia staff Clerk principal and the redeploy is live.
- Migration `0038_trial_invites.sql` is in source but has not been confirmed in
  production; the visible Neon console session is not authenticated.
- No controlled second identity, partner nomination, authorised source bundle,
  or Quorum board pack has been supplied. Therefore no invite, redemption,
  board-cycle, or commercial proof is claimed.
