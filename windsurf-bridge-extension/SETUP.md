# Windsurf Bridge - Setup Guide

## Step 1: Install Dependencies

```bash
cd /Users/hayssamhoballah/clawd/windsurf-bridge-extension
npm install
```

## Step 2: Compile TypeScript

```bash
npm run compile
```

## Step 3: Install Extension in Windsurf

1. Open Windsurf
2. Press `Cmd+Shift+P`
3. Type: "Developer: Install Extension from Location"
4. Select: `/Users/hayssamhoballah/clawd/windsurf-bridge-extension`

## Step 4: Verify Installation

1. Press `Cmd+Shift+P`
2. Type: "Windsurf Bridge"
3. You should see:
   - "Windsurf Bridge: Start MCP Server"
   - "Windsurf Bridge: Stop MCP Server"

## Step 5: Configure OpenClaw

Edit `~/.openclaw/openclaw.json`:

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

## Step 6: Create Workspace Rules

Create `.windsurfrules` in your workspace:

```markdown
# Cascade MCP Integration

When receiving tasks via MCP delegation:

1. Complete the task as requested
2. Write results to `OPENCLAW_RESULT.md` in this format:

```
# Task: [task description]

## Status: COMPLETE|PARTIAL|FAILED

## Summary:
[Brief summary of what was done]

## Files Changed:
- file1.js
- file2.py

## Output:
[Any relevant output, logs, or results]

## Next Steps:
[What should happen next, if anything]
```

3. Be concise but complete
4. Include error messages if task failed
```

## Step 7: Test the Integration

### Test 1: Start MCP Server

In Windsurf:
1. Press `Cmd+Shift+P`
2. Run: "Windsurf Bridge: Start MCP Server"
3. Check output panel for: "MCP Server started on port 3100"

### Test 2: Test from OpenClaw

In OpenClaw terminal:

```bash
# Test connection
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | nc localhost 3100
```

You should see a list of available tools.

### Test 3: Delegate a Task

From OpenClaw:

```javascript
// Use the windsurf-bridge MCP server
await mcp.call('windsurf-bridge', 'delegate_to_cascade', {
  prompt: 'Create a simple hello world function in JavaScript',
  modelTier: 'cheap'
});
```

### Test 4: Check Status

```javascript
await mcp.call('windsurf-bridge', 'get_cascade_status', {
  lines: 10
});
```

## Troubleshooting

### Extension not loading
- Check Windsurf version: Must be VS Code 1.85.0+
- Check extension host logs: `Cmd+Shift+P` → "Developer: Show Logs" → "Extension Host"

### MCP Server not starting
- Check port 3100: `lsof -i :3100`
- Try different port in settings: `"windsurf-bridge.mcpPort": 3101`

### Commands not found
- Verify Codeium extension is installed
- Check available commands: `Cmd+Shift+P` → type "Codeium"
- Update command IDs in `cascadeController.ts` if needed

### Model not switching
- Check current model setting:
  ```bash
  code --list-extensions --show-versions | grep -i codeium
  ```
- Manually test model switch in Cascade UI first

## Advanced Configuration

### Custom Model Mappings

Edit `src/cascadeController.ts`:

```typescript
const MODEL_CONFIGS: Record<string, ModelConfig> = {
    cheap: {
        tier: 'cheap',
        modelId: 'your-preferred-cheap-model',
        displayName: 'Your Model Name',
    },
    // ...
};
```

### Custom Result File Location

In Windsurf settings:

```json
{
  "windsurf-bridge.resultFile": "custom/path/to/result.md"
}
```

### Debug Mode

Enable verbose logging:

```json
{
  "windsurf-bridge.debug": true
}
```

## Next Steps

1. Test all MCP tools individually
2. Create automation workflows in OpenClaw
3. Set up monitoring for Cascade output
4. Configure automatic model selection based on task complexity

## Support

For issues or questions:
- Check extension logs: `Cmd+Shift+P` → "Developer: Show Logs"
- Review MCP protocol: https://modelcontextprotocol.io
- Check Windsurf API: Search for Codeium commands in command palette
