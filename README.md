# pstack for omp (oh-my-pi) & Google Antigravity (agy)

> **"If you want to go fast, go deep first."**  
> Rigorous AI agent workflows you can parallelize with confidence — standalone native plugin for [omp (oh-my-pi)](https://omp.sh/) and **Google Antigravity (`agy`)**.

`pstack` is the engineering methodology and toolset created by **Lauren Tan** ([@poteto](https://x.com/poteto) — former React Core at Meta, Netflix Engineering Manager, Cursor, and Grok Bot lead at SpaceX / xAI). It bridges the gap between quick "vibe coding" and enterprise-grade software delivery, enabling over **2,000 pull requests per month** with high quality, rigorous verification, and zero code slop.

This repository (`https://github.com/tuannt39/pstack`) provides the standalone, native plugin distribution of `pstack` specifically optimized for **omp** (`oh-my-pi`) and **Google Antigravity** (`agy`).

---

## 1. Installation

### 1.1 omp (oh-my-pi)

Install pstack into `omp` with a single command:

```bash
# Install directly from GitHub
omp plugin install git:github.com/tuannt39/pstack

# Or clone and link locally for development
git clone https://github.com/tuannt39/pstack.git
omp plugin link ./pstack
```

Verify your installation:
```bash
omp plugin doctor
```

Once installed:
- All 30+ skills are automatically discovered and available via slash commands (`/poteto-mode`, `/how`, `/why`, `/architect`, `/arena`, `/swarm`, `/interrogate`, `/tdd`, etc.).
- `poteto-mode` and the 24 engineering principles are automatically injected upon session start and post-compaction.
- Full guide: [`docs/harness/omp.md`](docs/harness/omp.md).

### 1.2 Google Antigravity (agy)

Install `pstack` as a native plugin into Antigravity with a single command:

```bash
# Install directly from GitHub
agy plugin install https://github.com/tuannt39/pstack

# Or install from a local checkout for development
agy plugin install ./pstack
```

Verify your installation:
```bash
agy plugin list
agy plugin validate ./pstack
```

Once installed:
- All 57 skills are automatically discovered and invocable via slash commands (`/poteto-mode`, `/how`, `/why`, `/architect`, `/arena`, `/swarm`, `/interrogate`, `/tdd`, etc.).
- Both subagents (`poteto-agent` and `comment-sicko`) are registered.
- `rules/AGENTS.md` automatically injects the `poteto-mode` bootstrap and Antigravity tool mappings into every session.
- Full guide: [`docs/harness/antigravity.md`](docs/harness/antigravity.md).

---

## 2. The 5 Core Pillars

Based on the technical deep-dive in `Phân Tích Kỹ Thuật AI Agent.pdf`:

1. **The Trust Curve (From Micromanager to Head Chef):**
   Engineers in the agent era shift from typing code or manually testing screens ("human relays") to designing kitchen stations, recipe playbooks, and verification harnesses that prevent agents from failing.
2. **Verification Loop & Feature Map:**
   "Done" is not a green build (`BUILD SUCCESSFUL`). "Done" is observable runtime proof. The Feature Map specifies exact DOM/CDP selectors, routes, and preconditions so agents never blindly click.
3. **23 Playbooks & 24 Principles:**
   Structured recipes for every engineering scenario (`Bug fix`, `Perf`, `Hillclimb`, `Autonomous run`, `Shipping`), anchored by non-negotiable principles like `principle-laziness-protocol` and `principle-boundary-discipline`.
4. **Dune Architecture & The 5-Tier Control Tower:**
   Hard constraints replacing soft Markdown text:
   - *Tier 1:* Directory encapsulation & dependency cruiser.
   - *Tier 2:* Compiler & ArchUnit constraints (logical CQRS, no network calls inside `@Transactional`).
   - *Tier 3:* AST Linters with self-healing `[REMEDIATION]` messages (banning direct `useEffect`, `waitForTimeout`, `as any`).
   - *Tier 4:* Automated Playwright/CDP E2E dynamic gates.
   - *Tier 5:* Adversarial review (`/interrogate`) with cross-model judges.
5. **Autonomy Tiers (Reversible vs One-Way Doors):**
   - *Tier 1 (Two-Way Door, < 400 LOC):* Auto-merged after passing linters and independent verifier checks.
   - *Tier 2 (Autopilot Stack):* Linear PR stacks reviewed and landed by architects.
   - *Tier 3 (One-Way Door):* DB migrations, financial ledgers, AuthZ — auto-merge strictly locked; formal verification required.

---

## 3. Why omp is the Ultimate Runtime for pstack

| Feature | Why it matters for pstack |
| --- | --- |
| **Time-Traveling Stream Rules (TTSR)** | Intercepts forbidden patterns (`useEffect`, `waitForTimeout`, `as any`) mid-stream at the token level, aborting and injecting remediation hints instantly. |
| **Real-Time Advisor Role** | A second, independent model watches every turn of the main agent to prevent shortcuts. |
| **Hashline Edit Format** | Line content hashes (`[file.ts#A1B2]`) prevent misapplied diffs and save 61% output tokens. |
| **Native In-Process Tools** | Rust brush shell (58 coreutils), PCRE2 `grep`, `glob`, `read` with slice selectors. |
| **DAP Debugger Protocol (`debug`)** | Direct breakpoints, stack frames, and memory inspection without guessing. |
| **Loopback Eval Kernel (`eval`)** | Python / Bun workers can call back into agent tools (`await tool.read()`) to filter profiling traces before filling context. |
| **Native Worktree Concurrency (`task`)** | Runs parallel subagents (`/arena`, `/swarm`) in isolated Git Worktrees with schema validation. |

---

## 4. Quickstart

Start any non-trivial task by invoking `/poteto-mode`:

```text
/poteto-mode this endpoint has an N+1 query when fetching order items. repro first, then fix and verify.
```

```text
/poteto-mode i'm going to bed. land the stack even if ci flakes. i want everything merged by morning.
```

### The 23 Playbooks
* **Read-only Investigation:** `investigation`, `runtime forensics`, `trace forensics`
* **Fix & Optimize:** `bug fix`, `perf`, `hillclimb`
* **Build & Restructure:** `feature`, `refactoring`, `prototype`, `visual parity`, `multi-phase plan`
* **Review & Merge:** `opening a pr`, `babysit`, `shipping`, `autopilot-full`, `autopilot-stack`
* **Autonomous Runs:** `autonomous run`, `orchestrate`, `session pickup`, `pause safely`
* **Harness & Meta:** `authoring a skill`, `eval`, `worktree cleanup`

---

## 5. Multi-Model Role Routing (`~/.omp/agent/config.yml`)

Configure your model roles to maximize cost-efficiency and reasoning depth:

```yaml
# ~/.omp/agent/config.yml
modelRoles:
  default: "anthropic/claude-sonnet-4-6:high"   # builder: daily code implementation
  smol: "google/gemini-3.5-flash-lite"          # worker: fast exploration, swarm workers
  slow: "anthropic/claude-opus-4-7:max"          # judge: architecture (/architect) & eval
  plan: "anthropic/claude-opus-4-7:high"         # planner: task planning
  advisor: "xai/grok-4.6:high"                  # peer / watchdog: real-time streaming monitor
  vision: "google/gemini-3.8-flash"             # visual parity checking
  commit: "google/gemini-3.5-flash-lite"        # conventional commits
```

See `templates/omp/config.sample.yml` for the complete template with TTSR rules.

---

## 6. Enterprise Blueprints & Operational Tooling

For production multi-agent deployment, explore the guides in `docs/enterprise/`:
- [`01-verification-and-feature-map.md`](./docs/enterprise/01-verification-and-feature-map.md): 6-part Verification Skill & Feature Map.
- [`02-hard-constraints.md`](./docs/enterprise/02-hard-constraints.md): ArchUnit Java & ESLint AST rules with self-healing `[REMEDIATION]`.
- [`03-slot-orchestration.md`](./docs/enterprise/03-slot-orchestration.md): Slot-isolated multi-agent infrastructure (01–20) on shared Docker.
- [`04-eval-and-evolution.md`](./docs/enterprise/04-eval-and-evolution.md): Double-blind skill eval harness & `/correct` matrix.
- [`05-shipping-and-outer-loop.md`](./docs/enterprise/05-shipping-and-outer-loop.md): Benny bot triage ledger & GitHub Actions shipping gate.

Ready-to-use scripts live in `bin/`:
- `bin/check-feature-map.sh`
- `bin/check-no-slop-comments.sh`
- `bin/spawn-agent-slot.sh`
- `bin/audit-decisions.sh`

### Harness Guides
- **omp (`oh-my-pi`)**: [`docs/harness/omp.md`](docs/harness/omp.md)
- **Google Antigravity (`agy`)**: [`docs/harness/antigravity.md`](docs/harness/antigravity.md)
- **Claude Code**: [`docs/harness/claude-code.md`](docs/harness/claude-code.md)

---

## 7. License

MIT
