# Deployment Guide

Complete guide for deploying the Polymarket arbitrage bot to production.

## Table of Contents

1. [Local Deployment](#local-deployment)
2. [VPS Deployment](#vps-deployment)
3. [OpenClaw Integration](#openclaw-integration)
4. [Docker Deployment](#docker-deployment)
5. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Local Deployment

### macOS Setup

```bash
# Install Python 3
brew install python3

# Clone and setup
git clone <your-repo>
cd polymarket-arbitrage
./setup.sh

# Configure
cp .env.example .env
nano .env  # Add your credentials

# Run
./run.sh
```

### Background Process (tmux)

```bash
# Install tmux
brew install tmux

# Start session
tmux new -s arbitrage

# Run bot
./run.sh

# Detach: Ctrl+B, then D
# Reattach: tmux attach -t arbitrage
```

---

## VPS Deployment

### Recommended Providers

- **DigitalOcean**: $6/month Droplet
- **Linode**: $5/month Nanode
- **AWS EC2**: t3.micro (free tier eligible)
- **Hetzner**: €3.79/month CX11

### VPS Setup (Ubuntu 22.04)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python
sudo apt install python3 python3-pip python3-venv git -y

# Create user for bot
sudo useradd -m -s /bin/bash arbbot
sudo su - arbbot

# Clone repository
git clone <your-repo> ~/arbitrage-bot
cd ~/arbitrage-bot

# Run setup
chmod +x setup.sh
./setup.sh

# Configure credentials
nano .env
nano config/config.yaml
```

### Systemd Service

Create `/etc/systemd/system/polymarket-arb.service`:

```ini
[Unit]
Description=Polymarket Arbitrage Bot
After=network.target

[Service]
Type=simple
User=arbbot
WorkingDirectory=/home/arbbot/arbitrage-bot
ExecStart=/home/arbbot/arbitrage-bot/venv/bin/python src/arbitrage_bot.py
Restart=always
RestartSec=10

# Logging
StandardOutput=append:/home/arbbot/arbitrage-bot/logs/service.log
StandardError=append:/home/arbbot/arbitrage-bot/logs/service.error.log

# Environment
Environment="PYTHONUNBUFFERED=1"
EnvironmentFile=/home/arbbot/arbitrage-bot/.env

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
# Enable service
sudo systemctl enable polymarket-arb.service

# Start service
sudo systemctl start polymarket-arb.service

# Check status
sudo systemctl status polymarket-arb.service

# View logs
sudo journalctl -u polymarket-arb.service -f
```

---

## OpenClaw Integration

### Install as OpenClaw Skill

```bash
# Navigate to OpenClaw workspace
cd ~/clawd

# Clone arbitrage bot
git clone <repo> polymarket-arbitrage

# Create skill manifest
cat > polymarket-arbitrage/SKILL.md << 'EOF'
# Polymarket Arbitrage Skill

Automated arbitrage trading for Polymarket prediction markets.

## Commands

- `start arbitrage bot` - Start the arbitrage scanner
- `stop arbitrage bot` - Stop the bot
- `arbitrage status` - Get current status and P&L
- `arbitrage stats` - View performance statistics

## Configuration

Set up your credentials in `.env`:
- POLYMARKET_API_KEY
- POLYMARKET_SECRET
- POLYMARKET_PRIVATE_KEY

## Usage

The bot runs autonomously and sends Telegram notifications for:
- Discovered opportunities
- Executed trades
- Daily summaries
- Risk alerts

EOF
```

### OpenClaw Agent Instructions

Add to your `AGENTS.md` or `TOOLS.md`:

```markdown
### Polymarket Arbitrage

I can run an automated arbitrage bot for Polymarket.

**To start:**
```bash
cd ~/clawd/polymarket-arbitrage
./run.sh
```

**To check status:**
```bash
sqlite3 data/trades.db "SELECT COUNT(*) as trades, SUM(actual_profit) as profit FROM trades;"
```

**To stop:**
Find the process and kill it gracefully (Ctrl+C or SIGTERM).
```

### Automated Monitoring via OpenClaw

Create a heartbeat check in `HEARTBEAT.md`:

```markdown
### Arbitrage Bot Health Check

Every 4 hours:
1. Check if arbitrage bot process is running
2. Check logs for errors in last 4 hours
3. Review P&L and alert if unusual losses
4. Send summary to Telegram if significant activity

```bash
# Check process
ps aux | grep arbitrage_bot.py

# Check recent errors
tail -100 ~/clawd/polymarket-arbitrage/logs/bot.log | grep ERROR

# Get stats
sqlite3 ~/clawd/polymarket-arbitrage/data/trades.db "
SELECT 
  date(timestamp) as day,
  COUNT(*) as trades,
  SUM(actual_profit) as profit
FROM trades
WHERE timestamp > datetime('now', '-4 hours')
GROUP BY date(timestamp);"
```

---

## Docker Deployment

### Dockerfile

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY src/ ./src/
COPY config/ ./config/

# Create data directory
RUN mkdir -p data logs

# Run bot
CMD ["python", "src/arbitrage_bot.py"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  arbitrage-bot:
    build: .
    container_name: polymarket-arbitrage
    restart: unless-stopped
    
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./config:/app/config
    
    environment:
      - POLYMARKET_API_KEY=${POLYMARKET_API_KEY}
      - POLYMARKET_SECRET=${POLYMARKET_SECRET}
      - POLYMARKET_PRIVATE_KEY=${POLYMARKET_PRIVATE_KEY}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}
    
    env_file:
      - .env
```

### Run with Docker

```bash
# Build
docker-compose build

# Start
docker-compose up -d

# Logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## Monitoring & Maintenance

### Monitoring Tools

**1. Grafana + Prometheus**

Create `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'arbitrage-bot'
    static_configs:
      - targets: ['localhost:9090']
```

**2. Telegram Alerts**

Already built in! Configure in `config/config.yaml`:

```yaml
notifications:
  telegram:
    enabled: true
    notify_on_opportunity: true
    notify_on_trade: true
    notify_on_circuit_breaker: true
```

**3. Email Alerts** (optional)

```yaml
notifications:
  email:
    enabled: true
    smtp_server: "smtp.gmail.com"
    smtp_port: 587
    from_email: "bot@yourdomain.com"
    to_email: "alerts@yourdomain.com"
```

### Health Checks

Create `healthcheck.sh`:

```bash
#!/bin/bash

# Check if bot is running
if ! pgrep -f arbitrage_bot.py > /dev/null; then
    echo "❌ Bot not running!"
    # Send alert and restart
    systemctl restart polymarket-arb.service
    exit 1
fi

# Check last trade time
last_scan=$(sqlite3 data/trades.db "SELECT MAX(timestamp) FROM trades;")
if [ -z "$last_scan" ]; then
    echo "⚠️  No trades recorded yet"
else
    echo "✅ Last trade: $last_scan"
fi

# Check error count
error_count=$(tail -1000 logs/bot.log | grep -c ERROR)
if [ $error_count -gt 10 ]; then
    echo "⚠️  High error count: $error_count"
fi

echo "✅ Health check passed"
```

### Backup Strategy

```bash
# Daily backup of database
0 3 * * * /home/arbbot/backup.sh

# backup.sh:
#!/bin/bash
DATE=$(date +%Y%m%d)
cp ~/arbitrage-bot/data/trades.db ~/backups/trades_$DATE.db
# Keep only last 30 days
find ~/backups/ -name "trades_*.db" -mtime +30 -delete
```

### Log Rotation

Create `/etc/logrotate.d/arbitrage-bot`:

```
/home/arbbot/arbitrage-bot/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    missingok
    create 0644 arbbot arbbot
}
```

---

## Performance Tuning

### Optimize Scan Interval

```yaml
scanner:
  scan_interval: 15  # Faster scanning = more opportunities
                     # But higher API usage
```

### Parallel Processing

Edit `opportunity_scanner.py` to scan multiple markets concurrently:

```python
async def scan_markets(self):
    markets = await self.client.get_markets()
    
    # Process in parallel
    tasks = [self._check_market_for_arbitrage(m) for m in markets]
    results = await asyncio.gather(*tasks)
    
    opportunities = [r for r in results if r is not None]
    return opportunities
```

### Database Optimization

```bash
# Vacuum database weekly
sqlite3 data/trades.db "VACUUM;"

# Analyze for query optimization
sqlite3 data/trades.db "ANALYZE;"
```

---

## Security Best Practices

✅ **Never commit credentials to git**

```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo "config/config.yaml" >> .gitignore
```

✅ **Use environment variables**

✅ **Limit API key permissions** (trading only, no withdrawals)

✅ **Enable 2FA** on your Polymarket account

✅ **Regular security audits**

```bash
# Check for exposed secrets
git log -p | grep -i 'password\|secret\|key'
```

✅ **Firewall configuration**

```bash
# Allow only SSH
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw enable
```

---

## Troubleshooting

### Bot keeps stopping

Check systemd service:
```bash
sudo systemctl status polymarket-arb.service
sudo journalctl -u polymarket-arb.service -n 100
```

### High API rate limits

Increase scan interval:
```yaml
scanner:
  scan_interval: 30  # Slow down scanning
```

### Database locked errors

```bash
# Stop all processes
sudo systemctl stop polymarket-arb.service

# Backup and recreate
cp data/trades.db data/trades.db.backup
sqlite3 data/trades.db "VACUUM;"

# Restart
sudo systemctl start polymarket-arb.service
```

---

## Support

- GitHub Issues: <repo-issues-url>
- Telegram: @your_support_channel
- Discord: <discord-invite>

---

**Good luck with your deployment! 🚀**
