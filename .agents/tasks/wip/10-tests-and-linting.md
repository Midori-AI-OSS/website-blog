# Task 10: Tests and Linting

## Objective
Verify test coverage and fix all lint issues across the radio feature.

## Requirements

### Test Verification

Run tests with the project's test runner: `bun test`

Confirm tests exist and pass for:
- `lib/radio/loreSessionMap.test.ts` (from task 01)
- `lib/radio/probe.test.ts` (from task 03)
- `lib/radio/images.test.ts` (existing — verify still passes)
- `lib/radio/client.test.ts` (existing — verify still passes)
- `components/radio/RadioWidget.test.tsx` (existing — verify still passes)
- Any other new test files introduced by the radio feature

If any task hasn't been completed yet, skip its test verification but note it.

### Linting

The project uses Biome via `bun lint` (which runs `biome check .`).

1. Run `bunx biome check --write .` to auto-fix formatting and safe lint issues.
2. Run `bun lint` to verify no remaining issues.
3. If any lint issues remain after auto-fix, document them in the commit message or a summary:
   - File path
   - Line number
   - Rule name
   - Brief description of why it remains

### Fixes
- Fix any issues that can be reasonably resolved.
- Do not suppress rules with `// biome-ignore` comments without explicit justification. The codebase already has one such suppression (line 694 of RadioPageClient.tsx) — match that pattern if adding new ones.
- If a rule violation is intentional and justified, document the justification.

### Common things to check:
- Unused imports (Biome catches these).
- Missing `import type` for type-only imports (required by `verbatimModuleSyntax: true`).
- Undefined variables or missing exports.
- Test files using wrong import paths (e.g., `@/` alias vs relative).

## Done Criteria
- All existing and new tests pass: `bun test`
- `bun lint` passes with zero warnings, or remaining issues are documented with justification
- No new lint regressions introduced
