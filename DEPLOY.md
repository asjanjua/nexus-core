# NexusAI Mission Control - Render Deployment Runbook

Use this when you are setting up or understanding the Render deployment path from scratch.

For release-day cutover, use `CUTOVER.md`.
For the final go/no-go checklist, use `docs/PRODUCTION_HEALTH_CHECKLIST.md`.
For detailed Render-specific environment and smoke notes, use `docs/RENDER_DEPLOY.md`.

This document covers the current production pilot path for NexusAI Mission Control.

Current stack:

- Render Web Service for the Next.js app
- Neon Postgres with `pgvector`
- Clerk for signup, login, and organization tenancy
- Cloudflare R2 for original file retention
- DeepSeek/OpenAI/Anthropic-compatible LLM routing

---

## 1. Prerequisites

Before starting, you need:

- A Render account connected to GitHub
- A Neon project with a Postgres database
- A Clerk application with Organizations enabled
- A Cloudflare R2 bucket and R2 API token
- A DeepSeek, Anthropic, or compatible LLM API key
- An OpenAI API key if `NEXUS_VECTOR_SEARCH=enabled`
- Node.js 20+ locally

---

## 2. Neon Database

Create a Neon project and copy both connection strings:

- Pooled URL for application runtime
- Direct/non-pooling URL for migrations

Set the pooled URL as `DATABASE_URL` in Render.

Run migrations with the direct URL:

```bash
cd /Users/alijanjua/Documents/Playground/nexus-core/apps/mission-control
DATABASE_URL="<direct Neon connection string>" npm run db:migrate
```

Verify the schema:

```bash
DATABASE_URL="<direct Neon connection string>" npm run db:check
```

The migration runner auto-discovers migration files in `db/migrations` in order.

---

## 3. Render Web Service

Preferred path:

1. Push the repository to GitHub.
2. In Render, choose **New -> Blueprint**.
3. Select the `nexus-core` repository.
4. Let Render read `render.yaml`.
5. Fill every `sync: false` environment variable.
6. Trigger a manual sync.

The blueprint uses:

```bash
npm ci && npm run build
npm run start -w @nexus/mission-control -- -p $PORT
```

Health check path:

```text
/api/health
```

---

## 4. Required Environment Variables

Set these in Render.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon pooled runtime connection string |
| `NEXT_PUBLIC_APP_URL` | Public Render URL or custom domain |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk browser key |
| `CLERK_SECRET_KEY` | Clerk server key |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret |
| `AUTH_SECRET` | Random 32-byte hex string; Render can generate this |
| `NEXUS_DB_REQUIRED` | Set to `true` in deployed environments |
| `NEXUS_ENV` | Usually `pilot` |
| `NEXT_PUBLIC_NEXUS_ENV` | Usually `pilot` |
| `NEXUS_LLM_PROVIDER` | `deepseek`, `anthropic`, or compatible provider |
| `NEXUS_LLM_MODEL` | Active synthesis model |
| `DEEPSEEK_API_KEY` | Required when using DeepSeek |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` |
| `ANTHROPIC_API_KEY` | Optional Anthropic provider key |
| `ANTHROPIC_BASE_URL` | Optional Cloudflare AI Gateway endpoint |
| `CLOUDFLARE_AI_GATEWAY_TOKEN` | Optional AI Gateway token |
| `OPENAI_API_KEY` | Required for embeddings when vector search is enabled |
| `NEXUS_VECTOR_SEARCH` | Set to `enabled` to use `pgvector` retrieval |
| `NEXUS_CRON_SECRET` | Shared secret for `POST /api/cron/synthesis` scheduled refreshes |
| `NEXUS_RESEND_API_KEY` | Product email provider key for scheduled synthesis briefs; not used for Clerk auth email |
| `NEXUS_FROM_EMAIL` | Authenticated sender, usually `Nexus <noreply@pinavia.io>` |
| `NEXUS_R2_ORIGINALS` | Set to `enabled` to retain original uploads |
| `R2_ACCOUNT_ID` | Cloudflare account id |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret |
| `R2_BUCKET` | R2 bucket name |
| `SLACK_CLIENT_ID` | Optional Slack connector |
| `SLACK_CLIENT_SECRET` | Optional Slack connector |
| `SLACK_SIGNING_SECRET` | Optional Slack event verification |

Generate `AUTH_SECRET` locally if needed:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 5. Clerk Configuration

In Clerk:

1. Enable Organizations.
2. Keep Clerk responsible for auth email verification, password reset, account lifecycle, and future organization invitation email.
3. Configure sign-in and sign-up paths:

| Setting | Value |
|---|---|
| Sign-in URL | `/sign-in` |
| Sign-up URL | `/sign-up` |
| After sign-in URL | `/dashboard/ceo` |
| After sign-up URL | `/onboarding` |

4. Add the deployed app URL and custom domain to allowed redirect URLs.
5. Configure the webhook endpoint:

```text
https://your-render-service.onrender.com/api/webhooks/clerk
```

Subscribe to `organization.created`.

---

## 6. Slack Connector

If using Slack, add this redirect URL in the Slack app:

```text
https://your-render-service.onrender.com/api/connectors/slack/callback
```

Required bot scopes:

```text
channels:history
channels:read
groups:history
groups:read
users:read
files:read
```

---

## 7. Smoke Test

After deployment:

```bash
BASE=https://your-render-service.onrender.com
curl -s "$BASE/api/health"
```

Expected top-level result:

```json
{
  "data": {
    "status": "ok"
  }
}
```

Browser smoke path:

1. Visit `/sign-up`.
2. Create a user.
3. Complete onboarding.
4. Upload one small PDF or DOCX.
5. Confirm it appears in Approvals or Evidence.
6. Approve it if needed.
7. Open a dashboard.
8. Ask: `What are the top risks?`
9. Open `/workflows` and confirm the workflow scorer/backcasting surface renders.
10. Open `/settings/connectors` and confirm Connector Settings renders.
11. Open `/knowledge`, create a note, save it, switch to preview/graph, and confirm the note appears in the vault tree.
12. Ask about a term from that note and confirm the answer returns note references separately from evidence references.

---

## 8. Rollback

Render rollback path:

1. Open the Render service.
2. Go to **Deploys**.
3. Select the last known-good deploy.
4. Click **Rollback**.

Database migrations are forward-only. If a schema migration needs reversal, create a new migration that restores the prior behavior without deleting history.

---

## 9. Operational Notes

Render free services can sleep when idle. That is acceptable for demos and early pilots, but a paid instance is recommended for customer-facing usage where first-load latency matters.

For deeper production checks, see:

- `CUTOVER.md`
- `docs/PRODUCTION_HEALTH_CHECKLIST.md`
