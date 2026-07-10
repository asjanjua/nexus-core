#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RESULTS_DIR="$ROOT_DIR/docs/lmstudio/results"
OUT="$RESULTS_DIR/moe-probe.txt"

mkdir -p "$RESULTS_DIR"

declare -a CANDIDATES=(
  "qwen/qwen3-30b-a3b-2507"
  "qwen/qwen3-coder-30b-a3b-instruct"
  "zai-org/glm-4.7-flash"
  "nvidia/nemotron-3-nano"
)

{
  echo "LM Studio MoE Probe"
  echo "Generated: $(date -Iseconds)"
  echo
  echo "Runtime:"
  lms runtime ls || true
  echo
  echo "Server:"
  lms server status || true
  echo
  echo "Candidates:"
  for key in "${CANDIDATES[@]}"; do
    echo "- $key"
  done
  echo
  echo "Estimate-only checks:"
  for key in "${CANDIDATES[@]}"; do
    echo "-----"
    echo "MODEL: $key"
    (lms load --estimate-only -y "$key" 2>&1 || true)
    echo
  done
} > "$OUT"

echo "Wrote $OUT"
