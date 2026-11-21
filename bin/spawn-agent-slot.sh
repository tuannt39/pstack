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
  git fetch origin "$BASE_BRANCH" --quiet || true
  git worktree add -b "$BRANCH_NAME" "$WORKTREE_DIR" "origin/${BASE_BRANCH}" 2>/dev/null || \
  git worktree add -b "$BRANCH_NAME" "$WORKTREE_DIR" "${BASE_BRANCH}"
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
if command -v psql >/dev/null 2>&1; then
  PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql -h localhost -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-platform}" \
    -c "CREATE SCHEMA IF NOT EXISTS ${DB_SCHEMA};" >/dev/null 2>&1 || true
fi

# 4. Initialize decision-log.tsv for /show-me-your-work
DECISION_LOG="${WORKTREE_DIR}/decision-log.tsv"
if [[ ! -f "$DECISION_LOG" ]]; then
  printf "step_id\ttimestamp\tphase\tdecision_made\talternatives_rejected\tprinciples_cited\tverification_evidence\tcommit_sha\n" > "$DECISION_LOG"
fi

# 5. Create 3-Pane Tmux Station
if command -v tmux >/dev/null 2>&1; then
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
fi

echo "[STATION READY] Slot ${SLOT} active at: ${WORKTREE_DIR}"
