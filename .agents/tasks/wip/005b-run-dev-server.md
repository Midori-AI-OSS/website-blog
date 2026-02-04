# Task 005b: Run Dev Server for QA

**Parent:** 005-desktop-review-firefox  
**Type:** Server Management  
**Estimated Time:** 5 minutes

## Context
Start the development server in detached mode for manual QA testing. Server must stay running for browser testing.

## Constraints
- Use **bun** for all node commands
- Use **yay -Syu** for system package installs
- Do temp work in **/tmp/agents-artifacts**
- Follow **verification-first** approach
- **Sleep 5-10 seconds after every 3-5 actions**
- Use **detach: true** for the dev server (must persist)

## Steps

### 1. Verify Environment Ready
```bash
# Action 1
test -d .next && echo "✅ Build exists" || echo "❌ Need to build first"

# Action 2
test -f package.json && grep -q "dev" package.json && echo "✅ Dev script found" || echo "❌ No dev script"
```

**Sleep 5-10 seconds**

### 2. Check Port Availability
```bash
# Action 3
lsof -i :3000 2>/dev/null && echo "⚠️ Port 3000 in use" || echo "✅ Port 3000 available"

# Action 4
netstat -tuln 2>/dev/null | grep 3000 || echo "Port check complete"
```

**Sleep 5-10 seconds**

### 3. Start Dev Server (Detached)
```bash
# Action 5 - Using bash async with detach
# Note: Execution agent should use bash tool with mode="async" and detach=true
bun run dev > /tmp/agents-artifacts/dev-server-005b.log 2>&1 &
DEV_PID=$!

# Action 6
echo $DEV_PID > /tmp/agents-artifacts/dev-server-pid.txt
echo "Dev server PID: $DEV_PID"
```

**Sleep 10 seconds (allow server startup)**

### 4. Verify Server Started
```bash
# Action 7
sleep 5 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "Waiting for server..."

# Action 8
sleep 5 && curl -s http://localhost:3000 2>/dev/null | head -20 | tee /tmp/agents-artifacts/homepage-check-005b.txt
```

**Sleep 5-10 seconds**

### 5. Document Server Status
```bash
# Action 9
ps aux | grep "bun.*dev" | grep -v grep | tee /tmp/agents-artifacts/server-status-005b.txt

# Action 10
cat > /tmp/agents-artifacts/server-info-005b.txt << EOF
Dev Server Information
======================
Started: $(date)
PID: $(cat /tmp/agents-artifacts/dev-server-pid.txt 2>/dev/null || echo "Unknown")
URL: http://localhost:3000
Log: /tmp/agents-artifacts/dev-server-005b.log

Status: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)

Next: Open Firefox and begin QA testing
EOF

cat /tmp/agents-artifacts/server-info-005b.txt
```

**Sleep 5-10 seconds**

### 6. Tail Recent Logs
```bash
# Action 11
tail -30 /tmp/agents-artifacts/dev-server-005b.log
```

## Acceptance Criteria
- ✅ Dev server started in detached mode
- ✅ Server PID recorded
- ✅ Port 3000 responding
- ✅ Homepage loads successfully
- ✅ Server logs captured
- ✅ Server remains running (not killed on exit)

## Outputs
- Dev server log: `/tmp/agents-artifacts/dev-server-005b.log`
- Server PID: `/tmp/agents-artifacts/dev-server-pid.txt`
- Server status: `/tmp/agents-artifacts/server-status-005b.txt`
- Server info: `/tmp/agents-artifacts/server-info-005b.txt`
- Homepage check: `/tmp/agents-artifacts/homepage-check-005b.txt`

## Next Task
**005c-firefox-qa-blog-tags.md**

## PR Metadata Updates
None required for this server task.

## Important Notes
- Server MUST run detached (survives session end)
- Do NOT use stop_bash on this server
- To stop later: `kill $(cat /tmp/agents-artifacts/dev-server-pid.txt)`
- Sleep requirement: Every 3-5 actions, pause 5-10 seconds
