# SECURITY_REVIEW.md — Pre-Pilot Security Checklist

> Last updated: 2026-05-30
> Complete all items marked REQUIRED before signing the first paid pilot contract.
> Items marked RECOMMENDED should be done before scaling to a second pilot.

---

## 1. Authentication and Authorization

- [x] **REQUIRED** All API routes use `requireScope()` from `lib/api-auth.ts`. No route bypasses auth.
- [x] **REQUIRED** Bearer token validation is independent of Clerk — agents can call without browser sessions.
- [x] **REQUIRED** Clerk session scoping: workspace ID = Clerk orgId. Cross-workspace data access is structurally impossible without a token for that org.
- [x] **REQUIRED** API keys are stored as hashed values only (`keyHash`). Plaintext never persists after creation.
- [ ] **REQUIRED** Verify each API route for auth bypass manually before first pilot. Run through the route list in `app/api/` and confirm every handler calls `requireScope`.
- [ ] **REQUIRED** Verify that restricted evidence (`sensitivity = "restricted"`) never appears in LLM prompts for workspaces where it should not. Test with a cross-workspace retrieval attempt.

---

## 2. Data Isolation (Tenant Boundaries)

- [x] **REQUIRED** All DB queries are scoped by `workspaceId`. No query fetches evidence, recommendations, or decisions without a workspace filter.
- [x] **REQUIRED** Connector credentials are stored AES-256-GCM encrypted. Plaintext is never written to the DB.
- [ ] **REQUIRED** Run a manual tenant isolation test before first pilot:
  1. Create two workspaces (Org A and Org B in Clerk).
  2. Upload a document to Org A.
  3. Authenticate as Org B and attempt to retrieve Org A's evidence via the Ask panel and `/api/evidence`.
  4. Confirm zero results are returned.

---

## 3. Security Headers

- [x] **REQUIRED** `X-Content-Type-Options: nosniff`
- [x] **REQUIRED** `X-Frame-Options: DENY`
- [x] **REQUIRED** `Referrer-Policy: strict-origin-when-cross-origin`
- [x] **REQUIRED** `Permissions-Policy` (camera, microphone, geolocation, payment all denied)
- [x] **REQUIRED** `Strict-Transport-Security` (production only, 1 year, includeSubDomains)
- [x] **REQUIRED** `Content-Security-Policy` (added in v0.11.0 — verify with securityheaders.com after next deploy)
- [ ] **REQUIRED** Run https://securityheaders.com against the production URL after next deploy. Target: A rating or above.

---

## 4. Rate Limiting

- [x] **REQUIRED** In-process rate limiting active in middleware (added v0.11.0):
  - Auth routes: 10 req/min per IP
  - Ingestion: 20 req/min per IP
  - Ask: 30 req/min per IP
  - Dashboard: 60 req/min per IP
- [ ] **RECOMMENDED** Replace in-process rate limiting with Upstash Redis before scaling to >5 concurrent pilot workspaces. In-process limits do not persist across Render instances if the service is horizontally scaled.

---

## 5. CORS

- [x] **REQUIRED** CORS restricted to production domain (`NEXT_PUBLIC_APP_URL`) in production. Never `*`.
- [ ] **REQUIRED** Set `NEXT_PUBLIC_APP_URL` in Render environment variables to the production domain before first pilot deploy.

---

## 6. Dependency Vulnerabilities

- [ ] **REQUIRED** Run `npm audit` before first pilot deploy and resolve all critical and high findings.
  ```bash
  cd apps/mission-control && npm audit --audit-level=high
  ```
- [ ] **RECOMMENDED** Add `npm audit --audit-level=critical` to the CI pipeline (GitHub Actions or Render pre-deploy hook) to block deploys with critical CVEs.

---

## 7. Sensitive Data Handling

- [x] **REQUIRED** WhatsApp Business evidence is classified as `confidential` by default.
- [x] **REQUIRED** Financial services and healthcare sectors auto-elevate sensitivity to `confidential`.
- [x] **REQUIRED** Restricted evidence is excluded from retrieval for non-admin scopes.
- [ ] **REQUIRED** Verify that the Ask panel never returns raw customer PII or account numbers in its synthesis. Test with a document containing fictitious PII.
- [ ] **RECOMMENDED** Add a red-team pass: upload a document containing sample PII and verify it is either quarantined or stripped from LLM synthesis output.

---

## 8. Responsible Disclosure

- [x] `/security` page exists with contact information.
- [ ] **REQUIRED** Ensure `security@nexusai.io` (or equivalent) is actively monitored before the first pilot. All inbound security reports should be acknowledged within 24 hours.

---

## 9. Items Deferred to Phase 2 (before regulated-sector scale)

- [ ] AI evaluation harness with golden prompts for risks, decisions, recommendations, and source grounding.
- [ ] Prompt/version registry so every AI behaviour has a named prompt and changelog.
- [ ] Red-team checks for sensitive data leakage and unsafe recommendations.
- [ ] Workspace-level AI policy settings (UI control for allowed providers, local-only mode, sensitivity ceiling).

---

## Sign-Off

Before first paid pilot contract is signed, the platform lead should confirm:

| Item | Status | Date |
|---|---|---|
| All REQUIRED items above are complete | | |
| Tenant isolation test passed | | |
| Security headers verified via securityheaders.com | | |
| `npm audit` clean at high/critical level | | |
| Support email is monitored | | |
| DR Runbook reviewed and contacts confirmed | | |
