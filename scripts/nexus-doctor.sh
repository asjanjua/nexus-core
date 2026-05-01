#!/usr/bin/env bash
set -euo pipefail

JSON_OUTPUT=0
if [[ "${1:-}" == "--json" ]]; then
  JSON_OUTPUT=1
  shift
fi

NEXUS_HOME="${NEXUS_HOME:-$HOME/.nexus}"
OPENCLAW_BIN="${OPENCLAW_BIN:-openclaw}"

STATUS="ok"
CHECKS=()

escape_json() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  printf '%s' "$s"
}

record() {
  local level="$1"
  local message="$2"
  CHECKS+=("$level:$message")
  if [[ "$level" == "fail" ]]; then
    STATUS="fail"
  elif [[ "$level" == "warn" && "$STATUS" == "ok" ]]; then
    STATUS="warn"
  fi
  if [[ "$JSON_OUTPUT" -eq 0 ]]; then
    printf "[%s] %s\n" "$level" "$message"
  fi
}

check_cmd() {
  local c="$1"
  if command -v "$c" >/dev/null 2>&1; then
    record ok "$c: $(command -v "$c")"
  else
    record fail "$c not found in PATH"
  fi
}

main() {
  check_cmd "$OPENCLAW_BIN"
  check_cmd git
  check_cmd bash

  if [[ -f "$NEXUS_HOME/config/nexus.env" ]]; then
    record ok "config present: $NEXUS_HOME/config/nexus.env"
  else
    record warn "missing config: $NEXUS_HOME/config/nexus.env (run bootstrap)"
  fi

  if [[ -x "$NEXUS_HOME/scripts/nexus-doctor.sh" ]]; then
    record ok "nexus scripts installed: $NEXUS_HOME/scripts"
  else
    record warn "nexus scripts not installed in $NEXUS_HOME/scripts"
  fi

  if "$OPENCLAW_BIN" --help >/dev/null 2>&1; then
    record ok "OpenClaw command responds"
  else
    record warn "OpenClaw command did not respond to --help"
  fi

  if [[ "$JSON_OUTPUT" -eq 1 ]]; then
    printf '{"component":"nexus-doctor","status":"%s","checks":[' "$(escape_json "$STATUS")"
    local first=1
    local entry level message
    for entry in "${CHECKS[@]}"; do
      level="${entry%%:*}"
      message="${entry#*:}"
      if [[ "$first" -eq 0 ]]; then
        printf ','
      fi
      first=0
      printf '{"status":"%s","message":"%s"}' "$(escape_json "$level")" "$(escape_json "$message")"
    done
    printf ']}\n'
  fi

  [[ "$STATUS" != "fail" ]]
}

main "$@"

