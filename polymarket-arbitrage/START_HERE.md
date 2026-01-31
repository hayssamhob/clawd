# 🚀 START HERE - Quick Guide

## You're All Set! 

Your bot is configured in **DRY-RUN MODE** (simulation only - no real trades).

## Run the Bot Now

```bash
cd ~/clawd/polymarket-arbitrage
./run.sh
```

That's it! The bot will:
- ✅ Scan Polymarket for arbitrage opportunities
- ✅ Simulate trades (NO real money involved)
- ✅ Log everything to `logs/bot.log`
- ✅ Save simulated trades to `data/trades.db`

## What You'll See

```
╔═══════════════════════════════════════╗
║   Polymarket Arbitrage Bot v1.0       ║
║   Automated Trading for Prediction    ║
║   Markets                             ║
╚═══════════════════════════════════════╝

2026-01-31 10:35:12 - INFO - 🚀 Starting Polymarket Arbitrage Bot
2026-01-31 10:35:12 - INFO - Mode: dry_run
2026-01-31 10:35:15 - INFO - Scanning 42 markets in Politics...
2026-01-31 10:35:18 - DEBUG - No arbitrage opportunities found
```

## View Logs in Real-Time

Open a second terminal:

```bash
cd ~/clawd/polymarket-arbitrage
tail -f logs/bot.log
```

## Stop the Bot

Press `Ctrl+C` in the terminal where the bot is running.

## Check Simulated Results

After running for a while:

```bash
sqlite3 data/trades.db "SELECT * FROM trades;"
```

## Next Steps

### When Ready for Live Trading:

1. **Get Polymarket Credentials:**
   - Go to https://polymarket.com
   - Settings → API
   - Generate API key
   - Copy key, secret, and private key

2. **Edit `.env` file:**
   ```bash
   nano .env
   ```
   
   Replace placeholders with your actual credentials:
   ```
   POLYMARKET_API_KEY=sk-your-actual-key
   POLYMARKET_SECRET=your-actual-secret
   POLYMARKET_PRIVATE_KEY=0xyour-private-key
   ```

3. **Get Telegram Bot (Optional but Recommended):**
   - Message @BotFather on Telegram
   - Send `/newbot`
   - Copy bot token
   - Message your bot
   - Get chat ID from: `https://api.telegram.org/bot<TOKEN>/getUpdates`
   
   Add to `.env`:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
   TELEGRAM_CHAT_ID=123456789
   ```

4. **Switch to Live Mode:**
   ```bash
   nano config/config.yaml
   ```
   
   Change:
   ```yaml
   execution:
     mode: "live"  # Was "dry_run"
   ```

5. **Start with Small Amounts:**
   ```yaml
   polymarket:
     max_position_size: 50  # Start with $50 max
   
   risk_management:
     max_daily_loss: 100    # Conservative limit
   ```

6. **Restart Bot:**
   ```bash
   ./run.sh
   ```

## Files & Directories

```
polymarket-arbitrage/
├── .env                    # Your credentials (EDIT THIS)
├── config/config.yaml      # Bot settings (EDIT THIS)
├── logs/bot.log           # Live logs
├── data/trades.db         # Trade history database
├── run.sh                 # Launcher script
└── src/                   # Bot source code
    ├── arbitrage_bot.py   # Main bot
    ├── polymarket_client.py
    ├── opportunity_scanner.py
    ├── risk_manager.py
    └── ...
```

## Helpful Commands

```bash
# Run bot
./run.sh

# View logs
tail -f logs/bot.log

# Check trades
sqlite3 data/trades.db "SELECT * FROM trades;"

# Check performance
sqlite3 data/trades.db "
SELECT 
  COUNT(*) as total_trades,
  SUM(CASE WHEN actual_profit > 0 THEN 1 ELSE 0 END) as winning_trades,
  SUM(actual_profit) as total_profit
FROM trades;"

# Stop bot
# Press Ctrl+C
```

## Documentation

- **GETTING_STARTED.md** - Detailed setup guide
- **QUICKSTART.md** - 5-minute quick start
- **DEPLOYMENT.md** - Production deployment (VPS, Docker, etc.)
- **README.md** - Full documentation

## Support

- GitHub Issues
- Community Discord/Telegram (links in README.md)

---

## Safety Reminders 🛡️

- ✅ Start in dry-run mode
- ✅ Test for 24-48 hours before going live
- ✅ Start with small position sizes ($50-100 max)
- ✅ Set strict loss limits
- ✅ Monitor daily
- ⚠️ **Never risk more than you can afford to lose!**

---

**Ready? Run the bot:**

```bash
./run.sh
```

🎉 Good luck and happy trading! 🦞
