# Production Readiness

## Current Verdict
Nexus Core is ready for **paid pilot deployment** and design-partner use.
It is **not yet production-ready** for broad multi-tenant enterprise scale.

## What Is Ready
- Core product framing and scope boundaries
- Evidence-first output philosophy (provenance and confidence)
- Role-based executive output templates
- Governance stance (human approval required for high-impact actions)
- Additive architecture — sits on top of existing systems, does not replace them

## What Is Not Yet Ready
- Full multi-tenant control plane
- Formal RBAC/SSO implementation package
- End-to-end connector action writeback controls for enterprise systems
- Production-grade observability SLAs and incident automation
- Certification posture (SOC2/ISO/compliance package)
- Formal enterprise SSO/RBAC package beyond the current Clerk/workspace foundation

## Minimum Hardening Before Production
1. Identity and access hardening:
   - SSO
   - RBAC
   - strict workspace isolation
2. Security and governance:
   - secret management policy
   - audit trail completeness
   - data retention/deletion controls
3. Reliability and scale:
   - connector health monitoring
   - retry/backoff and dead-letter queues
   - explicit SLO/SLA baseline
4. Model risk and quality:
   - benchmark suite for output quality and routing
   - confidence-gate enforcement audits
   - hallucination and stale-evidence guardrails
5. Phase 1 operational readiness:
   - `/api/health` must return `status=ok`
   - production migrations must be applied
   - `npm audit` must have no high or critical vulnerabilities
   - browser smoke tests must pass for onboarding, upload, approval, dashboard, and Ask

See `docs/PRODUCTION_HEALTH_CHECKLIST.md` for the current operator checklist.

## Recommended Deployment Path
1. Paid pilot with constrained scope (6-8 weeks)
2. Measure impact (time-to-brief, decision clarity, recommendation adoption)
3. Expand connector coverage and governance controls
4. Production rollout only after hardening gates pass
