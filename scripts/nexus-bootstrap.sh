#!/usr/bin/env bash
set -euo pipefail

NEXUS_HOME="${NEXUS_HOME:-$HOME/.nexus}"
OPENCLAW_WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
OPENCLAW_BIN="${OPENCLAW_BIN:-openclaw}"
NEXUS_SCRIPT_BASE_URL="${NEXUS_SCRIPT_BASE_URL:-}"

say() {
  printf "[nexus] %s\n" "$1"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

install_openclaw_if_missing() {
  if need_cmd "$OPENCLAW_BIN"; then
    say "OpenClaw already available: $(command -v "$OPENCLAW_BIN")"
    return 0
  fi

  say "OpenClaw not found. Installing with npm..."
  if ! need_cmd npm; then
    say "npm is required to auto-install OpenClaw. Install Node.js first."
    exit 1
  fi

  npm install -g openclaw
  if ! need_cmd "$OPENCLAW_BIN"; then
    say "OpenClaw install did not expose '$OPENCLAW_BIN' in PATH."
    say "Try restarting your shell and run this installer again."
    exit 1
  fi
}

write_nexus_config() {
  mkdir -p "$NEXUS_HOME"/{config,logs}
  cat >"$NEXUS_HOME/config/nexus.env" <<EOF
# Nexus runtime defaults
NEXUS_HOME=$NEXUS_HOME
OPENCLAW_WORKSPACE=$OPENCLAW_WORKSPACE
OPENCLAW_BIN=$OPENCLAW_BIN
EOF
  say "Wrote config: $NEXUS_HOME/config/nexus.env"
}

write_helper_command() {
  mkdir -p "$NEXUS_HOME/bin"
  cat >"$NEXUS_HOME/bin/nexus" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

NEXUS_HOME="${NEXUS_HOME:-$HOME/.nexus}"
if [[ -f "$NEXUS_HOME/config/nexus.env" ]]; then
  # shellcheck disable=SC1090
  source "$NEXUS_HOME/config/nexus.env"
fi

case "${1:-}" in
  doctor)
    shift
    exec "$NEXUS_HOME/scripts/nexus-doctor.sh" "$@"
    ;;
  *)
    cat <<USAGE
Nexus command

Usage:
  nexus doctor

This helper bootstraps Nexus around OpenClaw.
USAGE
    ;;
esac
EOF
  chmod +x "$NEXUS_HOME/bin/nexus"
}

install_local_scripts() {
  mkdir -p "$NEXUS_HOME/scripts"
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  install_one() {
    local name="$1"
    local dest="$NEXUS_HOME/scripts/$name"
    if [[ -n "$NEXUS_SCRIPT_BASE_URL" ]] && command -v curl >/dev/null 2>&1; then
      curl -fsSL "${NEXUS_SCRIPT_BASE_URL}/$name" -o "$dest"
    else
      local source="$script_dir/$name"
      if [[ -f "$source" ]]; then
        if [[ "$(cd "$(dirname "$source")" && pwd)/$(basename "$source")" != "$(cd "$(dirname "$dest")" && pwd)/$(basename "$dest")" ]]; then
          cp "$source" "$dest"
        fi
      else
        say "Could not locate $name locally and no remote script base URL provided."
        exit 1
      fi
    fi
    chmod +x "$dest"
  }

  install_one "nexus-doctor.sh"
  install_one "nexus-init.sh"
  install_one "nexus-bootstrap.sh"
  install_one "nexus"
}

install_helper_command() {
  mkdir -p "$NEXUS_HOME/bin"
  cp "$NEXUS_HOME/scripts/nexus" "$NEXUS_HOME/bin/nexus"
  chmod +x "$NEXUS_HOME/bin/nexus"
}

print_path_hint() {
  if [[ ":$PATH:" != *":$NEXUS_HOME/bin:"* ]]; then
    say "Add Nexus helper to PATH:"
    echo "  export PATH=\"$NEXUS_HOME/bin:\$PATH\""
  else
    say "Nexus helper already in PATH."
  fi
}

main() {
  say "Starting Nexus bootstrap..."
  install_openclaw_if_missing
  write_nexus_config
  install_local_scripts
  install_helper_command
  print_path_hint
  say "Bootstrap complete."
  say "Run: $NEXUS_HOME/scripts/nexus-doctor.sh"
}

main "$@"
