# Task 005a: Setup Desktop QA Environment

**Parent:** 005-desktop-review-firefox  
**Type:** Environment Setup  
**Estimated Time:** 10 minutes

## Context
Prepare the PixelArch desktop environment for manual QA testing in Firefox. Ensure all prerequisites are installed and the application is ready to run.

## Constraints
- Use **bun** for all node commands
- Use **yay -Syu** for system package installs (PixelArch)
- Do temp work in **/tmp/agents-artifacts**
- Follow **verification-first** approach
- **Sleep 5-10 seconds after every 3-5 actions**

## Steps

### 1. Create Artifacts Directory
```bash
# Action 1
mkdir -p /tmp/agents-artifacts

# Action 2
ls -la /tmp/agents-artifacts/

# Action 3
chmod 755 /tmp/agents-artifacts
```

**Sleep 5-10 seconds**

### 2. Verify Git Status
```bash
# Action 4
git status --short

# Action 5
git log --oneline -10 | tee /tmp/agents-artifacts/git-log-005a.txt
```

**Sleep 5-10 seconds**

### 3. Check Firefox Installation
```bash
# Action 6
command -v firefox && firefox --version || echo "Firefox not found"

# Action 7
if ! command -v firefox; then
    echo "Installing Firefox via yay..."
    yay -Syu firefox --noconfirm 2>&1 | tee /tmp/agents-artifacts/firefox-install-005a.log
fi
```

**Sleep 10 seconds (if installing)**

### 4. Verify Bun Installation
```bash
# Action 8
command -v bun && bun --version || echo "ERROR: bun not found"

# Action 9
pwd
```

**Sleep 5-10 seconds**

### 5. Install/Update Dependencies
```bash
# Action 10
bun install 2>&1 | tee /tmp/agents-artifacts/bun-install-005a.log

# Action 11
echo "Install exit code: $?"
```

**Sleep 7-10 seconds**

### 6. Verify Build Works
```bash
# Action 12
bun run build 2>&1 | tee /tmp/agents-artifacts/build-005a.log

# Action 13
echo "Build exit code: $?"

# Action 14
tail -20 /tmp/agents-artifacts/build-005a.log
```

**Sleep 10 seconds**

### 7. Document Environment
```bash
# Action 15
cat > /tmp/agents-artifacts/qa-environment-005a.txt << EOF
QA Environment Setup - $(date)
================================

System: PixelArch
Browser: $(firefox --version 2>/dev/null || echo "Not installed")
Runtime: $(bun --version)
Node: $(node --version 2>/dev/null || echo "N/A")

Git Status:
$(git log --oneline -3)

Build Status: $(test -d .next && echo "Success" || echo "Failed")

Ready for QA: $(test -d .next && command -v firefox &>/dev/null && echo "YES" || echo "NO")
EOF

cat /tmp/agents-artifacts/qa-environment-005a.txt
```

## Acceptance Criteria
- ✅ `/tmp/agents-artifacts` directory exists
- ✅ Firefox installed and working
- ✅ Bun installed and working
- ✅ Project dependencies installed
- ✅ Build completes successfully
- ✅ Environment documented

## Outputs
- Firefox install log: `/tmp/agents-artifacts/firefox-install-005a.log` (if needed)
- Bun install log: `/tmp/agents-artifacts/bun-install-005a.log`
- Build log: `/tmp/agents-artifacts/build-005a.log`
- Git log: `/tmp/agents-artifacts/git-log-005a.txt`
- Environment summary: `/tmp/agents-artifacts/qa-environment-005a.txt`

## Next Task
If setup successful: **005b-run-dev-server.md**

## PR Metadata Updates
None required for this setup task.

## Notes
- Do NOT make any code changes
- Firefox installation may take 2-5 minutes on PixelArch
- Build should complete without errors
- Sleep requirement: Every 3-5 actions, pause 5-10 seconds
