# Windsurf Bridge - Testing Guide

## Quick Test (5 minutes)

### Step 1: Install Extension in Windsurf

1. **Open Windsurf**
2. Press `Cmd+Shift+P`
3. Type: `Developer: Install Extension from Location`
4. Select: `/Users/hayssamhoballah/clawd/windsurf-bridge-extension`
5. Click **Select**

You should see: "Extension 'windsurf-bridge' was successfully installed"

### Step 2: Verify MCP Server Started

1. **Check commands available:**
   - Press `Cmd+Shift+P`
   - Type: `Windsurf Bridge`
   - You should see:
     - ✅ "Windsurf Bridge: Start MCP Server"
     - ✅ "Windsurf Bridge: Stop MCP Server"

2. **Check it's running:**
   ```bash
   lsof -i :3100 | grep LISTEN
   ```
   Should show a process listening on port 3100

### Step 3: Test from Terminal (Basic Connectivity)

```bash
# Test MCP connection
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | nc localhost 3100
```

**Expected response:**
```json
{
  "tools": [
    {"name": "delegate_to_cascade", ...},
    {"name": "get_cascade_status", ...},
    {"name": "switch_cascade_model", ...},
    {"name": "list_models", ...},
    {"name": "focus_cascade", ...}
  ]
}
```

---

## Full Integration Test (10 minutes)

### Step 4: Configure OpenClaw

Add to `~/.openclaw/openclaw.json`:

```json
{
  "mcpServers": {
    "windsurf-bridge": {
      "command": "nc",
      "args": ["localhost", "3100"],
      "env": {}
    }
  }
}
```

### Step 5: Copy Workspace Rules

```bash
cp /Users/hayssamhoballah/clawd/windsurf-bridge-extension/.windsurfrules \
   /Users/hayssamhoballah/clawd/.windsurfrules
```

This tells Cascade to write results to `OPENCLAW_RESULT.md`.

### Step 6: Test Each Tool

#### Test 1: List Models

From OpenClaw:
```javascript
// Get all models
const result = await mcp.call('windsurf-bridge', 'list_models');
console.log(result);

// Filter by tier
const freeModels = await mcp.call('windsurf-bridge', 'list_models', {
  tier: 'free'
});
console.log(freeModels);
```

**Expected:** List of 14 models with details (id, name, credits, strengths)

---

#### Test 2: Switch Model

```javascript
// Test tier shortcut
await mcp.call('windsurf-bridge', 'switch_cascade_model', {
  model: 'free'
});

// Test exact model ID
await mcp.call('windsurf-bridge', 'switch_cascade_model', {
  model: 'deepseek-v3'
});
```

**Verify in Windsurf:**
- Look at Cascade panel
- Model dropdown should show selected model

---

#### Test 3: Delegate Simple Task

```javascript
await mcp.call('windsurf-bridge', 'delegate_to_cascade', {
  prompt: 'Create a file called test-bridge.js with a hello world function',
  model: 'swe-1.5-free'
});
```

**What should happen:**
1. ✅ Model switches to SWE-1.5 Free
2. ✅ Cascade panel focuses
3. ✅ Prompt appears in Cascade
4. ✅ Cascade executes task
5. ✅ File `test-bridge.js` created
6. ✅ Results written to `OPENCLAW_RESULT.md`

---

#### Test 4: Check Status

```javascript
const status = await mcp.call('windsurf-bridge', 'get_cascade_status', {
  lines: 30
});
console.log(status);
```

**Expected:** Content from `OPENCLAW_RESULT.md` showing task completion

---

#### Test 5: Test Different Models

```javascript
// Test various model selections
const tests = [
  { model: 'free', expected: 'SWE-1.5 Free' },
  { model: 'cheap', expected: 'DeepSeek V3' },
  { model: 'smart', expected: 'Claude 3.5 Haiku' },
  { model: 'fast', expected: 'Gemini 2.0 Flash' },
  { model: 'deepseek-v3', expected: 'DeepSeek V3' },
  { model: 'claude', expected: 'any Claude model' },
];

for (const test of tests) {
  const result = await mcp.call('windsurf-bridge', 'switch_cascade_model', {
    model: test.model
  });
  console.log(`${test.model} -> ${result.model}`);
}
```

---

## Troubleshooting Tests

### Test Fails: Extension not loading
```bash
# Check logs in Windsurf
Cmd+Shift+P → "Developer: Show Logs" → "Extension Host"

# Look for:
# - "windsurf-bridge" activation
# - Any error messages
```

### Test Fails: MCP server not starting
```bash
# Check if port is in use
lsof -i :3100

# Kill existing process if needed
kill -9 $(lsof -t -i :3100)

# Restart Windsurf
```

### Test Fails: Commands not found
```bash
# In Windsurf, check available commands:
Cmd+Shift+P → type "Codeium"

# Note which commands exist and update:
# windsurf-bridge-extension/src/cascadeController.ts
```

### Test Fails: Model not switching
```bash
# Check current setting
Cmd+Shift+P → "Preferences: Open User Settings (JSON)"

# Look for "codeium.chat.model" or "windsurf.cascade.model"
# Manually change it to test if setting works
```

### Test Fails: Prompt not sending
```bash
# Ensure Cascade panel is visible
# Check if clipboard access is allowed
# Try manual paste to test clipboard
```

---

## Automated Test Script

Create `test-windsurf-bridge.js`:

```javascript
// Run this in OpenClaw

async function runTests() {
  console.log('🧪 Testing Windsurf Bridge...\n');

  // Test 1: List models
  console.log('1️⃣ Testing list_models...');
  const models = await mcp.call('windsurf-bridge', 'list_models');
  console.log(`   Found ${models.count} models ✅\n`);

  // Test 2: Switch model
  console.log('2️⃣ Testing switch_cascade_model...');
  const switchResult = await mcp.call('windsurf-bridge', 'switch_cascade_model', {
    model: 'free'
  });
  console.log(`   Switched to: ${switchResult.model} ✅\n`);

  // Test 3: Delegate task
  console.log('3️⃣ Testing delegate_to_cascade...');
  const delegateResult = await mcp.call('windsurf-bridge', 'delegate_to_cascade', {
    prompt: 'Create a test file to verify the bridge is working',
    model: 'free'
  });
  console.log(`   Delegated: ${delegateResult.message} ✅\n`);

  // Wait for task completion
  console.log('⏳ Waiting 5 seconds for task completion...');
  await new Promise(r => setTimeout(r, 5000));

  // Test 4: Get status
  console.log('4️⃣ Testing get_cascade_status...');
  const status = await mcp.call('windsurf-bridge', 'get_cascade_status', {
    lines: 20
  });
  console.log(`   Status received (${status.length} chars) ✅\n`);

  console.log('🎉 All tests passed!');
}

runTests().catch(console.error);
```

---

## Manual Testing Checklist

- [ ] Extension installs without errors
- [ ] MCP server starts on port 3100
- [ ] `tools/list` returns 5 tools
- [ ] `list_models` returns 14 models
- [ ] `switch_cascade_model` with tier works
- [ ] `switch_cascade_model` with exact ID works
- [ ] `delegate_to_cascade` switches model
- [ ] `delegate_to_cascade` sends prompt
- [ ] Cascade executes the task
- [ ] `OPENCLAW_RESULT.md` is created/updated
- [ ] `get_cascade_status` returns results

---

## Expected Behavior Summary

| Action | Expected Result | Time |
|--------|----------------|------|
| Install extension | Success message | 2s |
| Start MCP server | Port 3100 listening | 1s |
| List models | 14 models returned | <1s |
| Switch model | Model changed in UI | 1s |
| Delegate task | Prompt sent to Cascade | 2s |
| Task execution | File created/edited | 5-30s |
| Get status | Results returned | <1s |

---

## Next Steps After Testing

1. ✅ All tests pass → Start using for real tasks
2. ❌ Some tests fail → Check troubleshooting section
3. 🔄 Need adjustments → Edit code and recompile:
   ```bash
   cd /Users/hayssamhoballah/clawd/windsurf-bridge-extension
   npm run compile
   ```
   Then reload extension in Windsurf

---

**Test Date:** ___________  
**Tester:** ___________  
**Status:** ✅ All Pass / ❌ Issues Found (describe below)

**Notes:**
```

```
