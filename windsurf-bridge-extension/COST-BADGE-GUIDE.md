# Cost Badge Feature - Implementation Guide

## Overview

The Cost Badge feature provides **visual cost tracking** for Windsurf models without interfering with WebSocket connections. It uses VS Code's native status bar and command palette for safe, reliable cost visibility.

## Features

### 1. **Status Bar Cost Display** 💰
- Shows current model cost in real-time
- Updates every 5 seconds
- Color-coded by tier
- Special highlighting for promotional models (🎁)

### 2. **Cost-Efficient Model Selector** 🎯
- Command: `Windsurf Bridge: Show Cost-Efficient Models`
- Lists all 82 models sorted by cost
- Promotional models appear first
- Shows cost, tier, and description

### 3. **Promotional Models Quick View** 🎁
- Command: `Windsurf Bridge: Show Promotional Models`
- Filters to show only promo models (currently 5)
- Shows original vs. promotional pricing
- Highlights limited-time offers

### 4. **Cost Breakdown** 📊
- Command: `Windsurf Bridge: Show Cost Breakdown`
- Groups models by tier
- Shows count per tier
- Total promotional model count

## How It Works

### Safe Implementation ✅

Unlike DOM manipulation approaches that can interfere with WebSocket connections, this implementation uses:

1. **VS Code Status Bar API** - Native, safe, no WebSocket interference
2. **Command Palette Integration** - Standard VS Code commands
3. **Extension Storage** - Tracks current model safely
4. **Polling Updates** - Non-intrusive 5-second updates

### No WebSocket Interference ✅

- ✅ No DOM manipulation
- ✅ No WebSocket message interception
- ✅ No network traffic modification
- ✅ Uses only VS Code extension APIs
- ✅ Completely isolated from Windsurf's internal communication

## Usage

### Automatic Activation

The cost badge display activates automatically when the extension loads. You'll see the cost indicator in the status bar (bottom right).

### Manual Commands

Access via Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

1. **Windsurf Bridge: Show Cost-Efficient Models**
   - Browse all models sorted by cost
   - Promo models listed first
   - Click to see details

2. **Windsurf Bridge: Show Promotional Models**
   - See only promotional offers
   - Compare original vs. promo pricing
   - Currently shows 5 promo models

3. **Windsurf Bridge: Toggle Cost Display**
   - Enable/disable status bar display
   - Useful if you want minimal UI

4. **Windsurf Bridge: Show Cost Breakdown**
   - Quick overview of model distribution
   - See counts by tier
   - Identify cost-efficient options

### Status Bar Interaction

Click the status bar cost indicator to open the cost-efficient model selector.

## Visual Indicators

### Tier Icons

- 🆓 **Free** - No cost (Free, BYOK models)
- 💵 **Cheap** - Low cost (0.5x - 1x)
- 💰 **Standard** - Standard cost (1x - 2x)
- 🧠 **Smart** - Higher cost (2x - 4x)
- 💎 **Premium** - Premium cost (5x+)

### Promotional Badge

- 🎁 **Promo** - Limited time promotional pricing
- Highlighted in status bar with warning background
- Pulsing animation in quick pick lists

## Current Promotional Models

As of last update (2026-02-02):

| Model | Cost | Original | Savings |
|-------|------|----------|---------|
| 🎁 Claude Sonnet 4.5 | 2x | 4x | 50% off |
| 🎁 Claude Sonnet 4.5 Thinking | 3x | - | Reduced |
| 🎁 Kimi K2.5 | FREE | 0.5x-1x | 100% off |
| 🎁 SWE-1.5 | FREE | Premium | 100% off |
| 🎁 SWE-1.5 (Fast) | 0.5x | - | Reduced |

## Configuration

Add to your VS Code `settings.json`:

```json
{
  "windsurf-bridge.showCostBadges": true,  // Enable/disable cost display
  "windsurf-bridge.autoStart": true        // Auto-start MCP server
}
```

## Integration with OpenClaw

OpenClaw can query model costs via MCP:

```javascript
// Get all models with cost info
const models = await mcp.windsurf_get_models();

// Get only promotional models
const promos = await mcp.windsurf_get_models({ promo_only: true });

// Get free tier models
const free = await mcp.windsurf_get_models({ tier: 'free' });
```

## Technical Details

### Architecture

```
┌─────────────────────────────────────┐
│   VS Code Extension                 │
│   ┌─────────────────────────────┐   │
│   │  CostBadgeDisplay           │   │
│   │  - Status Bar Item          │   │
│   │  - Command Registration     │   │
│   │  - Model Cost Tracking      │   │
│   └─────────────────────────────┘   │
│              ▼                       │
│   ┌─────────────────────────────┐   │
│   │  ALL_WINDSURF_MODELS        │   │
│   │  - 82 models                │   │
│   │  - Cost information         │   │
│   │  - Promotional flags        │   │
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Update Mechanism

1. Extension loads → CostBadgeDisplay initialized
2. Status bar item created
3. Polling starts (5-second interval)
4. Current model tracked via extension storage
5. Status bar updates with cost info
6. No WebSocket interaction at any point

### Safety Guarantees

- **No DOM Access** - Runs in Node.js context, not browser
- **No Network Interception** - Uses only VS Code APIs
- **No Message Modification** - Doesn't touch WebSocket messages
- **Isolated State** - Uses VS Code's globalState for persistence
- **Non-Blocking** - Async operations don't block UI

## Troubleshooting

### Status Bar Not Showing

1. Check if extension is activated:
   ```
   Output → Windsurf Bridge
   ```

2. Verify setting:
   ```json
   "windsurf-bridge.showCostBadges": true
   ```

3. Manually toggle:
   ```
   Cmd+Shift+P → Windsurf Bridge: Toggle Cost Display
   ```

### Cost Not Updating

The cost display updates every 5 seconds. If it's not updating:

1. Check extension output for errors
2. Verify model data is loaded (82 models)
3. Restart VS Code

### Commands Not Appearing

1. Reload window: `Cmd+Shift+P` → `Reload Window`
2. Check extension is enabled
3. Verify compilation succeeded

## Future Enhancements

Potential improvements (not yet implemented):

- [ ] Hover tooltips with detailed cost breakdown
- [ ] Cost history tracking
- [ ] Budget alerts
- [ ] Model recommendation based on task complexity
- [ ] Integration with usage analytics

## Summary

✅ **Safe** - No WebSocket interference  
✅ **Visual** - Clear cost indicators  
✅ **Efficient** - Lightweight polling  
✅ **Integrated** - Native VS Code UI  
✅ **Reliable** - Uses stable APIs  

The cost badge feature ensures you always know the cost of your current model and can quickly switch to more cost-efficient options when needed.
