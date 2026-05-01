#!/usr/bin/env bash
set -euo pipefail

NEXUS_HOME="${NEXUS_HOME:-$HOME/.nexus}"
OPENCLAW_BIN="${OPENCLAW_BIN:-openclaw}"

ok() {
  printf "[ok] %s\n" "$1"
}

warn() {
  printf "[warn] %s\n" "$1"
}

fail() {
  printf "[fail] %s\n" "$1"
  exit 1
}

check_cmd() {
  local c="$1"
  if command -v "$c" >/dev/null 2>&1; then
    ok "$c: $(command -v "$c")"
  else
    fail "$c not found in PATH"
  fi
}

main() {
  check_cmd "$OPENCLAW_BIN"
  check_cmd git
  check_cmd bash

  if [[ -f "$NEXUS_HOME/config/nexus.env" ]]; then
    ok "config present: $NEXUS_HOME/config/nexus.env"
  else
    warn "missing config: $NEXUS_HOME/config/nexus.env (run bootstrap)"
  fi

  if [[ -x "$NEXUS_HOME/scripts/nexus-doctor.sh" ]]; then
    ok "nexus scripts installed: $NEXUS_HOME/scripts"
  else
    warn "nexus scripts not installed in $NEXUS_HOME/scripts"
  fi

  if "$OPENCLAW_BIN" --help >/dev/null 2>&1; then
    ok "OpenClaw command responds"
  else
    warn "OpenClaw command did not respond to --help"
  fi
}

main "$@"

