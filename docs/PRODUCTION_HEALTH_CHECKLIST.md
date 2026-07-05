# Production Health Checklist

Use this checklist before demos, paid pilots, and production cutovers. It is
intentionally practical: every item should be verifiable from the app, Render,
Neon, Cloudflare, Clerk, GitHub, or the command line.

---

## 1. Required Services

- [ ] Render web service is deployed from the intended Git commit.
- [ ] Render service has `NODE_ENV=production`.
- [ ] Clerk sign-in and sign-up URLs point to the live app URL.
- [ ] Neon/Postgres is reachable from the app.
- [ ] Cloudflare R2 bucket exists if original-file storage is enabled.
- [ ] LLM provider key is configured for the selected provider.
- [ ] OpenAI key is configured if `NEXUS_VECTOR_SEARCH=enabled`.

---

## 2. Required Environment Variables

Required for all live deployments:

```text
DATABASE_URL
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
AUTH_SECRET
NEXUS_ENV
NEXUS_LLM_PROVIDER
NEXUS_LLM_MODEL
```

Required when using DeepSeek:

```text
DEEPSEEK_API_KEY
DEEPSEEK_BASE_URL
```

Required when using Anthropic:

```text
ANTHROPIC_API_KEY
```

Required when vector search is enabled:

```text
NEXUS_VECTOR_SEARCH=enabled
OPENAI_API_KEY
```

Required when R2 original storage is enabled:

```text
NEXUS_R2_ORIGINALS=enabled
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
```

Optional connector variables:

```text
SLACK_CLIENT_ID
SLACK_CLIENT_SECRET
SLACK_SIGNING_SECRET
SLACK_INGEST_CHANNELS
NEXUS_SLACK_INGEST_ALL=disabled
CLERK_WEBHOOK_SECRET
```

Knowledge Workspace local sync variables:

```text
NEXUS_VAULT_SYNC=disabled
NEXUS_LOCAL_VAULT_PATH=
```

Hosted deployments should keep `NEXUS_VAULT_SYNC=disabled`. Set `NEXUS_LOCAL_VAULT_PATH` only for trusted local, desktop, or self-hosted deployments.

---

## 3. Health Endpoint

Run:

```bash
curl -s https://YOUR_APP_URL/api/health | jq .
```

Expected:

```json
{
  "data": {
    "status": "ok",
    "checks": {
      "database": { "ok": true, "usingDatabase": true },
      "vectorSearch": { "ok": true },
      "originalsStorage": { "enabled": true },
      "llm": { "ok": true }
    }
  }
}
```

Interpretation:

- `database.ok=false`: database URL is missing, wrong, or unreachable.
- `vectorSearch.ok=false`: vector search is enabled but `OPENAI_API_KEY` is missing.
- `originalsStorage.enabled=true` and `originalsStorage.ok=false`: R2 is enabled but one or more R2 variables are missing.
- `llm.ok=false`: selected LLM provider key is missing.
- `status=degraded`: one or more required checks failed.

---

## 4. Database and Migrations

Run migrations with the direct/non-pooling database URL:

```bash
DATABASE_URL="<direct Neon connection string>" npm run db:migrate
```

Verify:

```bash
npm run db:check
```

Expected:

- Postgres connection succeeds.
- `workspace_profiles` exists.
- `evidence_records.embedding` is a `vector` column.
- `knowledge_notes`, `knowledge_links`, and `knowledge_sync_events` exist after migration 0026.
- HNSW/vector and workspace/status indexes exist.

---

## 5. Browser Smoke Test

- [ ] Open the live app.
- [ ] Sign up or sign in through Clerk.
- [ ] Complete onboarding.
- [ ] Confirm company context step appears before upload.
- [ ] Upload 1-3 small files.
- [ ] Confirm processed, pending approval, or quarantine state is shown.
- [ ] Approve pending evidence if needed.
- [ ] Open CEO/COO/CBO/CTO dashboards.
- [ ] Ask: `What are the top risks right now?`
- [ ] Confirm answer includes evidence refs and does not invent sources.
- [ ] Open `/knowledge`.
- [ ] Create and save a markdown note with a `[[wikilink]]`, a `#tag`, and an `evidence:...` ref.
- [ ] Confirm preview and graph modes render without layout breakage.
- [ ] Ask about note content and confirm note references are returned separately from evidence references.

## 5A. UI Baseline Gate

Use this when comparing the original Vercel-origin UI with the newer Render/new-architecture experience.

- [ ] `UI V0.1 baseline` is captured in `docs/UI_BASELINE_VERSIONING.md` with git ref, Render deploy/ref if available, and Figma link.
- [ ] `UI V0.2 proposal` is captured separately before colleague review.
- [ ] The demo label says whether the viewer is seeing `UI V0.1 baseline`, `UI V0.2 proposal`, or `Render production`.
- [ ] The newer Render-hosted experience has passed signed-in browser smoke for dashboard, Ask, ingestion, approvals, recommendations, connectors, and `/api/health`.
- [ ] Any colleague preference or rejection notes are recorded before marking a UI version as preferred or superseded.

---

## 6. Security Baseline

- [ ] `npm audit` has no high or critical vulnerabilities.
- [ ] Any remaining moderate advisories are documented with reason and owner.
- [ ] Secrets are configured in the hosting provider, not committed to git.
- [ ] Slack events verify signatures in production when Slack is enabled.
- [ ] Clerk webhook signature verification is enabled when webhooks are enabled.
- [ ] No public API route returns workspace data without auth.
- [ ] Agent key routes are scoped to the authenticated caller's workspace.
- [ ] OAuth callback state is HMAC-signed with `AUTH_SECRET`.
- [ ] Security headers are present: `x-content-type-options`, `x-frame-options`, `referrer-policy`, and `permissions-policy`.
- [ ] Restricted or unprovenanced evidence does not appear in Slack summaries.
- [ ] Hosted deployments keep `NEXUS_VAULT_SYNC=disabled`.
- [ ] If local sync is enabled in a self-hosted/local deployment, the vault path is absolute and controlled by the workspace owner.

Current residual dependency notes:

- `next@15.5.18` retains an npm audit moderate advisory through its bundled `postcss@8.4.31`.
- npm's suggested fix for that advisory is a destructive downgrade to `next@9.3.3`, so it is intentionally not applied.
- `drizzle-kit` is not installed in the committed dependency tree; `db:generate` uses `npx --yes drizzle-kit@0.31.10` only when schema generation is explicitly needed.
- No high or critical npm audit advisories should remain in the committed dependency tree.

---

## 7. Pilot Readiness Gate

Do not onboard a paid pilot unless all of these are true:

- [x] `/api/health` returns `status=ok`. Verified 2026-06-25 against `https://nexus-mission-control.onrender.com/api/health`.
- [x] Migrations have run against the target database. Migrations 0001-0026 are applied; `db:check` returned `ok=true` against `neondb`.
- [ ] Upload, approval, dashboard, and Ask smoke tests pass.
- [ ] LLM provider and embedding provider are configured.
- [ ] R2 is configured if original-file retention is promised.
- [ ] Terms, privacy, security, and human-review disclaimers are visible or linked in pilot materials.
- [ ] Sponsor-facing success scorecard is ready.
