# Nucleus PRD — Advisory Methodology Packs

Status: bounded advisory product-room pilot pattern | Owner: Product + Partner Success | Updated: 2026-08-02

## 1. Executive summary

1. Nucleus serves consulting firms and advisory partners who need governed AI-enabled delivery.
2. Its value moment is a client-ready, evidence-backed methodology-pack draft reviewed by the partner.
3. It wins by keeping trusted workflow controls fixed while permitting a limited brand layer.
4. Its primary lane is business/advisory; regulated enterprise is available when the client requires it.
5. It competes with manual slide/doc production, analyst teams, and generic white-label AI tools.
6. `/nucleus`, `/nucleus/profile`, and `/nucleus/reviewer-console` are code-backed protected routes (`HANDOVER.md`).
7. `whiteLabelBrand` exists in workspace settings and only permits logo/accent/font (`db/schema.ts`).
8. Signed-in brand save/reload and client-review smoke remain required.
9. It reuses NexusAI tenancy, auth, evidence, routing, audit, review, and billing sequence.
10. It owns methodology-pack configuration and constrained client-brand presentation—not a separate platform.

## 2. Problem and user

Partners face client pressure to deliver AI-enabled insight but cannot safely build a platform per engagement. The champion is a practice/delivery lead; the economic buyer is managing partner. They fear a generic output, leaked client data, inconsistent methodology, and loss of accountable partner review.

## 3. Positioning and wedge

First pilot: partner profile → bounded methodology pack → approved client evidence → source-backed draft → partner review → client preview → human delivery. Nucleus does not replace a firm’s practice management system, publish deliverables, communicate with clients, or make professional/legal/financial commitments.

## 4. Scope

| Horizon | Scope |
|---|---|
| V-now | `/nucleus`, `/nucleus/profile`, `/nucleus/reviewer-console`; `whiteLabelBrand`; engagement workflow registry (`lib/nucleus-engagement-workflow.ts`) |
| V-pilot | NEW: methodology-pack definition/version, client engagement boundary, partner reviewer, client-preview approval record |
| V-launch+1 | NEW: reusable pack catalogue and client-domain deployment only after contractual/security proof |

## 5. Journeys

Readiness/Nucleus landing → advisory lane → partner confirms firm profile and a named client sponsor/reviewer → approved client evidence and methodology pack → cited draft → partner review → client preview/delivery by human → scorecard → expand/stop. No evidence produces a request list; low signal stays provisional. No reviewer acceptance blocks pilot readiness. Rejected draft returns to the delivery lead; stopped engagements are recorded, not automatically sent or deleted.

## 6. Data and governance

Core schema covers current state; `workspace_settings.whiteLabelBrand` is the implemented constrained brand object. NEW for pilot: `methodology_pack`, version, engagement boundary, client-preview decision, and allowed branding domain. Client material is confidential/restricted. White-label may change logo/accent/font only; core status colors, trust patterns, approvals, and audit cannot be re-skinned (`paperwork/Pinavia_Brand_and_Domain_Architecture.md`).

## 7. AI surfaces

Pack drafting uses evidence retrieval plus sponsor-facing recommendation/decision policy and configured fallback. AI may structure, summarize, compare, cite, and prepare a partner-review draft; it must not impersonate the firm, publish, send, promise an outcome, or make professional advice/commitments. Trusted promotion requires cited claims, partner approval, and client-specific authority check. Baseline unmeasured — Partner Success owner, 2026-08-16.

## 8. Commercial model

Entry: partner discovery/readiness. Pilot: one firm, methodology pack, and client engagement via SOW. Expansion: recurring packs/client cohorts after partner scorecard proof. Paperwork adds partner/client roles, brand limits, IP/data handling, review gate, and delivery metric. Nucleus does not expose self-serve checkout before Stripe is approved.

## 9. Metrics

Shared funnel plus profile-save completion, pack-to-review time, source coverage, partner acceptance, client-preview conversion, and reuse per methodology pack. Baselines unmeasured.

## 10. Risks and open decisions

Map vs territory: profile route and brand persistence are implemented; a signed-in save/reload and client-review loop are not operationally verified. Risks: white-label scope creep, client-data boundary, methodology quality, brand misuse, and partners bypassing review. Mitigate with fixed trust layer, engagement scope, pack versioning, brand validation, and identity-bound reviewer gate. OPEN: first partner/design firm and IP terms by 2026-08-16.

## 11. Release gates

Demo shows a safe test brand and clear partner approval. Launch describes a governed advisory delivery pilot only. Pilot signing requires firm/client boundary, pack scope, accepted reviewer, SOW, scorecard, and billing trigger.

## Immediate next steps

1. Recruit one advisory partner.
2. Complete profile save/reload smoke using a safe test brand.
3. Define methodology-pack/version metadata.
4. Validate a partner-review draft.
5. Agree IP/data clauses for the SOW.

## Partner update

Nucleus lets advisory firms deliver source-backed methodology packs while keeping a partner in control. Its implemented profile route supports only a constrained brand layer; core trust mechanics remain fixed. It is not a separate white-label platform or autonomous delivery engine. The first pilot is one firm, one pack, and one client boundary with a named partner reviewer. The next gate is a signed-in brand-save and client-review proof. Client data stays governed by the shared NexusAI core. No output is sent or published automatically. Expansion follows partner acceptance and reusable-pack evidence. Commercialization begins with a pilot SOW, not checkout.
