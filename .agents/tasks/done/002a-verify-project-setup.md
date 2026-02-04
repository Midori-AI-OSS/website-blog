# Task 002a: Verify Project Setup Before TagFilterBar Implementation

**Parent:** 002-add-tag-filter-ui-component  
**Type:** Verification  
**Estimated Time:** 5 minutes

## Context
Before creating the TagFilterBar component, verify the project environment and dependencies are correct.

## Constraints
- Use **bun** for all node commands (never npm/yarn/pnpm)
- Use **yay -Syu** for system package installs
- Do temp work in **/tmp/agents-artifacts**
- Follow **verification-first** approach
- **Sleep 5-10 seconds after every 3-5 actions**

## Steps

### 1. Verify Environment
```bash
# Action 1
command -v bun || (echo "ERROR: bun not found" && exit 1)

# Action 2
bun --version

# Action 3
pwd
```

**Sleep 5-10 seconds**

### 2. Check Project Structure
```bash
# Action 4
ls -la components/ | head -10

# Action 5
ls -la package.json
```

**Sleep 5-10 seconds**

### 3. Verify Joy UI Dependencies
```bash
# Action 6
cat package.json | grep -A 5 "dependencies"

# Action 7
bun install
```

**Sleep 7-10 seconds**

### 4. Test Build System
```bash
# Action 8
bun run build 2>&1 | tee /tmp/agents-artifacts/build-test-002a.log

# Action 9
echo $?
```

**Sleep 5-10 seconds**

### 5. Check Existing Components Pattern
```bash
# Action 10
ls components/*.tsx | head -5
```

## Acceptance Criteria
- ✅ Bun is installed and working
- ✅ Project dependencies installed successfully
- ✅ Build completes without errors
- ✅ Components directory exists and contains TypeScript files

## Outputs
- Build log saved to `/tmp/agents-artifacts/build-test-002a.log`

## Next Task
If all checks pass: **002b-implement-tagfilterbar-component.md**

## PR Metadata Updates
None required for this verification task.

## Notes
- Do NOT make any code changes in this task
- If any verification fails, report and stop
- Sleep requirement: Every 3-5 actions, pause 5-10 seconds
