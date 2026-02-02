# Windsurf Bridge - Quick Start Guide

## What This Does

This VS Code extension allows **OpenClaw** (your external AI agent) to control **Windsurf Cascade** programmatically via MCP (Model Context Protocol). OpenClaw can:

- Switch Cascade models (cheap/smart/free)
- Send prompts to Cascade
- Read Cascade's output
- Fully automate coding tasks through Windsurf

## Installation (5 minutes)

### Step 1: Install the Extension

The extension is already compiled. Install it in Windsurf:

1. Open **Windsurf**
2. Press `Cmd+Shift+P`
3. Type: **"Developer: Install Extension from Location"**
4. Navigate to: `/Users/hayssamhoballah/clawd/windsurf-bridge-extension`
5. Click **Select**

### Step 2: Verify Installation

1. Press `Cmd+Shift+P`
2. Type: **"Windsurf Bridge"**
3. You should see:
   - ✅ "Windsurf Bridge: Start MCP Server"
   - ✅ "Windsurf Bridge: Stop MCP Server"

The MCP server should **auto-start** when Windsurf launches.

### Step 3: Configure OpenClaw

Add this to your `~/.openclaw/openclaw.json`:

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

Or copy the provided config:

```bash
cat /Users/hayssamhoballah/clawd/windsurf-bridge-extension/openclaw-mcp-config.json >> ~/.openclaw/openclaw.json
```

### Step 4: Create Workspace Rules

Copy the `.windsurfrules` file to your workspace root:

```bash
cp /Users/hayssamhoballah/clawd/windsurf-bridge-extension/.windsurfrules /Users/hayssamhoballah/clawd/.windsurfrules
```

This tells Cascade to write results to `OPENCLAW_RESULT.md`.

## Usage

### From OpenClaw

```javascript
// Delegate a simple task (uses cheap model - DeepSeek V3)
await mcp.call('windsurf-bridge', 'delegate_to_cascade', {
  prompt: 'Create a hello world function in JavaScript',
  modelTier: 'cheap'
});

// Delegate a complex task (uses smart model - Claude 3.5 Sonnet)
await mcp.call('windsurf-bridge', 'delegate_to_cascade', {
  prompt: 'Refactor this codebase to use async/await patterns',
  modelTier: 'smart'
});

// Check what Cascade did
const status = await mcp.call('windsurf-bridge', 'get_cascade_status', {
  lines: 20
});
console.log(status);
```

### Available Tools

#### 1. `delegate_to_cascade`
**Full automation**: Switches model + sends prompt + focuses Cascade

```json
{
  "prompt": "Your task here",
  "modelTier": "cheap" | "smart"
}
```

#### 2. `get_cascade_status`
**Read output**: Gets last N lines from `OPENCLAW_RESULT.md`

```json
{
  "lines": 10
}
```

#### 3. `switch_cascade_model`
**Model switching only**: Change model without sending a prompt

```json
{
  "modelTier": "cheap" | "smart" | "free"
}
```

#### 4. `focus_cascade`
**Focus only**: Bring Cascade panel to front

```json
{}
```

## Model Tiers

- **cheap**: DeepSeek V3 (fast, good for most tasks)
- **smart**: Claude 3.5 Sonnet (complex reasoning, refactoring)
- **free**: Hybrid Arena (no credits used)

## How It Works

```
OpenClaw → MCP → Extension → Windsurf API
                    ↓
              1. Switch model (update settings.json)
              2. Focus Cascade panel
              3. Send prompt (via command or clipboard)
              4. Cascade executes task
              5. Cascade writes to OPENCLAW_RESULT.md
              6. OpenClaw reads result
```

## Troubleshooting

### Extension not loading
```bash
# Check Windsurf logs
Cmd+Shift+P → "Developer: Show Logs" → "Extension Host"
```

### MCP Server not starting
```bash
# Check if port 3100 is in use
lsof -i :3100

# Manually start server
Cmd+Shift+P → "Windsurf Bridge: Start MCP Server"
```

### Can't find Cascade commands
The extension tries multiple command variations:
- `codeium.chat.focus`
- `windsurf.cascade.focus`
- `workbench.view.extension.codeium`

If none work, check available commands:
```bash
Cmd+Shift+P → type "Codeium"
```

### Model not switching
Check current setting:
```bash
# Open Windsurf settings.json
Cmd+Shift+P → "Preferences: Open User Settings (JSON)"

# Look for:
"codeium.chat.model": "..."
```

### Prompt not sending
The extension uses fallback methods:
1. **Primary**: `codeium.chat.sendMessage` command
2. **Fallback**: Clipboard paste + terminal accept

Ensure Cascade panel is visible and clipboard access is allowed.

## Testing

### Test 1: Basic Connection
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | nc localhost 3100
```

Should return list of 4 tools.

### Test 2: Model Switch
From OpenClaw:
```javascript
await mcp.call('windsurf-bridge', 'switch_cascade_model', {
  modelTier: 'cheap'
});
```

Check Windsurf Cascade - model should change to DeepSeek V3.

### Test 3: Full Delegation
```javascript
await mcp.call('windsurf-bridge', 'delegate_to_cascade', {
  prompt: 'Create a file called test.js with a hello world function',
  modelTier: 'cheap'
});

// Wait a few seconds, then check result
const result = await mcp.call('windsurf-bridge', 'get_cascade_status', {
  lines: 50
});
console.log(result);
```

## Advanced Configuration

### Custom Port
In Windsurf settings:
```json
{
  "windsurf-bridge.mcpPort": 3101
}
```

Update OpenClaw config accordingly.

### Custom Result File
```json
{
  "windsurf-bridge.resultFile": "custom/path/result.md"
}
```

### Disable Auto-Start
```json
{
  "windsurf-bridge.autoStart": false
}
```

## Integration Examples

### Example 1: Automated Code Review
```javascript
// OpenClaw reviews code via Cascade
const files = await fs.readdir('./src');
for (const file of files) {
  await mcp.call('windsurf-bridge', 'delegate_to_cascade', {
    prompt: `Review ${file} for security issues and performance`,
    modelTier: 'smart'
  });
  
  const review = await mcp.call('windsurf-bridge', 'get_cascade_status', {
    lines: 100
  });
  
  await saveReview(file, review);
}
```

### Example 2: Batch Refactoring
```javascript
// Refactor multiple files
const tasks = [
  'Convert all callbacks to async/await in auth.js',
  'Add TypeScript types to api.js',
  'Optimize database queries in models.js'
];

for (const task of tasks) {
  await mcp.call('windsurf-bridge', 'delegate_to_cascade', {
    prompt: task,
    modelTier: 'smart'
  });
  
  // Wait for completion (check OPENCLAW_RESULT.md)
  await waitForCompletion();
}
```

### Example 3: Smart Model Selection
```javascript
// OpenClaw decides which model to use
function selectModel(taskComplexity) {
  if (taskComplexity > 7) return 'smart';
  if (taskComplexity > 3) return 'cheap';
  return 'free';
}

const task = 'Implement OAuth2 authentication flow';
const complexity = analyzeComplexity(task); // Your logic
const model = selectModel(complexity);

await mcp.call('windsurf-bridge', 'delegate_to_cascade', {
  prompt: task,
  modelTier: model
});
```

## Next Steps

1. ✅ Extension installed and running
2. ✅ MCP server accessible from OpenClaw
3. ✅ Test basic delegation
4. 🔄 Create automation workflows in OpenClaw
5. 🔄 Set up monitoring for Cascade output
6. 🔄 Configure automatic model selection

## Support

- **Extension logs**: `Cmd+Shift+P` → "Developer: Show Logs"
- **MCP protocol**: https://modelcontextprotocol.io
- **Windsurf docs**: Check Codeium/Windsurf documentation

## Architecture

```
┌─────────────────────────────────────┐
│         OpenClaw (AI Agent)         │
│  - Task planning                    │
│  - Model selection                  │
│  - Result processing                │
└──────────────┬──────────────────────┘
               │ MCP Protocol (port 3100)
               │
┌──────────────▼──────────────────────┐
│    Windsurf Bridge Extension        │
│  ┌────────────────────────────────┐ │
│  │      MCP Server (TCP)          │ │
│  └──────────┬─────────────────────┘ │
│             │                        │
│  ┌──────────▼─────────────────────┐ │
│  │   Cascade Controller           │ │
│  │  - Model switching             │ │
│  │  - Prompt injection            │ │
│  │  - Status reading              │ │
│  └──────────┬─────────────────────┘ │
└─────────────┼───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│      Windsurf/VS Code API           │
│  - Commands                         │
│  - Settings                         │
│  - File system                      │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│      Cascade AI (Codeium)           │
│  - Code generation                  │
│  - Refactoring                      │
│  - Analysis                         │
└─────────────────────────────────────┘
```

---

**Status**: ✅ Ready to use  
**Version**: 0.1.0  
**Last Updated**: 2026-02-03
