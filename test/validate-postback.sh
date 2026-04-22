#!/usr/bin/env bash
#
# Validate Postback examples against their JSON Schemas.
#
# Prerequisites: Node.js (for npx) and network access (ajv-cli is fetched
# via `npx --yes`). No permanent install needed.
#
# Usage:
#   bash schema/test/validate-postback.sh
#
# Exit codes:
#   0 = all examples validate successfully
#   1 = at least one example failed validation (or tooling error)
#
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_DIR="$(cd "${HERE}/.." && pwd)/json-schema"
EXAMPLES_DIR="$(cd "${HERE}/../.." && pwd)/examples/http/postback"

AGENT_SCHEMA="${SCHEMA_DIR}/postback-agent-payload-v0.1.json"
PARTNER_SCHEMA="${SCHEMA_DIR}/postback-partner-payload-v0.1.json"

pass=0
fail=0

run() {
  local label="$1"
  local schema="$2"
  local data="$3"
  echo ""
  echo ">>> ${label}"
  echo "    schema: ${schema}"
  echo "    data:   ${data}"
  if npx --yes --package=ajv-cli@5 --package=ajv-formats@3 -- \
       ajv validate \
       --spec=draft2020 \
       -c ajv-formats \
       --strict-types=false \
       --all-errors \
       -s "${schema}" \
       -d "${data}"; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
  fi
}

# Part A: Agent payload schema
run "basic-conversion.json against agent payload schema" \
    "${AGENT_SCHEMA}" \
    "${EXAMPLES_DIR}/agent/basic-conversion.json"

# Part B: Partner payload schema (conversion)
run "conversion.json against partner payload schema" \
    "${PARTNER_SCHEMA}" \
    "${EXAMPLES_DIR}/partner/conversion.json"

# Part B: Partner payload schema (refund)
run "refund.json against partner payload schema" \
    "${PARTNER_SCHEMA}" \
    "${EXAMPLES_DIR}/partner/refund.json"

echo ""
echo "================ Summary ================"
echo "passed: ${pass}"
echo "failed: ${fail}"
if [[ ${fail} -gt 0 ]]; then
  exit 1
fi
