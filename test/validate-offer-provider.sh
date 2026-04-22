#!/usr/bin/env bash
#
# Validate OfferProvider API examples against their JSON Schemas.
#
# Prerequisites: Node.js (for npx) and network access (ajv-cli is fetched
# via `npx --yes`). No permanent install needed.
#
# Usage:
#   bash schema/test/validate-offer-provider.sh
#
# Exit codes:
#   0 = all examples validate successfully
#   1 = at least one example failed validation (or tooling error)
#
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_DIR="$(cd "${HERE}/.." && pwd)/json-schema"
EXAMPLES_DIR="$(cd "${HERE}/../.." && pwd)/examples/http/offer-provider"

REQUEST_SCHEMA="${SCHEMA_DIR}/offer-provider-request-v0.1.json"
RESPONSE_SCHEMA="${SCHEMA_DIR}/offer-provider-response-v0.1.json"

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

# Request schema ← basic + full examples
run "basic-query.json against request schema"        "${REQUEST_SCHEMA}"  "${EXAMPLES_DIR}/basic-query.json"
run "full-query-with-filter.json against request schema" "${REQUEST_SCHEMA}" "${EXAMPLES_DIR}/full-query-with-filter.json"

# Response schema ← success and error envelopes both validate via oneOf
run "success envelope (offer-response.json) against response schema" \
    "${RESPONSE_SCHEMA}" \
    "$(cd "${HERE}/../.." && pwd)/examples/http/offer-response.json"
run "error-bad-request.json against response schema" \
    "${RESPONSE_SCHEMA}" \
    "${EXAMPLES_DIR}/error-bad-request.json"

echo ""
echo "================ Summary ================"
echo "passed: ${pass}"
echo "failed: ${fail}"
if [[ ${fail} -gt 0 ]]; then
  exit 1
fi
