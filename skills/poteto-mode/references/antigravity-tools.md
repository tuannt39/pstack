# Antigravity CLI (`agy`) Tool Mapping for pstack

pstack skills speak in generic actions and Cursor conventions ("dispatch a subagent", "open a todolist", "Task", "AskQuestion"). On Google Antigravity (`agy`), these resolve to the native tools and CLI commands below.

| Action skills request | Antigravity (`agy`) equivalent |
| :--- | :--- |
| Dispatch a subagent (`Task`, code implementer / `poteto-agent`) | `invoke_subagent` with `TypeName: "self"` (inherits parent tools, model, and instructions) or bundled `"poteto-agent"` |
| Dispatch a read-only subagent (explorer, reviewer, `readonly: true`) | `invoke_subagent` with `TypeName: "research"` (read-only file reading, search, and web search) or bundled `"comment-sicko"` |
| Create or manage transient subagents | `define_subagent` (register a temporary subagent type) and `manage_subagents` (`list`, `kill`, `kill_all`) |
| Parallel worktree isolation (`environment: "cloud"`, worktree) | `invoke_subagent` with `Workspace: "branch"` (isolated branch clone) or `Workspace: "share"` (shared repository storage) |
| Resume or follow-up subagent communication | `send_message` with `Recipient: "<subagent-conversationId>"` (or `@<name> <msg>` in CLI prompt) |
| Scripted fan-out or staged pipeline across files/modules | `run_workflow` (`/run-workflow` Python script using `phase()`, `agent()`, `parallel()`, `pipeline()`, JSON Schema outputs) |
| Live shared-board agent swarm | `swarm` tool ONLY when the user explicitly invoked `/swarm` or a swarm is active; otherwise pstack `/swarm` uses `invoke_subagent` with `Workspace: "branch"` or `"share"` |
| UI / browser verification (`control-ui`, visual parity) | `/browser` subagent (built-in browser in Antigravity App on personal accounts; Chrome DevTools MCP in CLI `v144+`) |
| Ask the user a question (`AskQuestion`) | `ask_question` with structured options and `is_multi_select` |
| Task tracking ("create a todo", "open a todolist", "mark complete") | **Task Artifact** via `write_file` / `edit_file` in `<appDataDir>/brain/<conversation-id>/task.md`. Do NOT use `manage_task` (which manages OS processes and timers). |
| Read file / inspect directory | `read_file` (`StartLine`/`EndLine` slices and binary/media files) |
| Edit or create file | `edit_file` (exact substring replacement) and `write_file` |
| Execute shell command | `run_command` (bash/powershell with backgrounding via `WaitMsBeforeAsync`) |
| Autonomous loop / scheduled check (`/loop`) | `schedule` with `DurationSeconds` or `CronExpression` and `Prompt` |
| Session review, rewind, compaction, and monitoring | `/diff`, `/rewind` (`/undo`), `/compact`, `/fork`, `/agents`, `/tasks` |

---

## 1. Subagent Support & Delegation

Antigravity runs subagents asynchronously in the background via `invoke_subagent`:
- Each subagent starts with a clean context window and reports back to its parent when done.
- The system wakes the parent automatically when a subagent completes or sends a message (**Reactive Wakeup**, do not poll `manage_task` or sleep).
- You can launch multiple independent subagents in parallel in one turn, up to 10 nesting levels deep.
- Manage active subagents with `manage_subagents` (`list`, `kill`, `kill_all`). In the CLI, open `/agents` to inspect subagent logs, press `Alt+J` to jump to the next subagent awaiting approval, `Ctrl+K` to approve a pending request in place, or start a prompt with `@<subagent-name> <message>` to talk to a subagent directly.

### Built-in & Bundled Subagent Types

- **`self`**: Clones the calling agent's system instructions and full toolset. Use for code-writing, test runs, refactoring, and general delegate work (`poteto-agent`).
- **`research`**: Read-only codebase search, file reading, and web search. Use for `/how`, `/why`, and read-only reviews.
- **`browser`**: Built-in browser / Chrome DevTools subagent invoked via `/browser` for UI checks, console/network errors, screenshots, and traces.
- **Bundled plugin agents**: `poteto-agent` (delegate worker) and `comment-sicko` (comment deletion and workaround auditor), plus custom agents defined via `define_subagent` or `.agents/agents/*.md`.

### Choosing an Orchestration Primitive

- **`invoke_subagent`**: One focused task or a pstack `/arena` bakeoff with isolated `Workspace: "branch"` workspaces.
- **`run_workflow`**: Predictable Python-scripted `parallel()` or `pipeline()` sweeps over files or packages where agents return JSON Schema verdicts rather than talking to each other.
- **`swarm` (`/swarm`)**: Broad independent tasks where named workers (`@name`), a `@verifier`, and a `@monitor` coordinate on one shared board (`/swarm board`, `Alt+S`). Call the `swarm` tool only when the user explicitly ran `/swarm` or a swarm is active.
- **`/boost` & `/teamwork`**: Built-in paid-plan Antigravity orchestrators for hard single-problem iteration (`/boost`) or multi-milestone scoped projects (`/teamwork`).

### Parallel Worktree Concurrency

For playbooks that fan out across candidates or slices (`/arena`, `/swarm`):
```json
{
  "TypeName": "self",
  "Role": "Arena Candidate A",
  "Prompt": "Read <path>/worker.md before anything else.\nImplement idempotency using Redis lock. Verify with tests.",
  "Model": "pro",
  "Workspace": "branch"
}
```
Setting `Workspace: "branch"` spins up an isolated branch workspace so concurrent subagents never overwrite each other's files.

---

## 2. Task Tracking

Antigravity has **no todo tool** (`manage_task` only supports `list`, `status`, `send_input`, and `kill` on OS background processes and timers).

When a playbook or skill directs you to open a todolist:
1. Create a **Task Artifact** in `<appDataDir>/brain/<conversation-id>/task.md` using `write_file` with `ArtifactMetadata` (`UserFacing: true`, `RequestFeedback: false`).
2. List all playbook steps and task milestones as markdown checkboxes (`- [ ] Step 1`).
3. As each milestone completes, update the artifact with `edit_file` (`- [x] Step 1`).

---

## 3. Model Configuration

### Subagent Tier Mapping (`invoke_subagent`)

pstack's Cursor model defaults map to Antigravity subagent tiers (`Model` parameter) as follows:
- `claude-opus-5-5-xhigh-fast`, `claude-fable-5-2-high`, `gemini-4-neon-xhigh` -> `Model: "pro"` (or `Model: "inherit"`)
- `claude-opus-5-5-high-fast` -> `Model: "flash"` or `Model: "inherit"`
- Fast explore / high-volume swarm workers -> `Model: "flash_lite"`

`agents/poteto-agent.md` omits `model:` for `agy` loader compatibility, so pass `Model` explicitly on `invoke_subagent` calls and lead every kickoff with `Read <path>/worker.md before anything else.`. Persist per-role subagent tier overrides globally in `~/.gemini/config/rules/pstack-models.md` via `/setup-pstack`.

### CLI Session Models & Reasoning Effort (`agy`)

Run `agy models` to inspect available session model IDs on your account:
- **`Orchestrator (Neon)`** (`gemini-pro-orchestrator-neon`): Recommended default pairing a top-tier planner (`Gemini 4 Neon`, `Carbon`, or `Argon`) with a fast executor (`Gemini 4 Hydrogen`). Fixed effort (`--effort` and `/effort` do not apply to Orchestrator).
- **`gemini-4-neon-xhigh`** (`Gemini 4 Neon (XHigh)`): Maximum single-model reasoning depth for architecture, race conditions, and cross-model review panels (`--model gemini-4-neon-xhigh` or `--effort xhigh`).
- **`gemini-4-hydrogen-*`**, **`claude-opus-5-5-*`**, **`claude-sonnet-5-5-*`**: Selectable via `/model` or `agy --model` depending on plan entitlement.
