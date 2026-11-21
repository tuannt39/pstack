#!/usr/bin/env bash
# bin/check-no-slop-comments.sh — Rejects AI inline comment slop
set -euo pipefail

SLOP_COMMENTS=$(git diff --cached -U0 -- '*.ts' '*.tsx' '*.java' 2>/dev/null \
  | grep -E '^\+\s*//' \
  | grep -vE '^\+\s*//\s*(eslint-disable|@ts-expect-error|noinspection|https?://)' || true)

if [[ -n "$SLOP_COMMENTS" ]]; then
  echo "[VIOLATION: /no-comments & principle-encode-lessons-in-structure]" >&2
  echo "New inline comments detected in git diff:" >&2
  echo "$SLOP_COMMENTS" >&2
  echo "" >&2
  echo "REMEDIATION:" >&2
  echo "1. If narrating what code does -> Delete it; make variable/method names self-explanatory." >&2
  echo "2. If describing a required invariant -> Encode as a Type, assert, or unit test." >&2
  exit 1
fi

echo "[NO-COMMENTS OK] Diff is free of inline comment slop."
