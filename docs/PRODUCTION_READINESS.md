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
- Knowledge Workspace for pilot use, including markdown notes, backlinks, graph, import/export, Ask note refs, and MCP wrapper

## What Is Not Yet Ready
- Full multi-tenant control plane
- Formal RBAC/SSO implementation package
- End-to-end connector action writeback controls for enterprise systems
- Production-grade observability SLAs and incident automation
- Certification posture (SOC2/ISO/compliance package)
- Formal enterprise SSO/RBAC package beyond the current Clerk/workspace foundation
- Live local folder sync in hosted production. Keep `NEXUS_VAULT_SYNC=disabled` on Render/hosted deployments unless running a controlled local/desktop/self-hosted environment.

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
   - migration `0026_knowledge_workspace.sql` must be applied before enabling `/knowledge` in a database-backed environment
   - `npm audit` must have no high or critical vulnerabilities
   - browser smoke tests must pass for onboarding, upload, approval, dashboard, Ask, and Knowledge Workspace
   - local sync must remain disabled in hosted production unless explicitly approved for a self-hosted/local deployment

See `docs/PRODUCTION_HEALTH_CHECKLIST.md` for the current operator checklist.

## Recommended Deployment Path
1. Paid pilot with constrained scope (6-8 weeks)
2. Measure impact (time-to-brief, decision clarity, recommendation adoption)
3. Expand connector coverage and governance controls
4. Expand Knowledge Workspace automations only after pilot usage proves note/graph/search behavior
5. Production rollout only after hardening gates pass
