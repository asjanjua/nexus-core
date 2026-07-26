# UI V0.7 Initial Launch Cockpit

Status: Screenshot-verified Figma coordination board for initial pilot review.
Date: 2026-07-26.
Git reference at registration: `f1bfa46` plus this docs follow-up.

## Figma Reference

File: `Nexus System` (`NcQ8F5a0hczwGwZua2gfun`)

Page: `24 Initial Launch Cockpit V0.7`

Page link: `https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=129-6`

Frames:

| Frame | Node | Purpose |
|---|---:|---|
| `Launch Cockpit / 01 Executive Status / 1440` | `130:2` | One-page matrix for every launch surface: final Figma source, live/code route, demo stance, and claims to avoid. |
| `Launch Cockpit / 02 Demo Route Map / 1440` | `131:2` | Ten-minute pilot walkthrough using apex routes and explicitly blocking product subdomain demos until DNS cutover passes. |
| `Launch Cockpit / 03 Final Screen QA Matrix / 1440` | `131:70` | Launch acceptance checks for action clarity, user inputs, trust evidence, authority boundaries, state coverage, accessibility, and claim control. |
| `Launch Cockpit / 04 Action Board / 1440` | `131:126` | Practical queue for design review, code polish, external setup, and pilot script sequencing. |
| `Launch Cockpit / 05 Pilot Start Intake / 1440` | `135:2` | Code-backed `/start-pilot` route contract: user inputs, single primary CTA, product-room branches, and authority boundary. |
| `Launch Cockpit / 06 Product Brief / 1440` | `141:2` | Code-backed `/product-brief` refresh: Pinavia product-family collateral, mobile room cards, route contract, and standing authority boundary. |

## Why V0.7 Exists

V0.4, V0.5, and V0.6 are all still useful, but they answer different questions:

- V0.4 maps the commercial pilot loop against code-backed public surfaces.
- V0.5 locks the broad initial-launch truth across all pilots.
- V0.6 updates that truth after Vantage and Nucleus gained protected route-entry hubs.

V0.7 is the review cockpit: it gives colleagues a single starting point before a pilot conversation. It does not replace the detailed product boards; it routes the viewer to the correct source board and keeps live-route claims honest.

The fifth frame was added after the `/start-pilot` route became a real public page rather than a redirect-only handoff. It documents the conversion path before code deployment: `Create pilot workspace` routes to Clerk signup with `/onboarding` as the return path, `Run diagnostic first` routes to `/diagnostic`, and `Email pilot scope` opens a mailto link.

Follow-up alignment promoted `/start-pilot` into the homepage and public shell: the hero primary CTA, header primary CTA, money-map CTA, competitive-difference CTA, footer get-started link, and final pilot CTA now converge on the governed pilot-start page. The Figma frame `135:2` was updated and re-rendered to show that homepage-to-intake handoff.

The sixth frame was added after `/product-brief` was refreshed from stale NexusAI-only collateral into a Pinavia product-family pilot brief. It records the exact route contract: public header and brief follow-ups point to `/start-pilot` as the primary action, `/diagnostic` as the secondary action, and the five product rooms through `/workspace`, `/board`, `/meridian`, `/vantage`, and `/nucleus`. The code page keeps a desktop table for print/PDF and switches to readable room cards on mobile.

## Launch Truth Captured

| Surface | Current route/demo stance | Design source |
|---|---|---|
| Pinavia | Show now from `https://pinavia.io`; use `/start-pilot` as the governed pilot intake page and `/product-brief` as the shareable product-family brief. | `00 Executive Landing`, `21 Commercial Pilot Loop V0.4`, V0.7 frames `135:2`, `141:2` |
| NexusAI | Show as the core execution room; use Ask -> draft decision -> approval as the main demo beat. | `13 NexusAI Executive Room Final`, V0.2 full desktop prototype |
| Quorum | Show the board lifecycle and governance roadmap through `/board`. | `14 Quorum Board Room Final`, `09 Quorum Governance Workflow V0.2` |
| Meridian | Show the regulated filing-pack workflow through `/meridian`. | `15 Meridian Submission Room Final`, `21 Commercial Pilot Loop V0.4` |
| Vantage | Show the protected deal-room hub through `/vantage`; label deep routes as planned. | `16 Vantage Deal Room Final`, `23 Launch Route Update V0.6` |
| Nucleus | Show the protected engagement-room hub through `/nucleus`; label tenant deployment and client portal publishing as planned. | `17 Nucleus Engagement Room`, `19 Nucleus Rebuilt`, `23 Launch Route Update V0.6` |

## Current External Gate

Do not demo product subdomain URLs yet.

Current evidence is recorded in `docs/PRODUCT_DOMAIN_DNS_CUTOVER_2026-07-26.md`:

- `app.pinavia.io` redirects to `app.pinavia.co`.
- `nexus.pinavia.io`, `quorum.pinavia.io`, `meridian.pinavia.io`, `vantage.pinavia.io`, and `nucleus.pinavia.io` do not resolve.

Use these apex routes for immediate demos:

- `https://pinavia.io`
- `https://pinavia.io/diagnostic`
- `https://pinavia.io/vantage`
- `https://pinavia.io/nucleus`

## Visual Verification

Screenshots were generated and inspected for all six frames after creation or update.

The only defect found was a title/subtitle overlap in `Launch Cockpit / 03 Final Screen QA Matrix / 1440`; it was fixed by shortening the title to `Final UI makes action, trust, and human control obvious`, then re-rendered cleanly.

The fifth frame initially had a wrapped title overlapping the preview panel and a narrow `Sign in` pill; both were fixed and re-rendered cleanly.

After homepage CTA alignment, the fifth frame was re-rendered again to verify the updated `homepage -> /start-pilot` handoff copy did not clip or overlap.

The sixth frame was rebuilt after an initial auto-layout sizing miss collapsed the content wrapper. The final static handoff frame renders cleanly and shows the product brief status, mobile card fix, route contract, and authority boundary. Local production smoke for `/product-brief` passes on desktop and mobile: Pinavia shell present, stale NexusAI-only strings absent, three `/start-pilot` links, all five product-room links present, no body overflow, desktop table retained, and five mobile room cards rendered.

## Next Actions

1. Use V0.7 as the first page for colleague design review.
2. Complete the external DNS cutover gate before showing product subdomain URLs.
3. Run signed-in NexusAI Ask -> draft decision -> approval smoke as the core demo proof.
4. Run signed-in smoke for `/meridian`, `/vantage`, and `/nucleus`.
5. Configure `PINAVIA_ADMIN_PRINCIPALS`, then run the staff invite -> accept -> redeem pilot smoke.
