# UI V0.4 Commercial Pilot Loop Figma Plan

Status: Figma candidate, code-backed by the current local commit stack.
Date: 2026-07-26.

## Source Tree

This design pass reflects the local `main` tree after the Pinavia commercial and trial-invite commits:

- `448863d` Meridian Submission Room hub.
- `f65a789` priced readiness diagnostic offer page.
- `d14d8b3` two-rung diagnostic ladder: USD 49 diagnostic and two-week evidence-tested review.
- `bb2af6c` Pinavia trial invite portal and migration 0038.
- `b9b3592` trial invite production runbook.

The Figma frames are not a separate imagined product direction. They are a visual operating map for the routes now present in the app.

## Figma Reference

File: `Nexus System` (`NcQ8F5a0hczwGwZua2gfun`)

Page: `21 Commercial Pilot Loop V0.4`

Page link: `https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=121-2`

Frames:

| Frame | Node | Route / surface | Purpose |
|---|---:|---|---|
| `Pinavia / Landing Delta / Commercial CTAs / 1440` | `121:3` | `/` | Show the homepage CTA hierarchy and proof path after the recent commercial commits. |
| `Pinavia / Diagnostic / Two-rung Offer / 1440` | `121:73` | `/diagnostic` | Compare the USD 49 scored diagnostic against the two-week evidence-tested review. |
| `Meridian / Submission Room / Code-backed Hub / 1440` | `121:143` | `/meridian` | Reflect the code-backed submission room: jurisdiction, requirement coverage, gaps, and filing pack. |
| `Pinavia / Trial Invites / Admin Portal / 1440` | `121:226` | `/admin/invites` | Show the platform-staff invite workflow, generated link, email status, and issued-invite table. |
| `Pinavia / Trial Invite / Accept Redeem / 1440` | `121:300` | `/invite/accept` | Show the invitee flow: sign in, provision workspace, redeem invite, optional sample material. |
| `Pinavia / Commercial Pilot Loop / Storyboard / 1440` | `121:347` | release path | Explain the end-to-end buyer path from landing page through Render deploy and smoke. |

## Screen Principles

- One commercial path is primary: homepage -> diagnostic -> evidence-tested review -> trial invite -> Meridian room -> named human sign-off.
- Diagnostic CTAs stay explicit: `Run the USD 49 diagnostic`, `Book the evidence-tested review`, and `Start a governed trial`.
- Trial access remains staff-issued and code-bound. Invite links are bearer credentials shown once; only the SHA-256 hash is stored.
- The invitee page must not call admin-only setup actions. The redeem API provisions the entitlement atomically, then seeds sample material server-side as a best-effort action.
- Meridian remains a preparation and review product. It can check evidence, show gaps, and assemble a filing pack; it must not file, submit, certify, or sign.

## User Inputs And Action Points

| Surface | User input | Primary action | Proof shown |
|---|---|---|---|
| Landing | Buyer intent: diagnostic, trial, or Meridian proof path | Run diagnostic | Demo path, proof passport, governance boundary. |
| Diagnostic | Seven readiness dimensions and optional evidence review request | Start USD 49 diagnostic | Score, assumptions, next-step recommendation. |
| Admin invites | Email, name, company, trial days, demo pack, internal note | Issue invite | One-time link, invite status, audit trail. |
| Invite accept | Invite code from URL and signed-in Clerk identity | Start my trial | Trial expiry, Pro access, sample material status. |
| Meridian | Jurisdiction, license type, requirement, evidence, reviewer owner | Resolve outstanding requirements | Coverage percentage, citations, reviewer sign-off gate. |

## Implementation Mapping

The Figma page maps to these app files:

- `apps/mission-control/app/page.tsx`
- `apps/mission-control/app/diagnostic/page.tsx`
- `apps/mission-control/lib/diagnostic-offer.ts`
- `apps/mission-control/app/meridian/page.tsx`
- `apps/mission-control/components/meridian-submission-panel.tsx`
- `apps/mission-control/app/admin/invites/page.tsx`
- `apps/mission-control/app/invite/accept/page.tsx`
- `apps/mission-control/app/api/trial-invites/redeem/route.ts`
- `apps/mission-control/app/api/admin/trial-invites/route.ts`
- `apps/mission-control/app/sign-in/[[...sign-in]]/page.tsx`
- `apps/mission-control/app/sign-up/[[...sign-up]]/page.tsx`
- `apps/mission-control/lib/auth/hosted-clerk-url.ts`
- `apps/mission-control/lib/demo/seed-sector-pack.ts`
- `apps/mission-control/lib/data/repository.ts`

## Verification Notes

Figma validation on 2026-07-26:

- All six frames are 1440x900 desktop-browser frames.
- Default opaque white container fills were removed from nested auto-layout groups.
- The landing, Meridian, admin invite, accept, and storyboard frames use one primary action per state/screen.
- Diagnostic intentionally shows one primary action per commercial rung because the USD 49 diagnostic and the evidence-tested review are separate paid offers.
- Typography uses local Pinavia styles where available and Inter for new frame text.

## Deployment Gate

Before this candidate is called live:

1. Run TypeScript, focused tests, production build, and `git diff --check`.
2. Push `main` so Render receives the five local product commits plus this version record.
3. Confirm the Render deploy reaches the pushed commit.
4. Smoke public `/`, `/diagnostic`, `/invite/accept?code=missing`, and `/api/health`.
5. Smoke authenticated `/meridian` and `/admin/invites` after `PINAVIA_ADMIN_PRINCIPALS` is configured in Render.
