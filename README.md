# pstack

> **"If you want to go fast, go deep first."**  
> Rigorous AI agent workflows you can parallelize with confidence — standalone native plugin for **Google Antigravity (`agy`)** and **omp (oh-my-pi)**.

`pstack` is the engineering methodology and toolset created by **Lauren Tan** ([@poteto](https://x.com/poteto) — former React Core at Meta, Netflix Engineering Manager, Cursor, and Grok Bot lead at SpaceX / xAI). It bridges the gap between quick "vibe coding" and enterprise-grade software delivery, enabling over **2,000 pull requests per month** with high quality, rigorous verification, and zero code slop.

This repository (`https://github.com/tuannt39/pstack`) provides the standalone, native plugin distribution of `pstack` for modern AI coding harnesses.

---

## 1. Installation

### Google Antigravity (`agy`)

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
agy plugin validate ./pstack --strict
```

Once installed:
- All 57 skills are automatically discovered and invocable via slash commands (`/poteto-mode`, `/how`, `/why`, `/architect`, `/arena`, `/swarm`, `/interrogate`, `/tdd`, etc.).
- Both subagents (`poteto-agent` and `comment-sicko`) are registered.
- `rules/AGENTS.md` automatically injects the `poteto-mode` bootstrap and Antigravity tool mappings into every session.
- Full guide: [`docs/harness/antigravity.md`](docs/harness/antigravity.md).

### omp (oh-my-pi)

Install `pstack` into `omp`:

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
- All skills are mounted via `resources_discover`.
- `poteto-mode` and the 24 engineering principles are injected upon session start and post-compaction.
- Full guide: [`docs/harness/omp.md`](docs/harness/omp.md).

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

## 3. Quickstart

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

## 4. Harness Guides

- **Google Antigravity (`agy`)**: [`docs/harness/antigravity.md`](docs/harness/antigravity.md)
- **omp (`oh-my-pi`)**: [`docs/harness/omp.md`](docs/harness/omp.md)
- **Claude Code**: [`docs/harness/claude-code.md`](docs/harness/claude-code.md)

---

## 5. Enterprise Blueprints & Operational Tooling

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

---

## 6. License

MIT
