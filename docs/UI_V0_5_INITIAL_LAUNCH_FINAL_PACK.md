# UI V0.5 Initial Launch Final Pack

Status: Figma launch-lock board, design coordination source for immediate pilot demos.
Date: 2026-07-26.

## Figma Reference

File: `Nexus System` (`NcQ8F5a0hczwGwZua2gfun`)

Page: `22 Initial Launch UI Final Pack V0.5`

Page link: `https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=125-2`

Frames:

| Frame | Node | Purpose |
|---|---:|---|
| `Launch UI / Readiness Matrix / 1440` | `125:3` | Single launch truth matrix across parent site, diagnostic, trial invite, NexusAI, Quorum, Meridian, Vantage, and Nucleus. |
| `Launch UI / Core Buyer Path / 1440` | `125:72` | Six-step regulated-buyer walkthrough from Pinavia landing to human approval. |
| `Launch UI / Pilot Surface Lock / 1440` | `125:118` | Product-by-product launch posture and demo instruction. |
| `Launch UI / Screen Handoff Index / 1440` | `125:163` | Figma-to-code mapping for each screen family. |
| `Launch UI / Gaps Before Pilot Demo / 1440` | `125:221` | Remaining gaps before a paid pilot conversation. |
| `Launch UI / Final Demo Script / 1440` | `125:265` | Ten-minute pilot demo script with boundaries. |

## Launch Truth

| Product / surface | Launch status | Demo instruction |
|---|---|---|
| Pinavia parent site | Live | Use as the opening story: governed AI execution rooms, diagnostic wedge, proof passport. |
| Diagnostic | Live | Use as the low-friction commercial entry: USD 49 score, then evidence-tested review. |
| Trial invite | Live gated | Use after `PINAVIA_ADMIN_PRINCIPALS` is configured and a real staff invite smoke has passed. |
| NexusAI | Live core | Primary app demo: Ask -> evidence -> draft decision -> approval. |
| Quorum | Live route plus deep design | Show `/board` as live and the 17-screen governance workflow as planned depth. |
| Meridian | Live vertical route | Best immediate regulated-entity vertical: submission room, coverage, gaps, human filing boundary. |
| Vantage | Design-only pilot | Show as a Figma storyboard only until `/vantage/dealroom` or equivalent route exists. |
| Nucleus | Design-only partner pilot | Show as a Figma partner/white-label concept only until a Nucleus app route exists. |

## Screen Source Map

| Screen family | Figma source | Code destination |
|---|---|---|
| Pinavia landing | `21 Commercial Pilot Loop V0.4`, live `/` | `apps/mission-control/app/page.tsx` |
| Diagnostic | `21 Commercial Pilot Loop V0.4` | `apps/mission-control/app/diagnostic/page.tsx`, `apps/mission-control/lib/diagnostic-offer.ts` |
| Trial invites | `21 Commercial Pilot Loop V0.4` | `apps/mission-control/app/admin/invites/page.tsx`, `apps/mission-control/app/invite/accept/page.tsx`, trial-invite APIs |
| NexusAI core | `13 NexusAI Executive Room Final`, `20 NexusAI Ask + Connectors` | `/workspace`, `/ask`, `/ingestion`, `/decisions`, `/settings/connectors` surfaces |
| Quorum | `14 Quorum Board Room Final`, `09 Quorum Governance Workflow V0.2` | `apps/mission-control/app/board/page.tsx`, `apps/mission-control/lib/board-governance-workflow.ts` |
| Meridian | `15 Meridian Submission Room Final`, `21 Commercial Pilot Loop V0.4` | `apps/mission-control/app/meridian/page.tsx`, `apps/mission-control/components/meridian-submission-panel.tsx` |
| Vantage | `16 Vantage Deal Room Final`, `11 Vertical Input Action Screens V0.2` | `apps/mission-control/lib/vantage-dd-workflow.ts`; route implementation pending |
| Nucleus | `17 Nucleus Engagement Room`, `19 Nucleus Rebuilt` | `apps/mission-control/lib/branding/white-label.ts`; route implementation pending |

## Demo Boundary

The V0.5 board exists to prevent demo overclaiming:

- A screen marked `Live` needs code, deploy, and smoke evidence.
- A screen marked `Live gated` needs sign-in or admin configuration before a full user-path smoke can be claimed.
- A screen marked `Design-only` can be shown in Figma, but the demo script must not imply a live route, live data object, or implemented workflow.
- Every vertical must keep the human-control boundary visible: Pinavia can prepare, check, cite, draft, route, and package; named humans approve, sign, file, certify, invest, or make statutory records final.

## Next Build Order

1. Configure `PINAVIA_ADMIN_PRINCIPALS` and run the staff invite smoke.
2. Signed-in smoke of Meridian on Render, then polish the Meridian route from the V0.5/V0.4 screen contracts.
3. Deepen Quorum beyond `/board` only after the first buyer confirms that board governance is the pilot target.
4. Build Vantage route entry if deal diligence becomes the next named pilot.
5. Build Nucleus route entry only for a live consulting partner conversation; until then Figma is sufficient.
