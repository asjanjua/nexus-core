# Nexus Core

Nexus Core is an executive intelligence command layer for organizations that need faster, evidence-backed decision support across documents and communication streams.

## What Nexus Does
- Ingests enterprise content from document and comms sources.
- Extracts structured signals (risks, opportunities, tasks, decisions, KPIs).
- Maps findings to a lightweight enterprise ontology.
- Produces role-aware outputs for leadership (CEO, COO, CBO/Strategy).
- Preserves provenance so each insight links back to source evidence.

## V1 Product Scope
Nexus Core V1 is designed for paid enterprise pilots (6-8 weeks), not broad self-serve production rollout.

Included in V1:
- Mission control data contracts and templates
- Evidence-backed recommendation pipeline
- Role-oriented brief and dashboard generation
- Human approval gates for consequential outputs

Not included in V1:
- Autonomous writeback to critical source systems
- Full ERP/HRIS/CRM replacement claims
- Multi-tenant SaaS control plane

## System Shape
Nexus Core builds on:
- OpenClaw orchestration for routing and channel access
- AI_Global_Vault for durable knowledge and synthesis
- ConsultingAI specialist agents for domain execution

Nexus adds:
- pilot contracts
- ontology mappings
- executive report artifacts
- governance and approval controls

## Repository Layout
- `docs/` product architecture, scope, decisions, rollout
- `contracts/` schemas and interface contracts
- `templates/` pilot outputs and operating artifacts
- `scripts/` utility scripts for pilot generation and checks

## Install
Nexus can bootstrap OpenClaw automatically if it is not already installed.

Quick install:
```bash
curl -fsSL https://raw.githubusercontent.com/asjanjua/nexus-core/main/scripts/install.sh | bash
```

Repo-local install:
```bash
bash scripts/nexus-bootstrap.sh
```

Then verify:

```bash
$HOME/.nexus/scripts/nexus-doctor.sh
```

Or, after adding `~/.nexus/bin` to your `PATH`:

```bash
nexus doctor
nexus doctor --json
nexus init
nexus init /path/to/workspace
nexus status
nexus setup
nexus help
```

Full guide: [docs/INSTALL.md](docs/INSTALL.md)

## Production Readiness
Current status: **Pilot-ready, not production-ready at scale**.

See [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md) for:
- what is ready
- what is missing
- hardening priorities before production

## Ideal Pilot Buyer
- CEO / COO / Chief Strategy Officer / Managing Director
- Transformation office sponsors who need faster, trusted situational awareness

## License
This project is open-source under the `MIT License` and is free for everyone to use, modify, and share.
