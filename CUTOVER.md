# NexusAI Production Cutover Runbook

Use this on release day when moving a locally verified build to the live pilot URL.

For first-time Render setup, use `DEPLOY.md` and `docs/RENDER_DEPLOY.md`.
For the final production gate, use `docs/PRODUCTION_HEALTH_CHECKLIST.md`.

This is the current cutover checklist for the Render + Neon deployment path.

Use this when moving a new build from local validation to a live pilot URL.

---

## Step 1 - Confirm Required Accounts

You need access to:

- Render project or blueprint
- Neon database project
- Clerk application
- Cloudflare R2 bucket
- LLM provider dashboard
- GitHub repository

---

## Step 2 - Set Render Environment Variables

In Render, open the `nexus-mission-control` service and set:

```text
DATABASE_URL=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
AUTH_SECRET=
NEXUS_DB_REQUIRED=true
NEXUS_ENV=pilot
NEXT_PUBLIC_NEXUS_ENV=pilot
NEXUS_LLM_PROVIDER=deepseek
NEXUS_LLM_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=
OPENAI_API_KEY=
NEXUS_VECTOR_SEARCH=enabled
NEXUS_R2_ORIGINALS=enabled
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

Only set Slack variables when the Slack connector is active.

Sentry variables are optional — the app runs identically with no Sentry account configured (`enabled: !!process.env.SENTRY_DSN` gates initialization to a no-op). Set them once a Sentry project exists; leave them blank otherwise. `NEXUS_LLM_MODEL` should be `deepseek-v4-flash` or `deepseek-v4-pro`, not the legacy `deepseek-chat`/`deepseek-reasoner` names — DeepSeek retires those on 2026-07-24 15:59 UTC.

---

## Step 3 - Run Migrations

Use the Neon direct/non-pooling connection string for schema changes.

```bash
cd /Users/alijanjua/Documents/Playground/nexus-core/apps/mission-control
DATABASE_URL="<direct Neon connection string>" npm run db:migrate
```

Verify:

```bash
DATABASE_URL="<direct Neon connection string>" npm run db:check
```

Confirm these features exist in the database:

- `vector` extension
- `evidence_records.embedding`
- `agent_control_profiles`
- `agent_outputs`
- workspace/evidence/audit indexes

---

## Step 4 - Deploy

Recommended path:

1. Push the current branch to GitHub.
2. Open Render.
3. Open the Nexus blueprint or web service.
4. Trigger **Manual Sync** or **Manual Deploy**.
5. Wait for the build and health check to pass.

Expected build commands from `render.yaml`:

```bash
npm ci && npm run build
npm run start -w @nexus/mission-control -- -p $PORT
```

---

## Step 5 - Health Verification

Set:

```bash
BASE=https://nexus-mission-control.onrender.com
```

Then run:

```bash
curl -s "$BASE/api/health"
```

Expected:

```json
{
  "data": {
    "status": "ok"
  }
}
```

If health fails:

| Failed area | Most likely cause | Fix |
|---|---|---|
| database | Wrong `DATABASE_URL` or migrations not run | Recheck Neon pooled URL and run migrations with direct URL |
| vector search | `OPENAI_API_KEY` missing or migration missing | Add key and run migrations |
| originals storage | R2 variables missing | Recheck R2 account, keys, and bucket |
| LLM | provider key missing or provider/model mismatch | Recheck `NEXUS_LLM_PROVIDER`, model, and key |

---

## Step 6 - Browser Smoke Test

Use the deployed URL:

```text
https://nexus-mission-control.onrender.com
```

Checklist:

- [ ] `/sign-up` renders.
- [ ] New user can sign up.
- [ ] Onboarding appears after signup.
- [ ] Company profile step saves.
- [ ] Upload accepts a small PDF or DOCX.
- [ ] Evidence is processed, pending approval, or quarantined with clear status.
- [ ] Pending evidence can be approved.
- [ ] CEO/COO/CBO/CTO dashboards render.
- [ ] Ask answers with evidence refs or refuses when evidence is weak.
- [ ] `/workflows` renders the workflow scorer/backcasting surface.
- [ ] `/settings/connectors` renders Connector Settings.
- [ ] `/knowledge` opens.
- [ ] A markdown note can be created, saved, previewed, and shown in graph mode.
- [ ] Ask can reference note content with note references separate from evidence references.
- [ ] Settings -> Agent Governance renders profiles and output log.
- [ ] Rollback button is visible for prior agent outputs when history exists.

---

## Step 7 - API Smoke Test

With a valid browser session or scoped bearer token:

```bash
curl -s "$BASE/api/auth/me"
curl -s "$BASE/api/evidence?status=processed&limit=5"
curl -s "$BASE/api/agent-control-profiles"
curl -s "$BASE/api/agent-outputs?limit=5"
```

Unauthenticated calls to protected APIs should return `401` or equivalent auth failure.

---

## Step 8 - Tag After Verification

Only tag after:

- local tests pass
- local build passes
- migrations have run
- Render deploy is healthy
- browser smoke path passes

```bash
git tag v1-pilot-cutover
git push origin v1-pilot-cutover
```

---

## Step 9 - Rollback

Use Render's deploy rollback if the app deploy breaks.

If a migration causes an issue, create a forward corrective migration. Do not manually delete tables or rewrite migration history in a live pilot database.
