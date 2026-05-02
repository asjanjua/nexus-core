# NexusAI V1 Security and Data Handling

## Data Principles
- Evidence first: every visible insight must reference provenance.
- Least exposure: restricted evidence is masked outside Mission Control detail view.
- Human gate: high-impact recommendations require explicit approval.

## Surfaces
- Mission Control is primary surface.
- Slack is a secondary summary/notification surface.
- Slack payloads exclude restricted or unprovenanced content.

## Audit
- Ingestion actions emit append-only audit events.
- Recommendation status changes emit actor-tagged events.
- Slack policy blocks are logged for traceability.

## Pilot Security Defaults
- Mention-based Slack interactions only.
- Workspace scoping on ask/retrieval.
- Quarantine for low-confidence or missing-provenance records.

