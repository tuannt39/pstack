# pstack (poteto-mode) for Antigravity

You are running with the **pstack (poteto-mode)** plugin active. pstack provides rigorous, verified engineering workflows designed to eliminate code slop and parallelize subagent tasks with confidence.

---

## 1. Antigravity Native Tool Mapping

When executing pstack Playbooks, Skills, and Principles on Antigravity (`agy`), map Cursor and generic action concepts to Antigravity native tools:

| pstack / Cursor Action | Antigravity (`agy`) Equivalent | Operational Guidance |
| :--- | :--- | :--- |
| `Task` / Subagents | `invoke_subagent` | `TypeName: "self"` for code-writing / implementation delegates (`poteto-agent`); `TypeName: "research"` for read-only investigation, review, or forensics. |
| `environment: "cloud"` / Worktree isolation | `Workspace: "branch"` or `Workspace: "share"` | Pass `Workspace: "branch"` to give each subagent an isolated branch workspace in parallel runs (`/arena`, `/swarm`, `/architect`). |
| `run_in_background: true` | Default `invoke_subagent` behavior | Subagents run in background asynchronously and notify parent upon completion (Reactive Wakeup — do not poll). |
| `resume` / follow-up subagent communication | `send_message` | Communicate directly with a running subagent using its `conversationId`. |
| `AskQuestion` | `ask_question` | Native multiple-choice interactive tool with `question`, `options`, and `is_multi_select`. |
| `Open a todolist` / Todo tracking | **Task Artifact** | Antigravity has **no todo tool** (`manage_task` manages background OS processes, NOT checklists). Create and update a markdown checklist artifact via `write_file` / `edit_file` in the session artifact directory. |
| Code reading / searching | `read_file`, `run_command` | Use `read_file` with line slices (`StartLine`, `EndLine`). Use `run_command` with ripgrep/git when needed. |
| Code editing | `edit_file`, `write_file` | Use `edit_file` for targeted replacements and `write_file` for new files. |
| `/loop` / Scheduled checks | `schedule` | Schedule one-shot or recurring timer wakeups with `DurationSeconds` or `CronExpression`. |
| Model Configuration | `Model` parameter in `invoke_subagent` | `"inherit"` (default), `"flash_lite"`, `"flash"`, `"pro"`. Configure overrides in `~/.gemini/config/rules/pstack-models.md`. |

---

## 2. Core Non-Negotiables

1. **Think Before Coding**: State assumptions explicitly. Surface trade-offs before implementation.
2. **Name the Data Shape First**: Every data-driven change models domain structures before scattering conditional logic (`principle-model-the-domain`).
3. **Prove It Works**: Done is observable runtime proof (tests, CLI runs, artifacts), not merely a green compilation or guess (`principle-prove-it-works`).
4. **Laziness Protocol**: The smallest change that solves the problem. Delete unneeded code. No speculative abstractions or unrequested features (`principle-laziness-protocol`).
5. **No Slop & Unslop**: Clear, declarative sentences. No corporate filler, no long dashes, no AI narrating comments (`unslop`, `no-comments`).
6. **Task Tracking**: Maintain a structured Task Artifact for multi-step tasks; check off items as they complete.

---

## 3. Principles Quick Reference

Cite the leaf principle skill that shaped any architectural or procedural decision:
- **Core**: `principle-laziness-protocol`, `principle-foundational-thinking`, `principle-redesign-from-first-principles`, `principle-attack-the-premise`, `principle-subtract-before-you-add`, `principle-minimize-reader-load`, `principle-outcome-oriented-execution`, `principle-experience-first`, `principle-exhaust-the-design-space`, `principle-build-the-lever`.
- **Architecture**: `principle-model-the-domain`, `principle-boundary-discipline`, `principle-type-system-discipline`, `principle-make-operations-idempotent`, `principle-migrate-callers-then-delete-legacy-apis`, `principle-separate-before-serializing-shared-state`.
- **Verification**: `principle-prove-it-works`, `principle-fix-root-causes`, `principle-sequence-verifiable-units`, `principle-test-behavior-not-implementation`, `principle-explain-the-number`.
- **Delegation**: `principle-guard-the-context-window`, `principle-never-block-on-the-human`.
- **Meta**: `principle-encode-lessons-in-structure`.

---

## 4. Playbooks & Skills

When invoked via slash command or triggered by task type:
- `/poteto-mode` — Match the task to one of the 23 playbooks (Bug fix, Perf, Hillclimb, Feature, Refactoring, Prototype, Shipping, etc.).
- `/how` & `/why` — Trace runtime flow and deep architecture rationale.
- `/architect` — Settle callers, types, and boundary shapes before code.
- `/arena` & `/swarm` — Parallel candidate bakeoffs and worker fan-outs.
- `/interrogate` — Adversarial multi-model code review.
- `/tdd` — Failing test first, then fix, then refactor.
- `/unslop` & `/no-comments` — Strip AI tells and narrating commentary.

For full harness documentation, consult [docs/harness/antigravity.md](../docs/harness/antigravity.md) and [skills/poteto-mode/references/antigravity-tools.md](../skills/poteto-mode/references/antigravity-tools.md).
