# NexusAI Mission Control — Vercel Deployment Runbook

This document covers every step to take the platform from a local dev environment to a production-grade pilot deployment on Vercel.

---

## Prerequisites

Before starting, you need:

- A Vercel account (Pro tier recommended for Postgres add-on limits)
- A Clerk account at [clerk.com](https://clerk.com) with a new application created
- An Anthropic API key (or OpenAI key if you prefer GPT-4o)
- A Slack app registered at [api.slack.com/apps](https://api.slack.com/apps) if you want the Slack connector
- Node.js 20+ installed locally
- The `vercel` CLI: `npm install -g vercel`

---

## 1. Vercel Project Setup

```bash
# From the monorepo root
cd nexus-core
vercel link   # connect to your Vercel account and create/select a project
```

Set the root directory to `apps/mission-control` when prompted. Vercel detects Next.js automatically.

### 1.1 Add Vercel Postgres

In the Vercel dashboard, go to your project, then **Storage → Create Database → Postgres**.

Name it `nexus-db` (or any name you prefer). Select the region closest to your primary user base.

Once created, Vercel automatically injects these env vars into your project:

```
POSTGRES_URL
POSTGRES_URL_NON_POOLING
POSTGRES_PRISMA_URL
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DATABASE
POSTGRES_HOST
```

You will use `POSTGRES_URL` as `DATABASE_URL` in your env. Vercel Postgres uses pgvector by default — no separate extension install needed.

### 1.2 Run Database Migrations

Connect to your Vercel Postgres instance from your local machine using the `POSTGRES_URL_NON_POOLING` connection string (bypasses PgBouncer for DDL):

```bash
# Set the connection string for migration
export DATABASE_URL="<paste POSTGRES_URL_NON_POOLING here>"

# Run all migrations in order
cd apps/mission-control
psql $DATABASE_URL -f db/migrations/0001_init.sql
psql $DATABASE_URL -f db/migrations/0002_auth_users.sql
psql $DATABASE_URL -f db/migrations/0003_agent_keys_and_settings.sql
psql $DATABASE_URL -f db/migrations/0004_connectors.sql
psql $DATABASE_URL -f db/migrations/0005_pending_approval_status.sql
```

Verify:
```bash
psql $DATABASE_URL -c "\dt"
```

You should see: `evidence_records`, `recommendations`, `tenants`, `workspaces`, `workspace_settings`, `connectors`, `agent_keys`, `users`, `roles`, `entities`, `decisions`, `audit_events`.

---

## 2. Clerk Configuration

### 2.1 Application Settings

In the Clerk dashboard ([dashboard.clerk.com](https://dashboard.clerk.com)):

1. Create a new application or use an existing one.
2. Enable **Organizations** — go to **Configure → Organizations** and toggle it on. This is required for multi-tenant workspace isolation.
3. Under **User & Authentication**, enable email/password and any social providers you want (Google is recommended for B2B pilots).

### 2.2 Redirect URLs

In **Configure → Paths**, set:

| Setting | Value |
|---------|-------|
| Sign-in URL | `/sign-in` |
| Sign-up URL | `/sign-up` |
| After sign-in URL | `/dashboard/ceo` |
| After sign-up URL | `/onboarding` |

Also add your Vercel deployment URL to **Allowed redirect URLs**:
```
https://your-app.vercel.app
https://your-custom-domain.com   # if applicable
```

### 2.3 Webhooks

Go to **Configure → Webhooks → Add Endpoint**.

- Endpoint URL: `https://your-app.vercel.app/api/webhooks/clerk`
- Subscribe to: `organization.created`

Copy the **Signing Secret** — you will need it as `CLERK_WEBHOOK_SECRET`.

### 2.4 Retrieve API Keys

Go to **API Keys** and copy:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_live_` or `pk_test_`)
- `CLERK_SECRET_KEY` (starts with `sk_live_` or `sk_test_`)

Use live keys for production, test keys for staging.

---

## 3. Slack App Setup (optional — needed for Task 22 connector)

In the Slack app manifest at [api.slack.com/apps](https://api.slack.com/apps), create or update your app with:

**OAuth Scopes (Bot Token Scopes):**
```
channels:history
channels:read
groups:history
groups:read
users:read
files:read
```

**Redirect URLs:**
```
https://your-app.vercel.app/api/connectors/slack/callback
```

Copy:
- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `SLACK_SIGNING_SECRET` (from Basic Information)

---

## 4. Environment Variables

In the Vercel dashboard, go to **Settings → Environment Variables** and add all of the following. Set them for **Production**, **Preview**, and **Development** environments as appropriate.

### Required

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | Paste `POSTGRES_URL` from Vercel Postgres | Use the pooling URL for app connections |
| `NEXUS_DB_REQUIRED` | `true` | Enables DB-required mode in production |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Used for OAuth redirect URIs |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | From Clerk dashboard |
| `CLERK_SECRET_KEY` | `sk_live_...` | From Clerk dashboard |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard/ceo` | |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/onboarding` | |
| `CLERK_WEBHOOK_SECRET` | `whsec_...` | From Clerk webhook settings |
| `AUTH_SECRET` | 64-char random string | Signs agent Bearer tokens and Slack OAuth state |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | |
| `NEXUS_LLM_MODEL` | `claude-opus-4-6` | Or `gpt-4o` if using OpenAI |
| `NEXUS_ENV` | `pilot` | |
| `NEXT_PUBLIC_NEXUS_ENV` | `pilot` | Shown in UI |

### Generate AUTH_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Optional (Slack connector)

| Variable | Value |
|----------|-------|
| `SLACK_CLIENT_ID` | From Slack app settings |
| `SLACK_CLIENT_SECRET` | From Slack app settings |
| `SLACK_SIGNING_SECRET` | From Slack app Basic Information |

---

## 5. Deploy

```bash
# From the monorepo root
vercel --prod
```

Or push to your main branch if you have GitHub auto-deploy enabled in Vercel.

### Build Command

If Vercel doesn't detect it automatically, set in **Settings → Build & Output**:

- **Build Command:** `npm run build` (or `cd apps/mission-control && npm run build`)
- **Output Directory:** `.next`
- **Install Command:** `npm install`
- **Root Directory:** `apps/mission-control`

---

## 6. Post-Deployment Smoke Test

Run through this checklist after the first successful deploy:

### 6.1 Authentication

- [ ] Visit `https://your-app.vercel.app/sign-in` — Clerk sign-in page renders
- [ ] Create an account and an organization
- [ ] Clerk webhook fires, workspace auto-provisions (check Vercel logs: `organization.created` event)
- [ ] Redirected to `/onboarding` after org creation
- [ ] Onboarding wizard completes: provision → upload a test PDF → evidence preview → dashboard selection

### 6.2 Database

```bash
# Check that rows were created after onboarding
psql $DATABASE_URL -c "SELECT id, name FROM tenants LIMIT 5;"
psql $DATABASE_URL -c "SELECT id, ingestion_status, extraction_confidence FROM evidence_records LIMIT 5;"
```

### 6.3 API Health

```bash
BASE=https://your-app.vercel.app

# Public health check (no auth needed)
curl $BASE/api/health

# Auth check (requires valid Clerk session cookie — use browser DevTools to get it)
curl -H "Cookie: __session=<your-session-token>" $BASE/api/auth/me

# Agent Bearer token flow
curl -X POST $BASE/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{"keyId":"your-key-id","secret":"your-key-secret","scopes":["read:dashboard"]}'
```

### 6.4 Evidence Pipeline

- [ ] Upload a PDF via `/ingestion` page
- [ ] Check status at `/approvals` — items with 35–75% confidence appear in queue
- [ ] Approve an item and verify it moves to `/dashboard/ceo`
- [ ] Check `/api/evidence?status=pending_approval` returns the correct count

### 6.5 LLM Synthesis

Visit `/dashboard/ceo` and verify:

- [ ] Recommendations load (LLM synthesis ran successfully)
- [ ] Charts render (SVG-based, no external deps)
- [ ] `Ask` page returns answers based on uploaded evidence

---

## 7. Custom Domain (optional)

In Vercel, go to **Settings → Domains** and add your domain. Update:

- `NEXT_PUBLIC_APP_URL` to your custom domain
- Clerk allowed redirect URLs (add your new domain)
- Slack OAuth redirect URL in the Slack app settings

---

## 8. Scaling for Pilot Clients

### 8.1 Per-Tenant Isolation

Each client signs up, creates a Clerk Organization, and gets their own `tenantId/workspaceId`. No data crosses tenant boundaries. Verified at the repository layer by `ctx.workspaceId` enforcement on every query.

### 8.2 Adding a New Pilot

1. Invite the client's admin user to their Clerk Organization via the Clerk dashboard.
2. They land on `/onboarding`, provision their workspace, and connect their first data source.
3. No code changes or manual DB setup required — fully self-serve.

### 8.3 LLM Cost Management

Set `NEXUS_LLM_MODEL=claude-haiku-4-5-20251001` for pilots where cost sensitivity matters. Switch to `claude-opus-4-6` for high-stakes executive briefings.

### 8.4 Evidence Volume

Vercel Postgres (Hobby: 256MB, Pro: 512MB). For pilots with heavy document ingestion, consider:

- Storing extracted text in object storage (S3/R2) and keeping only embeddings + metadata in Postgres
- Enabling pgvector indexing once the evidence table exceeds 10,000 rows

---

## 9. Rollback Procedure

```bash
# List deployments
vercel ls

# Roll back to a specific deployment
vercel rollback <deployment-url>
```

For DB schema rollbacks, migrations must be reversed manually. Keep the previous migration SQL file and write explicit DOWN steps before deploying schema changes to production.

---

## 10. Monitoring

Vercel provides basic request logs and function logs out of the box. For a pilot:

- **Vercel Logs**: Check function runtimes and error rates at `vercel.com/your-team/your-project/logs`
- **Clerk Dashboard**: User activity, sign-ins, and webhook delivery status
- **Postgres Metrics**: Query performance and storage usage in the Vercel Storage tab

For production observability, add [Vercel Monitoring](https://vercel.com/docs/observability) or connect a third-party provider such as Datadog, Sentry, or Axiom.

---

## Quick Reference — All Required Env Vars

```bash
# Copy this block into Vercel's env settings
DATABASE_URL=<from Vercel Postgres>
NEXUS_DB_REQUIRED=true
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard/ceo
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
CLERK_WEBHOOK_SECRET=whsec_...
AUTH_SECRET=<64-char random hex>
ANTHROPIC_API_KEY=sk-ant-...
NEXUS_LLM_MODEL=claude-opus-4-6
NEXUS_ENV=pilot
NEXT_PUBLIC_NEXUS_ENV=pilot
SLACK_CLIENT_ID=<optional>
SLACK_CLIENT_SECRET=<optional>
SLACK_SIGNING_SECRET=<optional>
```
