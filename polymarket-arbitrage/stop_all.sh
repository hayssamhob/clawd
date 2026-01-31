#!/bin/bash
# Stop all Polymarket Arbitrage Bot processes

echo "🛑 Stopping Polymarket Arbitrage Bot..."

# Kill bot
pkill -f "arbitrage_bot.py" && echo "✅ Bot stopped" || echo "ℹ️  Bot not running"

# Kill dashboard
pkill -f "dashboard.py" && echo "✅ Dashboard stopped" || echo "ℹ️  Dashboard not running"

echo "✅ All processes stopped"
