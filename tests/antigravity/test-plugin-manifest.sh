#!/usr/bin/env bash
# Validate the native Antigravity plugin manifest, layout, and multi-harness coexistence.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "test-plugin-manifest: checking pstack Antigravity plugin manifest and layout"

fail() { echo "FAIL: $*" >&2; exit 1; }

MANIFEST="$REPO_ROOT/plugin.json"
RULES="$REPO_ROOT/rules/AGENTS.md"
MARKETPLACE="$REPO_ROOT/.agents/plugins/marketplace.json"
AGY_PLUGIN="$REPO_ROOT/.antigravity-plugin/plugin.json"

[ -f "$MANIFEST" ] || fail "manifest missing at $MANIFEST"
[ -f "$RULES" ] || fail "rules missing at $RULES"
[ -f "$MARKETPLACE" ] || fail "marketplace manifest missing at $MARKETPLACE"
[ -f "$AGY_PLUGIN" ] || fail "antigravity manifest missing at $AGY_PLUGIN"

# Verify required fields via node
node - "$REPO_ROOT" <<'JS'
const fs = require('fs');
const path = require('path');
const root = process.argv[2];

const manifestPath = path.join(root, '.antigravity-plugin', 'plugin.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const required = ['name', 'displayName', 'version', 'description', 'suggestedPrompts', 'author', 'homepage', 'repository'];
for (const field of required) {
  if (!manifest[field]) {
    console.error(`Missing manifest field: ${field}`);
    process.exit(1);
  }
}

if (manifest.name !== 'pstack') {
  console.error(`Expected name 'pstack', got '${manifest.name}'`);
  process.exit(1);
}

if (manifest.description.length > 160) {
  console.error(`Description too long (${manifest.description.length} > 160)`);
  process.exit(1);
}
if (!Array.isArray(manifest.suggestedPrompts) || manifest.suggestedPrompts.length === 0) {
  console.error('suggestedPrompts must be a non-empty array');
  process.exit(1);
}

if (!manifest.logo || !fs.existsSync(path.join(root, manifest.logo))) {
  console.error(`Invalid logo in manifest: ${manifest.logo}`);
  process.exit(1);
}

// Multi-harness version parity check
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const rootManifest = JSON.parse(fs.readFileSync(path.join(root, 'plugin.json'), 'utf8'));
const claudeManifest = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8'));

const expectedVersion = '0.15.43';
for (const [file, v] of [
  ['.antigravity-plugin/plugin.json', manifest.version],
  ['package.json', pkg.version],
  ['plugin.json', rootManifest.version],
  ['.claude-plugin/plugin.json', claudeManifest.version],
]) {
  if (v !== expectedVersion) {
    console.error(`Version mismatch in ${file}: expected '${expectedVersion}', got '${v}'`);
    process.exit(1);
  }
}

for (const rel of [
  '.antigravity-plugin/plugin.json',
  '.claude-plugin/plugin.json',
  '.claude-plugin/marketplace.json',
  'plugin.json',
  'commands/poteto-mode.toml',
  'rules/AGENTS.md',
  'docs/harness/antigravity.md',
]) {
  const txt = fs.readFileSync(path.join(root, rel), 'utf8');
  if (/23\s+playbooks/i.test(txt)) {
    console.error(`Stale '23 playbooks' text found in ${rel}`);
    process.exit(1);
  }
}

// Skills count and frontmatter sanitization check (58 skills)
const skillsDir = path.join(root, 'skills');
const skillFolders = fs.readdirSync(skillsDir).filter((f) => fs.existsSync(path.join(skillsDir, f, 'SKILL.md')));
if (skillFolders.length !== 58) {
  console.error(`Expected exactly 58 skills, found ${skillFolders.length}`);
  process.exit(1);
}

for (const skill of skillFolders) {
  const content = fs.readFileSync(path.join(skillsDir, skill, 'SKILL.md'), 'utf8');
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) {
    console.error(`Missing YAML frontmatter in skills/${skill}/SKILL.md`);
    process.exit(1);
  }
  const fm = fmMatch[1];
  for (const forbidden of ['disable-model-invocation', 'icon', 'color', 'paths']) {
    if (new RegExp(`^${forbidden}:`, 'm').test(fm)) {
      console.error(`Forbidden key '${forbidden}:' found in skills/${skill}/SKILL.md frontmatter`);
      process.exit(1);
    }
  }
}

// Slash commands parity check (34 non-principle workflow skills)
const commandsDir = path.join(root, 'commands');
const nonPrincipleSkills = skillFolders.filter((s) => !s.startsWith('principle-'));
if (nonPrincipleSkills.length !== 34) {
  console.error(`Expected 34 non-principle skills, found ${nonPrincipleSkills.length}`);
  process.exit(1);
}

for (const skill of nonPrincipleSkills) {
  const cmdFile = path.join(commandsDir, `${skill}.toml`);
  if (!fs.existsSync(cmdFile)) {
    console.error(`Missing command manifest: commands/${skill}.toml`);
    process.exit(1);
  }
}

// Worker kickoff doc and 22 playbooks check
const workerDoc = path.join(skillsDir, 'poteto-mode', 'worker.md');
if (!fs.existsSync(workerDoc)) {
  console.error('Missing skills/poteto-mode/worker.md');
  process.exit(1);
}

const playbooksDir = path.join(skillsDir, 'poteto-mode', 'playbooks');
const playbooks = fs.readdirSync(playbooksDir).filter((f) => f.endsWith('.md'));
if (playbooks.length !== 22) {
  console.error(`Expected 22 playbooks, found ${playbooks.length}`);
  process.exit(1);
}

for (const retired of [
  'skills/poteto-mode/playbooks/orchestrate.md',
  'skills/poteto-mode/scripts/check-plan.mjs',
  'skills/how/references',
  'skills/why/references',
  'skills/reflect/references',
  'skills/architect/references',
]) {
  if (fs.existsSync(path.join(root, retired))) {
    console.error(`Retired path still exists: ${retired}`);
    process.exit(1);
  }
}

const agentsDir = path.join(root, 'agents');
for (const agentFile of fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'))) {
  const content = fs.readFileSync(path.join(agentsDir, agentFile), 'utf8');
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch && /^model:\s*(claude-|grok-|gemini-|cursor-)/m.test(fmMatch[1])) {
    console.error(`Cursor-specific model slug in agents/${agentFile} breaks agy agent loading`);
    process.exit(1);
  }
}
JS

# Check agy plugin validate if agy is installed
if command -v agy >/dev/null 2>&1; then
  echo "Running agy plugin validate..."
  output="$(agy plugin validate "$REPO_ROOT" 2>&1)" || {
    echo "$output" >&2
    fail "agy plugin validate failed"
  }
  echo "$output"
  grep -qiE 'Validation passed|\[ok\]' <<<"$output" || fail "Validation did not pass"
else
  echo "SKIP: agy not on PATH; skipping live CLI validation"
fi

echo "PASS: Antigravity plugin manifest and layout valid"
