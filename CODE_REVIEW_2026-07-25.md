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

### 4.1 HIGH — Seven high-severity advisories pass the CI gate
`npm audit` reports 7 high-severity vulnerabilities, all with fixes available:
- **Next.js** (8 CVEs) including unauthenticated disclosure of internal Server Function endpoints, SSRF via rewrites, cache confusion on request bodies, and Server Actions DoS
- **postcss** — path traversal via `sourceMappingURL`
- **sharp** — inherited libvips CVEs

`.github/workflows/` gates on `npm audit --audit-level=critical`, so all seven pass silently. The gate is set one level below the actual exposure. Next is pinned `^15.5.18`; `npm audit fix` reports these as fixable.

### 4.2 MEDIUM — Lint has never run; no ESLint config exists
`npm run lint` invokes `next lint`, which is deprecated and, finding no ESLint config anywhere in the repo, drops into an interactive setup prompt and exits 1. CI runs `check:boundaries`, `tsc`, `npm test`, and `build` — it never invokes lint. The `lint` script is therefore dead and misleading, and the codebase has had zero lint enforcement for its lifetime.

### 4.3 LOW — CI typecheck timeout is tight
The CI `Typecheck` step has `timeout-minutes: 4`. A clean local `tsc --noEmit` on this project took over 5 minutes. Machine specs differ, but the margin is thin enough to cause intermittent red builds.

---

## 5. Data Layer

### 5.1 MEDIUM — Schema/migration index drift
`db/schema.ts` declares **zero** indexes across its 39 `pgTable` definitions. The migrations contain 51 `CREATE INDEX` statements. Drizzle's view of the schema therefore does not match the database. The next `drizzle-kit generate` is liable to emit `DROP INDEX` for indexes it does not know about, or to lose them silently on a rebuild.

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

**Wave 1 — before any further client exposure**
1. 2.1 RBAC: introduce Clerk org roles; stop granting `["*"]` to every session
2. 4.1 `npm audit fix` for the Next.js / postcss / sharp advisories; raise the CI gate to `--audit-level=high`
3. 2.2 Server-side MIME allowlist on upload + force `content-disposition: attachment` on evidence originals
4. 2.3 Remove the `DEFAULT_WORKSPACE` fallback from `strategy-profile` and `workspace/status`

**Wave 2 — correctness and operational safety**
5. 3.1 Key versioning + a documented rotation path for connector credentials; split the credential key from `AUTH_SECRET`
6. 2.4 Revocation check in `decodeBearerToken` (cached lookup, mirroring the existing workspace-access cache)
7. 2.5 Rate limiting on auth, token, claim and public POST routes
8. 3.2 Cache the derived PBKDF2 key
9. 2.9 Remove the `nexus-dev-secret` fallback; fail closed and set `NODE_ENV` explicitly in `render.yaml`

**Wave 3 — hardening and hygiene**
10. 2.6 Nonce-based CSP, drop `unsafe-inline`
11. 2.8 Prompt-injection fencing on ingested content
12. 4.2 Add a real ESLint config and wire lint into CI
13. 6.2 Route audit-write failures to Sentry instead of swallowing them
14. 5.1 Reconcile `db/schema.ts` indexes with the migrations
15. 2.7 / 6.4 Extract a shared `cronAuthorized` using `timingSafeEqualString`

**Wave 4 — structural, do deliberately**
16. 6.1 Decompose `settings/page.tsx` and `onboarding/wizard.tsx`
17. 5.2 Split `repository.ts` by domain
18. 6.3 Central validated config module
19. 6.5 / 6.6 Delete stale deploy scripts; clean the stray `node_modules 2` directories
