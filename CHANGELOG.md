# Changelog

## 0.2.1 - DB Required Mode + Migration/Seed Hardening
- Added DB-required policy (`NEXUS_DB_REQUIRED`) with production-safe defaults.
- Added startup DB health check path in Mission Control layout.
- Added DB-backed auth path with salted password hashing and workspace membership verification.
- Added users auth migration (`0002_auth_users.sql`) and seed bootstrap for admin credentials in DB.
- Added migration tooling and scripts:
  - `db/migrations/0001_init.sql`
  - `npm run db:migrate`
  - `npm run db:seed`
  - `npm run db:check`
  - `npm run db:generate` (Drizzle)
- Added seeded demo records for tenant/workspace/evidence/recommendations/decisions.
- Updated schema IDs to text keys to stay compatible with existing demo and pipeline IDs.
- Added DB policy tests.

## 0.2.0 - Mission Control V1 Stack (Pilot Build)
- Added monorepo workspace foundation and `apps/mission-control` Next.js app.
- Added Mission Control route scaffolding:
  - `/dashboard/ceo`, `/dashboard/coo`, `/dashboard/cbo`
  - `/ask`, `/sources`, `/ingestion`, `/review`, `/recommendations`, `/decisions`, `/evidence/[id]`
  - `/settings/workspace`, `/settings/policies`
- Added API routes:
  - `GET /api/dashboard/:role`
  - `GET /api/recommendations`
  - `GET /api/evidence/:id`
  - `POST /api/approvals/:recommendationId`
  - `GET|POST /api/ingestion/status`
  - `POST /api/ask`
  - `POST /api/slack/events`
- Added core contracts and in-memory pilot store with append-only audit events.
- Added deterministic ingestion extraction path (PDF/DOCX/PPTX/XLSX/text) with confidence scoring and quarantine gating.
- Added retrieval service with evidence refs, confidence/freshness, refusal path, and restricted-evidence filtering.
- Added recommendation approval workflow and review/audit visibility.
- Added Drizzle Postgres schema scaffold for tenant/workspace/evidence/recommendation/decision/approval/audit models.
- Added pilot documentation pack:
  - onboarding checklist
  - security and data-handling one-pager
  - pilot success scorecard
  - executive pack template
- Added test coverage for contracts, ingestion policy, retrieval behavior, and approvals.
- Added login layer:
  - session cookie auth middleware
  - `POST /api/auth/login` and `POST /api/auth/logout`
  - `/login` UI and sign-out control in Mission Control shell
- Updated default login credentials to `admin / admin` (configurable via env).

## 0.1.1 - Launch Kit
- Added launch landing-page copy
- Added launch post template
- Added reusable visual assets for release and social posts
- Added contributor guide and launch kit folder

## 0.1.0 - Public Launch
- Open-sourced Nexus Core under MIT
- Added one-command install
- Added `nexus` shell wrapper with `doctor`, `status`, `setup`, `help`, and `init`
- Added JSON health checks
- Added workspace scaffolding
- Added buyer one-pager, pilot SOW template, contribution guide, and demo examples
