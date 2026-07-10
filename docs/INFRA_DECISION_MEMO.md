# NexusAI Infrastructure Decision Memo

Prepared: 2026-06-01
Status: Approved operating direction for V1 pilot hosting

## Executive Summary

NexusAI should run on a pragmatic managed-cloud stack for V1 pilots:

- Render for the Mission Control web service
- Neon Postgres with `pgvector` as the system of record
- Clerk for browser authentication and organization tenancy
- Cloudflare R2 for original document retention
- Cloudflare selective services for DNS, WAF, CDN, and optional AI Gateway
- Pinavia product subdomains as a hostname-routed house-of-brands layer on the same Render app

The goal is not infrastructure purity. The goal is a reliable, understandable pilot stack that supports self-signup, governed evidence ingestion, agent output history, and human approval workflows without introducing avoidable platform rewrites.

## Decision

### Locked Direction

| Layer | Choice | Reason |
|---|---|---|
| Web runtime | Render Web Service | Simple managed Node runtime for the current Next.js app |
| Product routing | Shared Render app + hostname detection | Keeps Quorum, Meridian, Vantage, Nucleus, and NexusAI on one runtime until isolation is commercially required |
| Database | Neon Postgres | Managed Postgres, direct migration URL, good pilot fit |
| Vector search | `pgvector` | Keeps semantic search close to evidence and governance joins |
| Auth | Clerk | Already integrated for signup, login, and organizations. Operational constraint since 2026-07-09: Clerk CLIENT components are excluded from the production build (`docs/ENGINEERING_GUARDRAILS.md` §7); sign-in/up use hosted handoff via `NEXT_PUBLIC_CLERK_HOSTED_SIGN_IN_URL`/`_SIGN_UP_URL`, which must be set in Render |
| Email | Clerk + managed product email provider | Clerk handles auth verification and account lifecycle email; Nexus product/cron email uses Resend or Cloudflare Email Sending |
| File storage | Cloudflare R2 | Low-cost original-file retention with S3-compatible APIs |
| Edge/security | Cloudflare selective services | DNS, CDN, WAF, AI Gateway where useful |
| Messaging | Slack adapter first | Governed secondary interface, not source of truth |

### What We Are Not Doing in V1

- No full runtime migration to edge workers
- No migration from Postgres to SQLite-style serverless databases
- No split vector database unless retrieval load proves it is necessary
- No autonomous writeback to enterprise systems
- No replacement of Clerk during pilot packaging
- No custom auth-email confirmation flow or self-hosted mail server for V1 demos
- No separate infrastructure per product until a product needs dedicated region, database, compliance boundary, or scale profile
- No separate API deployment during the pilot; preserve a modular service boundary and use the extraction triggers in `docs/API_SERVICE_BOUNDARY_DECISION.md`

## Why This Fits NexusAI

NexusAI is a governed intelligence operating layer for high-stakes professional workflows. It is judged by:

- evidence provenance
- tenant isolation
- human approval
- output rollback
- auditability
- controlled data exposure

Those are data-governance problems before they are raw compute problems. A relational-first system with Postgres and `pgvector` is the right foundation for the pilot.

## Current Architecture

```mermaid
flowchart LR
  User["User / Sponsor"] --> Clerk["Clerk Auth"]
  Clerk --> App["Mission Control on Render"]
  App --> DB["Neon Postgres + pgvector"]
  App --> R2["Cloudflare R2 Originals"]
  App --> LLM["LLM Provider"]
  App --> Slack["Slack Adapter"]
  App --> Audit["Audit + Approval Flows"]
  CF["Cloudflare DNS / WAF / CDN"] --> DomainRouter["Product Hostname Detection"]
  DomainRouter --> App
```

## Decision Drivers

Infrastructure decisions should optimize for:

1. Pilot reliability
2. Fast customer onboarding
3. Trusted evidence and approval workflows
4. Tenant and workspace isolation
5. Operator visibility and cost control
6. Extensibility without premature rewrites

## Cloudflare Role

Cloudflare remains valuable, but selectively:

- R2 stores original uploaded files for provenance and re-review.
- DNS/CDN/WAF protect the public surface.
- AI Gateway can add LLM observability, rate limiting, and provider controls.
- Queue-style async processing is a later hardening option if ingestion timeouts become a real bottleneck.

Cloudflare data products that would replace Postgres are intentionally deferred for V1 because Nexus needs joins, audit trails, approvals, and filtered retrieval in one system of record.

## Database Strategy

Postgres is the primary system of record for:

- workspaces
- users and roles
- evidence records
- recommendations
- decisions
- approvals
- audit events
- agent control profiles
- agent outputs
- learning signals
- workflow twin primitives

`pgvector` is used for semantic retrieval when enabled. Keyword retrieval remains a fallback.

## Deployment Strategy

Primary deployment path:

1. Push to GitHub.
2. Render blueprint reads `render.yaml`.
3. Render builds and starts the Next.js app.
4. Neon direct URL is used for migrations.
5. Neon pooled URL is used by the app at runtime.
6. Clerk and Slack callback URLs point to the deployed Render domain.
7. Cloudflare DNS maps `app`, `nexus`, `quorum`, `meridian`, `vantage`, and `nucleus.pinavia.io` to the same Render service.
8. Render custom domains attach those hostnames to the service.
9. Clerk allowed origins and redirect URLs include every product domain that appears in demos.
10. Product-domain smoke verifies branding, sign-in, redirect target, and route maturity per host.

Product subdomain policy:

- `app.pinavia.io` and `nexus.pinavia.io` are NexusAI entrypoints.
- `quorum.pinavia.io` is the board-governance entrypoint and can route signed-in users to `/board`.
- `meridian.pinavia.io`, `vantage.pinavia.io`, and `nucleus.pinavia.io` are reserved product entrypoints that may show product-aware branding, but should route to the core dashboard until their dedicated runtime routes ship.
- The subdomain layer is a positioning and navigation layer. It does not replace feature-readiness gates for each product.

Historical Vercel-origin UI baseline:

1. Vercel is not the current deployment direction for Nexus.
2. The first UI was built in Vercel, then carried into the Render-hosted app and new architecture.
3. Preserve that experience as `UI V0.1 baseline`, not as a parallel Vercel deployment lane.
4. Compare newer work as `UI V0.2 proposal`, `UI V0.3`, and so on.
5. Keep the UI baseline ledger in `docs/UI_BASELINE_VERSIONING.md` updated before colleague demos.

Use explicit names in discussions and paperwork: `Render production`, `UI V0.1 baseline`, and `UI V0.2 proposal`. Do not use "Vercel version" unless referring to historical origin.

## Cost and Scale Notes

Render free services may sleep when idle. REVERSED 2026-07-10 (architecture review adoption, `docs/ARCH_REVIEW_2026-07-10_ADOPTION.md`): sleeping services are NOT acceptable for regulated-buyer demos or paid pilots — a cold start in front of a bank reads as an outage. Use a paid non-sleeping web service and keep Neon off scale-to-zero for any demo or pilot window. Paid Render instances should also be used when:

- a customer expects instant first-load response
- onboarding calls depend on live demos
- scheduled jobs or webhook reliability become business-critical

Neon remains the database path unless storage, connection count, or region requirements force a direct upgrade.

## Future Revisit Triggers

Revisit infrastructure only if one of these becomes true:

- ingestion jobs time out under real customer load
- cold starts materially hurt paid pilot usage
- a regulated client requires a specific region or dedicated deployment
- retrieval volume requires a separate vector/search layer
- customer security requirements require private networking or on-prem processing

Until then, keep the stack boring, auditable, and easy to operate.
