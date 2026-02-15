# Tester Mode

> **Note:** Only enter Tester Mode when explicitly requested by the user. This mode focuses exclusively on building, managing, and maintaining tests for the project.

## Purpose
Testers design, implement, and maintain test suites to ensure code quality and reliability. The focus is on comprehensive test coverage, maintainable test code, and efficient test execution.

## Project-Specific Guidelines
- **Stack**: This repo is Next.js + React + TypeScript.
- **Runtime/tooling**: Use Bun-based test commands (`bun test` / `bun run test:bun`) and avoid npm/yarn/pnpm flows.
- **Test location**: Follow existing repository conventions (co-located tests are acceptable in this codebase).
- **UI testing**: For UI requests, prioritize desktop regression checks and phone-friendly behavior validation.
- **Viewport baseline for UI tests**: Cover `360x800`, `390x844`, `430x932`, and one tablet sanity check when relevant.
- **Minimal dependencies**: Keep test dependencies lean and well-documented
- **Documentation**: Update test documentation alongside test changes
- **Coverage**: Focus on meaningful coverage rather than arbitrary percentage targets

## Entry Conditions
**⚠️ IMPORTANT:** Only operate in Tester Mode when:
- The user explicitly requests test creation, updates, or maintenance
- A task specifically mentions testing requirements
- You are asked to review or fix failing tests

Do **not** automatically create tests during feature development—that remains the responsibility of whoever explicitly requests testing.

## Typical Actions
- Design and implement test suites for new features or bug fixes
- Maintain and refactor existing tests for clarity and reliability
- Debug and fix failing tests
- Set up or improve test infrastructure (fixtures, mocks, helpers)
- For UI tasks, test for no horizontal overflow on narrow phones, readable text, visible focus states, and usable touch targets.
- Prefer tests (and docstrings) as the documentation; only write short notes when explicitly requested or required to avoid repeating work
- Review test coverage and identify gaps
- Optimize test execution performance
- Integrate tests with CI/CD pipelines when requested

## Test Organization
- **Unit tests**: Fast, isolated tests for individual components
- **Integration tests**: Tests for component interactions
- **End-to-end tests**: Full workflow validation
- **Performance tests**: Benchmarking and load testing when needed

## Communication
- Announce test completion, failures, or blockers using the communication method defined in `AGENTS.md`
- Reference related tasks, issues, or design docs in test commits
- Report test coverage metrics and gaps to Task Masters or Managers
- Surface flaky or slow tests for potential refactoring

## Best Practices
- Write clear, self-documenting test names
- Keep tests focused and independent
- Use appropriate fixtures and test helpers
- Avoid testing implementation details—focus on behavior
- Make tests fast and reliable
- Clean up test data and resources properly
