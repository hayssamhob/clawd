#!/bin/bash

# Daily Windsurf Model Update Service
# This script sets up automated daily updates for Windsurf model pricing

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPDATE_SCRIPT="$SCRIPT_DIR/smart-updater.js"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/model-updates.log"

# Create logs directory
mkdir -p "$LOG_DIR"

# Cron job entry - runs daily at 9 AM
CRON_TIME="0 9 * * *"
CRON_COMMAND="cd $SCRIPT_DIR && npm run update-models >> $LOG_FILE 2>&1"
CRON_ENTRY="$CRON_TIME $CRON_COMMAND"

echo "🔧 Setting up automated daily model updates..."
echo ""
echo "📅 Schedule: Daily at 9:00 AM"
echo "📝 Log file: $LOG_FILE"
echo "🔄 Update script: $UPDATE_SCRIPT"
echo ""

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "auto-update-models.js"; then
    echo "⚠️  Existing cron job found. Removing..."
    crontab -l 2>/dev/null | grep -v "auto-update-models.js" | crontab -
fi

# Add new cron entry
echo "➕ Adding cron job..."
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

if [ $? -eq 0 ]; then
    echo "✅ Cron job added successfully!"
    echo ""
    echo "📋 Current cron jobs:"
    crontab -l | grep "auto-update-models"
    echo ""
    echo "🧪 Run test update now? (y/n)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo ""
        echo "🚀 Running test update..."
        node "$UPDATE_SCRIPT"
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Test update successful!"
            echo "🔄 Compiling extension..."
            cd "$SCRIPT_DIR" && npm run compile
            echo ""
            echo "✅ Setup complete! Models will update daily at 9 AM."
        else
            echo ""
            echo "❌ Test update failed. Check the script."
        fi
    else
        echo ""
        echo "✅ Setup complete! Models will update daily at 9 AM."
    fi
else
    echo "❌ Failed to add cron job"
    exit 1
fi

echo ""
echo "📖 Useful commands:"
echo "   View logs: tail -f $LOG_FILE"
echo "   Manual update: node $UPDATE_SCRIPT"
echo "   Remove automation: crontab -e (delete the auto-update-models line)"
echo ""
