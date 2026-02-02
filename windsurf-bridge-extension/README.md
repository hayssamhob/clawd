# Windsurf Bridge - MCP Control Extension

VS Code extension that exposes Windsurf Cascade control via Model Context Protocol (MCP), allowing external agents like OpenClaw to programmatically control Cascade.

## Features

- **MCP Server**: Standard MCP server for external control
- **Model Switching**: Programmatically switch between DeepSeek V3 (cheap) and Claude 3.5 Sonnet (smart)
- **Prompt Injection**: Send prompts directly to Cascade
- **Status Monitoring**: Read Cascade output from `OPENCLAW_RESULT.md`

## Installation

1. **Install dependencies:**
   ```bash
   cd windsurf-bridge-extension
   npm install
   ```

2. **Compile the extension:**
   ```bash
   npm run compile
   ```

3. **Install in Windsurf:**
   - Open Windsurf
   - Press `Cmd+Shift+P` → "Developer: Install Extension from Location"
   - Select the `windsurf-bridge-extension` folder

## Configuration

Add to your Windsurf `settings.json`:

```json
{
  "windsurf-bridge.mcpPort": 3100,
  "windsurf-bridge.resultFile": "OPENCLAW_RESULT.md",
  "windsurf-bridge.autoStart": true
}
```

## MCP Tools

### 1. `delegate_to_cascade`

Delegate a task to Cascade with automatic model selection.

**Arguments:**
- `prompt` (string, required): Task to send to Cascade
- `modelTier` (enum, optional): `'cheap'` (DeepSeek V3) or `'smart'` (Claude 3.5 Sonnet), default: `'cheap'`

**Example:**
```json
{
  "prompt": "Create a REST API with authentication",
  "modelTier": "smart"
}
```

### 2. `get_cascade_status`

Read the last N lines from `OPENCLAW_RESULT.md`.

**Arguments:**
- `lines` (number, optional): Number of lines to read, default: 10

**Example:**
```json
{
  "lines": 20
}
```

### 3. `switch_cascade_model`

Switch Cascade model without sending a prompt.

**Arguments:**
- `modelTier` (enum, required): `'cheap'`, `'smart'`, or `'free'`

**Example:**
```json
{
  "modelTier": "cheap"
}
```

### 4. `focus_cascade`

Focus the Cascade chat panel.

**Arguments:** None

## OpenClaw Integration

Add to your OpenClaw `~/.openclaw/openclaw.json`:

```json
{
  "mcpServers": {
    "windsurf-bridge": {
      "command": "node",
      "args": [
        "/path/to/windsurf-bridge-extension/out/mcp-standalone.js"
      ],
      "env": {}
    }
  }
}
```

Or use stdio transport:

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

## Windsurf Setup

Create `.windsurfrules` in your workspace root:

```markdown
# Cascade Output Protocol

When completing tasks delegated via MCP:

1. Write your final output to `OPENCLAW_RESULT.md`
2. Include:
   - Task summary
   - Files changed
   - Next steps (if any)
   - Status: COMPLETE/PARTIAL/FAILED

Example:
```
# Task: Create REST API

## Status: COMPLETE

## Changes:
- Created `src/api/server.js`
- Created `src/api/routes.js`
- Added authentication middleware

## Next Steps:
- Add unit tests
- Deploy to staging
```

## How It Works

1. **Model Switching**: Updates `codeium.chat.model` in settings.json
2. **Focus Cascade**: Executes `codeium.chat.focus` command
3. **Prompt Injection**: 
   - Primary: Uses `codeium.chat.sendMessage` command
   - Fallback: Clipboard paste + terminal accept
4. **Status Recovery**: Reads last N lines of `OPENCLAW_RESULT.md`

## Troubleshooting

### MCP Server won't start
- Check port 3100 is not in use: `lsof -i :3100`
- Check extension logs: `Cmd+Shift+P` → "Developer: Show Logs"

### Model switching not working
- Verify setting key: Check `codeium.chat.model` in settings
- Try manual switch first to confirm key name

### Prompt not sending
- Ensure Cascade panel is visible
- Check command palette for available Codeium commands
- Fallback uses clipboard - ensure clipboard access is allowed

## Development

```bash
# Watch mode
npm run watch

# Lint
npm run lint

# Package extension
vsce package
```

## Architecture

```
┌─────────────┐
│  OpenClaw   │
└──────┬──────┘
       │ MCP Protocol
       │
┌──────▼──────────────────┐
│  Windsurf Bridge Ext    │
│  ┌──────────────────┐   │
│  │   MCP Server     │   │
│  └────────┬─────────┘   │
│           │             │
│  ┌────────▼─────────┐   │
│  │ CascadeController│   │
│  └────────┬─────────┘   │
│           │             │
└───────────┼─────────────┘
            │
    ┌───────▼────────┐
    │ Windsurf API   │
    │ - Commands     │
    │ - Settings     │
    └────────────────┘
```

## License

MIT
