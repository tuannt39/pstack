#!/usr/bin/env bash
# bin/check-feature-map.sh — Fail-closed check to prevent router and Feature Map drift
set -euo pipefail

ROUTER_FILE="${1:-web-app/src/routes/AppRouter.tsx}"
FEATURES_DIR="${2:-.omp/skills/verify-platform/features}"

if [[ ! -f "$ROUTER_FILE" ]]; then
  echo "[FAIL-CLOSED] Router file not found at: $ROUTER_FILE" >&2
  exit 2
fi

if [[ ! -d "$FEATURES_DIR" ]]; then
  echo "[FAIL-CLOSED] Features directory not found at: $FEATURES_DIR" >&2
  exit 2
fi

# 1. Extract application routes from router file
mapfile -t CODE_ROUTES < <(grep -oE 'path:\s*["'"'"'](/[^"'"'"']*)["'"'"']' "$ROUTER_FILE" | sed -E "s/path:\s*['\"]([^'\"]+)['\"]/\1/")

if [[ ${#CODE_ROUTES[@]} -eq 0 ]]; then
  echo "[FAIL-CLOSED] No routes extracted from $ROUTER_FILE. Verify parser syntax." >&2
  exit 2
fi

# 2. Check coverage in features/*.md or README.md unmapped list
MISSING_ROUTES=()
for route in "${CODE_ROUTES[@]}"; do
  if ! grep -rqF "$route" "$FEATURES_DIR"; then
    MISSING_ROUTES+=("$route")
  fi
done

if [[ ${#MISSING_ROUTES[@]} -gt 0 ]]; then
  echo "[FEATURE-MAP DRIFT DETECTED] Unmapped routes found in codebase:" >&2
  for r in "${MISSING_ROUTES[@]}"; do
    echo "  - $r" >&2
  done
  echo "REMEDIATION: Add feature documentation under ${FEATURES_DIR}/ or list under Unmapped in README.md." >&2
  exit 1
fi

# 3. Check 4 mandatory H2 headers
REQUIRED_SECTIONS=(
  "## 1. User POV & Entry Points"
  "## 2. Stable Handles & Selectors"
  "## 3. Driving Recipe"
  "## 4. Gotchas & Side-Effect Proofs"
)

for md_file in "${FEATURES_DIR}"/*.md; do
  [[ "$(basename "$md_file")" == "README.md" ]] && continue
  for section in "${REQUIRED_SECTIONS[@]}"; do
    if ! grep -qF "$section" "$md_file"; then
      echo "[SCHEMA VIOLATION] File $md_file is missing required section: '$section'" >&2
      exit 1
    fi
  done
done

echo "[FEATURE-MAP OK] All ${#CODE_ROUTES[@]} routes and feature specs are in sync."
