#!/usr/bin/env bash
#
# Validate Postback examples and fixed signing vectors.
#
# Prerequisites: repository Node dependencies and Python 3.
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
pass=0
fail=0

run_schema_gate() {
  echo ""
  echo ">>> Local Ajv v0.2 Postback schema vectors"
  if node "${HERE}/protocol-v0.2-contract-baseline.test.mjs" --postback-only; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
  fi
}

run_reference_verifier() {
  echo ""
  echo ">>> Python stdlib reference verifier for signing and receiver vectors"
  if python3 "${HERE}/verify-postback-v0.2.py"; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
  fi
}

run_schema_gate

# Static contract gate: signature, URL byte preservation, retry and idempotency
# vectors require no Node package, network access, sender, or receiver runtime.
run_reference_verifier

echo ""
echo "================ Summary ================"
echo "passed: ${pass}"
echo "failed: ${fail}"
if [[ ${fail} -gt 0 ]]; then
  exit 1
fi
