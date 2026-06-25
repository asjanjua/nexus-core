# NexusAI V1 Security and Data Handling

## Data Principles
- Evidence first: every visible insight must reference provenance.
- Least exposure: restricted evidence is masked outside Mission Control detail view.
- Human gate: high-impact recommendations require explicit approval.
- Portable memory with controls: Knowledge Workspace notes can be exported/imported as Markdown, but workspace scoping, sensitivity, and typed Nexus refs remain part of the governed record.

## Surfaces
- Mission Control is primary surface.
- Knowledge Workspace is a governed Mission Control surface for markdown notes, backlinks, graph traversal, local sync, and MCP memory tools.
- Slack is a secondary summary/notification surface.
- Slack payloads exclude restricted or unprovenanced content.

## Audit
- Ingestion actions emit append-only audit events.
- Recommendation status changes emit actor-tagged events.
- Slack policy blocks are logged for traceability.
- Knowledge note create/update events, import/export/sync events, and sync failures are recorded in the database/audit path where implemented.

## Pilot Security Defaults
- Mention-based Slack interactions only.
- Workspace scoping on ask/retrieval.
- Quarantine for low-confidence or missing-provenance records.
- Knowledge APIs require Clerk session auth or scoped bearer tokens with `read:knowledge` / `write:knowledge`.
- Ask returns `noteRefs` separately from `evidenceRefs` so operators can distinguish user-authored notes from source evidence.

## Local Vault Sync

Live local folder sync is opt-in and should remain disabled in hosted/Render deployments.

Environment controls:

```bash
NEXUS_VAULT_SYNC=disabled
NEXUS_LOCAL_VAULT_PATH=/absolute/path/to/vault
```

Modes:

- `disabled`: default and hosted-safe.
- `readonly`: imports Markdown file changes into Nexus; does not write files back.
- `bidirectional`: imports file changes and writes Nexus note saves back to Markdown.

Safety controls:

- the vault path must be absolute
- only `.md` files are processed
- path traversal is rejected
- hidden system paths are rejected except `.nexus` and `.conflicts`
- symlinks outside the vault are rejected
- oversized files are rejected
- conflicts preserve the local prior content under `.conflicts/`

Operators should use local sync only on trusted local/dev/desktop/self-hosted deployments where the filesystem path is controlled by the workspace owner.

## MCP Memory Tools

The Knowledge MCP wrapper calls the same authenticated internal APIs as Mission Control.

Required environment:

```bash
NEXUS_MCP_BASE_URL=http://localhost:3000
NEXUS_MCP_BEARER_TOKEN=<scoped bearer token>
```

The token should carry only the needed scopes, usually `read:knowledge` and `write:knowledge`.
