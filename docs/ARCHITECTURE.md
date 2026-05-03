# Nexus Core Architecture (V1)

## Objective
Provide executive intelligence outputs that are evidence-backed, role-aware, and operationally usable.

## Core Layers
1. Source ingestion layer
   - documents, meeting notes, selected communication channels
2. Structuring layer
   - extraction, confidence scoring, provenance mapping, quarantine
3. Ontology layer
   - Company, Department, Role, KPI, Risk, Opportunity, Recommendation, Decision
4. Agent orchestration layer
   - manager routing + specialist execution + quality gates
5. Delivery layer
   - executive briefs, dashboards, recommendation registers, decision memos

## Output Contract Principles
- Every high-impact insight must link to evidence.
- Confidence and freshness metadata are mandatory.
- Low-confidence/unprovenanced inputs do not flow into executive outputs.
- Human approval gates remain enabled for consequential recommendations.

## Integration Boundary
Nexus Core does not replace upstream systems in V1.
It sits as a decision-support layer above existing sources and workflows.

## V1 Infrastructure Position

- Mission Control stays on Vercel for V1 and pilot delivery.
- Clerk remains the browser auth and organization-tenancy layer.
- Postgres plus `pgvector` remains the primary evidence and retrieval store.
- Cloudflare is adopted selectively: AI Gateway first, R2 next, Queues later if scale requires it.
- D1 and Vectorize are out of scope for V1.
