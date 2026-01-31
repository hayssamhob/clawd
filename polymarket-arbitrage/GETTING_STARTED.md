# 🚀 Getting Started with Your Arbitrage Bot

## What You Have Now

A fully-functional Polymarket arbitrage bot that can:
- ✅ Scan Polymarket markets 24/7
- ✅ Detect profitable arbitrage opportunities
- ✅ Execute trades automatically
- ✅ Send Telegram notifications
- ✅ Manage risk with circuit breakers
- ✅ Log all activity to database

## Quick Start (3 Steps)

### Step 1: Configure Credentials

Edit `.env` file:

```bash
cd ~/clawd/polymarket-arbitrage
nano .env
```

**For Testing (Dry-Run Mode):**
You can leave credentials blank! The bot will simulate trades.

**For Live Trading:**
```bash
# Polymarket API (get from https://polymarket.com/settings/api)
POLYMARKET_API_KEY=your_key_here
POLYMARKET_SECRET=your_secret_here
POLYMARKET_PRIVATE_KEY=your_private_key_here

# Telegram Notifications (optional but recommended)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### Step 2: Configure Settings

Edit `config/config.yaml`:

```bash
nano config/config.yaml
```

**Key settings:**
```yaml
execution:
  mode: "dry_run"  # Start here! Change to "live" later

polymarket:
  min_profit_threshold: 0.015  # 1.5% minimum profit
  max_position_size: 100       # Max $100 per trade

risk_management:
  max_daily_loss: 500          # Stop trading if loss reaches $500
  max_open_positions: 5        # Max 5 trades at once
```

### Step 3: Run the Bot

```bash
./run.sh
```

That's it! 🎉

## What Happens Next?

1. **Bot starts scanning** - Every 15 seconds (configurable)
2. **Finds opportunities** - Looks for price discrepancies
3. **Validates profit** - Ensures profit after fees
4. **Checks risk limits** - Makes sure it's safe to trade
5. **Executes trades** - Buys/sells simultaneously
6. **Sends notifications** - Updates you via Telegram

## Monitoring

### View Live Logs
```bash
tail -f logs/bot.log
```

### Check Trading History
```bash
sqlite3 data/trades.db "SELECT * FROM trades ORDER BY timestamp DESC LIMIT 10;"
```

### Get Performance Stats
```bash
sqlite3 data/trades.db "
SELECT 
  date(timestamp) as date,
  COUNT(*) as trades,
  SUM(actual_profit) as profit,
  AVG(actual_profit) as avg_profit
FROM trades
GROUP BY date(timestamp)
ORDER BY date DESC
LIMIT 7;"
```

## Safety First! ⚠️

**Before going live:**

1. ✅ Run in `dry_run` mode for 24-48 hours
2. ✅ Review simulated trades in database
3. ✅ Set conservative limits (start with $50 max position)
4. ✅ Enable Telegram notifications
5. ✅ Start with small amounts ($100-500 total capital)

**Risk Management:**
- The bot has built-in circuit breakers
- It will stop trading if daily loss limit is reached
- It will pause after consecutive losses
- You can stop it anytime with Ctrl+C

## Getting Credentials

### Polymarket API

1. Go to https://polymarket.com
2. Sign in
3. Go to Settings → API
4. Click "Generate New API Key"
5. Save the key, secret, and private key
6. ⚠️ **Never share these credentials!**

### Telegram Bot

1. Open Telegram
2. Search for `@BotFather`
3. Send `/newbot`
4. Follow instructions
5. Copy the bot token
6. Message your bot, then visit: 
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
7. Copy your `chat_id` from the response

## Troubleshooting

### Bot won't start
```bash
# Check Python version (needs 3.8+)
python3 --version

# Reinstall dependencies
source venv/bin/activate
pip install -r requirements.txt
```

### No opportunities found
This is normal! Arbitrage opportunities are rare. The bot may run for hours without finding anything profitable.

### API errors
- Check your credentials in `.env`
- Make sure API key has trading permissions
- Ensure you have funds in your Polymarket account

## Next Steps

- Read [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
- Join our community (links in README.md)
- Set up monitoring and alerts
- Consider running on a VPS for 24/7 operation

## Need Help?

- Check the logs: `tail -f logs/bot.log`
- Review [README.md](README.md) for full documentation
- Ask in the community Discord/Telegram

---

**Remember: Start in dry-run mode, test thoroughly, and never risk more than you can afford to lose!** 🦞
