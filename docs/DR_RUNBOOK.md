# DR_RUNBOOK.md — NexusAI Disaster Recovery Runbook

> Last updated: 2026-05-30
> Owner: Platform team / Ali Janjua (Leap Associates)
> RTO: 4 hours | RPO: 24 hours (aligned to daily backup cadence)

---

## 1. Database Loss or Corruption (Neon Postgres)

**Symptoms:** API routes returning 500, DB health check failing, `DATABASE_URL` connection refused.

**Immediate steps:**

1. Confirm the issue is DB-side, not app-side:
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```
2. Check Neon dashboard at https://console.neon.tech — look for incidents or branch issues.
3. If the primary branch is corrupted, restore from the most recent daily backup:
   - In Neon: Project > Branches > Restore from point-in-time
   - Target: the last known-good timestamp (max 24 hours ago per our RPO)
4. After restore, run pending migrations:
   ```bash
   cd apps/mission-control && npm run db:migrate
   ```
5. Verify the restore:
   ```bash
   npm run db:check
   ```
6. Re-deploy the app to pick up the restored DB connection.
7. Notify affected pilot clients within 1 hour of confirmed data loss.

**If Neon is fully unavailable (provider outage):**

- The app falls back to in-memory store (`lib/data/store.ts`) automatically when `DATABASE_URL` is unreachable and `NEXUS_DB_REQUIRED` is not set to `true`.
- This mode is read-only from a persistence standpoint — new uploads and recommendations will not survive a restart.
- Set `NEXUS_DB_REQUIRED=false` temporarily to keep the app shell responsive.
- Communicate estimated recovery time to pilot clients.

---

## 2. R2 Object Storage Unavailable

**Symptoms:** File upload succeeds but original file cannot be retrieved; evidence records show `sourceUri` but file download returns 404.

**Immediate steps:**

1. Check Cloudflare R2 status at https://www.cloudflarestatus.com
2. The app continues to function for text extraction and LLM synthesis — only original file downloads are affected.
3. Evidence records remain in Postgres. No data is lost.
4. If the bucket was accidentally deleted:
   - Recreate the bucket with the same name in the Cloudflare dashboard.
   - R2 bucket versioning (when enabled per Phase 7C) allows recovery of deleted objects within 30 days.
   - Contact Cloudflare support if the bucket cannot be recreated.
5. When R2 is restored, verify with a test upload and download.

---

## 3. Clerk Auth Service Failure

**Symptoms:** All users redirected to sign-in loop; `/api/auth/me` returns 401; Clerk SDK throwing.

**Immediate steps:**

1. Check Clerk status at https://status.clerk.com
2. If Clerk is experiencing an outage, the app is effectively inaccessible for browser sessions. Bearer-token API calls (agents) are unaffected — route handlers validate tokens independently.
3. Do not attempt to bypass Clerk auth in production. Wait for Clerk to recover.
4. If the issue is a misconfigured env var:
   - Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set correctly in Render.
   - Re-deploy after correcting.
5. Notify pilot clients that the service is temporarily unavailable for browser access.

---

## 4. LLM Provider Unavailable

**Symptoms:** Dashboard cards show `[LLM unavailable]`; Ask panel returns no answer; ingestion proceeds but recommendations are not generated.

**Immediate steps:**

1. Check provider status:
   - Anthropic: https://status.anthropic.com
   - DeepSeek: https://platform.deepseek.com (no public status page — check X/Twitter)
2. The app is designed to degrade gracefully:
   - Dashboard cards show a fallback message, not an error page.
   - Ask panel returns `null` with a user-facing message.
   - Ingestion continues — evidence is stored, recommendations are skipped.
3. Switch provider if needed (without redeployment):
   - Set `NEXUS_LLM_PROVIDER=deepseek` and `DEEPSEEK_API_KEY` in Render environment variables.
   - Restart the app (Render: Manual Deploy > Restart).
4. When the primary provider recovers, revert `NEXUS_LLM_PROVIDER` to `anthropic`.

---

## 5. Full Application Outage (Render hosting)

**Symptoms:** All routes returning 503 or timing out; Render dashboard shows deploy failure or crashed service.

**Immediate steps:**

1. Check Render status at https://status.render.com
2. If a bad deploy caused the outage:
   - In Render: Deploys tab > select the last known-good deploy > click "Redeploy".
3. If the service is OOM or crashed:
   - Check logs in Render dashboard for the crash reason.
   - Scale up memory if needed (Render: Service Settings > Instance Type).
4. If the issue is a failed database migration on deploy:
   - Roll back to the previous deploy first.
   - Fix the migration SQL.
   - Test migration on a staging branch before redeploying to production.

**Rollback SQL reference (key migrations):**

| Migration | Rollback |
|---|---|
| 0012_workspace_status.sql | `ALTER TABLE workspaces DROP COLUMN IF EXISTS status, trial_ends_at, suspended_at, stripe_customer_id, stripe_subscription_id; DROP TABLE IF EXISTS llm_usage;` |
| 0011_role_archetype.sql | `ALTER TABLE workspace_profiles DROP COLUMN IF EXISTS company_archetype, archetype_version, brief_language_mode, location_count, role_states;` |
| 0010_connector_instance.sql | `ALTER TABLE evidence_records DROP COLUMN IF EXISTS connector_instance_id;` |

---

## 6. Contact Directory

| Role | Contact |
|---|---|
| Platform lead | ali.janjua@live.com |
| Neon support | https://console.neon.tech/support |
| Cloudflare support | https://dash.cloudflare.com/support |
| Clerk support | https://dashboard.clerk.com/support |
| Anthropic support | https://console.anthropic.com/support |
| Render support | https://render.com/support |

---

## 7. Post-Incident Checklist

After any incident that affected pilot clients:

- [ ] Write an internal incident summary (what happened, when, cause, resolution, duration).
- [ ] Notify affected pilot clients within 1 business day with a plain-English explanation.
- [ ] Add a retrospective item to TASKS.md if a systemic fix is needed.
- [ ] Check if the incident revealed a gap in monitoring — add an alert if so.
