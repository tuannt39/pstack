#!/usr/bin/env bash
# Validate the native Antigravity plugin manifest, layout, and strict compliance.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "test-plugin-manifest: checking pstack Antigravity plugin manifest and layout"

fail() { echo "FAIL: $*" >&2; exit 1; }

MANIFEST="$REPO_ROOT/plugin.json"
RULES="$REPO_ROOT/rules/AGENTS.md"
MARKETPLACE="$REPO_ROOT/.agents/plugins/marketplace.json"

[ -f "$MANIFEST" ] || fail "manifest missing at $MANIFEST"
[ -f "$RULES" ] || fail "rules missing at $RULES"
[ -f "$MARKETPLACE" ] || fail "marketplace manifest missing at $MARKETPLACE"

# Verify required fields via node
node - "$REPO_ROOT" <<'JS'
const fs = require('fs');
const path = require('path');
const root = process.argv[2];

const manifestPath = path.join(root, 'plugin.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const required = ['name', 'displayName', 'version', 'description', 'suggestedPrompts', 'author', 'homepage', 'repository'];
for (const field of required) {
  if (!manifest[field]) {
    console.error(`Missing manifest field: ${field}`);
    process.exit(1);
  }
}

if (manifest.name !== 'pstack') {
  console.error(`Expected name 'pstack', got '${manifest.name}'`);
  process.exit(1);
}

if (manifest.description.length > 160) {
  console.error(`Description too long (${manifest.description.length} > 160)`);
  process.exit(1);
}

if (!Array.isArray(manifest.suggestedPrompts) || manifest.suggestedPrompts.length === 0) {
  console.error('suggestedPrompts must be a non-empty array');
  process.exit(1);
}
JS

# Check agy plugin validate if agy is installed
if command -v agy >/dev/null 2>&1; then
  echo "Running agy plugin validate --strict..."
  output="$(agy plugin validate "$REPO_ROOT" --strict 2>&1)" || {
    echo "$output" >&2
    fail "agy plugin validate --strict failed"
  }
  echo "$output"
  grep -qi 'Validation passed' <<<"$output" || fail "Validation did not pass"
else
  echo "SKIP: agy not on PATH; skipping live CLI validation"
fi

echo "PASS: Antigravity plugin manifest and layout valid"
