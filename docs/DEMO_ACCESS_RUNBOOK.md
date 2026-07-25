# Demo Access Runbook

## Purpose

Create a repeatable, safe Nexus demo without putting credentials, admin
passwords, or Clerk secret material in application code, Git, or demo notes.

## Recommended Pinavia identities

Create these as separate Clerk users under your `pinavia.io` domain. The names
are a template; replace them with real mailbox aliases you control.

| Identity | Suggested email | Clerk organization role | Demo responsibility |
| --- | --- | --- | --- |
| Demo owner | `demo-owner@pinavia.io` | `org:admin` | Creates the workspace, configures sources, manages the demo. |
| Demo executive | `demo-executive@pinavia.io` | `org:member` | Views dashboards, Ask, decisions, and workflow outputs. |
| Demo reviewer | `demo-reviewer@pinavia.io` | `org:member` | Accepts the reviewer invite and signs off evidence/recommendations. |

Do not make the reviewer an `org:admin`. Nexus deliberately rejects admin
reviewer-seat acceptance so a single identity cannot administer and approve
the same governed workflow.

## Clerk setup

1. In Clerk, create the three users or invite them using their Pinavia mailbox.
2. Require each user to set a unique password in Clerk. Never copy a shared
   password into `.env`, a source file, a ticket, or a demo script.
3. Add all three users to the same Clerk organization.
4. Assign `org:admin` only to the demo owner. Leave the executive and reviewer
   on Clerk's built-in `org:member` role.
5. Copy the demo owner's Clerk user ID into `NEXUS_OPERATOR_USER_IDS` on Render
   only if that account needs the internal Pilot Funnel view.
6. Sign in as the owner, create a reviewer-seat invite for the reviewer email,
   then sign in separately as the reviewer to redeem it. The acceptance route
   requires a verified matching Clerk email and a non-admin organization role.

## Safe password handling

Clerk owns password storage, reset, MFA, lockout, and session security. Nexus
does not implement a second password database and must not ship default admin
credentials. If a demo password is exposed, reset it in Clerk and revoke the
session; no code deployment is needed.

## In-app company setup helper

Authenticated users see the **Set up company** helper on first use. It guides
them through the real product sequence:

1. Company profile and leadership context.
2. A small, high-value evidence pack.
3. Human approval for uncertain evidence.
4. Selection of one governed first workflow.

The helper is dismissible per browser and always available again from the
floating **Set up company** button. It does not claim that a step is complete;
completion remains controlled by the server-side onboarding, approval, and
workflow gates.
