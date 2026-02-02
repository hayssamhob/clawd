#!/bin/bash
# Windsurf Model Extractor
# Extracts available models from Windsurf installation and API

set -e

echo "🔍 Windsurf Model Extractor"
echo "============================="
echo ""

# Check if Windsurf is running
if ! pgrep -f "Windsurf" > /dev/null; then
    echo "⚠️  Windsurf is not running. Start it first."
    exit 1
fi

echo "✅ Windsurf is running"
echo ""

# Method 1: Check cache/IndexedDB for model data
echo "📦 Method 1: Checking local cache..."
CACHE_DIR="$HOME/Library/Application Support/Windsurf"

if [ -d "$CACHE_DIR" ]; then
    # Look for model configurations in workspace storage
    MODEL_FILES=$(find "$CACHE_DIR/User/workspaceStorage" -name "state.vscdb" 2>/dev/null | head -1)
    
    if [ -n "$MODEL_FILES" ]; then
        echo "   Found workspace database"
        # Try to extract model data
        sqlite3 "$MODEL_FILES" "SELECT key, value FROM ItemTable WHERE key LIKE '%model%' OR key LIKE '%cascade%';" 2>/dev/null | head -20
    fi
fi

echo ""

# Method 2: Check API Server endpoint
echo "📡 Method 2: Querying Windsurf API..."

# Extract authentication info from running process
API_URL="https://server.self-serve.windsurf.com"
echo "   API Server: $API_URL"

# Try to find cached API responses
CACHE_HTTP="$HOME/Library/Caches/Windsurf"
if [ -d "$CACHE_HTTP" ]; then
    echo "   Checking HTTP cache..."
    find "$CACHE_HTTP" -name "*.json" 2>/dev/null | head -5
fi

echo ""

# Method 3: Check extension storage (Windsurf stores Cascade config here)
echo "🔧 Method 3: Checking extension storage..."
EXT_DIR="$HOME/.windsurf/extensions"

if [ -d "$EXT_DIR" ]; then
    # Look for Windsurf/Cascade extension
    WINDSURF_EXT=$(find "$EXT_DIR" -type d -name "*windsurf*" -o -name "*cascade*" 2>/dev/null | head -1)
    
    if [ -n "$WINDSURF_EXT" ]; then
        echo "   Found extension: $WINDSURF_EXT"
        find "$WINDSURF_EXT" -name "*.json" 2>/dev/null | grep -E "(model|config)" | head -10
    fi
fi

echo ""

# Method 4: Check settings.json for model preferences
echo "⚙️  Method 4: Checking settings..."
SETTINGS_FILE="$HOME/Library/Application Support/Windsurf/User/settings.json"

if [ -f "$SETTINGS_FILE" ]; then
    echo "   Settings file found"
    cat "$SETTINGS_FILE" | jq '.' 2>/dev/null || cat "$SETTINGS_FILE"
fi

echo ""

# Method 5: Direct API query (requires auth token)
echo "🌐 Method 5: Attempting API query..."
echo "   (This requires valid authentication)"

# Try to extract session/auth from storage
GLOBAL_STORAGE="$HOME/Library/Application Support/Windsurf/User/globalStorage/storage.json"
if [ -f "$GLOBAL_STORAGE" ]; then
    echo "   Checking global storage for auth..."
    # This might contain session info
fi

echo ""
echo "========================================="
echo ""
echo "💡 RECOMMENDATION:"
echo "The most reliable method is to:"
echo "1. Open Windsurf"
echo "2. Open Cascade panel"
echo "3. Click model dropdown"
echo "4. Screenshot or manually list models"
echo ""
echo "Or use browser DevTools:"
echo "1. View > Command Palette (Cmd+Shift+P)"
echo "2. Type 'Developer: Toggle Developer Tools'"
echo "3. Go to Network tab"
echo "4. Open model dropdown"
echo "5. Look for API call to fetch models"
echo ""
