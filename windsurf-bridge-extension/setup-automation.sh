#!/bin/bash

# Automated Windsurf Price Scraper Setup
# This script sets up automated daily price checking

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/price-scraper.log"
CRON_ENTRY="0 9 * * * cd $SCRIPT_DIR && npm run scrape-and-compile >> $LOG_FILE 2>&1"

echo "🔧 Setting up automated Windsurf price scraping..."

# Create logs directory
mkdir -p "$SCRIPT_DIR/logs"

# Create log file if it doesn't exist
touch "$LOG_FILE"

# Check if cron entry already exists
if crontab -l 2>/dev/null | grep -q "windsurf-bridge.*scrape-and-compile"; then
    echo "⚠️  Cron job already exists. Updating..."
    # Remove existing entry
    crontab -l 2>/dev/null | grep -v "windsurf-bridge.*scrape-and-compile" | crontab -
fi

# Add new cron entry
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo "✅ Cron job added successfully!"
echo "📅 Schedule: Daily at 9:00 AM"
echo "📝 Log file: $LOG_FILE"
echo ""
echo "🔍 To view logs: tail -f $LOG_FILE"
echo "🛑 To stop automation: crontab -e (then remove the windsurf line)"
echo ""
echo "🧪 Test run now? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "🚀 Running test scrape..."
    cd "$SCRIPT_DIR" && npm run scrape-and-compile
    echo "✅ Test completed. Check the output above."
fi
