# Automated Model Updates

## Overview

The Windsurf Bridge extension now includes an **automated daily update system** that keeps model pricing and promotional information current.

## System Components

### 1. Smart Updater (`smart-updater.js`)
- Uses validated model data from `windsurf-models-actual.json`
- Updates the extension's `cascadeController.ts` with latest models
- Tracks promotional pricing (models with 🎁 gift icon)
- Maintains 86 Windsurf models with accurate costs

### 2. Daily Automation (`setup-daily-updates.sh`)
- Sets up cron job to run daily at 9:00 AM
- Automatically updates models and recompiles extension
- Logs all updates to `logs/model-updates.log`

### 3. Model Data Source
- **Primary**: `windsurf-models-actual.json` (validated data from Windsurf dropdown)
- **Future**: Can be extended to scrape https://docs.windsurf.com/windsurf/models

## Quick Start

### Manual Update
```bash
npm run update-models
```

### Setup Daily Automation
```bash
npm run setup-daily-updates
```

This will:
1. Create a cron job that runs daily at 9 AM
2. Run a test update immediately
3. Show you the cron job configuration

### Check Update Logs
```bash
tail -f logs/model-updates.log
```

### Remove Automation
```bash
crontab -e
# Delete the line containing "smart-updater.js"
```

## Model Data Structure

Each model includes:
- **id**: Unique identifier (kebab-case)
- **name**: Display name
- **tier**: free, cheap, standard, smart, premium
- **credits**: Cost in credits (or "Free", "BYOK")
- **description**: Brief description
- **strengths**: Array of capabilities
- **isPromo**: Boolean flag for promotional pricing
- **promoDescription**: Details about the promotion
- **originalCost**: Original cost before promo

## Current Promotional Models

As of the last update, these models have promotional pricing:

1. **Claude Sonnet 4.5** - 2x (was 4x) - 50% off!
2. **Claude Sonnet 4.5 Thinking** - 3x (reduced)
3. **Kimi K2.5** - FREE (limited time)
4. **SWE-1.5** - FREE (limited time)
5. **SWE-1.5 (Fast)** - 0.5x (reduced)

## MCP Tool Integration

The extension exposes these promotional features via MCP:

### List All Models
```json
{
  "name": "list_models"
}
```

### List Only Promo Models
```json
{
  "name": "list_models",
  "arguments": {
    "promo_only": true
  }
}
```

### Filter by Tier
```json
{
  "name": "list_models",
  "arguments": {
    "tier": "free"
  }
}
```

## Update Frequency

- **Automated**: Daily at 9:00 AM (via cron)
- **Manual**: Run `npm run update-models` anytime
- **Recommended**: Check for promos daily as they change frequently

## Data Sources

### Current (Validated)
- `windsurf-models-actual.json` - 86 models extracted from Windsurf UI
- Manually verified and maintained
- Updated: 2026-02-02

### Future Enhancements
The system is designed to support:
1. Web scraping from https://docs.windsurf.com/windsurf/models
2. API integration with Windsurf services
3. Internal config file monitoring
4. Real-time promo detection

## Troubleshooting

### Models not updating
```bash
# Check if cron job exists
crontab -l | grep smart-updater

# Run manual update with verbose output
node smart-updater.js

# Check logs
cat logs/model-updates.log
```

### Extension not compiling
```bash
# Restore from backup
git checkout src/cascadeController.ts

# Re-run update
npm run update-models
```

### Cron job not running
```bash
# Check cron service (macOS)
launchctl list | grep cron

# Verify cron permissions
ls -la /usr/sbin/cron
```

## Architecture

```
┌─────────────────────────────────────┐
│   windsurf-models-actual.json       │
│   (86 validated models)             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   smart-updater.js                  │
│   - Loads validated data            │
│   - Generates TypeScript defs       │
│   - Updates cascadeController.ts    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   src/cascadeController.ts          │
│   - ALL_WINDSURF_MODELS constant    │
│   - 86 models with promo tracking   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   TypeScript Compilation            │
│   npm run compile                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   MCP Server (port 3100)            │
│   - list_models tool                │
│   - Promo filtering                 │
│   - Daily check reminders           │
└─────────────────────────────────────┘
```

## Daily Reminder

The MCP `list_models` tool includes this reminder:
> "Check daily for new promotional pricing! Gift icon = limited time offer!"

This ensures OpenClaw and other clients are aware that promos change frequently.

## Maintenance

### Update Model Data
To update the source data:

1. Open Windsurf
2. Click model dropdown
3. Copy all models with their costs
4. Update `windsurf-models-actual.json`
5. Run `npm run update-models`

### Verify Updates
```bash
# Check model count
grep -c '"name":' windsurf-models-actual.json

# Check promo models
grep -A 1 '"Promo"' windsurf-models-actual.json

# Test MCP tool
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_models","arguments":{"promo_only":true}}}' | nc localhost 3100
```

## Security Notes

- Model data is read-only
- No external API keys required
- Cron job runs with user permissions
- Logs stored locally only

## Support

For issues or questions:
1. Check logs: `logs/model-updates.log`
2. Run manual update: `npm run update-models`
3. Verify data: `cat windsurf-models-actual.json`
4. Test compilation: `npm run compile`
