# pstack in omp (oh-my-pi)

pstack skills run natively inside **omp** (`oh-my-pi`). By packaging pstack with native extension hooks (`package.json` and `.pi/extensions/pstack.ts`), all 30+ skills, playbooks, and 24 engineering principles are auto-discovered and loaded with zero manual copying.

## 1. Installation

Install pstack into your omp installation directly from GitHub:

```bash
# Install directly from Git
omp plugin install git:github.com/tuannt39/pstack

# Or install from a local repository checkout
omp plugin link D:\tuannt21\git\me\me\pstack
```

Once installed:
- `resources_discover` automatically mounts all skills under `./skills`.
- Every session start and post-compaction event injects the `poteto-mode` bootstrap and inline 24 principles index.
- You can invoke `/poteto-mode` directly, or let the router guide complex engineering tasks.

## 2. Tool Mapping

omp provides native Rust-powered and in-process tools that map directly to pstack conventions:

| Cursor / Concept | omp Native Tool | Capability & Advantage |
| --- | --- | --- |
| `Task` / Subagents | `task` | Spawns concurrent subagents in isolated Git Worktrees with schema validation and `agent://<id>` IRC messaging. |
| `AskQuestion` | `ask` | Structured prompt with single/multi-select chips and trade-off previews. |
| Open a todolist | `todo` | Atomic operations (`init`, `start`, `done`, `block`). Dispatched in parallel with execution tools. |
| `Edit` | `edit` | Hashline editing format with snapshot content hashes (`[file.ts#A1B2]`). Immune to drift and saves 61% output tokens. |
| `View` / `Read` | `read` | Unified file, directory, SQLite, PDF, archive reader with inline line slicing (`path:10-50`). |
| `Grep` / `Glob` | `grep` / `glob` | Built-in PCRE2 regex search and filesystem globbing inside the omp Rust core (zero fork/exec overhead). |
| `Bash` | `bash` | Persistent shell powered by Rust brush shell with 58 built-in coreutils. |
| Runtime Forensics | `debug` | DAP (Debugger Adapter Protocol) integration. Attach to JVM, Python, Node, Go processes, set breakpoints, inspect stack frames. |
| Profile / Trace Analysis | `eval` | Persistent Bun/Python loopback kernel. Code inside `eval` can call back into agent tools via `await tool.<name>()`. |
| Code Intelligence | `xd://lsp` & `xd://ast_edit` | LSP queries (definitions, references, renames) and AST-aware refactorings. |

## 3. Subagent Delegation

When running playbooks that fan out (such as `/arena`, `/swarm`, or `/architect`), omp's `task` tool provides native worktree isolation:

```typescript
// Example: Delegating an arena or swarm slice via omp's task tool
await tool.task({
  context: "# Goal: Refactor OrderCheckout to enforce idempotency\n# Contract: OrderCommandPort",
  tasks: [
    {
      name: "ArenaWorkerA",
      task: "Implement idempotency using Redis distributed lock. Verify with verify-platform.",
      solutionSpace: "Redis lock pattern",
      agent: "task"
    },
    {
      name: "ArenaWorkerB",
      task: "Implement idempotency using PostgreSQL unique constraint and outbox event. Verify with verify-platform.",
      solutionSpace: "DB unique constraint pattern",
      agent: "task"
    }
  ]
});
```

Subagents run in parallel without stepping on each other's files, and coordinate through `agent://all` or report structured results back to the coordinator.

## 4. Multi-Model Role Routing (`~/.omp/agent/config.yml`)

pstack assigns roles (worker, builder, judge, peer) based on model strengths. In omp, configure these via `modelRoles` in `~/.omp/agent/config.yml`:

```yaml
# ~/.omp/agent/config.yml
modelRoles:
  # [builder] Daily implementation, refactoring, bug fixes
  default: "anthropic/claude-sonnet-4-6:high"

  # [worker] Fast exploration, simple edits, swarm workers
  smol: "google/gemini-3.5-flash-lite"

  # [judge] Deepest reasoning: /architect, root-cause forensics, eval judge
  slow: "anthropic/claude-opus-4-7:max"

  # [planner] Task planning and playbook decomposition
  plan: "anthropic/claude-opus-4-7:high"

  # [peer / watchdog] Real-time streaming monitor watching main agent turns
  advisor: "xai/grok-4.6:high"

  # Visual parity inspection
  vision: "google/gemini-3.8-flash"

  # Conventional commit messages
  commit: "google/gemini-3.5-flash-lite"

# Path-based overrides: force strongest model on high-risk code
pathModelOverrides:
  "**/src/test/**": "pi/smol"
  "**/domain/payment/**": "pi/slow"
  "**/db/migration/**": "pi/slow"

# Automatic fallback chains on rate limits or 5xx
retry:
  fallbackChains:
    default:
      - "xai/grok-4.6:high"
      - "openai-codex/gpt-5.5:high"
    slow:
      - "openai-codex/gpt-5.5:max"
      - "xai/grok-4.6:high"
```

## 5. Time-Traveling Stream Rules (TTSR)

Instead of waiting for an agent to finish writing a file and fail a linter on CI, omp's **TTSR** intercepts forbidden anti-patterns mid-stream, aborts generation, injects a remediation reminder, and retries:

```yaml
# Add to ~/.omp/agent/config.yml
ttsr:
  enabled: true
  rules:
    - id: "ban-react-use-effect"
      pattern: "\\buseEffect\\s*\\("
      reminder: |
        [TTSR INTERCEPT - principle-minimize-reader-load]:
        Direct useEffect is banned in feature components.
        Remediation: (1) Compute derived values during render; (2) Move side effects to event handlers; (3) Use dedicated hooks from 'src/shared/hooks/'.

    - id: "ban-playwright-hard-sleep"
      pattern: "\\.waitForTimeout\\s*\\("
      reminder: |
        [TTSR INTERCEPT - principle-prove-it-works]:
        page.waitForTimeout() hard sleep is banned in E2E tests.
        Remediation: Await an observable DOM or network state, e.g. await expect(page.getByTestId('...')).toBeVisible().

    - id: "ban-typescript-any-escape"
      pattern: "\\bas\\s+(any|unknown)\\b|:\\s*any\\b"
      reminder: |
        [TTSR INTERCEPT - principle-type-system-discipline]:
        Casting to 'any' or using ': any' is banned.
        Remediation: Define an explicit type or parse external data with a Zod schema at the system boundary.
```

## 6. Daily Super-Workflows on omp

### Workflow A: Checkpoint & Rewind Investigation
When investigating subtle bugs (Playbook `Bug fix` or `Investigation`):
1. Call `checkpoint` before reading dozens of unfamiliar files.
2. Form competing hypotheses, read files, run reproduction tests.
3. Once the root cause is confirmed, call `rewind`: all intermediate exploration turns are wiped from the context window, leaving only the concise diagnosis.
4. Implement the fix with 100% fresh, uncluttered context.

### Workflow B: DAP Debugger Forensics
When a process hangs, deadlocks, or loops indefinitely:
1. Use omp's `debug` tool to attach via DAP (JDWP for Java, debugpy for Python, lldb/delve for Go/Rust).
2. Set breakpoints and inspect local variables and threads directly.
3. Eliminate guesswork with ground-truth runtime state.

### Workflow C: Loopback Trace Forensics
When analyzing large CPU traces or heap profiles:
1. Run a script inside `eval` (Bun or Python).
2. The script processes the raw JSON trace, extracts the top 5 bottleneck functions, and calls `await tool.read({ path: funcPath })` to fetch the source code.
3. Only the summarized findings enter the conversation, protecting the context window.
