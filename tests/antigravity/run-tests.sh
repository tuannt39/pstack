#!/usr/bin/env bash
# Run all Antigravity (agy) integration tests for pstack.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Antigravity (agy) integration tests ==="

for t in "$SCRIPT_DIR"/test-*.sh; do
  echo
  echo ">>> $t"
  bash "$t"
done

echo
echo "=== All Antigravity tests passed ==="
