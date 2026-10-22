# Enterprise Blueprint 03: Slot-Isolated Multi-Agent Orchestration

When scaling from 1 agent to 10–20 concurrent agents, local environment contention is the primary failure mode (`principle-separate-before-serializing-shared-state`).

If agents share one working tree, git locks crash. If agents share port 8080 or the `public` Postgres schema, one agent's test seed wipes another agent's run. Conversely, launching 20 separate Docker Compose stacks exhausts server RAM.

The optimal pattern is: **Shared Infrastructure with Slot-Isolated Namespaces (`AGENT_SLOT` 01 → 20)**.

---

## 1. Slot Isolation Architecture Table

| Resource | Configuration for Slot $N$ (e.g. `01` to `20`) | Isolation Mechanism |
| --- | --- | --- |
| **Source Code** | `../worktrees/slot-${N}` | `git worktree add` on isolated branch `agent/slot-${N}-${TASK_SLUG}`. |
| **Network Ports** | Backend: `18000 + N` \| Frontend: `13000 + N` \| CDP: `19200 + N` | Guaranteed no port collisions (`EADDRINUSE`). |
| **PostgreSQL** | `SPRING_DATASOURCE_HIKARI_SCHEMA=slot_${N}` | Shared Postgres container, but dynamic schema created in 30ms. Dropped on cleanup. |
| **Redis** | Key Prefix: `app:slot_${N}:` | `FLUSHDB` in slot 01 never touches keys in slot 02. |
| **Kafka / RabbitMQ** | Topic Prefix: `slot_${N}.` \| Consumer Group: `cg_slot_${N}` | Slot 01 events are isolated from Slot 02 consumers. |
| **MinIO / S3** | Bucket: `bucket-slot-${N}` | Upload and render artifacts separated per agent slot. |

---

## 2. Fleet Spawn Script (`bin/spawn-agent-slot.sh`)

Automates worktree creation, isolated environment variables, Postgres schema provisioning, and opens a 3-pane Tmux cockpit:

```bash
#!/usr/bin/env bash
# bin/spawn-agent-slot.sh — Spawns an isolated Agent station
set -euo pipefail

SLOT=""
TASK_SLUG=""
TASK_PROMPT=""
BASE_BRANCH="main"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slot) SLOT="$2"; shift 2 ;;
    --task) TASK_SLUG="$2"; shift 2 ;;
    --prompt) TASK_PROMPT="$2"; shift 2 ;;
    --base) BASE_BRANCH="$2"; shift 2 ;;
    *) echo "Invalid param: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$SLOT" || -z "$TASK_SLUG" ]]; then
  echo "Usage: $0 --slot <01..20> --task <slug> [--prompt <text>]" >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
WORKTREES_BASE="$(dirname "$REPO_ROOT")/agent-worktrees"
WORKTREE_DIR="${WORKTREES_BASE}/slot-${SLOT}-${TASK_SLUG}"
BRANCH_NAME="agent/slot-${SLOT}/${TASK_SLUG}"
TMUX_SESSION="pstack-fleet"
WINDOW_NAME="slot-${SLOT}-${TASK_SLUG:0:18}"

# 1. Git Worktree Isolation
mkdir -p "$WORKTREES_BASE"
if [[ ! -d "$WORKTREE_DIR" ]]; then
  git fetch origin "$BASE_BRANCH" --quiet
  git worktree add -b "$BRANCH_NAME" "$WORKTREE_DIR" "origin/${BASE_BRANCH}"
fi

# 2. Allocate Slot Environment
SLOT_NUM=$((10#$SLOT))
BACKEND_PORT=$((18000 + SLOT_NUM))
FRONTEND_PORT=$((13000 + SLOT_NUM))
CDP_PORT=$((19200 + SLOT_NUM))
DB_SCHEMA="slot_${SLOT}"

cat > "${WORKTREE_DIR}/.env.agent-slot" <<EOF
export AGENT_SLOT="${SLOT}"
export SERVER_PORT="${BACKEND_PORT}"
export VITE_PORT="${FRONTEND_PORT}"
export CDP_DEBUGGING_PORT="${CDP_PORT}"
export SPRING_DATASOURCE_HIKARI_SCHEMA="${DB_SCHEMA}"
export SPRING_FLYWAY_SCHEMAS="${DB_SCHEMA}"
export APP_REDIS_KEY_PREFIX="slot_${SLOT}:"
export APP_KAFKA_TOPIC_PREFIX="slot_${SLOT}."
EOF

# 3. Create isolated Postgres Schema (~30ms)
PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql -h localhost -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-platform}" \
  -c "CREATE SCHEMA IF NOT EXISTS ${DB_SCHEMA};" >/dev/null 2>&1 || true

# 4. Initialize decision-log.tsv for /show-me-your-work
DECISION_LOG="${WORKTREE_DIR}/decision-log.tsv"
if [[ ! -f "$DECISION_LOG" ]]; then
  printf "step_id\ttimestamp\tphase\tdecision_made\talternatives_rejected\tprinciples_cited\tverification_evidence\tcommit_sha\n" > "$DECISION_LOG"
fi

# 5. Create 3-Pane Tmux Station
if ! tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
  tmux new-session -d -s "$TMUX_SESSION" -n "$WINDOW_NAME" -c "$WORKTREE_DIR"
else
  tmux new-window -t "$TMUX_SESSION" -n "$WINDOW_NAME" -c "$WORKTREE_DIR"
fi

# Pane 0 (60% width): Main Agent Turn
tmux send-keys -t "${TMUX_SESSION}:${WINDOW_NAME}.0" "source .env.agent-slot && clear" C-m
if [[ -n "$TASK_PROMPT" ]]; then
  tmux send-keys -t "${TMUX_SESSION}:${WINDOW_NAME}.0" "omp" C-m
fi

# Pane 1 (Top right): Decision log & git status live monitor
tmux split-window -h -p 40 -t "${TMUX_SESSION}:${WINDOW_NAME}.0" -c "$WORKTREE_DIR"
tmux send-keys -t "${TMUX_SESSION}:${WINDOW_NAME}.1" \
  "watch -n 2 -c 'echo \"=== SLOT ${SLOT} (${BRANCH_NAME}) ===\" && git status -sb && echo \"\n=== DECISION LOG ===\" && tail -n 10 decision-log.tsv'" C-m

# Pane 2 (Bottom right): Verification harness trigger
tmux split-window -v -p 50 -t "${TMUX_SESSION}:${WINDOW_NAME}.1" -c "$WORKTREE_DIR"
tmux send-keys -t "${TMUX_SESSION}:${WINDOW_NAME}.2" "source .env.agent-slot && clear && echo 'Ready to verify.'" C-m

tmux select-pane -t "${TMUX_SESSION}:${WINDOW_NAME}.0"
echo "[STATION READY] Slot ${SLOT} active at: ${WORKTREE_DIR}"
echo "Attach with: tmux attach -t ${TMUX_SESSION}"
```

---

## 3. Decision Log Auditor (`bin/audit-decisions.sh`)

Audits `decision-log.tsv` generated by `/show-me-your-work` before merging:

```bash
#!/usr/bin/env bash
# bin/audit-decisions.sh — Verifies decision-log.tsv integrity
set -euo pipefail

LOG_FILE="${1:-decision-log.tsv}"
if [[ ! -f "$LOG_FILE" ]]; then
  echo "[AUDIT FAILED] File not found: $LOG_FILE" >&2
  exit 1
fi

LINE_NUM=0
while IFS=$'\t' read -r step_id timestamp phase decision rejected principles evidence commit_sha; do
  LINE_NUM=$((LINE_NUM + 1))
  [[ $LINE_NUM -eq 1 ]] && continue

  if [[ -z "$principles" || "$principles" == "none" ]]; then
    echo "[AUDIT FAILED - Line $LINE_NUM] Step '$step_id' missing cited principle!" >&2
    exit 1
  fi

  if [[ "$commit_sha" != "PENDING" ]] && ! git cat-file -e "${commit_sha}^{commit}" 2>/dev/null; then
    echo "[AUDIT FAILED - Line $LINE_NUM] Declared commit '$commit_sha' does not exist!" >&2
    exit 1
  fi

  if [[ "$phase" == "verify" ]]; then
    EVIDENCE_PATH=$(echo "$evidence" | grep -oE '/tmp/verify-[^ ]+\.json' || true)
    if [[ -n "$EVIDENCE_PATH" && -f "$EVIDENCE_PATH" ]]; then
      if ! grep -q '"passed": true' "$EVIDENCE_PATH" && ! grep -q '"passed":true' "$EVIDENCE_PATH"; then
        echo "[AUDIT FAILED - Line $LINE_NUM] Verification evidence marked failed in $EVIDENCE_PATH!" >&2
        exit 1
      fi
    fi
  fi
done < "$LOG_FILE"

echo "[AUDIT PASSED] All $((LINE_NUM - 1)) decisions validated."
```
