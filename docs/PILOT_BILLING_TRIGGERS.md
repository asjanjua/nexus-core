# PILOT_BILLING_TRIGGERS.md — Conditions for Moving a Workspace from Trial to Paid

> Last updated: 2026-05-30
> Owner: Leap Associates FZCO / NexusAI commercial team
> Pricing anchor: $3,000–$8,000/month per workspace, 90-day pilot commitment.

---

## 1. Purpose

This document defines the conditions that move a NexusAI workspace from the free trial to
a paid pilot. These are not automated in Phase 1 — they are enforced manually by the commercial
team and later automated via Stripe webhook logic in Phase 7C (billing infrastructure).

The triggers exist so:
- The commercial team has a consistent, documented basis for billing conversations.
- Pilot sponsors understand the conditions at kickoff (included in the Pilot Sponsor Kit).
- Future automation has a clear specification to implement against.

---

## 2. Workspace Status Definitions

| Status | Meaning | Ingestion | Dashboard | Billing |
|---|---|---|---|---|
| `trial` | 14-day free access, no credit card | Enabled | Full access | Not billed |
| `pilot` | Signed 90-day pilot, actively paying | Enabled | Full access | Monthly invoice |
| `active` | Ongoing subscription post-pilot | Enabled | Full access | Monthly/annual invoice |
| `suspended` | Payment failed or lapsed | Disabled | Read-only | Invoice pending |
| `cancelled` | Client has churned | Disabled | Disabled | Archived |

---

## 3. Trial-to-Pilot Triggers

A workspace should be moved from `trial` to `pilot` when **all three** of the following are met:

**Trigger 1 — Usage threshold (any one):**
- 10 or more evidence records uploaded and processed, OR
- The Ask panel has been used at least 5 times, OR
- At least one recommendation has been approved by the client

**Trigger 2 — Engagement confirmation:**
- Pilot sponsor has attended at least one demo or kickoff call with the NexusAI team, AND
- Pilot Sponsor Onboarding Checklist (from `/pilot-kit`) has been signed or acknowledged

**Trigger 3 — Commercial agreement:**
- Pilot proposal signed (see `docs/PILOT_PROPOSAL_TEMPLATE.md` when created), OR
- Written confirmation via email from the sponsor authorising the pilot engagement

**Action on trigger:** Update `workspaces.status` from `trial` to `pilot`. Set `trial_ends_at`
to null. Set `stripe_customer_id` and `stripe_subscription_id` once Stripe is integrated.

---

## 4. Pilot-to-Active (Renewal) Triggers

A workspace is moved from `pilot` to `active` when:
- The 90-day pilot period has completed
- Pilot Success Scorecard shows 5+/7 outcomes met
- Renewal proposal accepted and new subscription signed
- Stripe subscription renewed or upgraded to annual

---

## 5. Trial Expiry and Suspension Logic

**Trial expiry (day 14):**
- Banner in the app shows countdown from day 10
- On day 14: access restricted to read-only (no new uploads or recommendations)
- Email sent to sponsor with upgrade instructions (once email service is wired)
- Evidence and settings preserved for 30 days before deletion

**Payment failure (pilot/active):**
- Day 1: Failed payment email sent
- Day 3: Warning banner in app
- Day 7: Dashboard access restricted to read-only
- Day 14: Full suspension — `status = suspended`
- Day 90: Data deletion warning
- Day 120: Workspace data permanently deleted (requires explicit confirmation)

---

## 6. Manual Override

The commercial team can manually update workspace status via the Postgres admin tool or
a future admin dashboard. Always log the change reason in the audit events table.

```sql
-- Move a workspace to pilot status
UPDATE workspaces
SET status = 'pilot', trial_ends_at = NULL
WHERE id = '<workspace_id>';

INSERT INTO audit_events (id, workspace_id, type, actor, payload, created_at)
VALUES (
  gen_random_uuid()::text,
  '<workspace_id>',
  'workspace_status_updated',
  'commercial_team',
  '{"from": "trial", "to": "pilot", "reason": "Pilot contract signed"}',
  NOW()
);
```

---

## 7. Pricing Tiers

| Tier | Price | Term | Limits |
|---|---|---|---|
| Pilot | $3,000–$8,000/month | 90 days | 5 active roles, 500 evidence records, 1 workspace |
| Growth | Per seat ($250–$500/user/month) | Monthly | Unlimited roles, 5,000 records, 3 workspaces |
| Enterprise | Custom | Annual | Unlimited, data residency options, SLA |

Pilot pricing is anchored at $3,000/month for organisations under 100 staff and
$8,000/month for regulated entities or organisations over 200 staff.
The anchor is a starting point — adjust based on client size, sector, and strategic value.

---

## 8. When to Automate

Phase 7C (billing infrastructure) will automate triggers 1 and 3 via:
- Stripe Checkout for trial → pilot conversion (client self-serves)
- Stripe webhook for payment events → status updates in the DB
- Scheduled job to enforce trial expiry and suspension timelines

Until Stripe is integrated, all status changes are manual with SQL and audit logging.
