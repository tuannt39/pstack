# pstack in Google Antigravity (`agy`)

pstack skills, 22 playbooks, and 24 engineering principles run natively inside **Google Antigravity (`agy`)** as a multi-harness plugin. All 58 skills and 2 subagents (`poteto-agent`, `comment-sicko`) are auto-discovered, and `rules/AGENTS.md` injects the `poteto-mode` bootstrap and Antigravity tool mappings at session start.

---

## 1. Installation & Validation

### Install the CLI (`agy`) and pstack Plugin

If you have not installed `agy` yet:
```bash
# macOS / Linux
curl -fsSL https://antigravity.google/cli/install.sh | bash

# Windows PowerShell
irm https://antigravity.google/cli/install.ps1 | iex
```

Install `pstack` from GitHub or a local checkout (installed plugins stage to `~/.gemini/config/plugins/pstack/` and sync across the Antigravity App and CLI):
```bash
# Install directly from GitHub
agy plugin install https://github.com/tuannt39/pstack

# Or install from a local checkout
agy plugin install /path/to/pstack
```

Verify installation, list bundled agents, and validate the plugin layout:
```bash
agy plugin list --json
agy agents
agy plugin validate ./pstack
```

### Multi-Tool Repository Validation Warnings

Because this repository supports both `agy` and `omp` (`oh-my-pi`), `agy plugin validate ./pstack` emits two expected informational warnings:
1. `commands`: `omp` slash-command aliases (`commands/*.toml`) are ignored by Antigravity because Antigravity loads skills directly from `skills/<name>/SKILL.md`.
2. `plugin.json`: Shadowed by `.antigravity-plugin/plugin.json`, which Antigravity prioritizes when present.

In CI, validate without `--strict` (`agy plugin validate ./pstack`) or filter known multi-tool files with `--json`:
```bash
agy plugin validate --json ./pstack | node -e '
const fs = require("fs");
const r = JSON.parse(fs.readFileSync(0, "utf8"));
const bad = r.findings.filter(f =>
  f.severity === "error" ||
  (f.severity === "warning" && f.file !== "commands" && (f.file !== "plugin.json" || r.manifest === "plugin.json"))
);
if (bad.length) { console.error(bad); process.exit(1); }
'
```

Once enabled (`agy plugin enable pstack`), you can invoke any skill with `/<skill-name>` or launch a session directly with a bundled agent:
```bash
agy --agent poteto-agent
```

---

## 2. Tool Mapping & Multi-Agent Orchestration

Antigravity maps pstack's Cursor and generic conventions to native tools:

| Cursor / Generic Concept | Antigravity Native Tool | Behavior & Operational Notes |
| :--- | :--- | :--- |
| `Task` / Subagents | `invoke_subagent` | Spawns background subagents (`TypeName: "self"`, `"research"`, `"poteto-agent"`, or `"comment-sicko"`). Automatically wakes the parent on completion (Reactive Wakeup). |
| Worktree concurrency | `Workspace: "branch"` or `"share"` | Creates an isolated cloned branch workspace (`branch`) or shared storage working copy (`share`) per subagent. |
| Transient / managed subagents | `define_subagent`, `manage_subagents` | Define temporary subagent types at runtime and `list`, `kill`, or `kill_all` active direct subagents (max nesting depth 10). |
| Subagent follow-up | `send_message` | Sends instructions to a running or idle subagent by `conversationId` (or via `@<name> <msg>` in the CLI prompt). |
| Scripted multi-agent sweeps | `run_workflow` (`/run-workflow`) | Runs a Python workflow script with `phase()`, `agent()`, `parallel()`, `pipeline()`, and JSON Schema outputs to keep raw logs out of main context. |
| Shared-board team | `swarm` (`/swarm`) | Runs named workers (`@name`), a `@verifier`, and a `@monitor` on a shared board (`/swarm board` or `Alt+S`). Only call `swarm` when `/swarm` was explicitly invoked or is active. |
| UI verification (`control-ui`) | `/browser` subagent | Uses the built-in browser in Antigravity App (personal accounts) or Chrome DevTools MCP (`v144+`) in CLI for screenshots, console/network logs, and traces. |
| `AskQuestion` | `ask_question` | Interactive single/multi-select questions. |
| Open a todolist | Task Artifact (`write_file` / `edit_file`) | Writes and updates `<appDataDir>/brain/<conversation-id>/task.md`. Do NOT use `manage_task` (which manages OS background processes and timers). |
| Code reading & editing | `read_file`, `edit_file`, `write_file` | Slice reads (`StartLine`/`EndLine`), exact substring edits, and file creation. |
| Shell & scheduled loops | `run_command`, `schedule` | Background shell execution (`WaitMsBeforeAsync`) and one-shot or cron wakeups (`/schedule`). |

### Choosing the Right Multi-Agent Mode

- **Orchestrator (`Orchestrator`)**: Single-conversation planner/executor handoff for everyday features, bug fixes, and refactors.
- **`invoke_subagent` + `Workspace: "branch"`**: Best for pstack `/arena` bakeoffs and isolated candidate patches.
- **Dynamic Workflows (`/run-workflow`)**: Best when applying the same check or staged fix-and-verify pipeline across many files or packages.
- **Swarm (`/swarm`)**: Best when named peers and a `@verifier` need to coordinate directly on one shared board.
- **`/boost` & `/teamwork`**: Paid-plan Antigravity orchestrators for hard iterative reasoning (`/boost`) or scoped multi-milestone projects (`/teamwork`).

---

## 3. Execution Modes, Permissions & `settings.json`

Cycle execution modes mid-session in the CLI with `Shift+Tab` (`default` > `accept-edits` > `auto` > `plan`) or launch with `--mode`:

| Mode | Behavior | Recommended Use |
| :--- | :--- | :--- |
| `auto` | Default where OS terminal sandbox is available (`v1.5.7+` on macOS/Linux/Windows). Auto-approves workspace edits and sandboxed commands; evaluates external commands for safety. | Autonomous pstack runs with low friction and OS containment. |
| `accept-edits` | Auto-approves workspace edits and subagent writes, but prompts before every shell command. | Untrusted command workflows inside trusted codebases. |
| `plan` | Prepends `/plan` to explore read-only and write an implementation plan artifact before editing. | Complex architecture or `/architect` exploration. |
| `default` | Interactive diff preview (`request-review`) before every edit and shell command. | Sensitive changes requiring line-by-line review. |

Configure defaults in `~/.gemini/antigravity-cli/settings.json` (or interactively via `/config`):
```json
{
  "$schema": "https://antigravity.google/schemas/v1/settings.json",
  "agentMode": "auto",
  "toolPermission": "proceed-in-sandbox",
  "enableTerminalSandbox": true,
  "verbosity": "medium",
  "notifications": true,
  "permissions": {
    "allow": ["command(git)", "command(npm test)"],
    "deny": ["command(rm -rf)"]
  }
}
```

---

## 4. Models, Reasoning Effort & Role Routing

List all entitled models and identifiers in your environment:
```bash
agy models
```

### Session Models & Effort

- **Default Planner/Executor (`Orchestrator`)**: Select `Orchestrator (Neon)` via `/model` or `agy --model "Orchestrator (Neon)"`. `Orchestrator` uses a fixed reasoning budget, so `--effort` and `/effort` do not apply to it.
- **Maximum Single-Model Reasoning (`Gemini 4 Neon`)**: Use `--model gemini-4-neon-xhigh` or `--effort xhigh` (supported levels: `low`, `medium`, `high`, `xhigh`) for distributed systems design, concurrency bugs, and cross-vendor review panels.
- **Other Frontier Models**: `Gemini 4 Carbon`, `Gemini 4 Argon`, `Gemini 4 Hydrogen`, `Claude Opus 5.5`, `Claude Sonnet 5.5`, and `Gemini 3.8 Flash` (availability depends on plan).

### Subagent Tier Routing (`~/.gemini/config/rules/pstack-models.md`)

`agents/poteto-agent.md` omits `model:` for `agy` loader compatibility. Lead every spawned subagent kickoff with `Read <path>/worker.md before anything else.` and pass `Model` explicitly (`pro`, `flash`, `flash_lite`, `inherit`) on `invoke_subagent` calls.

Run `/setup-pstack` to persist per-role subagent tiers in `~/.gemini/config/rules/pstack-models.md`:
```markdown
# pstack model configuration for Antigravity
# Allowed models: pro, flash, flash_lite, inherit
# defaults: 3
# budget: large (xhigh)

feature, refactoring: pro
bug-fix: pro
perf-issue: pro
hillclimb: pro
judgment and prose: pro
arena runners: pro, flash
arena cross-judge pool: flash, pro
swarm workers: flash_lite
interrogate reviewers: pro, flash
```

---

## 5. CLI Workflows, Best Practices & Autonomous Runs

### Core Development Loop

1. **Explore & Plan**: Start in `plan` mode (`--mode=plan` or `/plan`) or run `/architect` before touching shared boundaries. Use `@` for path completion and `Ctrl+V` to attach screenshots when debugging UI.
2. **Execute & Isolate**: Delegate parallel candidates or broad slices using `invoke_subagent` (`Workspace: "branch"`), `/run-workflow`, or `/swarm`.
3. **Verify & Inspect**: Provide unit/E2E commands or a project `verify-*` skill so agents verify real output. Inspect per-turn changes with `/diff`, review artifacts with `Ctrl+R`, and check UI flows with `/browser`.
4. **Keep Context Clean**: Press `Esc` early to steer off-track loops, roll back turns with `/rewind` (`/undo`), compress milestones with `/compact`, and branch experiments with `/fork` + `/resume`.

### Essential CLI Shortcuts & Panels

| Shortcut / Command | Purpose |
| :--- | :--- |
| `Shift+Tab` | Cycle execution modes (`default` > `accept-edits` > `auto` > `plan`) |
| `/diff` | Open interactive diff viewer with per-turn views and inline comments |
| `Ctrl+R` | Open Artifact Review panel (`Shift+A` approves all) |
| `Ctrl+O` | Expand or collapse tool execution details and `/run-workflow` phase trees |
| `Ctrl+G` | Open prompt in `$EDITOR` (or edit pending command before approval) |
| `/agents`, `Alt+J`, `Ctrl+K` | Monitor subagents, jump to waiting approval (`Alt+J`), approve in place (`Ctrl+K`) |
| `/swarm board`, `Alt+S` | Open full-screen live swarm board (`Alt+X` dismisses finished status row) |
| `/tasks`, `/context`, `/codesearch`, `/usage`, `/btw` | Track background tasks, inspect token budget, search code, check quota, ask side questions |

### Headless CI, ACP, Remote Control & Remote Agents

- **Headless mode (`-p`)**: Script reviews, commit drafting, or structured CI checks:
  ```bash
  agy -p "Review git diff and list P0/P1 findings" --output-format json --json-schema ./schema.json
  ```
  Other flags: `--input-format stream-json`, `--print-timeout`, `--disable-slash-commands`, `--dangerously-skip-permissions`.
- **Agent Client Protocol (`agy acp`)**: Run `agy` as an ACP stdio backend in editors like Zed, JetBrains, Android Studio, and Xcode.
- **Remote Control & Remote Agents**: Use `/remote-control` (or `--remote-control`, or `agy remote-control start`) to monitor and approve local overnight runs (`autonomous-run`, `autopilot-full`, `babysit`) from any browser or phone. Use `--remote-agent` to execute sessions in Google-managed remote environments.
