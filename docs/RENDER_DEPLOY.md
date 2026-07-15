# NexusAI Render Deploy

Use this for Render-specific setup, environment variables, and smoke-test details.

For release-day cutover sequencing, use `CUTOVER.md`.
For the final go/no-go checklist, use `docs/PRODUCTION_HEALTH_CHECKLIST.md`.
For a general deployment overview, use `DEPLOY.md`.

Render is the current primary hosting path for NexusAI Mission Control.

The app architecture is:

- Render hosts one shared Next.js Mission Control app.
- Product subdomains are detected by hostname inside the shared app (`app`, `nexus`, `quorum`, `meridian`, `vantage`, `nucleus` under `pinavia.io`).
- Neon hosts Postgres + `pgvector`.
- Cloudflare R2 stores original uploaded files.
- Clerk provides login, signup, and organization tenancy.

## 1. Create Neon Database

Create a Neon project and copy:

- pooled connection string for app runtime
- direct/non-pooling connection string for migrations

Set the pooled value in Render:

```text
DATABASE_URL=<pooled Neon connection string>
```

For manual recovery or a controlled local run, migrations can still be applied with the direct URL:

```bash
cd /Users/alijanjua/Documents/Playground/nexus-core/apps/mission-control
DATABASE_URL="<direct Neon connection string>" npm run db:migrate
```

## 2. Create Render Web Service

Recommended path:

1. Push this repo to GitHub.
2. In Render, choose **New -> Blueprint**.
3. Select the repo and let Render read `render.yaml`.
4. Fill in all `sync: false` environment variables.

Render uses:

```bash
npm ci && npm run build && npm run db:migrate
npm run start -w @nexus/mission-control -- -p $PORT
```

The ordering is intentional: a failed install or production build prevents database mutation. The repository migration runner is transactional and records applied files, so later builds skip completed migrations. This build-time gate is the current free-tier compromise because Render Shell, one-off jobs, and pre-deploy commands require a paid service. If the web service is upgraded, move migrations to `preDeployCommand` so schema changes are separated from artifact construction.

The primary `render.yaml` declares only the web service. Optional cost-bearing cron services are isolated in `render.cron.yaml`; sync that Blueprint only after billing approval and after setting `NEXUS_CRON_SECRET`.

## 3. Configure Product Custom Domains

Use one Render web service for the current house-of-brands layer. Add separate Render services only if a product later needs isolated infrastructure, region, database, or security controls.

Product domains to reserve and attach:

```text
app.pinavia.io
nexus.pinavia.io
quorum.pinavia.io
meridian.pinavia.io
vantage.pinavia.io
nucleus.pinavia.io
```

Setup sequence:

1. In Render, open the `nexus-mission-control` web service and add each hostname under **Settings -> Custom Domains**.
2. In Cloudflare DNS, create the CNAME records Render asks for, or follow Render's displayed DNS target for each custom domain.
3. Keep `NEXT_PUBLIC_APP_URL` pointed at the canonical app URL. Recommended after cutover: `https://app.pinavia.io`.
4. Redeploy after DNS and environment changes.

The app will use hostname detection to adjust the public shell:

| Host | Product mode | Default signed-in destination |
|---|---|---|
| `app.pinavia.io` | NexusAI | `/dashboard/ceo` |
| `nexus.pinavia.io` | NexusAI | `/dashboard/ceo` |
| `quorum.pinavia.io` | Quorum | `/board` |
| `meridian.pinavia.io` | Meridian | `/dashboard/ceo` until Meridian routes ship |
| `vantage.pinavia.io` | Vantage | `/dashboard/ceo` until Vantage routes ship |
| `nucleus.pinavia.io` | Nucleus | `/dashboard/ceo` until Nucleus routes ship |

This is a product entry and branding layer, not a claim that every product route is complete.

## 4. Required Render Environment Variables

Set these manually in Render:

```text
# Core
DATABASE_URL=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
AUTH_SECRET=

# LLM providers
DEEPSEEK_API_KEY=
OPENAI_API_KEY=

# Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=

# Slack connector
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
SLACK_INGEST_CHANNELS=
NEXUS_SLACK_INGEST_ALL=disabled

# Stripe (v0.21.0+)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO=
STRIPE_PRICE_BUSINESS=

# Cron protection (v0.19.0+)
NEXUS_CRON_SECRET=

# Product email delivery
# Clerk owns auth email. Nexus sends product email only.
NEXUS_RESEND_API_KEY=
NEXUS_FROM_EMAIL="Nexus <noreply@pinavia.io>"

# Dispatcher (v0.22.0+, optional — default 5)
NEXUS_DISPATCH_BATCH_SIZE=5

# Knowledge Workspace local sync (v0.25.0+)
# Hosted Render deployments should keep this disabled and use ZIP import/export.
NEXUS_VAULT_SYNC=disabled
# Do not set NEXUS_LOCAL_VAULT_PATH on hosted Render unless running a controlled self-hosted/local deployment.

# Clerk CSP domain (v0.23.0+, optional — default clerk.accounts.dev)
# Set to your custom Clerk frontend API domain if you use a vanity domain (e.g. clerk.nexusai.io)
# Used to build Content-Security-Policy script-src and connect-src. Wrong value breaks Clerk UI silently.
NEXT_PUBLIC_CLERK_DOMAIN=clerk.accounts.dev

# Optional: only needed for additional non-Pinavia origins.
# The standard Pinavia product origins are already included by code.
NEXUS_EXTRA_CORS_ORIGINS=
```

`AUTH_SECRET` can be generated by the Render blueprint unless you need to preserve an existing token-signing secret.

`NEXUS_CRON_SECRET` protects `/api/cron/synthesis`, `/api/cron/billing`, `/api/cron/dispatch`, and `/api/cron/readiness-prune`. Set it in Render and pass it as `Authorization: Bearer <secret>` in your Render cron job HTTP requests.

`NEXUS_RESEND_API_KEY` and `NEXUS_FROM_EMAIL` are for Nexus product email only, including scheduled synthesis briefs. Keep Clerk responsible for auth email verification and password reset. Authenticate the `pinavia.io` sender domain before production demos, then run one scheduled synthesis email delivery test.

**Optional paid cron jobs (`render.cron.yaml`):**

| Job | URL | Schedule | Purpose |
|---|---|---|---|
| Synthesis refresh | `POST /api/cron/synthesis` | Daily (or per workspace config) | Scheduled executive synthesis |
| Billing reset | `POST /api/cron/billing` | Daily | Monthly token reset + trial-to-free conversion |
| Dispatch runner | `POST /api/cron/dispatch` | Every 2 minutes | Process queued background agent jobs |
| Readiness prune | `POST /api/cron/readiness-prune` | Daily | Delete expired or consumed readiness claim rows |

## 5. Update Clerk URLs

Once Render gives you a URL, set:

```text
NEXT_PUBLIC_APP_URL=https://your-render-service.onrender.com
```

After custom-domain cutover, prefer:

```text
NEXT_PUBLIC_APP_URL=https://app.pinavia.io
```

In Clerk, add allowed redirect URLs for the Render URL and every product domain you plan to demo:

```text
https://your-render-service.onrender.com/sign-in
https://your-render-service.onrender.com/sign-up
https://your-render-service.onrender.com/dashboard/ceo
https://your-render-service.onrender.com/onboarding
https://app.pinavia.io/sign-in
https://app.pinavia.io/sign-up
https://app.pinavia.io/dashboard/ceo
https://app.pinavia.io/onboarding
https://nexus.pinavia.io/sign-in
https://nexus.pinavia.io/sign-up
https://nexus.pinavia.io/dashboard/ceo
https://nexus.pinavia.io/onboarding
https://quorum.pinavia.io/sign-in
https://quorum.pinavia.io/sign-up
https://quorum.pinavia.io/board
https://quorum.pinavia.io/onboarding
https://meridian.pinavia.io/sign-in
https://meridian.pinavia.io/sign-up
https://meridian.pinavia.io/dashboard/ceo
https://meridian.pinavia.io/onboarding
https://vantage.pinavia.io/sign-in
https://vantage.pinavia.io/sign-up
https://vantage.pinavia.io/dashboard/ceo
https://vantage.pinavia.io/onboarding
https://nucleus.pinavia.io/sign-in
https://nucleus.pinavia.io/sign-up
https://nucleus.pinavia.io/dashboard/ceo
https://nucleus.pinavia.io/onboarding
```

If using Clerk webhooks, point the webhook to:

```text
https://your-render-service.onrender.com/api/webhooks/clerk
```

## 6. Update Slack OAuth

In the Slack app settings, add:

```text
https://your-render-service.onrender.com/api/connectors/slack/callback
```

After custom-domain cutover, also add:

```text
https://app.pinavia.io/api/connectors/slack/callback
```

Redeploy Render after `NEXT_PUBLIC_APP_URL` is updated.

## 7. Smoke Test

After deploy:

```bash
curl https://your-render-service.onrender.com/api/health
```

Then test in browser:

1. Sign up with Clerk.
2. Complete onboarding.
3. Upload a small PDF/DOCX.
4. Confirm it appears in approvals or evidence.
5. Approve if needed.
6. Open a dashboard.
7. Ask: `What are the top risks?`
8. Open `/knowledge`, create a note, save it, switch to preview/graph, and confirm the note appears in the vault tree.
9. Ask about a term from that note and confirm the response includes `noteRefs` in the network/API response or rendered source trail.

Product-domain smoke:

1. Open `https://app.pinavia.io` and confirm the public shell says NexusAI.
2. Open `https://quorum.pinavia.io` and confirm the public shell says Quorum and signed-in users can reach `/board`.
3. Open `https://meridian.pinavia.io`, `https://vantage.pinavia.io`, and `https://nucleus.pinavia.io`; confirm product branding appears and signed-in fallback goes to `/dashboard/ceo` until product-specific routes ship.
4. Confirm Clerk sign-in/sign-up works from each domain used in the demo.

## 8. Knowledge Workspace Notes

v0.25.0 adds migration `0026_knowledge_workspace.sql`. Apply migrations before deploying this feature to a database-backed environment.

Render/hosted deployments should leave live local sync disabled:

```text
NEXUS_VAULT_SYNC=disabled
```

Use `/knowledge` ZIP import/export for Markdown portability on hosted deployments. Only enable `readonly` or `bidirectional` sync for local, desktop, or self-hosted deployments where the filesystem path is controlled by the workspace owner.

## 9. Production Note

Render's free web service can sleep when idle. That is fine for a free demo or early pilot, but not for a production SLA. Use a paid Render instance when a pilot client expects instant first-load response.

For the full operational checklist, see `DEPLOY.md`, `CUTOVER.md`, and `docs/PRODUCTION_HEALTH_CHECKLIST.md`.
