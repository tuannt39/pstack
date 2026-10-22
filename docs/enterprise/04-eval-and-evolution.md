# Enterprise Blueprint 04: Skill Eval & Self-Evolution

How do you know if an edit to a `SKILL.md` or system prompt actually makes agents smarter rather than confusing them? And how does your codebase evolve to prevent recurring mistakes?

---

## 1. The Double-Blind Skill Eval Harness

LLMs game evals: when an agent detects directory names containing `eval`, `benchmark`, or `test-skill`, it alters its behavior and answers unnaturally.

pstack's Eval Playbook uses a **Double-Blind A/B Protocol**:

1. **Camouflaged Workspaces:**
   - Clone the evaluation task into realistic paths (e.g. `/tmp/work/orders-service-hotfix-3910`).
   - Strip any harness headers or scoring keywords.
2. **Parallel A/B Arms:**
   - Run 3–5 trials with the Baseline skill (Control).
   - Run 3–5 trials with the Candidate skill (Treatment).
3. **Cross-Model Blinded Judge:**
   - An independent judge model (from a different model family than the workers) scores anonymized transcripts against an automated rubric.

### Sample Quantitative Rubric (`eval-rubric.json`)

```json
{
  "skill_under_test": "bug-fix-playbook",
  "evaluation_rubric": [
    {
      "criterion_id": "repro_before_edit",
      "weight": 30,
      "description": "Reproduction test or verification harness was executed BEFORE modifying source code."
    },
    {
      "criterion_id": "no_speculative_guessing",
      "weight": 25,
      "description": "Agent read relevant callers and files before declaring a root cause hypothesis."
    },
    {
      "criterion_id": "minimal_diff_laziness",
      "weight": 25,
      "description": "Diff solved defect with zero extraneous wrapper classes or boilerplate."
    },
    {
      "criterion_id": "real_artifact_proof",
      "weight": 20,
      "description": "Final verification evidence exists on disk with passed == true."
    }
  ]
}
```

---

## 2. The `/correct` Enforcement Matrix (`docs/architecture/ENFORCEMENT_MATRIX.md`)

When you run `/correct`, the agent scans past PR reviews and chat transcripts to extract **Mistake Classes**, then pushes them up to the highest possible defense tier in the 5-tier tower:

| Error Code | Violation Description | Defense Tier | Enforcing Rule / Tool |
| --- | --- | --- | --- |
| **ERR-01** | Direct HTTP/Kafka call inside `@Transactional` | **Tier 2 (ArchUnit)** | `AgentHardConstraintsArchTest.java` -> `transactional_methods_must_never_perform_external_io` |
| **ERR-02** | Hardcoded sleep `waitForTimeout(3000)` in E2E tests | **Tier 3 (AST Lint)** | `eslint.config.mjs` -> `no-restricted-syntax (waitForTimeout)` |
| **ERR-03** | Route added in AppRouter without Feature Map entry | **Tier 4 (CI Gate)** | `bin/check-feature-map.sh` |
| **ERR-04** | Use of `double`/`float` for financial balance | **Tier 2 (ArchUnit)** | `AgentHardConstraintsArchTest.java` -> `financial_fields_must_use_strict_types` |
| **ERR-05** | Unauthorized new flag added to `application.yml` | **Tier 5 (Soft Rule)** | `principle-laziness-protocol` + `/interrogate` |

### The Enforcement Rule of `/correct`:
Any violation currently residing at **Tier 5 (Soft text in Markdown)** that recurs a second time must be elevated to **Tier 1, 2, 3, or 4** in the following sprint.
