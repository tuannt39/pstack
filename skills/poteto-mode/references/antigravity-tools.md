# Antigravity CLI (`agy`) Tool Mapping for pstack

pstack skills speak in generic actions and Cursor conventions ("dispatch a subagent", "open a todolist", "Task", "AskQuestion"). On Google Antigravity (`agy`), these resolve to the native tools below.

| Action skills request | Antigravity CLI (`agy`) equivalent |
| :--- | :--- |
| Dispatch a subagent (`Task`, code implementer / `poteto-agent`) | `invoke_subagent` with `TypeName: "self"` (full capabilities: tools, model, system prompt inherited) |
| Dispatch a read-only subagent (explorer, reviewer, `readonly: true`) | `invoke_subagent` with `TypeName: "research"` (read-only tools: searches codebase, reads files, searches web) |
| Parallel worktree isolation (`environment: "cloud"`, worktree) | `invoke_subagent` with `Workspace: "branch"` (isolated cloned branch workspace) or `Workspace: "share"` |
| Resume or follow-up subagent communication | `send_message` with `Recipient: "<subagent-conversationId>"` |
| Ask the user a question (`AskQuestion`) | `ask_question` with structured options and multi-select support |
| Task tracking ("create a todo", "open a todolist", "mark complete") | **Task Artifact** — write/edit a markdown checklist artifact via `write_file` / `edit_file` in the session artifact directory. **Not** `manage_task` (which manages background processes/timers). |
| Read file / inspect directory | `read_file` (supports line ranges `StartLine`/`EndLine` and binary files) |
| Edit code | `edit_file` (targeted exact replacement) |
| Create / write file | `write_file` |
| Execute command | `run_command` (powershell/bash with backgrounding via `WaitMsBeforeAsync`) |
| Autonomous loop / scheduled check (`/loop`) | `schedule` with `DurationSeconds` or `CronExpression` and `Prompt` |

---

## 1. Subagent Support & Delegation

Antigravity handles subagents via the native `invoke_subagent` tool:
- Subagents run asynchronously in the background. The system automatically resumes the parent agent when a subagent finishes or sends a message (**Reactive Wakeup** — do not poll `manage_task` or loop).
- Multiple independent subagents can be launched sequentially or in parallel in a single turn.

### Subagent Types

- **`self`** (`TypeName: "self"`): Spawns an agent inheriting the parent's full toolset and configuration. Use this for all code-writing, test-running, refactoring, and general delegate work (`poteto-agent`).
- **`research`** (`TypeName: "research"`): Spawns a read-only research agent equipped only with file reading and web search. Use for read-only investigation, spec review, and why/how exploration.
- Custom subagents: Use `define_subagent` if a specialized system prompt, permissions, or MCP toolset is required, then invoke with its registered name.

### Parallel Worktree Concurrency

For playbooks that fan out across multiple candidates or slices (`/arena`, `/swarm`, `/architect`):
```json
{
  "TypeName": "self",
  "Role": "Arena Candidate A",
  "Prompt": "Implement idempotency using Redis lock. Verify with tests.",
  "Workspace": "branch"
}
```
Setting `Workspace: "branch"` spins up an isolated branch workspace so concurrent subagents never clobber each other's files.

---

## 2. Task Tracking

Antigravity has **no todo tool** (`manage_task` manages background processes and timers — `list`/`kill`/`status`/`send_input` — it is **not** a checklist).

When a playbook or skill directs you to open a todolist:
1. Create a **Task Artifact** in the artifact directory (`<appDataDir>/brain/<conversation-id>/task.md`) using `write_file` with `ArtifactMetadata` (`UserFacing: true`, `RequestFeedback: false`).
2. List all playbook steps and task milestones as markdown checkboxes (`- [ ] Step 1`).
3. As each milestone completes, edit the artifact with `edit_file` to mark it done (`- [x] Step 1`).
4. Keep the artifact updated as your single source of truth across long sessions.

---

## 3. Model Configuration

pstack's role-based models map to Antigravity's model options:
- `claude-opus-5-5-xhigh` or highest reasoning → `Model: "pro"`
- `grok-4.7-xhigh-fast` or builder default → `Model: "flash"` or `Model: "inherit"`
- Fast worker / swarm explore → `Model: "flash_lite"`

Users can persist model choices globally in `~/.gemini/config/rules/pstack-models.md` using `/setup-pstack`.
