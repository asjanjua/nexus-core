#!/usr/bin/env bash
set -euo pipefail

REPO="${NEXUS_REPO:-asjanjua/nexus-core}"
REF="${NEXUS_REF:-main}"
BOOTSTRAP_URL="https://raw.githubusercontent.com/${REPO}/${REF}/scripts/nexus-bootstrap.sh"
SCRIPT_BASE_URL="https://raw.githubusercontent.com/${REPO}/${REF}/scripts"

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

  local tmp
  tmp="$(mktemp)"
  trap 'rm -f "$tmp"' EXIT

  say "Downloading bootstrap script..."
  curl -fsSL "$BOOTSTRAP_URL" -o "$tmp"
  chmod +x "$tmp"

  say "Running Nexus bootstrap..."
  NEXUS_SCRIPT_BASE_URL="$SCRIPT_BASE_URL" bash "$tmp"

  say "Install finished."
  say "Run: $HOME/.nexus/scripts/nexus-doctor.sh"
}

main "$@"
