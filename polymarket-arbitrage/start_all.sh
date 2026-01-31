#!/bin/bash
# Polymarket Arbitrage Bot - Complete Startup Script
# Starts bot + dashboard + chat interface

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Polymarket Arbitrage Bot Launcher   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please create .env file with your credentials"
    exit 1
fi

# Check if config exists
if [ ! -f "config/config.yaml" ]; then
    echo -e "${RED}❌ Error: config/config.yaml not found${NC}"
    exit 1
fi

# Create necessary directories
echo -e "${GREEN}📁 Creating directories...${NC}"
mkdir -p data logs data/backups

# Check dependencies
echo -e "${GREEN}🔍 Checking dependencies...${NC}"
python3 -c "from py_clob_client.client import ClobClient; from dotenv import load_dotenv; import flask" 2>/dev/null
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Missing dependencies${NC}"
    echo -e "${YELLOW}Installing dependencies...${NC}"
    pip3 install -r requirements.txt
fi
echo -e "${GREEN}✅ Dependencies OK${NC}"

# Initialize database
echo -e "${GREEN}🗄️  Initializing database...${NC}"
python3 -c "from src.database import Database; db = Database('data/trades.db'); print('Database initialized')"
echo -e "${GREEN}✅ Database ready${NC}"

# Kill any existing processes
echo -e "${YELLOW}🔄 Stopping existing processes...${NC}"
pkill -f "arbitrage_bot.py" || true
pkill -f "dashboard.py" || true
sleep 2

# Start dashboard in background
echo -e "${GREEN}🌐 Starting dashboard server (port 8000)...${NC}"
python3 src/dashboard.py > logs/dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo -e "${GREEN}   Dashboard PID: $DASHBOARD_PID${NC}"

# Wait for dashboard to start
sleep 3

# Start bot
echo -e "${GREEN}🤖 Starting arbitrage bot...${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo

# Run bot in foreground (shows output)
python3 src/arbitrage_bot.py

# Cleanup on exit
trap "echo -e '\n${YELLOW}Shutting down...${NC}'; kill $DASHBOARD_PID 2>/dev/null || true" EXIT
