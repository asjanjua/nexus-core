# Live Smoke Matrix

## Levels

| Level | Evidence | Proves | Does not prove |
| --- | --- | --- | --- |
| Deployment identity | Live release marker/Render metadata | Expected SHA is serving | Dependencies or user flows work |
| Health | `/api/health` with dependency statuses | Declared dependencies answer | Correct SHA or authenticated workflows |
| Public domain | `smoke-domain.mjs` | HTTPS/header/redirect/CORS edge behavior | Logged-in feature behavior |
| Auth handoff | Fresh Clerk sign-in and absolute return | Hosted auth transition works | Every protected API is authorized |
| Protected routes | Fresh session, API-backed pages | Auth context and selected surfaces work | Full milestone flow |
| Workflow | Real end-to-end acceptance path | Release behavior works operationally | Unrelated product behavior |

## Default protected route set

Select only routes relevant to the release. Common high-value surfaces include:

- `/dashboard/ceo`
- `/knowledge`
- `/settings/connectors`
- `/workflows`
- `/reviewer-seat`
- `/pilot/afterlife`
- `/funnel` for an authorized operator

## Regulated readiness proof

When the release touches onboarding/pilot gates, prove:

1. a fresh workspace starts blocked;
2. server rejection includes the expected gate code and blocked gates;
3. sponsor, accepted reviewer, and evidence prerequisites are established;
4. scorer/gate state becomes ready;
5. pilot selection succeeds and persists;
6. approval identity is enforced where required.

Use an isolated test workspace and explicit mutation authority.

## Evidence wording

- `live`: directly observed on the deployed system.
- `deployment pending`: expected code is not yet proven live.
- `DNS pending`: resolution/provider propagation, not automatically an app defect.
- `migration pending`: code is present but schema state is not established.
- `auth smoke incomplete`: fresh authenticated proof was not achieved.
- `operationally verified`: the required live workflow was directly exercised.
