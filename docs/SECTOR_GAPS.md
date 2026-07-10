# Sector Gaps and Custom Company Handling

NexusAI V1 ships with eight broad sectors because the first pilot motion needs clarity more than exhaustive taxonomy coverage.

Sector handling should serve the buyer-lane strategy, not replace it. When sector fit is uncertain, route the user through readiness, company archetype, first workflow selection, and governed value proof.

## Current Gap List

- Hospitality and tourism
- Logistics and transport
- Media and publishing
- Energy and utilities
- Government and public sector
- NGO and non-profit
- Agriculture
- Sports and entertainment

## V1 Handling

- If a company does not fit the eight-sector list, onboarding should use the free-text company description path.
- The archetype signal becomes the primary driver for role suggestion: `corporate`, `startup_scaleup`, `sme_physical`, `digital_native`, or `professional_practice`.
- The role suggestion engine already works without a known sector when the archetype and description contain enough operating signals.
- The UI should show the closest sector only when confidence is reasonable; otherwise, use archetype-first language and avoid pretending the sector fit is exact.

## Expansion Trigger

Add a new sector when multiple workspaces cluster around the same unsupported company type and the unsupported type changes documents, KPIs, risks, or agent responsibilities enough to justify a first-class taxonomy entry.

## Buyer-Lane Tie-In

- Evaluator / SME: keep unsupported-sector language simple and route to readiness guidance.
- SME self-serve: use archetype-first onboarding and one owner workflow.
- Business / advisory: use workflow scorer output to choose the pilot before adding sector taxonomy.
- Regulated enterprise: prioritize governance, data boundaries, and approval language even when the sector label is imperfect.
