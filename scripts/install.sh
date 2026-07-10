#!/usr/bin/env bash
set -euo pipefail

REPO="${NEXUS_REPO:-asjanjua/nexus-core}"
REF="${NEXUS_REF:-main}"
BOOTSTRAP_URL="https://raw.githubusercontent.com/${REPO}/${REF}/scripts/nexus-bootstrap.sh"
DOCTOR_URL="https://raw.githubusercontent.com/${REPO}/${REF}/scripts/nexus-doctor.sh"

say() {
  printf "[nexus-install] %s\n" "$1"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

main() {
  say "Installing Nexus from ${REPO}@${REF}"

  if ! need_cmd curl; then
    say "curl is required but not found."
    exit 1
  fi

  local tmp_bootstrap tmp_doctor tmp_nexus tmp_init
  tmpdir="$(mktemp -d)"
  tmp_bootstrap="$tmpdir/nexus-bootstrap.sh"
  tmp_doctor="$tmpdir/nexus-doctor.sh"
  tmp_nexus="$tmpdir/nexus"
  tmp_init="$tmpdir/nexus-init.sh"
  cleanup() {
    rm -rf "${tmpdir:-}"
  }
  trap cleanup EXIT

  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  say "Preparing installer payload..."
  if [[ -f "$script_dir/nexus-bootstrap.sh" && -f "$script_dir/nexus-doctor.sh" && -f "$script_dir/nexus" && -f "$script_dir/nexus-init.sh" ]]; then
    cp "$script_dir/nexus-bootstrap.sh" "$tmp_bootstrap"
    cp "$script_dir/nexus-doctor.sh" "$tmp_doctor"
    cp "$script_dir/nexus" "$tmp_nexus"
    cp "$script_dir/nexus-init.sh" "$tmp_init"
  else
    say "Downloading bootstrap script..."
    curl -fsSL "$BOOTSTRAP_URL" -o "$tmp_bootstrap"
    curl -fsSL "$DOCTOR_URL" -o "$tmp_doctor"
    curl -fsSL "https://raw.githubusercontent.com/${REPO}/${REF}/scripts/nexus-init.sh" -o "$tmp_init"
    cat >"$tmp_nexus" <<'EOF'
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
  init)
    shift
    exec "$NEXUS_HOME/scripts/nexus-init.sh" "$@"
    ;;
  status)
    shift || true
    echo "Nexus status"
    echo "NEXUS_HOME: $NEXUS_HOME"
    if [[ -f "$NEXUS_HOME/config/nexus.env" ]]; then
      echo "config: present"
    else
      echo "config: missing"
    fi
    if command -v openclaw >/dev/null 2>&1; then
      echo "openclaw: $(command -v openclaw)"
    else
      echo "openclaw: missing"
    fi
    exec "$NEXUS_HOME/scripts/nexus-doctor.sh" "$@"
    ;;
  setup)
    shift || true
    exec "$NEXUS_HOME/scripts/nexus-bootstrap.sh" "$@"
    ;;
  help|-h|--help|"")
    cat <<USAGE
Nexus command

Usage:
  nexus doctor
  nexus init [target]
  nexus status
  nexus setup
  nexus help

Commands:
  doctor  Run health checks for the installed Nexus/OpenClaw stack.
  init    Scaffold a new Nexus workspace in the current directory or target path.
  status  Show a short runtime summary and then run doctor checks.
  setup   Rerun the Nexus bootstrap.
  help    Show this help.

This helper bootstraps Nexus around OpenClaw.
USAGE
    ;;
  *)
    exec "$NEXUS_HOME/scripts/nexus" help
    ;;
esac
EOF
  fi
  chmod +x "$tmp_bootstrap" "$tmp_doctor" "$tmp_nexus" "$tmp_init"

  say "Running Nexus bootstrap..."
  bash "$tmp_bootstrap"

  say "Install finished."
  say "Run: $HOME/.nexus/scripts/nexus-doctor.sh"
}

main "$@"
