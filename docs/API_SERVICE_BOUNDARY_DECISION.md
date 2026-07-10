# API Service Boundary Decision

Updated: 2026-07-10
Status: Accepted for the paid-pilot architecture

## Decision

Keep Mission Control as a modular Next.js application for the pilot. UI routes and HTTP route handlers remain in `apps/mission-control`, while domain logic, provider clients, governance, and data access remain behind `lib/services`, `lib/connectors`, `lib/agents`, and `lib/data` boundaries.

Do not add a remote API switch or a second deployable service yet. The July 2026 build hang came from client import graphs, instrumentation, output tracing, duplicate route files, stale dependency installs, and local Git/filesystem state. A separate API deployment would not have corrected those causes.

## Required Boundary Now

Route handlers should:

1. authenticate and authorize the caller;
2. validate the request contract;
3. call a service/repository function;
4. map the result to an HTTP response;
5. avoid owning business rules or provider-specific SDK setup.

Client components call relative `/api/*` routes. They must not import database, provider, auth-server, or observability SDKs. External API clients use the same scoped route handlers.

## Why Not Split Yet

A second API service would add:

- another deployment and rollback unit;
- cross-origin and cookie/token handling;
- duplicated environment and secret management;
- distributed tracing and failure modes;
- network latency between UI and domain logic;
- more complex local development and pilot operations.

The pilot needs stronger boundaries, not more processes.

## Extraction Triggers

Create a separately deployed API/worker service when at least one trigger is sustained by real usage:

- ingestion, OCR, exports, or agent runs regularly exceed the web request window;
- background work needs independent autoscaling or queue consumers;
- API and UI need independent release cadence or ownership;
- a customer requires dedicated region, private networking, or an isolated compliance boundary;
- external API traffic materially exceeds browser traffic;
- Next.js builds remain dominated by server-only dependencies after boundary checks and tracing exclusions;
- one service failure domain is demonstrably harming the other.

## Planned Extraction Shape

When a trigger is met:

1. extract asynchronous ingestion/agent execution first, not the entire API;
2. keep public contracts in a shared typed package;
3. use scoped bearer/service credentials between services;
4. keep Postgres as the system of record and audit every cross-service action;
5. introduce `NEXUS_API_BASE_URL` only when a real remote service exists;
6. preserve relative `/api` as the default embedded mode for local development and the pilot.

This is an extraction path, not a commitment to microservices.
