# Pilot Operations Runbook

Scope: the operational baseline required before charging a pilot customer.
Owner: Ali Janjua. Production: https://app.pinavia.io (Render, auto-deploy from main).
Last reviewed: 2026-07-05.

## 1. Production email boundary (Resend + pinavia.io)

### 1.1 What is enforced in code
- `lib/email/resend.ts` refuses sends to any recipient outside pilot/production
  (`NEXUS_ENV`) unless the recipient matches `NEXUS_EMAIL_ALLOWLIST`
  (comma-separated addresses or `@domains`). Covered by
  `tests/email-boundary.test.ts`.
- Default from address is `NexusAI <briefs@pinavia.io>`; override with
  `NEXUS_FROM_EMAIL`.
- Clerk owns auth email (verification, reset). Nexus only sends product email
  (scheduled synthesis briefs, pilot notifications), always with an
  unsubscribe link, and every send/failure is audit-logged.

### 1.2 One-time setup (Resend console + DNS)
1. Resend > Domains > Add `pinavia.io`. Choose the `send.pinavia.io` subdomain
   option if offered — it isolates product mail reputation.
2. Add the DKIM and SPF records Resend displays to Cloudflare DNS. Verify.
3. Add a DMARC record if not present: `_dmarc.pinavia.io TXT
   "v=DMARC1; p=quarantine; rua=mailto:security@pinavia.io"`.
4. Create a production API key scoped to sending only.
5. Render (nexus-mission-control) env vars:
   - `NEXUS_RESEND_API_KEY` = the key
   - `NEXUS_FROM_EMAIL` = `NexusAI Briefs <briefs@pinavia.io>`
   - `NEXUS_ENV` is already `pilot` (render.yaml) so real sends are allowed.
6. Smoke: create a synthesis schedule with your own email target, run the
   synthesis cron once, confirm delivery and the `synthesis_email_sent` audit
   entry, and click the unsubscribe link.

## 2. Uptime monitoring

Target: know within 5 minutes if the pilot is down, without building anything.

1. Create a free UptimeRobot (or BetterStack) account with monitors:
   - `GET https://app.pinavia.io/api/health` — keyword monitor, expect `"ok"`.
     This is the deep check (app + database).
   - `GET https://app.pinavia.io/` — HTTP 200/redirect, edge and TLS check.
   - `GET https://app.pinavia.io/sign-in` — auth surface renders.
   Ingestion and dashboard are behind auth; the health endpoint plus the
   Render deploy status is the practical proxy. Do not put session cookies in
   a third-party monitor.
2. Alert contacts: ali.janjua@live.com plus phone push. Escalation after 2
   consecutive failures (10 minutes) to avoid free-tier flapping noise.
3. Render free tier sleeps on idle. If health checks show cold-start latency
   alarms, either accept keyword-only alerting or upgrade the service before
   the paid pilot. Note: a paid pilot on a free dyno is a commercial risk —
   budget the Render starter plan as a pilot cost.
4. Record incidents in `docs/INCIDENTS.md` (date, duration, cause, fix) — this
   becomes your SLA evidence.

## 3. Neon backup and restore

Facts (verified 2026-07): Neon free plan point-in-time restore covers only
6 hours or 1 GB of change history. Launch plan extends to 7 days at
$0.20/GB-month. Instant restore applies to root branches.

1. Automated: `.github/workflows/nightly-backup.yml` takes a nightly
   `pg_dump` and stores 14 daily dumps in the R2 backup bucket. Set the
   repository secrets listed in the workflow header.
2. Decision: for a paid pilot, upgrade Neon to Launch so PITR covers a
   weekend, or accept that dumps are the recovery mechanism (max 24h data
   loss). Recommended: Launch during any paid pilot.
3. Quarterly restore drill (do once now, then quarterly):
   - Download the latest dump from R2.
   - `pg_restore` into a fresh Neon branch or local Postgres.
   - Run `npm run db:check -w @nexus/mission-control` against it.
   - Log the drill date and outcome in this file. An untested backup is not
     a backup.

Restore drill log:
| Date | Dump | Restored to | Result |
|---|---|---|---|
| (pending first drill) | | | |

## 4. R2 originals protection

Fact (verified 2026-07): R2 does NOT support object versioning; it is on
Cloudflare's roadmap only. Lifecycle management exists but is not protection.

1. Protection model: the nightly workflow copies originals to a second bucket
   (`R2_BACKUP_BUCKET`) using `rclone copy` — deletions in production never
   propagate to the backup.
2. Create the backup bucket (`nexus-originals-backup`) in the Cloudflare
   dashboard. Create a dedicated API token scoped to read the production
   bucket and write the backup bucket. The app's runtime token must have NO
   access to the backup bucket — that isolation is the whole point.
3. When Cloudflare ships native versioning, enable it and retire the copy job.

## 5. Support and security mailboxes

1. Cloudflare Email Routing (free, domain already on Cloudflare):
   - `support@pinavia.io` -> ali.janjua@live.com
   - `security@pinavia.io` -> ali.janjua@live.com
2. `public/.well-known/security.txt` is served by the app and points
   researchers at security@pinavia.io (see file for expiry date — renew
   annually).
3. Put support@pinavia.io in the app footer/help dialogs and in the pilot
   agreement as the single support channel.

## 6. Pilot SLA (offer this, do not over-promise)

Positioning: this is a paid pilot, not enterprise production. The SLA sells
honesty and responsiveness, not five nines.

| Item | Commitment |
|---|---|
| Service hours | Business days, 09:00-18:00 Gulf Standard Time |
| Support channel | support@pinavia.io |
| P1 (service down / data integrity) | Response within 4 business hours, workaround or fix target 1 business day |
| P2 (feature broken, workaround exists) | Response within 1 business day, fix target 5 business days |
| P3 (question, cosmetic, request) | Response within 2 business days |
| Availability target | 99% monthly, measured by health-endpoint monitoring; excludes planned maintenance announced 24h ahead |
| Backups | Nightly database and document backups, 14-day retention, quarterly restore drills |
| Data handling | Tenant-isolated workspace; evidence never used to train models; deletion on request within 30 days of pilot end |
| Security contact | security@pinavia.io; acknowledgement within 2 business days |

Exclusions to state plainly: no on-call outside service hours during pilot;
third-party outages (Render, Neon, Cloudflare, Clerk, LLM provider) are
managed on a best-effort basis; SLA credits are not offered at pilot pricing —
the remedy is termination with a pro-rata refund.

## 7. Pre-pilot go/no-go checklist

- [ ] Resend domain verified, live send + unsubscribe tested (1.2.6)
- [ ] Uptime monitors green for 7 consecutive days
- [ ] Nightly backup workflow green, first restore drill logged
- [ ] Backup bucket isolated from runtime credentials
- [ ] support@ / security@ routing tested end to end
- [ ] SLA table pasted into the pilot agreement
- [ ] Render plan decision made (free-tier sleep vs starter)
- [ ] Neon plan decision made (free PITR 6h vs Launch 7d)
