#!/bin/bash
# Stop all Polymarket Arbitrage Bot processes

# Project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOT_PID_FILE="$PROJECT_DIR/.bot.pid"
DASHBOARD_PID_FILE="$PROJECT_DIR/.dashboard.pid"

echo "🛑 Stopping Polymarket Arbitrage Bot..."

# Stop bot using PID file (safer than pkill)
if [ -f "$BOT_PID_FILE" ]; then
    BOT_PID=$(cat "$BOT_PID_FILE")
    if kill -0 "$BOT_PID" 2>/dev/null; then
        kill "$BOT_PID" 2>/dev/null
        echo "✅ Bot stopped (PID: $BOT_PID)"
    else
        echo "ℹ️  Bot not running (stale PID file)"
    fi
    rm -f "$BOT_PID_FILE"
else
    # Fallback to pgrep/kill if no PID file
    BOT_PID=$(pgrep -f "arbitrage_bot.py" | head -1)
    if [ -n "$BOT_PID" ]; then
        kill "$BOT_PID" 2>/dev/null
        echo "✅ Bot stopped (PID: $BOT_PID)"
    else
        echo "ℹ️  Bot not running"
    fi
fi

# Stop dashboard using PID file
if [ -f "$DASHBOARD_PID_FILE" ]; then
    DASHBOARD_PID=$(cat "$DASHBOARD_PID_FILE")
    if kill -0 "$DASHBOARD_PID" 2>/dev/null; then
        kill "$DASHBOARD_PID" 2>/dev/null
        echo "✅ Dashboard stopped (PID: $DASHBOARD_PID)"
    else
        echo "ℹ️  Dashboard not running (stale PID file)"
    fi
    rm -f "$DASHBOARD_PID_FILE"
else
    # Fallback to pgrep/kill if no PID file
    DASHBOARD_PID=$(pgrep -f "dashboard.py" | head -1)
    if [ -n "$DASHBOARD_PID" ]; then
        kill "$DASHBOARD_PID" 2>/dev/null
        echo "✅ Dashboard stopped (PID: $DASHBOARD_PID)"
    else
        echo "ℹ️  Dashboard not running"
    fi
fi

echo "✅ All processes stopped"
