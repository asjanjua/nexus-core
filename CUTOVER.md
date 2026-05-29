# NexusAI Production Cutover Runbook

Everything is deployed and built. The only remaining step is wiring 8 env vars,
running two migrations, and redeploying. This document covers both paths.

---

## Prerequisites

```bash
# Install Vercel CLI if needed
npm install -g vercel

# Log in (skip if already authenticated)
vercel login

# Link to the project (run from monorepo root)
cd nexus-core
vercel link
# When prompted: set root directory to apps/mission-control
```

---

## Step 1 — Add missing env vars

Pick **one** of the two approaches below.

### Option A — CLI (recommended, end-to-end, no browser needed)

Run each command in sequence. The CLI will prompt for the value; paste and press Enter.
Set for both **production** and **preview** unless noted.

```bash
# From the monorepo root where vercel link was run

# 1. Vercel Postgres connection URL
#    Get from: Vercel Dashboard → Storage → your DB → .env.local tab → POSTGRES_URL
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview

# 2. OpenAI API key for text-embedding-3-small (vector search)
#    Get from: platform.openai.com → API keys
vercel env add OPENAI_API_KEY production
vercel env add OPENAI_API_KEY preview

# 3. Enable vector search feature flag
echo "enabled" | vercel env add NEXUS_VECTOR_SEARCH production
echo "enabled" | vercel env add NEXUS_VECTOR_SEARCH preview

# 4. Enable R2 original file storage
echo "enabled" | vercel env add NEXUS_R2_ORIGINALS production
echo "enabled" | vercel env add NEXUS_R2_ORIGINALS preview

# 5-8. Cloudflare R2 credentials
#    Get from: Cloudflare Dashboard → R2 → your bucket → Manage R2 API tokens
#    R2_ACCOUNT_ID is your Cloudflare account ID (top-right in the dashboard)
vercel env add R2_ACCOUNT_ID production
vercel env add R2_ACCOUNT_ID preview

vercel env add R2_ACCESS_KEY_ID production
vercel env add R2_ACCESS_KEY_ID preview

vercel env add R2_SECRET_ACCESS_KEY production
vercel env add R2_SECRET_ACCESS_KEY preview

vercel env add R2_BUCKET production
vercel env add R2_BUCKET preview
```

Verify all vars are set:
```bash
vercel env ls production | grep -E "DATABASE_URL|OPENAI|NEXUS_VECTOR|NEXUS_R2|R2_"
```
You should see 8 lines.

### Option B — Vercel UI

Go to: **Vercel Dashboard → your project → Settings → Environment Variables**

Add each of these for Production and Preview:

| Variable              | Value                                     | Where to get it                                      |
|-----------------------|-------------------------------------------|------------------------------------------------------|
| `DATABASE_URL`        | `postgres://...` (pooling URL)            | Vercel Storage → your DB → `.env.local` tab          |
| `OPENAI_API_KEY`      | `sk-...`                                  | platform.openai.com → API keys                       |
| `NEXUS_VECTOR_SEARCH` | `enabled`                                 | literal string                                       |
| `NEXUS_R2_ORIGINALS`  | `enabled`                                 | literal string                                       |
| `R2_ACCOUNT_ID`       | your Cloudflare account ID                | Cloudflare Dashboard top-right                       |
| `R2_ACCESS_KEY_ID`    | R2 token access key                       | Cloudflare R2 → Manage R2 API tokens                 |
| `R2_SECRET_ACCESS_KEY`| R2 token secret                           | same token creation screen                           |
| `R2_BUCKET`           | bucket name (e.g. `nexus-originals`)      | Cloudflare R2 → your bucket name                     |

---

## Step 2 — Run production migrations

**Must use the non-pooling URL** (direct connection, bypasses PgBouncer — DDL requires this).

Get it from: Vercel Dashboard → Storage → your DB → `.env.local` tab → `POSTGRES_URL_NON_POOLING`

```bash
export DIRECT_URL="postgres://..."   # paste POSTGRES_URL_NON_POOLING here

cd apps/mission-control

# Migration 0006 — recommendation workspace/status composite index
psql $DIRECT_URL -f db/migrations/0006_recommendation_status_index.sql

# Migration 0007 — pgvector extension + real vector(1536) column + HNSW index
# Note: 0007 contains CREATE INDEX CONCURRENTLY which cannot run inside a
# transaction block. Run the file as-is; psql sends each statement separately.
psql $DIRECT_URL -f db/migrations/0007_pgvector.sql
```

### Verify migrations applied correctly

```bash
# Confirm pgvector extension is active
psql $DIRECT_URL -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
# Expected: vector | 0.x.x

# Confirm embedding column is vector type (not jsonb)
psql $DIRECT_URL -c "
  SELECT column_name, data_type, udt_name
  FROM information_schema.columns
  WHERE table_name = 'evidence_records' AND column_name = 'embedding';
"
# Expected: embedding | USER-DEFINED | vector

# Confirm HNSW index exists
psql $DIRECT_URL -c "
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE tablename = 'evidence_records' AND indexname = 'idx_evidence_embedding_hnsw';
"

# Confirm composite indexes
psql $DIRECT_URL -c "
  SELECT indexname FROM pg_indexes
  WHERE tablename IN ('evidence_records', 'audit_events', 'recommendations')
  AND indexname LIKE 'idx_%'
  ORDER BY indexname;
"
# Expected: idx_audit_workspace_created, idx_evidence_embedding_hnsw,
#           idx_evidence_workspace_status, idx_recommendations_workspace_status
```

---

## Step 3 — Redeploy

```bash
# From monorepo root (where vercel link was run)
vercel --prod
```

Or push to main if GitHub auto-deploy is enabled.

Watch the build output for any env var errors. A clean deploy should show:
```
✓ Build completed in Xs
✓ Deployed to production
```

---

## Step 4 — Health verification

Replace `YOUR_APP` with your actual Vercel deployment URL.

```bash
BASE=https://YOUR_APP.vercel.app

# Primary health check — must return all three flags true
curl -s $BASE/api/health | jq .
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-05-03T...",
  "environment": "pilot",
  "checks": {
    "database": {
      "ok": true,
      "usingDatabase": true
    },
    "vectorSearch": true,
    "originalsStorage": true
  }
}
```

If any flag is false, check the table below:

| Flag false          | Most likely cause                                     | Fix                                          |
|---------------------|-------------------------------------------------------|----------------------------------------------|
| `usingDatabase`     | `DATABASE_URL` not set or wrong URL format            | Re-add env var, use the pooling URL          |
| `vectorSearch`      | `NEXUS_VECTOR_SEARCH` not set to `enabled`            | Confirm exact string value is `enabled`      |
| `originalsStorage`  | Any of the 4 R2 vars missing or `NEXUS_R2_ORIGINALS` not `enabled` | Check all 5 R2-related vars     |

---

## Step 5 — Smoke tests

```bash
BASE=https://YOUR_APP.vercel.app

# 1. Auth check (requires Clerk session — grab __session from browser DevTools)
curl -s -H "Cookie: __session=<token>" $BASE/api/auth/me | jq .

# 2. Evidence endpoint
curl -s -H "Cookie: __session=<token>" \
  "$BASE/api/evidence?status=processed&limit=5" | jq '.total, (.items | length)'

# 3. Pending approval queue
curl -s -H "Cookie: __session=<token>" \
  "$BASE/api/evidence?status=pending_approval" | jq '.total'

# 4. Upload a test PDF through the UI at /ingestion
#    Then verify it appears at /approvals if confidence was 35-75%

# 5. Ask query (LLM synthesis)
curl -s -X POST $BASE/api/ask \
  -H "Cookie: __session=<token>" \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the top risks in this workspace?"}' | jq '.refused, .confidence'
# refused: false = LLM synthesis working
# refused: true with reason "insufficient_evidence" = no data yet (expected for fresh workspace)
```

---

## Troubleshooting

### Build fails with missing module `@aws-sdk/client-s3`

```bash
cd apps/mission-control && npm install
vercel --prod
```

### `CREATE INDEX CONCURRENTLY cannot run inside a transaction block`

Run the HNSW index statement separately:
```bash
psql $DIRECT_URL -c "
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_embedding_hnsw
    ON evidence_records
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 128);
"
```

### Database health check passes but data is wrong

Confirm the app is using the pooling URL for runtime (not the non-pooling one):
- `DATABASE_URL` = `POSTGRES_URL` (pooling, for the app)
- `POSTGRES_URL_NON_POOLING` = migrations only, not in env vars

### R2 uploads silently fail

Test the R2 credentials directly:
```bash
# Install AWS CLI and configure with R2 endpoint
aws s3 ls s3://YOUR_BUCKET_NAME \
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com \
  --no-sign-request
# Or with credentials:
AWS_ACCESS_KEY_ID=YOUR_KEY AWS_SECRET_ACCESS_KEY=YOUR_SECRET \
  aws s3 ls s3://YOUR_BUCKET_NAME \
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

---

## Post-cutover checklist

- [ ] `/api/health` returns `status: ok` with all three flags `true`
- [ ] Can sign in via Clerk and land on `/dashboard/ceo`
- [ ] Can upload a file at `/ingestion` — it appears in `/approvals` or goes straight to processed
- [ ] Approving a record at `/approvals` makes it visible on the dashboard
- [ ] Ask panel at `/ask` returns an answer grounded in evidence
- [ ] Audit events appear at `/review` after approval actions
- [ ] Tag the release: `git tag v1-pilot-cutover && git push --tags`
