#!/usr/bin/env bash
# bin/sync-skills.sh — Synchronizes pstack skills to ~/.omp/agent/skills
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PSTACK_DIR="$(dirname "$SCRIPT_DIR")"
SKILLS_SRC="$PSTACK_DIR/skills"
TARGET_DIR="${HOME}/.omp/agent/skills"

ACTION="${1:-link}"

case "$ACTION" in
  link)
    mkdir -p "$TARGET_DIR"
    echo "Syncing skills from $SKILLS_SRC to $TARGET_DIR..."
    COUNT=0
    for skill in "$SKILLS_SRC"/*; do
      if [[ -d "$skill" && -f "$skill/SKILL.md" ]]; then
        name="$(basename "$skill")"
        dest="$TARGET_DIR/$name"
        if [[ ! -e "$dest" ]]; then
          cp -r "$skill" "$dest" 2>/dev/null || ln -s "$skill" "$dest" 2>/dev/null || true
          COUNT=$((COUNT + 1))
        fi
      fi
    done
    echo "[OK] Synced $COUNT skills to $TARGET_DIR."
    ;;
  unlink)
    echo "Removing pstack skills from $TARGET_DIR..."
    COUNT=0
    for skill in "$SKILLS_SRC"/*; do
      name="$(basename "$skill")"
      dest="$TARGET_DIR/$name"
      if [[ -e "$dest" ]]; then
        rm -rf "$dest"
        COUNT=$((COUNT + 1))
      fi
    done
    echo "[OK] Removed $COUNT skills."
    ;;
  *)
    echo "Usage: $0 [link|unlink]" >&2
    exit 1
    ;;
esac
