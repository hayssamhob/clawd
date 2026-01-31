# Quick Start Guide

Get your Polymarket arbitrage bot running in 5 minutes.

## Prerequisites

- Python 3.8+
- Polymarket account (optional for dry-run mode)
- Telegram bot token (optional but recommended)

## Installation

### 1. Run Setup Script

```bash
chmod +x setup.sh
./setup.sh
```

This will:
- Create a Python virtual environment
- Install all dependencies
- Create configuration files
- Set up directory structure

### 2. Configure Credentials

Edit `.env` file:

```bash
# Required for live trading
POLYMARKET_API_KEY=your_actual_api_key
POLYMARKET_SECRET=your_actual_secret
POLYMARKET_PRIVATE_KEY=your_actual_private_key

# Recommended for notifications
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

**Getting Polymarket Credentials:**
1. Go to https://polymarket.com
2. Sign in to your account
3. Navigate to Settings → API
4. Generate API key and secret

**Getting Telegram Bot:**
1. Talk to @BotFather on Telegram
2. Send `/newbot` and follow instructions
3. Copy the bot token
4. Get your chat ID by messaging the bot and checking https://api.telegram.org/bot<TOKEN>/getUpdates

### 3. Configure Bot Settings

Edit `config/config.yaml`:

```yaml
polymarket:
  min_profit_threshold: 0.015    # 1.5% minimum profit
  max_position_size: 100         # Max $100 per trade

execution:
  mode: "dry_run"  # Start in dry-run mode!
```

### 4. Start the Bot

```bash
./run.sh
```

Or manually:

```bash
source venv/bin/activate
python src/arbitrage_bot.py
```

## First Run Checklist

✅ **Dry-Run Mode**: Start with `mode: "dry_run"` to test without real money

✅ **Check Logs**: Monitor `logs/bot.log` for any errors

✅ **Telegram Alerts**: Verify you receive startup notification

✅ **Test Period**: Run for at least 24 hours in dry-run mode

✅ **Review Results**: Check the database for simulated trades

## Switching to Live Trading

⚠️ **IMPORTANT**: Only switch to live mode after thorough testing!

1. Review your simulated results in dry-run mode
2. Set conservative limits in `config/config.yaml`:
   ```yaml
   polymarket:
     max_position_size: 50  # Start small!
   
   risk_management:
     max_daily_loss: 100    # Conservative limit
   ```

3. Change execution mode:
   ```yaml
   execution:
     mode: "live"
   ```

4. Restart the bot
5. Monitor closely for the first few hours

## Common Commands

```bash
# Start bot
./run.sh

# Check logs
tail -f logs/bot.log

# View database
sqlite3 data/trades.db "SELECT * FROM trades ORDER BY timestamp DESC LIMIT 10;"

# Stop bot
# Press Ctrl+C in the terminal
```

## Monitoring

### Telegram Commands

Once connected, you can:
- `/status` - Check bot status
- `/stop` - Emergency stop
- `/stats` - View statistics

### Web Dashboard (Optional)

```bash
python src/dashboard.py
# Visit http://localhost:8000
```

## Troubleshooting

### Bot won't start

```bash
# Check Python version
python3 --version  # Should be 3.8+

# Reinstall dependencies
pip install -r requirements.txt

# Check config
cat config/config.yaml
```

### No opportunities found

This is normal! Arbitrage opportunities are rare. The bot may run for hours without finding profitable trades.

### API errors

- Verify your Polymarket credentials in `.env`
- Check you have funds in your Polymarket account
- Ensure your API key has trading permissions

## Next Steps

- Read [README.md](README.md) for full documentation
- Review [config/config.example.yaml](config/config.example.yaml) for all options
- Join the community (Discord/Telegram links in README)
- Consider running on a VPS for 24/7 operation

## Safety Tips

🔒 **Never share your API keys**

💰 **Start with small amounts**

📊 **Monitor daily performance**

🛑 **Set strict loss limits**

⚠️ **Understand the risks** - Trading involves risk of loss

---

Happy trading! 🚀
