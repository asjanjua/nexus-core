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

  local tmp_bootstrap tmp_doctor
  tmpdir="$(mktemp -d)"
  tmp_bootstrap="$tmpdir/nexus-bootstrap.sh"
  tmp_doctor="$tmpdir/nexus-doctor.sh"
  cleanup() {
    rm -rf "${tmpdir:-}"
  }
  trap cleanup EXIT

  say "Downloading bootstrap script..."
  curl -fsSL "$BOOTSTRAP_URL" -o "$tmp_bootstrap"
  curl -fsSL "$DOCTOR_URL" -o "$tmp_doctor"
  chmod +x "$tmp_bootstrap" "$tmp_doctor"

  say "Running Nexus bootstrap..."
  bash "$tmp_bootstrap"

  say "Install finished."
  say "Run: $HOME/.nexus/scripts/nexus-doctor.sh"
}

main "$@"
