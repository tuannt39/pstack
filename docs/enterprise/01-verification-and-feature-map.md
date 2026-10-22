# Enterprise Blueprint 01: Verification Skill & Automated Feature Map

In the pstack methodology by Lauren Tan, a **Verification Skill** is the foundational boundary that separates amateur AI coding from production automation. It frees engineers from acting as "human relays" who manually click through apps to test an agent's changes.

## 1. The 6 Mandatory Sections of a Verification Skill

Every generated or maintained verification skill (`.claude/skills/verify-<app>/SKILL.md` or `.cursor/skills/verify-<app>/SKILL.md` or `.omp/skills/verify-<app>/SKILL.md`) must interview the codebase directly ("interview the repo, not the human") and contain these 6 sections:

1. **Launch (Isolated startup):**
   - Exact command to boot the app from clean state with migrations and seed data.
   - *Rule:* Ready means fully operational, not merely that a socket opened.
2. **Doctor (Read-only pre-flight check):**
   - Checks: Is the process alive? Is the Git SHA matching HEAD? Are DB connections sound?
   - Agents must run Doctor before driving and immediately after any abnormal failure.
3. **Drive (Programmatic UI/API recipe):**
   - Recipes using Playwright, CDP (Chrome DevTools Protocol), PTY/tmux, or HTTP client.
   - Selectors must use stable handles (`data-testid`, ARIA labels, semantic routes), never arbitrary screen coordinates or brittle CSS classes.
4. **Evidence (Proof artifacts):**
   - Requires real user paths (no test-only setters).
   - Artifacts: before/after screenshots, network logs (`status < 400`), runtime console errors array (`[]`), and database side-effect verification.
5. **Cleanup (Safe teardown):**
   - Kill only the recorded PIDs started by this run. Never run global `killall` or `pkill` which would kill developers' or peer agents' processes.
   - Scratch databases/directories are wiped, but proof evidence in the output directory is strictly preserved.
6. **Helpers (Executable automation):**
   - Reusable scripts for DB querying, Kafka outbox inspection, and screenshot comparison.

---

## 2. Feature Map Architecture (`features/`)

A Feature Map bridges the gap between high-level user reports and concrete application routes. Every feature file in `features/<name>.md` must follow **4 standard H2 headers**:

```markdown
# Feature: Order Checkout Flow

## 1. User POV & Entry Points
- User intent: Customer reviews cart items, applies voucher, and confirms order.
- Routes: \`/cart\` -> \`/checkout\` -> \`/orders/:orderId/confirmation\`
- Prerequisites: Authenticated QA user (\`customer@example.com\`), cart contains at least 1 in-stock item.

## 2. Stable Handles & Selectors
- Proceed to checkout button: \`[data-testid="cart-proceed-checkout-btn"]\`
- Voucher input: \`[data-testid="checkout-voucher-input"]\`
- Submit button: \`[data-testid="checkout-submit-order-btn"]\`
- API contracts: \`POST /api/v1/orders\` (requires header \`Idempotency-Key\`)

## 3. Driving Recipe
\`\`\`bash
npx tsx bin/verify-harness.ts --route "/checkout" --action "apply-voucher:SUMMER50" --out "/tmp/verify-artifacts"
\`\`\`

## 4. Gotchas & Side-Effect Proofs
- Gotcha: Submit button has \`aria-busy="true"\` for ~300ms while debounce recalculation runs. Must wait for \`aria-busy="false"\`.
- Proof 1: Screenshot \`01-before.png\` and \`02-after.png\`.
- Proof 2: Database query confirms order status is 'CONFIRMED' in orders table.
```

---

## 3. CI Gate Script: Anti-Map-Drift (`bin/check-feature-map.sh`)

A Feature Map is only useful while it is true. Add this fail-closed script to your CI pipeline:

```bash
#!/usr/bin/env bash
# bin/check-feature-map.sh — Fail-closed check to prevent router and Feature Map drift
set -euo pipefail

ROUTER_FILE="web-app/src/routes/AppRouter.tsx"
FEATURES_DIR=".omp/skills/verify-platform/features"

if [[ ! -f "$ROUTER_FILE" ]]; then
  echo "[FAIL-CLOSED] Router file not found at: $ROUTER_FILE" >&2
  exit 2
fi

# 1. Extract application routes
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
```
