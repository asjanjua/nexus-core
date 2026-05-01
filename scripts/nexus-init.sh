#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-$(pwd)/nexus-workspace}"

say() {
  printf "[nexus-init] %s\n" "$1"
}

main() {
  mkdir -p "$TARGET"
  mkdir -p "$TARGET"/{config,docs,contracts,templates,sources,outputs}

  if [[ ! -f "$TARGET/README.md" ]]; then
    cat >"$TARGET/README.md" <<'EOF'
# Nexus Workspace

This workspace is a Nexus pilot scaffold.

## Layout
- `config/` pilot configuration and source maps
- `docs/` operating docs and executive briefs
- `contracts/` interface and evidence contracts
- `templates/` reusable output templates
- `sources/` optional local source bundles
- `outputs/` generated dashboards and artifacts
EOF
  fi

  if [[ ! -f "$TARGET/docs/GETTING_STARTED.md" ]]; then
    cat >"$TARGET/docs/GETTING_STARTED.md" <<'EOF'
# Getting Started

1. Add your source folders.
2. Configure allowed users and source policy.
3. Run Nexus ingestion and dashboard generation.
EOF
  fi

  if [[ ! -f "$TARGET/config/nexus.workspace.example.json" ]]; then
    cat >"$TARGET/config/nexus.workspace.example.json" <<'EOF'
{
  "workspace_name": "nexus-workspace",
  "source_bundle": "docs+comms",
  "role_dashboards": ["CEO", "COO", "CBO"]
}
EOF
  fi

  say "Initialized Nexus workspace at $TARGET"
}

main "$@"

