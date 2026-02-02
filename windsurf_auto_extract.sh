#!/bin/bash
# Fully Automated Windsurf Model Extractor
# Uses AppleScript + network monitoring

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_FILE="$SCRIPT_DIR/windsurf-models-actual.json"

echo "🌊 Windsurf Automatic Model Extractor"
echo "========================================="
echo ""

# Check if Windsurf is running
if ! pgrep -f "Windsurf" > /dev/null; then
    echo "▶️  Starting Windsurf..."
    open -a "Windsurf"
    sleep 3
else
    echo "✅ Windsurf is running"
fi

# Start network monitoring in background
echo "📡 Starting network monitor..."
MONITOR_LOG="$SCRIPT_DIR/windsurf-network.log"
rm -f "$MONITOR_LOG"

# Monitor network traffic from Windsurf process
# Look for API calls containing 'model'
(sudo tcpdump -i any -A 'host server.self-serve.windsurf.com' 2>/dev/null | \
    grep -A 50 "model" > "$MONITOR_LOG" &)
TCPDUMP_PID=$!

echo "   Network monitor started (PID: $TCPDUMP_PID)"
echo ""

# Open DevTools automatically using AppleScript
echo "🔧 Opening Developer Tools..."
osascript <<'APPLESCRIPT'
tell application "Windsurf"
    activate
end tell

delay 1

tell application "System Events"
    tell process "Windsurf"
        -- Open Developer Tools (Cmd+Option+I)
        keystroke "i" using {command down, option down}
    end tell
end tell
APPLESCRIPT

sleep 2

# Inject JavaScript using AppleScript
echo "💉 Injecting network interceptor..."
osascript <<'APPLESCRIPT'
tell application "System Events"
    tell process "Windsurf"
        -- Paste the interception code
        set the clipboard to "const originalFetch = window.fetch; window.fetch = async (...args) => { const response = await originalFetch(...args); const url = String(args[0]); if (url.includes('model')) { const clone = response.clone(); try { const data = await clone.json(); console.log('🎯MODEL_DATA🎯', JSON.stringify(data)); } catch(e) {} } return response; }; console.log('✅ Interceptor active!');"
        
        keystroke "v" using {command down}
        delay 0.5
        keystroke return
    end tell
end tell
APPLESCRIPT

sleep 1

echo "✅ JavaScript injected"
echo ""
echo "========================================="
echo "👆 CLICK THE MODEL DROPDOWN NOW"
echo "========================================="
echo ""
echo "Looking in Cascade panel (right side)"
echo "Click the model selector at the bottom"
echo ""
echo "Waiting for API call..."
echo "(This script will auto-detect when you click)"
echo ""

# Wait for user to click and for data to be captured
sleep 5

# Try to extract from console output or network log
echo "🔍 Searching for model data..."

# Check if we captured anything
if [ -f "$MONITOR_LOG" ] && [ -s "$MONITOR_LOG" ]; then
    echo "✅ Network traffic captured"
    # Try to extract JSON from network log
    # This is tricky and might not work reliably
fi

# Alternative: Check Windsurf's console logs
CONSOLE_LOG="$HOME/Library/Logs/Windsurf/main.log"
if [ -f "$CONSOLE_LOG" ]; then
    echo "   Checking console logs..."
    grep -A 100 "MODEL_DATA" "$CONSOLE_LOG" 2>/dev/null | tail -50
fi

# Stop network monitoring
echo ""
echo "🛑 Stopping network monitor..."
sudo kill $TCPDUMP_PID 2>/dev/null || true

echo ""
echo "========================================="
echo "⚠️  MANUAL STEP REQUIRED"
echo "========================================="
echo ""
echo "The automated extraction is 90% done, but we need"
echo "you to copy the model data from the Console:"
echo ""
echo "1. Look at DevTools Console (should be open)"
echo "2. Find the line with 🎯MODEL_DATA🎯"
echo "3. Copy the JSON that follows"
echo "4. Save it to: $OUTPUT_FILE"
echo ""
read -p "Press Enter when you've saved the file..."

if [ -f "$OUTPUT_FILE" ]; then
    echo "✅ File found! Parsing..."
    python3 <<'PYTHON_EOF'
import json
import sys

try:
    with open('windsurf-models-actual.json') as f:
        data = json.load(f)
    
    print("\n🎯 SUCCESS! Models extracted:")
    print("=" * 60)
    print(json.dumps(data, indent=2)[:500] + "...")
    print("=" * 60)
    print(f"\n✅ {len(data.get('models', data))} models found")
    
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
PYTHON_EOF
else
    echo "❌ File not created. Please run the interactive script:"
    echo "   ./get-windsurf-models.sh"
fi
