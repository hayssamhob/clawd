#!/bin/bash
# Simple JavaScript injection for Windsurf - No sudo required

set -e

echo "🌊 Windsurf Console Injector"
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

echo ""
echo "Step 1: Opening Developer Tools..."

# Open DevTools
osascript <<'APPLESCRIPT'
tell application "Windsurf"
    activate
end tell

delay 1

tell application "System Events"
    tell process "Windsurf"
        keystroke "i" using {command down, option down}
    end tell
end tell
APPLESCRIPT

sleep 3

echo "✅ DevTools opened"
echo ""
echo "Step 2: Injecting JavaScript interceptor..."
echo ""

# Create the JavaScript code
JS_CODE='const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  const url = String(args[0]);
  if (url.includes("model") || url.includes("llm")) {
    const clone = response.clone();
    try {
      const data = await clone.json();
      console.log("🎯🎯🎯 MODELS START 🎯🎯🎯");
      console.log(JSON.stringify(data, null, 2));
      console.log("🎯🎯🎯 MODELS END 🎯🎯🎯");
      
      // Also try to copy to clipboard
      copy(JSON.stringify(data, null, 2));
      console.log("✅ Copied to clipboard!");
    } catch(e) { console.error("Parse error:", e); }
  }
  return response;
};
console.log("✅ Interceptor active! Click model dropdown now.");'

# Copy JavaScript to clipboard
echo "$JS_CODE" | pbcopy

echo "✅ JavaScript copied to clipboard"
echo ""

# Paste into console
osascript <<'APPLESCRIPT'
tell application "System Events"
    tell process "Windsurf"
        -- Make sure we're in the console
        -- Paste from clipboard
        keystroke "v" using {command down}
        delay 0.5
        keystroke return
    end tell
end tell
APPLESCRIPT

sleep 2

echo "✅ JavaScript injected into console"
echo ""
echo "========================================="
echo "👆 NOW CLICK THE MODEL DROPDOWN"
echo "========================================="
echo ""
echo "Look in Cascade panel (right side of Windsurf)"
echo "Click the model selector at the bottom"
echo ""
echo "The models will be:"
echo "  1. Logged in the console (look for 🎯 markers)"
echo "  2. Automatically copied to your clipboard"
echo ""
echo "After clicking, the JSON should be in your clipboard."
echo "Just paste it here in the chat!"
echo ""
echo "Waiting for you to click..."

# Wait a moment for user to click
sleep 10

echo ""
echo "Did you click the dropdown?"
echo ""
echo "If you see models logged in the console:"
echo "  1. The JSON is already in your clipboard"
echo "  2. Just paste it in the chat with Augustus"
echo ""
echo "If nothing happened:"
echo "  1. Make sure DevTools Console tab is selected"
echo "  2. Look for '✅ Interceptor active!' message"
echo "  3. Click the model dropdown again"
echo ""
