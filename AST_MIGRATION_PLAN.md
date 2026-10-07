# AST-Driven Formatter Migration Plan (No Behavior Change Yet)

## Objective
Migrate both formatter engines from regex/string-rule transforms to AST-driven formatting while preserving existing formatting outcomes and idempotency.

This phase introduces only architecture and execution planning. No business/formatting behavior is changed in this document-only step.

## Scope
- VS Code formatter implementation under `vscode/src/formatter/`
- IntelliJ formatter implementation under `intellij/src/main/kotlin/com/accenture/formatter/`
- Existing rules to preserve:
  - Rule 1 (annotation line placement)
  - Rule 4 (method/constructor parameter wrapping)
  - Rule 5 (extends/implements/throws layout)
  - Rule 6 (method call argument wrapping)
  - Rule 7 (assignment RHS continuation indentation)
  - Rule 8 (chained call wrapping)
  - Rule 9 (line-length wrapping)
  - Rule 10 (trigger integration: format command/save)
  - ternary normalization and text-block/string literal preservation

## Target Architecture

### 1) Shared conceptual pipeline
1. Parse source to AST
2. Build semantic formatting model (nodes + trivia/comments)
3. Apply rule passes over model (declarative where possible)
4. Emit formatted text using indentation/line-break policy
5. Validate idempotency and parity against golden tests

### 2) VS Code implementation target
- Introduce modules (proposed):
  - `vscode/src/formatter/ast/parser.ts`
  - `vscode/src/formatter/ast/model.ts`
  - `vscode/src/formatter/ast/rules/*.ts`
  - `vscode/src/formatter/ast/emitter.ts`
  - `vscode/src/formatter/ast/engine.ts`
- Keep existing formatter as fallback engine:
  - `vscode/src/formatter/javaFormatter.ts` (legacy engine)
- Engine selector (proposed):
  - config: `accentureJava.format.engine` with values `legacy | ast-preview`
  - default remains `legacy` until parity passes

### 3) IntelliJ implementation target
- Introduce modules (proposed):
  - `intellij/src/main/kotlin/com/accenture/formatter/ast/AstParser.kt`
  - `intellij/src/main/kotlin/com/accenture/formatter/ast/AstModel.kt`
  - `intellij/src/main/kotlin/com/accenture/formatter/ast/rules/*`
  - `intellij/src/main/kotlin/com/accenture/formatter/ast/AstEmitter.kt`
  - `intellij/src/main/kotlin/com/accenture/formatter/ast/AstFormattingEngine.kt`
- Keep legacy engine:
  - `AccentureJavaFormatter.kt`
- Use feature flag/config to switch only after parity confidence.

## Parser Strategy

### VS Code side
- Primary candidate: Java parser library for TypeScript runtime that preserves token/trivia enough for formatting.
- Fallback path: invoke a JVM-based parser service only if JS parser cannot preserve required constructs (text blocks, annotations, generics, comments).

### IntelliJ side
- Preferred: IntelliJ PSI/AST available in plugin runtime.
- Reuse PSI nodes and formatting model projection rather than rebuilding parser stack.

## Rule-to-AST Mapping

- Rule 1: Annotation nodes attached to declarations/parameters; enforce line-break policy at annotation boundary.
- Rule 4: Method/constructor declaration nodes; parameter list decision by count/line-length budget.
- Rule 5: Type declaration/method signature clauses (`extends`, `implements`, `throws`) as separate clause nodes.
- Rule 6: Method invocation argument list nodes.
- Rule 7: Assignment expression nodes with continuation indentation policy.
- Rule 8: Chained call/member access expression spine decomposition.
- Rule 9: Global line budget + local wrapping heuristics in emitter.
- Ternary: Conditional expression nodes with branch-safe wrapping.
- String/text blocks: literal nodes marked as immutable content.

## Migration Phases

### Phase 0 (current, this change)
- Produce migration plan and architecture definition.
- No behavior changes.

### Phase 1
- Create AST engine skeletons in both platforms.
- Add parser adapter interfaces.
- Wire engine selector with default `legacy`.
- No output change by default.

### Phase 2
- Implement AST model + emitter for a minimal subset:
  - package/import/class blocks
  - basic indentation and brace placement
- Keep unsupported constructs delegated to legacy or pass-through.

### Phase 3
- Port rule passes incrementally (1, 4, 5, 6, 7, 8, 9 + ternary).
- Add per-rule parity tests against existing suites.

### Phase 4
- Full parity verification and idempotency hardening.
- Enable `ast-preview` in CI matrix.

### Phase 5
- Flip default engine when parity criteria are met.
- Keep legacy fallback for one release cycle.

## Parity and Safety Gates
- Existing tests must remain green for legacy path.
- Add dual-engine snapshot comparison tests for shared fixtures.
- Require:
  - No regression in 35/35 VS Code tests (or current total)
  - No regression in IntelliJ formatter test suite
  - Idempotency check passes for AST engine

## Risks
- Parser differences between JS and IntelliJ PSI can cause cross-platform divergence.
- Comment/trivia preservation is the highest regression risk.
- Chained/lambda/ternary wrapping requires deterministic emitter behavior.

## Recommended Next Change Set (safe)
1. Add engine selector config with default `legacy`.
2. Add AST engine interface and no-op/skeleton implementation in both platforms.
3. Add dual-engine test harness with parity fixtures (AST engine expected to match legacy for covered subset).

## Non-Goals (for now)
- Changing formatting rules or style definitions.
- Removing legacy formatter.
- Altering command UX or triggering behavior.
