#!/usr/bin/env bash
# Validate the Antigravity tool mapping: subagent dispatch via invoke_subagent,
# task tracking via task artifact, and documentation linkages.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

MAPPING="$REPO_ROOT/skills/poteto-mode/references/antigravity-tools.md"
SKILL="$REPO_ROOT/skills/poteto-mode/SKILL.md"
RULES="$REPO_ROOT/rules/AGENTS.md"
DOC="$REPO_ROOT/docs/harness/antigravity.md"

fail() { echo "FAIL: $*" >&2; exit 1; }

echo "test-antigravity-tools: checking Antigravity tool mapping and linkages"

# --- Files exist -------------------------------------------------------------
[ -f "$MAPPING" ] || fail "tool mapping missing at $MAPPING"
[ -f "$RULES" ] || fail "rules missing at $RULES"
[ -f "$DOC" ] || fail "docs missing at $DOC"

# --- Core action->tool mappings are documented -------------------------------
for tool in invoke_subagent ask_question write_file edit_file schedule; do
  grep -q "$tool" "$MAPPING" \
    || fail "mapping does not document the '$tool' tool"
done

# --- Subagent built-in types -------------------------------------------------
grep -q '`self`' "$MAPPING" \
  || fail "mapping does not document the built-in 'self' subagent type"
grep -q '`research`' "$MAPPING" \
  || fail "mapping does not document the built-in 'research' subagent type"

# --- Task tracking documents Task Artifact (not manage_task) ----------------
grep -qE 'Task Artifact|task\.md' "$MAPPING" \
  || fail "mapping does not document task tracking as a Task Artifact"

# --- poteto-mode/SKILL.md Platform Adaptation links the mapping -------------
grep -q "antigravity-tools.md" "$SKILL" \
  || fail "SKILL.md Platform Adaptation does not reference antigravity-tools.md"

echo "PASS: Antigravity tool mapping and references valid"
