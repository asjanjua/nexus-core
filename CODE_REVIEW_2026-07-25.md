# Nexus Core — Full Code Review

Date: 2026-07-25
Scope: `nexus-core/` monorepo, primarily `apps/mission-control` (413 source files, ~19.3k lines of TSX, 137 API routes, 39 DB tables)
Baseline verified: `tsc --noEmit` clean, 481 tests / 71 files pass, `npm run build` passes.

---

## 1. Executive Summary

The codebase is in better shape than most products at this stage. Types are clean, tests are substantial and green, SQL is fully parameterised, destructive endpoints are properly gated, and webhook signature verification is correct across Stripe, Slack, and Clerk. There is almost no debt debris: zero `@ts-ignore`, zero `dangerouslySetInnerHTML`, zero `eval`, three `any` casts, no TODO markers.

The issues that matter cluster in four places:

1. **Authorisation model has no roles.** Every authenticated session user holds wildcard scope. Any org member can purge the workspace.
2. **File upload trusts the client for content type**, and the download route serves it back inline. That is a stored XSS path, and the CSP does not block it.
3. **Key management has no rotation story.** Connector credentials are encrypted with a key derived from an auto-generated `AUTH_SECRET`.
4. **The CI quality gates are set below the actual exposure.** Seven high-severity advisories pass the audit gate, and lint has never run because no ESLint config exists.

25 issues below, grouped by front, severity-ranked within each.

---

## 2. Security and Authorisation

### 2.1 HIGH — No RBAC: every session user has admin scope
`lib/api-auth.ts:52` — `resolveAuth()` returns `scopes: ["*"]` for any Clerk session. `requireScope(request, "admin")` therefore passes for every member of the org.

Consequence: any authenticated workspace member can call `POST /api/workspace/purge` (deletes all evidence, entities, agent outputs), `DELETE /api/agent-keys/:id`, `POST /api/workspace/demo-reset`, and every settings mutation.

Confirmed: a grep for `orgRole`, `sessionClaims`, `has({...})`, or any Clerk role check across `app/` and `lib/` returns nothing. The only role-like gate in the product is `NEXUS_OPERATOR_USER_IDS`, used solely by `/api/funnel`.

This is the single most important finding. For a product sold to regulated banks, "any user can delete the evidence trail" will not survive a client security review.

### 2.2 HIGH — Stored XSS via evidence originals
- `app/api/ingestion/status/route.ts:106` stores `contentType: file.type` — entirely client-controlled. There is no server-side MIME or extension allowlist. The `accept=".pdf,.docx,.pptx,.xlsx,.txt,.md"` in `components/ingestion-upload.tsx:20` is a browser hint only.
- `app/api/evidence/[id]/original/route.ts:31` serves the stored object back with `content-disposition: inline` and the stored content type.
- `lib/security-headers.ts:23` sets production CSP `script-src 'self' 'unsafe-inline'`.

Chain: upload a file with `type: text/html` containing an inline `<script>`, then have any workspace user open the evidence original. The script executes on the application origin with the victim's Clerk session. `nosniff` does not help — the declared type genuinely is `text/html`.

### 2.3 HIGH — Unauthenticated writes to the shared demo workspace
`app/api/strategy-profile/route.ts:20,32` and `app/api/workspace/status/route.ts:14` fall back to `DEFAULT_WORKSPACE` when `resolveAuth()` returns null. The `PATCH` is an unauthenticated write. The in-file comments correctly guard against a caller-supplied `workspaceId` widening access, but do not address the null-auth fallback itself.

### 2.4 HIGH — Revoked agent keys stay valid for up to an hour
`lib/tokens.ts:38` `decodeBearerToken()` verifies HMAC and `exp` only. It never checks whether the key was revoked. `DELETE /api/agent-keys/:id` marks the key revoked in the DB, but any token already issued from it keeps working until its 1-hour TTL expires. Revocation is advertised as immediate and is not.

### 2.5 MEDIUM — No rate limiting on any HTTP route
The only rate-limit code in the repo is `lib/services/llm.ts`, which handles provider-side 429s. Exposed and unthrottled:
- `POST /api/oauth/token` — `client_secret` brute force
- `POST /api/auth/login`
- `POST /api/reviewer-seat/accept` — invite code guessing
- `POST /api/readiness/claim` — claim code guessing
- `POST /api/waitlist`, `POST /api/feedback` — spam/cost

### 2.6 MEDIUM — Production CSP allows `script-src 'unsafe-inline'`
`lib/security-headers.ts:22-24`. This is the control that would have blunted 2.2. Next 15 App Router supports nonce-based CSP via middleware.

### 2.7 MEDIUM — Cron secret compared non-constant-time, duplicated five times
`cronAuthorized()` is copy-pasted verbatim into all five cron routes (`dispatch`, `synthesis`, `billing`, `readiness-prune`, `workspace-expiry`), each using `===`. `lib/security.ts:16` already exports `timingSafeEqualString`, which the connector OAuth callbacks correctly use.

### 2.8 MEDIUM — No input-side prompt-injection defence
The product ingests Gmail, Slack, Drive, SharePoint, Jira, HubSpot and QuickBooks content and produces board recommendations and regulatory reviews. `lib/security/red-team.ts` scans **generated output** for PII and unsafe-action language. Nothing inspects or fences ingested content before it reaches a prompt. An instruction embedded in an ingested email or document is currently indistinguishable from workspace context.

### 2.9 MEDIUM — Hardcoded dev secret behind a `NODE_ENV` check
`lib/security.ts:3,12` — `requireAuthSecret()` returns the literal `"nexus-dev-secret"` whenever `NODE_ENV !== "production"`. `render.yaml` never sets `NODE_ENV`; it relies on `next start` setting it implicitly. That holds for the web service today, but any other execution path (migration scripts, a worker, a future container entrypoint) would silently run on a publicly-known secret that signs bearer tokens **and** derives the connector credential encryption key.

### 2.10 MEDIUM — CORS reflects any origin outside production
`lib/security-headers.ts:65` — `process.env.NODE_ENV !== "production" || ALLOWED_ORIGINS.has(origin)`, then sets `access-control-allow-origin: origin || "*"`. Impact is limited because `allow-credentials` is never set, but it is a poor default and pairs badly with 2.9.

---

## 3. Cryptography and Key Management

### 3.1 HIGH (operational) — No key rotation path for connector credentials
`lib/crypto.ts:23` derives the AES-256-GCM key from `AUTH_SECRET` via PBKDF2 with a static salt. `render.yaml` provisions `AUTH_SECRET` with `generateValue: true`.

There is no key version in the stored blob format (`base64url(iv + ciphertext + tag)`), no rotation routine, and no re-encryption path. If `AUTH_SECRET` is ever regenerated — service recreated, blueprint re-synced, secret rotated after an incident — every stored OAuth token, API key and DB password becomes permanently undecryptable, and every connector must be re-authorised by hand. Using one secret for both session signing and credential encryption also means you can never rotate the session key without destroying the credential store.

### 3.2 MEDIUM — PBKDF2 runs synchronously on every encrypt and decrypt
`lib/crypto.ts:22` — `deriveKey()` performs `pbkdf2Sync(secret, SALT, 100_000, 32, "sha256")` on every single call, with no cache. Roughly 50-100ms of event-loop-blocking CPU per credential operation. The derived key is deterministic and should be computed once.

### 3.3 LOW — Buffer/string coercion in `decryptCredentials`
`lib/crypto.ts:62` — `decipher.update(ciphertext) + decipher.final("utf8")`. `update()` without an output encoding returns a Buffer; the `+` coerces it via an implicit `toString()`. Correct today for GCM because `final()` returns empty, but it is fragile and depends on cipher-mode behaviour that is not obvious from the code.

---

## 4. Supply Chain and CI

### 4.1 HIGH — Seven high-severity advisories pass the CI gate — PARTLY FIXED (Wave 1)
`npm audit` reported 7 high-severity vulnerabilities:
- **Next.js** (8 CVEs) including unauthenticated disclosure of internal Server Function endpoints, SSRF via rewrites, cache confusion on request bodies, and Server Actions DoS
- **postcss** — path traversal via `sourceMappingURL`
- **sharp** — inherited libvips CVEs

`.github/workflows/ci.yml` gates hard on `npm audit --audit-level=critical`. Correction to the original draft of this review: a non-blocking `--audit-level=high` reporting step already existed, so these were visible in the CI log, not silent. The gate was still one level below the exposure.

**Wave 1 outcome:** `npm audit fix` took next 15.5.18 to 15.5.21 and postcss 8.5.15 to 8.5.23, clearing all 8 Next.js CVEs. High advisories dropped 7 to 3.

The remaining 3 are **not fixable from this repo** and are now recorded as reviewed exceptions in `ci.yml`:
- `sharp` 0.34.5 and `postcss` 8.4.31 are both pinned inside next@15.5.21 itself
- the root `overrides` block does not reach them — npm never writes overrides into the lock here, so the pre-existing `postcss` override has in fact never taken effect either
- `npm audit fix --force` "resolves" them by installing **next@9.3.3**, a catastrophic downgrade
- adding `sharp` as a direct pinned dependency only produces a second copy; next keeps its own

Real exposure of the two residuals is low: the app imports `next/image` nowhere and configures no `remotePatterns`, so the sharp/libvips path is unreachable, and the postcss issue is build-time only. The gate therefore stays at `critical`; raise it to `high` once a Next.js release bumps its pinned postcss and sharp.

### 4.2 MEDIUM — Lint has never run; no ESLint config exists
`npm run lint` invokes `next lint`, which is deprecated and, finding no ESLint config anywhere in the repo, drops into an interactive setup prompt and exits 1. CI runs `check:boundaries`, `tsc`, `npm test`, and `build` — it never invokes lint. The `lint` script is therefore dead and misleading, and the codebase has had zero lint enforcement for its lifetime.

### 4.3 LOW — CI typecheck timeout is tight
The CI `Typecheck` step has `timeout-minutes: 4`. A clean local `tsc --noEmit` on this project took over 5 minutes. Machine specs differ, but the margin is thin enough to cause intermittent red builds.

---

## 5. Data Layer

### 5.1 ~~MEDIUM — Schema/migration index drift~~ — WITHDRAWN, false positive
The original finding said `db/schema.ts` declares zero indexes against 51 `CREATE INDEX` statements in the migrations, and that the next `drizzle-kit generate` would emit `DROP INDEX`.

That conclusion was wrong, and rested on an unchecked assumption that drizzle-kit drives migrations here. It does not. There is no `db/migrations/meta/` directory, no journal and no snapshots. The migrations are **hand-written SQL** with human commentary, applied by a custom runner (`scripts/db-migrate.mjs`) that tracks state in its own table. `db/schema.ts` serves only as the typed query-builder layer, and Drizzle's query builder does not need index declarations to function — indexes are purely a database concern owned by the SQL.

Declaring 51 indexes in `db/schema.ts` would therefore be churn that could *introduce* drift rather than remove it. No change made.

The one real residual is a footgun worth knowing about: `npm run db:generate` (`npx --yes drizzle-kit generate`) is still wired up, and running it against this schema would emit a from-scratch migration that ignores the hand-written history. It is not called by CI or the Render build — both use `db:migrate` — so nothing runs it today.

### 5.2 MEDIUM — `repository.ts` is a 4,215-line single module
The entire data access layer for 39 tables lives in one file. Every service imports the same `repository` object. This is the highest-churn file in the codebase and the most likely source of merge pain and accidental cross-tenant mistakes.

### 5.3 LOW — Sequential await loops
36 `for (const … of …)` blocks containing awaits across `lib/services/*` and `repository.ts`, against only a handful of `Promise.all` sites. Several are per-row DB round trips in list paths.

---

## 6. Code Quality and Maintainability

### 6.1 MEDIUM — Oversized client components
- `app/settings/page.tsx` — **3,579 lines**, single `"use client"` component with six tabs and inline type mirrors of the server contracts
- `app/onboarding/wizard.tsx` — 2,219 lines
- `app/settings/connectors/page.tsx` — 1,111 lines

All ship to the browser as one bundle. The settings page also duplicates `WorkspaceSettings` as a hand-maintained local type instead of importing from `lib/contracts`, so the two can silently diverge.

### 6.2 MEDIUM — 82 silent catches, including audit writes
- `.catch(() => null)` — 47 occurrences
- `.catch(() => {})` / bare `catch {}` — 35 occurrences
- `void repository.pushAudit(...).catch(() => {})` — 21 occurrences

The audit ones matter most. This product is sold on its evidence and decision trail; an audit write that fails leaves no trace anywhere. At minimum these should route to `captureHandledError` (which already exists in `lib/observability/sentry.ts`) rather than being swallowed.

### 6.3 LOW — No centralised, validated configuration
76 distinct `process.env.*` reads scattered across `app/` and `lib/`. `lib/config/` contains only `model-routing.ts`. There is no startup validation that required variables are present, so a missing secret surfaces as a runtime failure deep in a request path rather than at boot.

### 6.4 LOW — Duplicated `cronAuthorized()`
Same function, five copies. See 2.7.

### 6.5 LOW — Stale one-off deploy scripts at repo root
`deploy-company-context.sh`, `deploy-ingestion-fix.sh`, `deploy-phase6.sh`, `deploy-recommendations-fix.sh`, `deploy-uiux-wave1.sh` — all from late May, superseded by the Render blueprints. Two have `--x--x` permissions (executable but not readable by group/other), which is odd.

### 6.6 LOW — Non-standard dependency layout
`node_modules` is a symlink into `~/.cache/nexus-core-deps/<hash>-node24-v2/`, managed by `scripts/file-provider-deps.mjs`. Stray `node_modules 2/` directories exist at both the repo root and in `apps/mission-control`. This works but will confuse any new contributor and any tool that resolves modules by walking the tree.

---

## 7. What Is Working Well

Recorded so the priorities above are read fairly:

- `tsc --noEmit` clean; 481 tests across 71 files pass; production build succeeds
- All SQL goes through Drizzle parameterised templates — no injection surface found in 4,215 lines of repository code
- Bearer token verification uses `crypto.timingSafeEqual` with a length pre-check; connector OAuth callbacks use `timingSafeEqualString`
- Tenant isolation enforced on evidence routes, with dedicated `tenant-isolation`, `api-workspace-authz`, `approvals-authz` and `strategy-profile-authz` test suites
- Destructive endpoints correctly gated: `purge` requires an explicit `confirm: true` literal, `demo-reset` refuses to run outside demo mode
- Stripe, Slack and Clerk webhooks all verify signatures; Slack additionally enforces a 5-minute replay window
- Security headers are comprehensive and centrally applied: `nosniff`, `frame-ancestors 'none'`, `object-src 'none'`, HSTS in production
- Bearer tokens are short-lived (1h) and scope-intersected at issuance
- Env files correctly gitignored; no secrets found in `.env.example` or in tracked files

---

## 8. Proposed Fix Order

**Wave 1 — before any further client exposure — DONE (commit `06f5ec9`)**
1. 2.1 RBAC: introduce Clerk org roles; stop granting `["*"]` to every session — **done**
2. 4.1 `npm audit fix` for the Next.js / postcss / sharp advisories; raise the CI gate to `--audit-level=high` — **partly done**: 7 high to 3, all Next.js CVEs cleared; gate stays at `critical` because the 3 residuals are pinned inside next and cannot be fixed here (see 4.1)
3. 2.2 Server-side MIME allowlist on upload + force `content-disposition: attachment` on evidence originals — **done**
4. 2.3 Remove the `DEFAULT_WORKSPACE` fallback from `strategy-profile` and `workspace/status` — **done**

Verified at commit: `deps:check` healthy, `check:boundaries` clean, `tsc --noEmit` clean, 493 tests across 73 files pass (was 481/71), `npm run build` exits 0.

Two follow-ups surfaced while doing Wave 1, both new:
- **Ad-hoc scope strings are unreachable by bearer tokens.** Routes call `requireScope` with `read:connectors` (11 routes), `write` (7), `read:workspace` (7), `read` (5), `read:admin` (1) — none of which exist in `agentScopeSchema`. `/api/oauth/token` filters requested scopes through that schema, so a narrowly-scoped agent key can never hold them and always gets 403 unless it carries `admin`. Either add them to the enum or change the routes to use enum members.
- **`lib/auth.ts` is dead but ships a default `admin`/`admin` credential.** `verifyLoginCredentials`, `createSessionToken` and `readSession` have no callers; `/api/auth/login` returns 410 Gone. Only `verifyPassword` is still used (by `repository.ts`). Not currently reachable, but worth deleting rather than leaving a default-credential function in the tree.

**Wave 2 — correctness and operational safety — DONE**
5. 3.1 Key versioning + a documented rotation path for connector credentials; split the credential key from `AUTH_SECRET` — **done**: blobs are now `v2.`-prefixed, keyed on `NEXUS_CREDENTIALS_SECRET` (falling back to `AUTH_SECRET`), with `NEXUS_CREDENTIALS_SECRET_PREVIOUS` for zero-downtime rotation. Legacy unversioned blobs still decrypt. `needsReencryption()` and `reencryptCredentials()` drive a migration; the procedure is documented at the top of `lib/crypto.ts`
6. 2.4 Revocation check in `decodeBearerToken` (cached lookup, mirroring the existing workspace-access cache) — **done**, in `resolveAuth` rather than `decodeBearerToken` so the token module stays sync and DB-free. `DELETE /api/agent-keys/:id` invalidates the cache so revocation is immediate rather than TTL-delayed
7. 2.5 Rate limiting on auth, token, claim and public POST routes — **done** for `/api/oauth/token`, `/api/reviewer-seat/accept`, `/api/readiness/claim`, `/api/readiness/submit`
8. 3.2 Cache the derived PBKDF2 key — **done**, memoised per secret+salt
9. 2.9 Remove the `nexus-dev-secret` fallback; fail closed and set `NODE_ENV` explicitly in `render.yaml` — **done**: the fallback is now an allowlist (`development`/`test`) rather than `!production`, so an unset `NODE_ENV` throws instead of silently using the published constant

Verified: `check:boundaries` clean, `tsc --noEmit` clean, 521 tests across 77 files pass (was 493/73), `npm run build` exits 0.

Corrections and residual work from Wave 2:
- **`/api/waitlist` did not need rate limiting.** It is authenticated (`resolveAuth` + 401), so it is not the anonymous spam surface item 2.5 described. `/api/auth/login` likewise needed nothing — it returns 410 Gone.
- **Rate limiting is per-instance.** The limiter is in-process, matching the existing caching approach. On the current single Render web service that covers the whole request surface; scaling past one instance would weaken the limits proportionally and would want a shared store.
- **Credential re-encryption has not been run.** The rotation machinery exists and is tested, but no stored blob has been rewritten, so existing credentials are still v1 under `AUTH_SECRET`. Splitting the secret for real means setting `NEXUS_CREDENTIALS_SECRET` and running a re-encryption pass over the connectors table — a scheduled maintenance step, not a code change.
- `isProductionRuntime()` was removed from `lib/security.ts`; the Wave 2 change to `requireAuthSecret` left it with no callers anywhere.

**Wave 3 — hardening and hygiene — DONE**
10. 2.6 Nonce-based CSP, drop `unsafe-inline` — **done for `script-src`**. Middleware mints a per-request nonce and sets it on both the request CSP (so Next stamps its own inline bootstrap scripts) and the response. `next.config.mjs` no longer sets a CSP, so there is one source rather than two competing headers. `style-src` keeps `unsafe-inline` — Tailwind and React inline styles need it, and it carries no script-execution risk. Deliberately **not** using `'strict-dynamic'`, which would make browsers ignore the Clerk and Cloudflare host allowlists and break hosted auth
11. 2.8 Prompt-injection fencing on ingested content — **done**: `lib/security/prompt-fencing.ts` wraps evidence and knowledge-note text in a named delimiter, strips forged or early-closing tags, sanitises provenance attributes (a filename is attacker-controllable), and prepends a trust-boundary rule to the Ask system prompt
12. 4.2 Add a real ESLint config and wire lint into CI — **done**: flat config via `FlatCompat` (eslint-config-next 15.x is eslintrc-only), `npm run lint` replaces the broken `next lint`, and CI runs it. 12 errors down to 0; 47 warnings remain visible and non-blocking
13. 6.2 Route audit-write failures to Sentry instead of swallowing them — **done differently, see below**
14. 5.1 Reconcile `db/schema.ts` indexes with the migrations — **withdrawn as a false positive**, see 5.1
15. 2.7 / 6.4 Extract a shared `cronAuthorized` using `timingSafeEqualString` — **done**: one constant-time implementation in `lib/security.ts` replaces five copy-pasted `===` comparisons

Verified: `check:boundaries` clean, `tsc --noEmit` clean, `npm run lint` exits 0, 547 tests across 80 files pass (was 521/77), `npm run build` exits 0. Middleware bundle 84.4 kB to 84.5 kB.

Corrections and residual risk from Wave 3:

- **Item 13 could not be done as written.** `captureHandledError` is a deliberate no-op: Sentry's runtime is disabled because it hung the Next 15 middleware build, and CLAUDE.md forbids reintroducing it. Routing audit failures there would have routed them into a stub. Instead the helpers now write a structured line to stderr, which Render captures, and `pushAudit` catches and reports its own failures rather than letting them propagate into a caller that discards them. Payloads are excluded from the log because audit events carry customer PII. Real Sentry reporting remains blocked on the build issue.
- **The CSP change needs browser verification before it ships.** Neither the test suite nor `next build` executes a page in a browser, so a CSP that blocks a legitimate script would pass every gate here and fail only in front of a user. Load an authenticated page and a sign-in handoff with devtools open and confirm there are no `Content-Security-Policy` violations in the console. This is the one Wave 3 change I could not verify end to end.
- **`no-html-link-for-pages` is set to `warn`, not `error`.** The 10 plain `<a href="/sign-in">` elements it flags are deliberate: CLAUDE.md requires signed-out UI to use a plain link rather than Clerk client components, and `components/logout-button.tsx` says the same in its docstring. Rewriting them to `next/link` would swap a hard navigation for client-side routing in the hosted-Clerk handoff. Left visible as a warning rather than switched off.
- **ESLint adds 9 high advisories, all dev-only** (`brace-expansion` DoS, six nested copies inside plugin trees). Production dependencies are unchanged at 3. CI now reports `npm audit --omit=dev` separately so the shipped-dependency signal is not drowned out.

**Wave 4 — structural, do deliberately — PARTLY DONE**
16. 6.1 Decompose `settings/page.tsx` and `onboarding/wizard.tsx` — **not done, see below**
17. 5.2 Split `repository.ts` by domain — **not done, see below**
18. 6.3 Central validated config module — **done**: `lib/config/env.ts` validates the five variables a running production process cannot function without and reports all missing ones at once. Deliberately not a typed accessor for all ~76 env reads: most are optional connector credentials whose services no-op when unset, and CI builds with no secrets at all. `npm run check:env` runs it against a deploy environment
19. 6.5 / 6.6 Delete stale deploy scripts; clean the stray `node_modules 2` directories — **done**: removed five one-off `git add <hardcoded list> && commit && push` scripts superseded by Render auto-deploy and the `commit:check`/`verify:release` workflow, plus two empty `node_modules 2` directories and 31 `filename 2.ext` sync-conflict copies

Verified: `check:boundaries` clean, `deps:check` healthy, `tsc --noEmit` clean, `npm run lint` exits 0, 555 tests across 81 files pass (was 547/80), `npm run build` exits 0.

**Why 16 and 17 were stopped rather than done.** Both are refactors of working code, and both have failure modes that this repo's verification does not cover:

- **`repository.ts` holds module-level singleton state** — `dbInstance`, `dbPool` (the Postgres connection pool) and a Stripe event cache. Splitting the module requires extracting that into a shared internal module every domain file imports. Getting it wrong yields *two connection pools*, which no test would catch because the suite runs without a database. Separately, 13 test files mock the repository wholesale, so they would validate a barrel re-export while saying nothing about whether function bodies moved correctly.
- **`settings/page.tsx` (3,579 lines) and `onboarding/wizard.tsx` (2,219) have no rendering tests.** The suite is unit and API level; nothing mounts these components. Neither `tsc` nor `next build` executes a page. A decomposition that subtly breaks state wiring would pass every gate and fail in front of a user.

Neither is a hard blocker — both are doable — but they should be paired with manual QA (or component tests added first), not shipped on a green `tsc`. The maintainability gain is real but it is not a correctness or security gain, and the repo's own guideline is "don't refactor things that aren't broken". Recommended sequencing if picked up: add rendering tests for the two components first, then decompose; and for the repository, extract the shared DB-state module as its own reviewed commit before moving any query code.

`HANDOVER.md` retains historical references to the deleted deploy scripts. It is an append-only reverse-chronological log, so those entries were left intact rather than rewritten.

---

## 9. Production Readiness

### 9.1 The CSP is now verified, not assumed

Wave 3 shipped a nonce-based CSP that I flagged as unverified, because nothing in this repo executes a page. That gap is closed. The production build was served locally with the database disabled (production credentials were deliberately not used — a page load writes audit rows) and checked directly:

- Exactly **one** `content-security-policy` response header, confirming `next.config.mjs` and middleware are no longer both emitting one
- `script-src 'self' 'nonce-<per-request>' https://clerk... https://challenges.cloudflare.com` — no `'unsafe-inline'`
- **26 inline script tags all carry the request's nonce.** Next's bootstrap and hydration scripts execute
- The single un-nonced script is Clerk's, served from `*.clerk.accounts.dev` and covered by the host allowlist
- **Zero CSP violations** in the browser console; the page renders with styling intact

That last pair is the empirical case for not using `'strict-dynamic'`. Under strict-dynamic browsers ignore host allowlists, and Clerk's script carries no nonce — it would have been blocked and auth would have failed.

### 9.2 `NEXT_PUBLIC_CLERK_DOMAIN` is a deploy-blocking variable

Surfaced by the browser test. `lib/security-headers.ts` builds the CSP script-src allowlist from `NEXT_PUBLIC_CLERK_DOMAIN`, defaulting to `clerk.accounts.dev`. In `render.yaml` it is `sync: false`, so it must be set by hand in the Render dashboard.

If it is unset or wrong on a Clerk instance with a custom domain, the CSP allowlists the wrong host and the browser blocks Clerk's script. Auth fails with nothing but a console violation to show for it — no server error, no failing health check. It is now in the required set checked by `npm run check:env`.

This risk predates the nonce work: the old policy carried the same host list, and `'unsafe-inline'` never applied to external scripts.

### 9.3 The release gate was failing on a stopwatch

`npm run verify:release` failed with `RELEASE GATE FAILED: TypeScript timed out` against a 120s budget. A clean non-incremental typecheck measures **207s** and exits 0 — the gate could not be met by a passing typecheck. Raised to 420s (~2x measured). CI's typecheck budget was 4 minutes, ~30s above measured, and is now 8. `verify:release` passes end to end.

### 9.4 Before the production run

1. Set `NEXT_PUBLIC_CLERK_DOMAIN` in Render to the production Clerk domain (9.2). `npm run check:env` against the deploy environment verifies this and the other four required variables.
2. Optionally set `NEXUS_CREDENTIALS_SECRET` to split credential encryption from `AUTH_SECRET`. Unset, it falls back and everything works; set, it removes the risk that regenerating `AUTH_SECRET` destroys every stored connector credential. If set, run a re-encryption pass — the machinery and procedure are in `lib/crypto.ts`.
3. Confirm the Render dashboard carries a production Clerk key, not the `pk_test_` instance in the local `.env.production.local`.

Not blocking, but still open: Sentry remains a no-op pending the middleware build-hang investigation, so production error visibility is stderr only.
