# Initial Launch UI Release Audit

Status: design-final desktop release pack; authenticated workflow proof remains pending.

Date: 2026-07-28.
Design file: [`Nexus System`](https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=129-6).

## Purpose

This is the evidence-led release audit for the immediate Pinavia pilot. It separates three things that must not be confused:

1. **Design-final:** an editable, screenshot-reviewed desktop screen exists in Figma.
2. **Code-backed:** the screen has a corresponding route and product behavior in Mission Control.
3. **Live-proven:** the deployed route or flow has been exercised in its appropriate state.

The pilot can use apex routes today. Product subdomains remain an infrastructure follow-up, not a design gap.

## Release Surface Matrix

| Surface | Launch screen and Figma evidence | Code route | Desktop design status | Live proof | Remaining proof |
|---|---|---|---|---|---|
| Pinavia landing and conversion | Executive Landing; V0.7 Pilot Start `135:2`, Product Brief `141:2`, Readiness `143:2`, Diagnostic `145:2` | `/`, `/start-pilot`, `/product-brief`, `/readiness`, `/diagnostic` | Final | Public desktop/mobile smoke recorded in the V0.7 cockpit | None for design; continue normal conversion review. |
| Pinavia solutions and research | [V0.7 Solutions `176:2`](https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=176-2); [Research `176:63`](https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=176-63) | `/solutions`, `/research` | Final | `f9de6b2` live apex smoke: both routes return `200` with expected launch copy; `/api/health` remains `ok` | Continue publishing only measured pilot findings, not client-outcome claims. |
| Governed evidence intake | [V0.7 Connector Evidence Intake `173:2`](https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=173-2) | `/settings/connectors` | Final | `9747003` live signed-out return-path smoke and health check | Signed-in controlled-source install, source-policy save, and evidence-ingest smoke. |
| NexusAI core loop | [V0.7 Governed Ask `167:2`](https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=167-2) | `/ask` -> `/decisions` -> `/approvals` | Final | Signed-out return path is live | Signed-in Ask -> evidence -> draft -> approval walkthrough. |
| Quorum board loop | [V0.7 Board Action Loop `167:57`](https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=167-57) | `/board` -> `/decisions` | Final | Board route is code-backed; design frame is screenshot-reviewed | Signed-in baseline/delta run against a pilot board pack. |
| Meridian scope arc | [V0.7 Meridian Scope `160:2`](https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=160-2) | `/meridian/scope` -> `/meridian/license-profile` | Final | Signed-out protected-route smoke | Signed-in scope then profile save/reload. |
| Vantage coverage | [V0.7 Vantage Coverage `162:2`](https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=162-2) | `/vantage/coverage` | Final | `f357ace` live signed-out return-path and health smoke | Signed-in governed-evidence coverage run. |
| Nucleus firm profile | [V0.7 Nucleus Firm Profile `164:2`](https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=164-2) | `/nucleus/profile` | Final | `5e8e7d1` live signed-out return-path and health smoke | Signed-in safe brand save/reload. |

## Design Contract

Every launch screen was checked against the same desktop pilot contract:

- One visible primary action; secondary actions do not compete with it.
- User input, product action, evidence/trust signal, human boundary, and next step can be understood in one glance.
- AI-generated material has distinct provenance treatment; it is not presented as a final decision.
- A named human retains approvals, signatures, filing, certification, investment decisions, and board action.
- Helpful labels and contextual help support non-technical users without turning the screen into documentation.
- Empty, loading, error, prerequisite, and success states exist where the corresponding route is code-backed.
- All release artefacts are editable 1440x900 desktop-browser Figma frames. Mobile is deliberately a separate release scope.

## V0.7 Cockpit Inventory

The V0.7 cockpit contains sixteen screenshot-reviewed frames:

1. Executive Status (`130:2`)
2. Demo Route Map (`131:2`)
3. Final Screen QA Matrix (`131:70`)
4. Action Board (`131:126`)
5. Pilot Start Intake (`135:2`)
6. Product Brief (`141:2`)
7. Readiness Result Path (`143:2`)
8. Diagnostic Intake Path (`145:2`)
9. Meridian Scope Arc (`160:2`)
10. Vantage Coverage Review (`162:2`)
11. Nucleus Firm Profile (`164:2`)
12. NexusAI Governed Ask (`167:2`)
13. Quorum Board Action Loop (`167:57`)
14. Connector Evidence Intake (`173:2`)
15. Solutions Page (`176:2`)
16. Research Page (`176:63`)

## Pilot Demonstration Order

1. Open `https://pinavia.io`, then use `/solutions` for product-family orientation or `/research` for the measured pilot stance before entering `Start pilot`, diagnostic, or readiness.
2. In a controlled workspace, use `/settings/connectors` to choose one narrow, read-only source and set its policy before ingest.
3. Use the buyer's vertical to select the room: NexusAI, Quorum, Meridian, Vantage, or Nucleus.
4. Lead with the code-backed slice for that room.
5. State the visible authority boundary before discussing future workflow expansion.
6. Use planned deep-route screens only as a product roadmap, never as a live capability claim.

## Non-Design Gates

- Product DNS, Render custom domains, and Clerk redirect/origin configuration remain external. Use apex routes until `docs/PRODUCT_DOMAIN_DNS_CUTOVER_2026-07-26.md` is closed.
- The browser session must be authenticated before signed-in workflow claims are made.
- The staff invite -> accept -> redeem proof depends on `PINAVIA_ADMIN_PRINCIPALS` being configured in Render.

## Release Decision

**Design:** ready for immediate colleague review and a controlled pilot demonstration.

**Live workflow proof:** continue only with claims supported by the route matrix above until the signed-in smoke sequence is completed.
