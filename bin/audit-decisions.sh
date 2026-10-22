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
