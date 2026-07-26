# UI V0.6 Launch Route Update

Status: Code-backed route-entry update for the immediate pilot demo set.
Date: 2026-07-26.
Commit: `20f2848`.

## Figma Reference

File: `Nexus System` (`NcQ8F5a0hczwGwZua2gfun`)

Page: `23 Launch Route Update V0.6`

Page link: `https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=126-2`

Frames:

| Frame | Node | Purpose |
|---|---:|---|
| `Launch Routes / V0.6 Readiness Delta / 1440` | `126:3` | Updates the launch truth matrix now that Vantage and Nucleus have protected route entries. |
| `Launch Routes / Vantage + Nucleus Route Hubs / 1440` | `126:53` | Shows the two new launch hubs, their route evidence, user inputs, actions, and hard boundaries. |
| `Launch Routes / Updated Demo Script / 1440` | `126:103` | Updates the demo sequence so live routes come first and Figma-only depth is clearly separated. |

## Code Source Map

| Surface | Route | Code source | Current demo status |
|---|---|---|---|
| Vantage Deal Room | `/vantage` | `apps/mission-control/app/vantage/page.tsx`, `apps/mission-control/components/vantage-deal-room-panel.tsx`, `apps/mission-control/lib/vantage-dd-workflow.ts` | Protected launch hub. Deep `/vantage/*` route tree is still planned. |
| Nucleus Engagement Room | `/nucleus` | `apps/mission-control/app/nucleus/page.tsx`, `apps/mission-control/components/nucleus-engagement-panel.tsx`, `apps/mission-control/lib/nucleus-engagement-workflow.ts` | Protected launch hub with a dedicated registry. Deep `/nucleus/*` route tree is still planned. |
| Product-domain sign-in | product subdomains | `apps/mission-control/lib/product-detection.ts` | Meridian, Vantage, and Nucleus now land on their protected hub routes after sign-in. |
| Specialist Rooms nav | authenticated app shell | `apps/mission-control/components/side-nav.tsx` | Vantage and Nucleus appear beside Board Room and Submission Room. |

## Launch Truth

Vantage and Nucleus are no longer design-only. They are code-backed route entries:

- The route exists and is protected by `requireWorkspaceId`.
- The hub is rendered from a domain-owned workflow registry.
- User input and action guidance are visible on the route.
- Human-control boundaries are visible on the route.
- Deeper route candidates remain planned until implemented and smoke-tested.

## Verification

Local verification before commit:

- `npm test -- --run tests/product-detection.test.ts tests/vantage-dd-workflow.test.ts tests/nucleus-engagement-workflow.test.ts` passed: 3 files, 27 tests.
- `npx tsc --noEmit --pretty false` passed after clearing stale generated `.next/types/* 2.ts` files from a prior failed build.
- `npm run build` passed and listed both `/vantage` and `/nucleus` in the App Router route table.
- Local production smoke on `localhost:3010` confirmed signed-out `/vantage` redirects to `/sign-in?redirect_url=%2Fvantage`, signed-out `/nucleus` redirects to `/sign-in?redirect_url=%2Fnucleus`, and `/api/health` returns 200.

Live verification after push:

- `https://pinavia.io/vantage` returns 307 to `/sign-in?redirect_url=%2Fvantage`.
- `https://pinavia.io/nucleus` returns 307 to `/sign-in?redirect_url=%2Fnucleus`.
- `https://nexus-mission-control.onrender.com/vantage` and `/nucleus` return the same protected-route redirects.
- `https://pinavia.io/api/health` returns `ok=true`, database enabled, vector search enabled, originals storage enabled, and DeepSeek configured.

## Demo Boundary

Use `/vantage` and `/nucleus` to show product shape, buyer vocabulary, workflow arcs, and governance boundaries. Do not claim live deal-room APIs, client-portal publishing, full white-label deployment, or end-to-end Vantage/Nucleus workspace data until the deeper routes and APIs are implemented, deployed, and smoked.
