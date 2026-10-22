# Enterprise Blueprint 05: Outer Loop & Independent Shipping Gate

To process hundreds or thousands of PRs monthly without burning engineers out, teams must separate the **Outer Loop** (triage and batching) from the **Inner Loop** (code and test), and establish automated **Risk Gates** for merging.

---

## 1. Outer Loop Root-Cause Triage Ledger (`docs/triage/triage-ledger.md`)

Never spawn an agent to fix every incoming Slack or Sentry ticket individually. Many tickets share one underlying cause; patching each symptom creates bloated, conflicting PRs.

The Chief of Staff bot (like Benny) performs a 3-step triage:
1. **Reproduce on Main:** Drive the Feature Map in an isolated slot to verify if the bug exists on `main` or was already fixed.
2. **Cluster by Symptom Fingerprint:** Group tickets sharing identical stack traces or intersecting modules into one cluster.
3. **Log in Sổ Cái (Triage Ledger):** Produce actionable clusters for engineering leads.

### Sample Triage Ledger Entry

```markdown
# Root-Cause Triage Ledger

## Cluster #104: Inventory drift during concurrent order cancellation (Priority: HIGH)
- **Reported in:** \`SLACK-8821\`, \`JIRA-4102\`, \`SENTRY-991a\`, \`SLACK-8845\`
- **Suspected Root Locus:** \`InventoryReleaseConsumer.java:74\` and \`OrderCancellationHandler.java:112\`
- **Diagnosis from /how:** Both events interleave when Kafka consumer retries during DB deadlocks.
- **Action:** Dispatch 1 \`/poteto-mode\` task under \`Bug fix\` playbook to fix the locking mechanism.
```

---

## 2. Autonomy Tiers: Reversible vs One-Way Doors

Apply `principle-never-block-on-the-human` with strict boundary gates:

| Autonomy Tier | Scope of Changes | Operating Mode | Verification Requirement |
| --- | --- | --- | --- |
| **Tier 1: Auto-Merge** *(Two-Way Door)* | UI/CSS display fixes, local perf optimization, refactorings within 1 module, dead code pruning. Diff < 400 LOC. | Autonomous shipping (`/poteto-mode shipping`) | Passes all Hard Linters, Feature Map E2E check, and independent review. Revertible via `git revert` in 5s. |
| **Tier 2: Autopilot Stack** *(Low Risk)* | New business features, internal event payloads, caching TTL changes. | Agent stacks linear PRs; architect reviews final root commit. | `/blast-radius` proof that downstream consumers remain unbroken. |
| **Tier 3: Strict Human-in-the-Loop** *(One-Way Door)* | DB schema migrations (Flyway/Liquibase `V*.sql`), financial ledgers, distributed locks, authentication & authorization. | Auto-merge strictly disabled. | Formal verification (TLA+, property testing) + human architect signoff. |

---

## 3. GitHub Actions Independent Shipping Gate (`.github/workflows/pstack-shipping-gate.yml`)

A PR cannot auto-merge based solely on the author agent's approval. The shipping gate launches a fresh, independent verifier check:

```yaml
name: pstack Independent Shipping Gate

on:
  pull_request:
    types: [opened, synchronize, labeled]

jobs:
  classify-and-verify:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write

    steps:
      - name: Checkout PR Branch
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: 1. Architecture & Hard Constraints Gate
        run: |
          if [[ -f "./bin/check-no-slop-comments.sh" ]]; then
            ./bin/check-no-slop-comments.sh
          fi
          if [[ -f "./bin/check-feature-map.sh" ]]; then
            ./bin/check-feature-map.sh
          fi

      - name: 2. Audit Decision Log
        run: |
          if [[ -f "decision-log.tsv" && -f "./bin/audit-decisions.sh" ]]; then
            ./bin/audit-decisions.sh decision-log.tsv
          fi

      - name: 3. Classify Risk & Detect One-Way Doors
        id: risk_gate
        run: |
          CHANGED_FILES=$(git diff --name-only origin/${{ github.base_ref }}...HEAD)
          DIFF_LINES=$(git diff --numstat origin/${{ github.base_ref }}...HEAD | awk '{s+=$1+$2} END {print s+0}')

          if echo "$CHANGED_FILES" | grep -qE '(db/migration/|V[0-9]+__.*\.sql|security/|auth/|payment/ledger/)'; then
            echo "tier=TIER_3_ONE_WAY_DOOR" >> "$GITHUB_OUTPUT"
            echo "[TIER 3] PR touches DB migration, security, or payments. Auto-merge disabled."
            exit 0
          fi

          if [[ "$DIFF_LINES" -gt 400 ]]; then
            echo "tier=TIER_2_LARGE_DIFF" >> "$GITHUB_OUTPUT"
            echo "[TIER 2] Diff exceeds 400 LOC ($DIFF_LINES lines). Requires human review."
            exit 0
          fi

          echo "tier=TIER_1_AUTO_SHIPPABLE" >> "$GITHUB_OUTPUT"
          echo "[TIER 1] Reversible atomic PR. Eligible for auto-merge."

      - name: 4. Auto-Merge Verified Tier 1 PRs
        if: steps.risk_gate.outputs.tier == 'TIER_1_AUTO_SHIPPABLE' && contains(github.event.pull_request.labels.*.name, 'automerge')
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh pr merge "${{ github.event.pull_request.number }}" --squash --auto \
            --subject "${{ github.event.pull_request.title }} (#${{ github.event.pull_request.number }})"
```
