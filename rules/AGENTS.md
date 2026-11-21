# pstack (poteto-mode) for Antigravity

You are running with the **pstack (poteto-mode)** plugin active. pstack provides verified engineering workflows that parallelize cleanly across subagents and workspaces.

---

## 1. Antigravity Native Tool Mapping

When executing pstack Playbooks, Skills, and Principles on Antigravity (`agy`), map Cursor and generic action concepts to Antigravity native tools:

| pstack / Cursor Action | Antigravity (`agy`) Equivalent | Operational Guidance |
| :--- | :--- | :--- |
| `Task` / Subagents | `invoke_subagent` | `TypeName: "self"`, `"research"` (read-only), or bundled `"poteto-agent"` / `"comment-sicko"`. Use `define_subagent` for transient custom subagents and `manage_subagents` (`list`, `kill`, `kill_all`) to manage them. |
| `environment: "cloud"` / Worktree isolation | `Workspace: "branch"` or `Workspace: "share"` | Pass `Workspace: "branch"` to give each subagent an isolated cloned workspace in parallel runs (`/arena`, `/swarm`). |
| `run_in_background: true` | Default `invoke_subagent` behavior | Subagents run in the background and wake the parent on completion (Reactive Wakeup, do not poll). |
| `resume` / follow-up subagent communication | `send_message` | Send follow-up instructions to a running or idle subagent by its `conversationId`. |
| Scripted fan-out / staged pipelines | `run_workflow` | Runs a `/run-workflow` Python script with `phase()`, `agent()`, `parallel()`, `pipeline()`, and JSON Schema outputs. |
| Live shared-board swarm | `swarm` | Call ONLY when the user explicitly invoked `/swarm` or a swarm is already active. Otherwise pstack's `/swarm` skill uses `invoke_subagent` with `Workspace: "branch"` or `"share"`. |
| UI / browser verification (`control-ui`) | `/browser` subagent | Uses the built-in browser in Antigravity App on personal accounts, or local Chrome DevTools MCP in CLI (`v144+`). |
| `AskQuestion` | `ask_question` | Native multiple-choice prompt with `question`, `options`, and `is_multi_select`. |
| `Open a todolist` / Todo tracking | **Task Artifact** | Antigravity has no todo tool (`manage_task` manages background processes and timers). Write and update a markdown checklist artifact in `<appDataDir>/brain/<conversation-id>/task.md`. |
| Code reading / searching | `read_file`, `run_command` | Use `read_file` with line ranges (`StartLine`, `EndLine`). Use `run_command` with `rg` or `git` when needed. |
| Code editing | `edit_file`, `write_file` | Use `edit_file` for targeted replacements and `write_file` for new files. |
| `/loop` / Scheduled checks | `schedule` | Schedule one-shot (`DurationSeconds`) or recurring cron (`CronExpression`) wakeups. |
| Model configuration | `Model` parameter / `/model` | Pass `Model` (`"inherit"`, `"flash_lite"`, `"flash"`, `"pro"`) to `invoke_subagent`. Configure CLI session models and effort (`Orchestrator`, `gemini-4-neon-xhigh`) via `agy --model`, `/model`, or `/effort`, and subagent tier overrides in `~/.gemini/config/rules/pstack-models.md`. |

---

## 2. Core Non-Negotiables

1. **Think Before Coding**: State assumptions explicitly. Surface trade-offs before implementation.
2. **Name the Data Shape First**: Model domain structures before scattering conditional logic (`principle-model-the-domain`).
3. **Prove It Works**: Done is observable runtime proof (tests, CLI runs, screenshots, artifacts), not a green build (`principle-prove-it-works`).
4. **Laziness Protocol**: Make the smallest change that solves the problem. Delete unneeded code. Avoid speculative abstractions (`principle-laziness-protocol`).
5. **No Slop & Unslop**: Write clear, declarative sentences. No corporate filler, no em dashes, no AI narrating comments (`unslop`, `no-comments`).
6. **Task Tracking**: Maintain a Task Artifact checklist for multi-step tasks and check off items as they complete.

---

## 3. Principles Quick Reference

Cite the leaf principle skill that shaped each architectural or procedural choice:
- **Core**: `principle-laziness-protocol`, `principle-foundational-thinking`, `principle-redesign-from-first-principles`, `principle-attack-the-premise`, `principle-subtract-before-you-add`, `principle-minimize-reader-load`, `principle-outcome-oriented-execution`, `principle-experience-first`, `principle-exhaust-the-design-space`, `principle-build-the-lever`.
- **Architecture**: `principle-model-the-domain`, `principle-boundary-discipline`, `principle-type-system-discipline`, `principle-make-operations-idempotent`, `principle-migrate-callers-then-delete-legacy-apis`, `principle-separate-before-serializing-shared-state`.
- **Verification**: `principle-prove-it-works`, `principle-fix-root-causes`, `principle-sequence-verifiable-units`, `principle-test-behavior-not-implementation`, `principle-explain-the-number`.
- **Delegation**: `principle-guard-the-context-window`, `principle-never-block-on-the-human`.
- **Meta**: `principle-encode-lessons-in-structure`.

---

## 4. Playbooks, Skills, and CLI Ergonomics

When invoked via slash command or triggered by task type:
- `/poteto-mode`: Match the task to one of the 22 playbooks (`Bug fix`, `Perf issue`, `Hillclimb`, `Feature`, `Refactoring`, `Prototype`, `Shipping`, etc.). Lead every spawned agent kickoff with `Read <path>/worker.md before anything else.` (`<path>` is the absolute path of `skills/poteto-mode`).
- `/how` & `/why`: Trace runtime flow or inspect commit and PR rationale.
- `/architect`: Trace touched systems, sketch two shapes, and settle boundaries (or run `/arena` when contested).
- `/arena` & `/swarm`: Run parallel candidate bakeoffs and worker fan-outs.
- `/interrogate`: Run adversarial multi-model code review.
- `/tdd`: Write a failing test first, then fix and refactor.
- `/unslop` & `/no-comments`: Strip AI tells and narrating commentary.

CLI session controls (`agy` v1.5+):
- Cycle execution modes with `Shift+Tab` (`auto` default where the OS sandbox is available, `accept-edits`, `plan`, `default`).
- Review per-turn changes with `/diff`, and review artifacts with `Ctrl+R`.
- Keep context lean with `/rewind` (`/undo`), `/compact`, and `/fork`.
- Manage background work via `/agents` (`Alt+J` jumps to waiting approvals, `Ctrl+K` approves in place) and `/tasks`.

For full harness documentation, read [docs/harness/antigravity.md](../docs/harness/antigravity.md) and [skills/poteto-mode/references/antigravity-tools.md](../skills/poteto-mode/references/antigravity-tools.md).
