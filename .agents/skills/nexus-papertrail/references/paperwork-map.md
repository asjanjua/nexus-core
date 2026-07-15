# Paperwork Map

## Central documents

| Document | Role | Update when |
| --- | --- | --- |
| `BACKLOG.md` | Priority, dependencies, status map | Work changes what should happen or what blocks it |
| `TASKS.md` | Detailed execution checklist | A task advances, completes, splits, or is proven stale |
| `HANDOVER.md` | Append-only chronological state | A meaningful slice, failure, deploy, or handoff occurs |
| `CHANGELOG.md` | User-visible product history | Behavior visible to users/operators changes |
| `CONFIRM_NOW.md` | Short user-decision/action sheet | Work genuinely needs credentials, account action, or a decision |

## Specialized evidence

- Release/deploy evidence: `docs/RELEASE_GATE_*.md`, `docs/PRODUCTION_HEALTH_CHECKLIST.md`, `docs/RENDER_DEPLOY.md`, `CUTOVER.md`
- Architecture decisions: `docs/ARCHITECTURE.md`, `docs/ARCH_REVIEW_2026-07-10_ADOPTION.md`, `docs/API_SERVICE_BOUNDARY_DECISION.md`
- Security controls: `docs/SECURITY_REVIEW.md`, `docs/ENGINEERING_GUARDRAILS.md`, `docs/DR_RUNBOOK.md`
- UI/versioned workflows: `docs/UI_BASELINE_VERSIONING.md` and the relevant Quorum, Meridian, Vantage, onboarding, or workflow specification

## Evidence format

Record:

- date/time and timezone;
- local branch and HEAD;
- pushed commit when different;
- deployed SHA when verified;
- command or user flow;
- result and failure details;
- account/workspace context without secrets or personal data;
- what remains unverified;
- next exact action and owner.

## Multi-agent rule

Subagents write unique `docs/agent-runs/...` ledgers. The integration agent consolidates settled facts into central documents. This avoids concurrent conflicts and prevents unfinished agent notes from becoming product truth.
