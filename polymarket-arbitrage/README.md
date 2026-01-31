# Polymarket Arbitrage Bot

An automated arbitrage trading bot for Polymarket prediction markets, powered by OpenClaw.

## Features

- 🔍 **Real-time Market Monitoring**: Continuously scans Polymarket for price discrepancies
- 📊 **Arbitrage Detection**: Identifies profitable arbitrage opportunities across different markets
- 🤖 **Automated Trading**: Executes trades automatically when opportunities are detected
- 📈 **Risk Management**: Built-in position sizing and risk controls
- 📱 **Telegram Notifications**: Real-time alerts for opportunities and executed trades
- 💾 **Trade Logging**: Comprehensive logging of all trades and P&L

## Architecture

```
polymarket-arbitrage/
├── src/
│   ├── arbitrage_bot.py       # Main bot logic
│   ├── polymarket_client.py   # Polymarket API client
│   ├── opportunity_scanner.py # Market scanner for arbitrage
│   ├── risk_manager.py        # Position sizing and risk management
│   └── notification_service.py # Telegram notifications
├── config/
│   └── config.yaml            # Configuration file
├── data/
│   └── trades.db              # SQLite database for trade history
├── logs/
│   └── bot.log                # Application logs
└── requirements.txt           # Python dependencies
```

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Configure the bot:
```bash
cp config/config.example.yaml config/config.yaml
# Edit config.yaml with your settings
```

3. Set up environment variables:
```bash
export POLYMARKET_API_KEY="your_api_key"
export POLYMARKET_SECRET="your_secret"
export TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
export TELEGRAM_CHAT_ID="your_chat_id"
```

## Usage

### Manual Mode
```bash
python src/arbitrage_bot.py
```

### OpenClaw Integration
Add to your OpenClaw skills:
```bash
openclaw skill add polymarket-arbitrage
```

The bot will:
1. Connect to Polymarket API
2. Scan markets for arbitrage opportunities
3. Calculate potential profit minus fees
4. Execute trades when profit threshold is met
5. Send notifications to Telegram

## Configuration

Edit `config/config.yaml`:

```yaml
polymarket:
  api_endpoint: "https://clob.polymarket.com"
  min_profit_threshold: 0.02  # 2% minimum profit
  max_position_size: 100      # Max $100 per trade
  
risk_management:
  max_daily_loss: 500         # Max $500 loss per day
  max_open_positions: 5       # Max 5 concurrent positions
  
scanner:
  scan_interval: 10           # Scan every 10 seconds
  markets:
    - "Politics"
    - "Sports"
    - "Crypto"
```

## Safety Features

- **Dry-run mode**: Test without real trades
- **Maximum loss limits**: Circuit breakers to prevent excessive losses
- **Transaction simulation**: Validates trades before execution
- **Emergency stop**: `/stop` command via Telegram

## Monitoring

View live stats:
```bash
python src/dashboard.py
```

Access web dashboard at `http://localhost:8000`

## Legal & Risk Disclaimer

⚠️ **Important**:
- Trading involves risk of loss
- This bot is for educational purposes
- Ensure compliance with local regulations
- Polymarket may have geographical restrictions
- Always start with small amounts

## Support

For issues or questions:
- GitHub: https://github.com/yourusername/polymarket-arbitrage
- Telegram: @your_support_channel

## License

MIT License - see LICENSE file
