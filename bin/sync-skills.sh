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
        # Preserve user real directory overrides
        if [[ -d "$dest" && ! -L "$dest" ]]; then
          COUNT=$((COUNT + 1))
          continue
        fi
        # Skip if already a valid symlink to this skill
        if [[ -L "$dest" ]] && [[ "$(readlink -f "$dest" 2>/dev/null || true)" == "$(readlink -f "$skill" 2>/dev/null || echo "$skill")" ]]; then
          COUNT=$((COUNT + 1))
          continue
        fi
        rm -f "$dest"
        ln -s "$skill" "$dest" 2>/dev/null || cp -r "$skill" "$dest"
        COUNT=$((COUNT + 1))
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
      if [[ -e "$dest" || -L "$dest" ]]; then
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
