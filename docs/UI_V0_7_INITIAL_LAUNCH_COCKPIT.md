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

## Why V0.7 Exists

V0.4, V0.5, and V0.6 are all still useful, but they answer different questions:

- V0.4 maps the commercial pilot loop against code-backed public surfaces.
- V0.5 locks the broad initial-launch truth across all pilots.
- V0.6 updates that truth after Vantage and Nucleus gained protected route-entry hubs.

V0.7 is the review cockpit: it gives colleagues a single starting point before a pilot conversation. It does not replace the detailed product boards; it routes the viewer to the correct source board and keeps live-route claims honest.

## Launch Truth Captured

| Surface | Current route/demo stance | Design source |
|---|---|---|
| Pinavia | Show now from `https://pinavia.io`. | `00 Executive Landing`, `21 Commercial Pilot Loop V0.4` |
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

Screenshots were generated and inspected for all four frames after creation.

The only defect found was a title/subtitle overlap in `Launch Cockpit / 03 Final Screen QA Matrix / 1440`; it was fixed by shortening the title to `Final UI makes action, trust, and human control obvious`, then re-rendered cleanly.

## Next Actions

1. Use V0.7 as the first page for colleague design review.
2. Complete the external DNS cutover gate before showing product subdomain URLs.
3. Run signed-in NexusAI Ask -> draft decision -> approval smoke as the core demo proof.
4. Run signed-in smoke for `/meridian`, `/vantage`, and `/nucleus`.
5. Configure `PINAVIA_ADMIN_PRINCIPALS`, then run the staff invite -> accept -> redeem pilot smoke.
