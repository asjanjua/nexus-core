# UI V0.7 Initial Launch Cockpit

Status: Screenshot-verified Figma coordination board for initial pilot review.
Date: 2026-07-28.
Git reference at registration: `f1bfa46` plus follow-up commits through `7270c25`; code-backed Nucleus profile deployed through `5e8e7d1`.

## Figma Reference

File: `Nexus System` (`NcQ8F5a0hczwGwZua2gfun`)

Page: `24 Initial Launch Cockpit V0.7`

Page link: `https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=129-6`

Release audit: `docs/INITIAL_LAUNCH_UI_RELEASE_AUDIT.md`.

Frames:

| Frame | Node | Purpose |
|---|---:|---|
| `Launch Cockpit / 01 Executive Status / 1440` | `130:2` | One-page matrix for every launch surface: final Figma source, live/code route, demo stance, and claims to avoid. |
| `Launch Cockpit / 02 Demo Route Map / 1440` | `131:2` | Ten-minute pilot walkthrough using apex routes and explicitly blocking product subdomain demos until DNS cutover passes. |
| `Launch Cockpit / 03 Final Screen QA Matrix / 1440` | `131:70` | Launch acceptance checks for action clarity, user inputs, trust evidence, authority boundaries, state coverage, accessibility, and claim control. |
| `Launch Cockpit / 04 Action Board / 1440` | `131:126` | Practical queue for design review, code polish, external setup, and pilot script sequencing. |
| `Launch Cockpit / 05 Pilot Start Intake / 1440` | `135:2` | Code-backed `/start-pilot` route contract: user inputs, single primary CTA, product-room branches, and authority boundary. |
| `Launch Cockpit / 06 Product Brief / 1440` | `141:2` | Code-backed `/product-brief` refresh: Pinavia product-family collateral, mobile room cards, route contract, and standing authority boundary. |
| `Launch Cockpit / 07 Readiness Result Path / 1440` | `143:2` | Code-backed `/readiness` result-path refresh: Pinavia branding, live CTAs, inherited-result signup, and no contradictory advisor state. |
| `Launch Cockpit / 08 Diagnostic Intake Path / 1440` | `145:2` | Code-backed `/diagnostic` honesty pass: no unwired checkout promise, diagnostic-intent handoff to `/start-pilot`, helpful user inputs, and authority boundary. |
| `Launch Cockpit / 09 Meridian Scope Arc / 1440` | `160:2` | Code-backed Meridian entry arc: a regulatory-scope screen followed by a licence-profile screen, one shared persisted record, explicit cold-start gate, consequence preview, and human filing boundary. |
| `Launch Cockpit / 10 Vantage Coverage Review / 1440` | `162:2` | Code-backed Vantage Coverage screen: supported checklist selection, governed-evidence runner, coverage/gap output, named evidence requests, and the investment-decision boundary. |
| `Launch Cockpit / 11 Nucleus Firm Profile / 1440` | `164:2` | Code-backed Nucleus profile: firm name, logo URL, accent, and typeface persist through the guarded workspace settings route; protected trust controls sit outside the editable brand layer. |
| `Launch Cockpit / 12 NexusAI Governed Ask / 1440` | `167:2` | Code-backed NexusAI core loop: workspace-scoped Ask, evidence strip, AI-drafted answer, confidence/freshness, and the explicit human decision-draft handoff. |
| `Launch Cockpit / 13 Quorum Board Action Loop / 1440` | `167:57` | Code-backed Quorum board loop: stable board identifier, governed baseline, between-meetings delta, cited board status, and a director-owned decision boundary. |
| `Launch Cockpit / 14 Connector Evidence Intake / 1440` | `173:2` | Code-backed Settings -> Connectors entry: a controlled-source pilot sequence, real provider/setup links, an explicit pre-ingest source-policy step, and no-source-writeback boundary. |

## Why V0.7 Exists

V0.4, V0.5, and V0.6 are all still useful, but they answer different questions:

- V0.4 maps the commercial pilot loop against code-backed public surfaces.
- V0.5 locks the broad initial-launch truth across all pilots.
- V0.6 updates that truth after Vantage and Nucleus gained protected route-entry hubs.

V0.7 is the review cockpit: it gives colleagues a single starting point before a pilot conversation. It does not replace the detailed product boards; it routes the viewer to the correct source board and keeps live-route claims honest.

The fifth frame was added after the `/start-pilot` route became a real public page rather than a redirect-only handoff. It documents the conversion path before code deployment: `Create pilot workspace` routes to Clerk signup with `/onboarding` as the return path, `Run diagnostic first` routes to `/diagnostic`, and `Email pilot scope` opens a mailto link.

Follow-up alignment promoted `/start-pilot` into the homepage and public shell: the hero primary CTA, header primary CTA, money-map CTA, competitive-difference CTA, footer get-started link, and final pilot CTA now converge on the governed pilot-start page. The Figma frame `135:2` was updated and re-rendered to show that homepage-to-intake handoff.

The sixth frame was added after `/product-brief` was refreshed from stale NexusAI-only collateral into a Pinavia product-family pilot brief. It records the exact route contract: public header and brief follow-ups point to `/start-pilot` as the primary action, `/diagnostic` as the secondary action, and the five product rooms through `/workspace`, `/board`, `/meridian`, `/vantage`, and `/nucleus`. The code page keeps a desktop table for print/PDF and switches to readable room cards on mobile.

The seventh frame was added after `/readiness` was refreshed from stale NexusAI-only result copy into a Pinavia conversion path. Result-band CTAs now route to `/diagnostic` or `/start-pilot`, the advisor fallback uses `hello@pinavia.io`, and the "not a clear fit" advisor panel is suppressed whenever the server returns a valid lane and inherited-result signup path.

The eighth frame was added after `/diagnostic` was refreshed from a priced-offer page into an honest diagnostic-intake bridge. It documents the current route contract: `Start diagnostic intake` routes to `/start-pilot?intent=diagnostic`, `Free self-assessment` routes to `/readiness`, diagnostic pricing remains hidden until checkout and receipt flows are implemented, and the no-certification/no-filing/no-legal-opinion/no-approval boundary is visible before action.

The ninth frame records the first real Meridian arc beyond its hub. `/meridian/scope` is the compliance-lead entry point and captures jurisdiction, regulator, licence type/status, and filing objective. `/meridian/license-profile` adds applicant, ownership, director, and activity facts to that same saved scope. The second route now gates cleanly to Scope before any scope exists, rather than exposing an incomplete form with hidden required fields.

The tenth frame records the first executable Vantage deep route. `/vantage/coverage` moves the existing diligence analysis out of generic Settings and into the product workflow: the user selects a supported checklist, runs it against processed governed evidence, and sees coverage plus priority evidence requests. The screen does not turn evidence coverage into an investment recommendation; a named advisor and investment committee remain responsible for materiality and any decision.

The eleventh frame records the first executable Nucleus deep route. `/nucleus/profile` writes the existing constrained white-label record through the guarded workspace settings API. Editable inputs stay narrow: firm name, logo URL, accent, and typeface. Status meaning, AI provenance, evidence citations, named human approval boundaries, audit labels, and consequence previews remain fixed in the adjacent contract panel.

The twelfth frame makes the core NexusAI pilot story executable and inspectable: Ask is restricted to approved workspace evidence, evidence appears before the answer, the AI-drafted answer remains visibly distinct, and the only consequential next action is a human-owned decision draft. The thirteenth frame does the same for Quorum: board-pack evidence becomes a stable baseline, later packs produce a reviewable delta, and directors retain authority over every board action.

## Launch Truth Captured

| Surface | Current route/demo stance | Design source |
|---|---|---|
| Pinavia | Show now from `https://pinavia.io`; use `/readiness` for free self-assessment, `/diagnostic` for evidence-tested review intake, `/start-pilot` as the governed pilot intake page, and `/product-brief` as the shareable product-family brief. | `00 Executive Landing`, `21 Commercial Pilot Loop V0.4`, V0.7 frames `135:2`, `141:2`, `143:2`, `145:2` |
| NexusAI | Show the core execution room; use Ask -> evidence strip -> AI answer -> decision draft -> approval as the main demo beat. | `13 NexusAI Executive Room Final`, V0.2 full desktop prototype, V0.7 frame `167:2` |
| Quorum | Show `/board` as the code-backed between-meetings loop: establish a stable baseline, then review material changes and route them to human-owned decisions. | `14 Quorum Board Room Final`, `09 Quorum Governance Workflow V0.2`, V0.7 frame `167:57` |
| Meridian | Show `/meridian` as the submission hub. In a signed-in pilot, begin the real scope arc at `/meridian/scope`, then `/meridian/license-profile`. | `15 Meridian Submission Room Final`, `21 Commercial Pilot Loop V0.4`, V0.7 frame `160:2` |
| Vantage | Show `/vantage` as the deal-room hub. In a signed-in pilot, run the real governed-evidence slice at `/vantage/coverage`; label the dealroom, red-flag, and memo routes as planned. | `16 Vantage Deal Room Final`, `23 Launch Route Update V0.6`, V0.7 frame `162:2` |
| Nucleus | Show `/nucleus` as the engagement-room hub. In a signed-in pilot, set the real constrained firm brand at `/nucleus/profile`; label methodology packaging, client portal publishing, and tenant rollout as planned. | `17 Nucleus Engagement Room`, `19 Nucleus Rebuilt`, `23 Launch Route Update V0.6`, V0.7 frame `164:2` |

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

Screenshots were generated and inspected for all fourteen frames after creation or update.

The only defect found was a title/subtitle overlap in `Launch Cockpit / 03 Final Screen QA Matrix / 1440`; it was fixed by shortening the title to `Final UI makes action, trust, and human control obvious`, then re-rendered cleanly.

The fifth frame initially had a wrapped title overlapping the preview panel and a narrow `Sign in` pill; both were fixed and re-rendered cleanly.

After homepage CTA alignment, the fifth frame was re-rendered again to verify the updated `homepage -> /start-pilot` handoff copy did not clip or overlap.

The sixth frame was rebuilt after an initial auto-layout sizing miss collapsed the content wrapper. The final static handoff frame renders cleanly and shows the product brief status, mobile card fix, route contract, and authority boundary. Live production smoke for `/product-brief` passes on desktop and mobile through `4e8b71f`: Pinavia shell present, stale NexusAI-only strings absent, three `/start-pilot` links, all five product-room links present, no body overflow, desktop table retained, mobile table hidden, and five mobile room cards rendered.

The seventh frame renders cleanly and records the live `/readiness` result-flow smoke through `d1ac9b2`: high-score desktop/mobile flows produce the AI-Native result, carry the server claim code into signup, expose `/start-pilot`, remove stale personal-email/NexusAI-only copy, hide the contradictory advisor panel when a lane exists, and avoid horizontal overflow.

The eighth frame initially showed overflow in the buyer-handoff route cards because long URLs were squeezed into four narrow columns. It was rebuilt as a two-by-two route grid and re-rendered cleanly. It records the live `/diagnostic` change through `9428db9`: no `USD 49` checkout claim while checkout is absent, a single primary diagnostic-intake CTA, `/readiness` as the secondary path, and helpful inputs for sponsor/evidence/reviewer handoff. Local TypeScript, production build, local route smoke, and live apex desktop/mobile smoke passed for `/diagnostic` plus `/start-pilot?intent=diagnostic`; `/api/health` returned `ok=true`.

The ninth frame renders both Meridian Scope screens as equal, full-width browser surfaces. It makes the cold-start prerequisite, shared-record behaviour, field-level helper copy, visible consequence preview, specific CTA labels, and no-compliance-conclusion/no-filing boundary legible before implementation review.

The tenth frame initially had a long status-card headline overlapping its proof line; it was shortened and re-rendered cleanly. It now shows the executable review controls, real-result anatomy, evidence-request distinction, and the human investment-authority boundary without clipping or overlap.

The eleventh frame was re-rendered after heading and saved-state spacing corrections. It shows both the real brand inputs and a separate contractually-fixed trust panel without overlap.

The twelfth and thirteenth frames initially exposed header/subtitle overlap. Both were re-rendered after a shared header rhythm correction; the Quorum status card was also shortened so its authority boundary remains readable at desktop review size.

The fourteenth frame was added with the connector first-run pass. It makes a pilot administrator's sequence visible before the long provider reference: choose a narrow source, prepare provider setup, install with the source owner, then set policy before ingest. Initial visual review caught a heading-wrap collision; it was corrected and re-rendered cleanly. The corresponding code promotes this same intake sequence above the connector catalogue while retaining official provider links, exact redirect-URI guidance, and truthful future-connector scoping links.

The connector pass deployed through `96fcd8f`. CI passed, the live `/settings/connectors` response contains the new intake/reference copy, and `/api/health` remained `ok`. A follow-up route refactor makes the page genuinely workspace-authenticated before the client catalogue renders; the frame chrome now says `Authenticated workspace`. This proves the released UI, not a provider consent, policy save, or ingest outcome; those remain signed-in controlled-workspace checks.

The executive status and action-board frames were reconciled after the new slices landed. They now point directly to the NexusAI, Quorum, Meridian, Vantage, and Nucleus route loops that can be shown today, distinguish live pilot slices from still-planned deeper work, and list the correct signed-in proof instead of describing all Vantage/Nucleus deep routes as unbuilt.

The Vantage Coverage slice was deployed through `f357ace`. Live signed-out smoke confirms `/vantage/coverage` preserves `/vantage/coverage` as the Clerk return path, and the live health endpoint returned `ok=true`. The still-required evidence/run/result smoke needs a signed-in pilot workspace.

The Nucleus Firm Profile slice was deployed through `5e8e7d1`. Live signed-out smoke confirms `/nucleus/profile` preserves `/nucleus/profile` as the Clerk return path, and the live health endpoint returned `ok=true`. The still-required save/reload proof needs a signed-in pilot workspace and a safe test brand.

## Next Actions

1. Use V0.7 as the first page for colleague design review.
2. Complete the external DNS cutover gate before showing product subdomain URLs.
3. Run signed-in NexusAI Ask -> draft decision -> approval smoke as the core demo proof.
4. Run signed-in smoke for `/meridian`, `/meridian/scope`, `/meridian/license-profile`, `/vantage`, `/vantage/coverage`, `/nucleus`, and `/nucleus/profile` including a safe brand save/reload.
5. Configure `PINAVIA_ADMIN_PRINCIPALS`, then run the staff invite -> accept -> redeem pilot smoke.
