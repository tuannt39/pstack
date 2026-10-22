# Enterprise Blueprint 02: Self-Healing Hard Constraints

Under pstack's `principle-encode-lessons-in-structure`:
*"When you catch yourself correcting an AI agent for the same mistake a second time, do not write more words in Markdown. Encode it as a compiler check, linter rule, or CI gate."*

To enable AI agents to self-correct without human intervention, every automated rule failure must follow the **Self-Healing Error Format**:
1. `[VIOLATION: <principle-name>]`: The exact architectural principle violated.
2. `[WHY]`: The technical consequence (e.g. database pool starvation, frame drops, race condition).
3. `[REMEDIATION]`: The exact code pattern or replacement class to use.

---

## 1. Backend ArchUnit Test Suite (`AgentHardConstraintsArchTest.java`)

Place this test in your architecture verification module. When an agent violates any of these enterprise boundaries, `./gradlew check` fails with immediate remediation guidance:

```java
package vn.enterprise.architecture;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaCall;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaField;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import jakarta.persistence.Entity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RestController;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.*;

@AnalyzeClasses(packages = "vn.enterprise.platform", importOptions = {ImportOption.DoNotIncludeTests.class})
public class AgentHardConstraintsArchTest {

    // LUẬT 1: CƯỠNG CHẾ LOGICAL CQRS (Tách biệt Query side và Command side)
    @ArchTest
    static final ArchRule cqrs_query_side_must_never_mutate_state =
        noClasses().that().resideInAPackage("..query..")
            .should().dependOnClassesThat().resideInAPackage("..command..")
            .orShould().callMethodWhere(new DescribedPredicate<>("gọi hàm ghi dữ liệu (save/delete/update)") {
                @Override
                public boolean test(JavaCall<?> call) {
                    String name = call.getTarget().getName();
                    return name.startsWith("save") || name.startsWith("delete") || name.startsWith("update");
                }
            })
            .because("[VIOLATION: principle-boundary-discipline & Logical CQRS]\n" +
                     "[WHY]: Package '..query..' routes to Read-Replicas. Mutation causes replica write failures.\n" +
                     "[REMEDIATION]: Use read-only Projections in '..query..'. Move write operations to CommandHandler.");

    // LUẬT 2: CHỐNG TREO DB CONNECTION POOL (Cấm I/O mạng trong @Transactional)
    @ArchTest
    static final ArchRule transactional_methods_must_never_perform_external_io =
        noClasses().that().areAnnotatedWith(Transactional.class)
            .should().dependOnClassesThat().resideInAnyPackage(
                "..infrastructure.client..",
                "org.springframework.kafka.core..",
                "org.springframework.amqp.rabbit.core..",
                "org.springframework.web.client.."
            )
            .because("[VIOLATION: principle-foundational-thinking — Connection Pool Starvation]\n" +
                     "[WHY]: Network I/O inside @Transactional blocks DB connections, exhausting Hikari pool under load.\n" +
                     "[REMEDIATION]: Write events to 'outbox_events' table in the transaction, or emit events AFTER_COMMIT.");

    // LUẬT 3: KỶ LUẬT RANH GIỚI API (Cấm trả JPA Entity ra REST Controller)
    @ArchTest
    static final ArchRule rest_controllers_must_never_leak_jpa_entities =
        methods().that().areDeclaredInClassesThat().areAnnotatedWith(RestController.class)
            .should().notHaveRawReturnType(DescribedPredicate.describe("JPA @Entity class",
                c -> c.isAnnotatedWith(Entity.class) || c.getPackageName().contains(".persistence.")))
            .because("[VIOLATION: principle-boundary-discipline — Persistence Leakage]\n" +
                     "[WHY]: Returning JPA entities triggers LazyInitializationException and exposes schema.\n" +
                     "[REMEDIATION]: Map internal entities to immutable Java record DTOs at the controller boundary.");
}
```

---

## 2. Frontend ESLint AST Rules (`eslint.config.mjs`)

Enforce architectural discipline on React and Playwright E2E suites:

```javascript
// eslint.config.mjs
import tseslint from 'typescript-eslint';

export default tseslint.config({
  files: ['**/*.ts', '**/*.tsx'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.name='useEffect']",
        message:
          "[VIOLATION: principle-minimize-reader-load] Direct useEffect is banned in feature components.\n" +
          "[REMEDIATION]: (1) Derive state in render; (2) Move side-effects to event handlers; (3) Use shared custom hooks."
      },
      {
        selector: "CallExpression[callee.property.name='waitForTimeout']",
        message:
          "[VIOLATION: principle-prove-it-works] page.waitForTimeout() is banned in Playwright.\n" +
          "[REMEDIATION]: Await explicit DOM or network conditions: await expect(page.getByTestId(...)).toBeVisible()."
      }
    ]
  }
});
```

---

## 3. Anti-Slop Comment Script (`bin/check-no-slop-comments.sh`)

AI models tend to pollute code with narrating comments (`// fix bug as requested`). This script rejects inline comments added in PR diffs:

```bash
#!/usr/bin/env bash
# bin/check-no-slop-comments.sh — Rejects AI inline comment slop
set -euo pipefail

SLOP_COMMENTS=$(git diff --cached -U0 -- '*.ts' '*.tsx' '*.java' \
  | grep -E '^\+\s*//' \
  | grep -vE '^\+\s*//\s*(eslint-disable|@ts-expect-error|noinspection|https?://)' || true)

if [[ -n "$SLOP_COMMENTS" ]]; then
  echo "[VIOLATION: /no-comments & principle-encode-lessons-in-structure]" >&2
  echo "New inline comments detected in git diff:" >&2
  echo "$SLOP_COMMENTS" >&2
  echo "" >&2
  echo "REMEDIATION:" >&2
  echo "1. If narrating what code does -> Delete it; make variable/method names self-explanatory." >&2
  echo "2. If describing a required invariant -> Encode as a Type, assert, or unit test." >&2
  exit 1
fi

echo "[NO-COMMENTS OK] Diff is free of inline comment slop."
```
