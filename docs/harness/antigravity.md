# pstack in Google Antigravity (`agy`)

pstack skills, 23 playbooks, and 24 engineering principles run natively inside **Google Antigravity (`agy`)** as a native plugin. All 57 skills and 2 subagents are auto-discovered, and `rules/AGENTS.md` automatically injects the `poteto-mode` bootstrap and tool mappings upon session start.

---

## 1. Installation

Install pstack into your Antigravity environment with a single command:

```bash
# Install directly from Git repository
agy plugin install https://github.com/tuannt39/pstack

# Or install from a local checkout for development
agy plugin install D:\tuannt21\git\me\me\pstack
```

Verify your installation:
```bash
agy plugin list
agy plugin validate D:\tuannt21\git\me\me\pstack --strict
```

Once installed:
- All 57 skills are auto-discovered and available via slash commands (`/poteto-mode`, `/how`, `/why`, `/architect`, `/arena`, `/swarm`, `/interrogate`, `/tdd`, etc.).
- Both subagents (`poteto-agent` and `comment-sicko`) are registered and discoverable.
- `rules/AGENTS.md` is active in every session while the plugin is enabled (`agy plugin enable pstack`).

---

## 2. Tool Mapping

Antigravity provides rich native tool interfaces for AI pair programming:

| Cursor / Generic Concept | Antigravity Native Tool | Description & Advantage |
| :--- | :--- | :--- |
| `Task` / Subagents | `invoke_subagent` | Spawns background subagents (`TypeName: "self"` for code delegates, `TypeName: "research"` for read-only). Automatically awakens parent on completion (Reactive Wakeup). |
| Worktree Concurrency | `Workspace: "branch"` or `"share"` | Spins up isolated Git workspaces per subagent for `/arena`, `/swarm`, and `/architect`. |
| Subagent Follow-up | `send_message` | Allows messaging running subagents via their `conversationId`. |
| `AskQuestion` | `ask_question` | Interactive multi-choice questions with options and multi-select support. |
| Open a todolist | Task Artifact (`write_file` / `edit_file`) | Saves and updates markdown checklist artifacts in `<appDataDir>/brain/<conversation-id>/task.md`. (Do not use `manage_task`, which manages OS processes). |
| Code reading | `read_file` | Read files with line slices (`StartLine`/`EndLine`). |
| Code editing | `edit_file` / `write_file` | Precise substring replacement and file creation. |
| Bash / Terminal | `run_command` | Executes PowerShell / bash commands with backgrounding via `WaitMsBeforeAsync`. |
| Autonomous loop (`/loop`) | `schedule` | Schedules one-shot or cron timer wakeups with `DurationSeconds` or `CronExpression`. |

---

## 3. Subagent Delegation

When running fan-out playbooks (`/arena`, `/swarm`, `/architect`):

```json
{
  "TypeName": "self",
  "Role": "Arena Runner - Redis Lock Pattern",
  "Prompt": "Implement idempotency using Redis distributed lock. Verify with test suite.",
  "Model": "flash",
  "Workspace": "branch"
}
```

- **Reactive Wakeup**: Parent does not poll in a loop; execution resumes automatically when subagents finish.
- **Isolated Branching**: Each subagent gets its own branch workspace when `Workspace: "branch"` is specified, preventing file conflicts during parallel code generation.

---

## 4. Multi-Model Role Routing (`~/.gemini/config/rules/pstack-models.md`)

Configure model roles per task difficulty using `/setup-pstack`, which writes `~/.gemini/config/rules/pstack-models.md`:

```markdown
# pstack model configuration for Antigravity
# Allowed models: pro, flash, flash_lite, inherit

feature, refactoring: flash
bug-fix: flash
perf-issue: flash
hillclimb: flash
judgment and prose: pro
hardest tasks: pro
how explorer: flash
how explainer: pro
why investigators: flash_lite
why synthesizer: pro
arena runners: pro, flash
swarm workers: flash_lite
architect runners: pro, flash
interrogate reviewers: pro, flash
```

---

## 5. Daily Super-Workflows on Antigravity

### Workflow A: Intent-Driven Playbook Routing
Start any non-trivial engineering task:
```text
/poteto-mode this endpoint has an N+1 query when fetching order items. repro first, then fix and verify.
```
The agent selects the `Bug fix` playbook, opens a Task Artifact checklist, reproduces with tests, implements the fix surgically, and verifies with runtime proof.

### Workflow B: Parallel Design Exploration (`/architect` & `/arena`)
Explore competing architecture patterns before touching shared boundaries:
```text
/architect design an idempotent webhook consumer for Stripe payments
```
Subagents explore distinct patterns in parallel branch workspaces (`Workspace: "branch"`), synthesize tradeoffs, and present an optimal minimal design.

### Workflow C: Adversarial Code Review (`/interrogate`)
Before shipping high-risk changes (DB migrations, AuthZ, financial transactions):
```text
/interrogate review current uncommitted changes from security, edge-case, and concurrency perspectives
```
Multiple subagent perspectives probe for failure modes, ensuring enterprise reliability.
