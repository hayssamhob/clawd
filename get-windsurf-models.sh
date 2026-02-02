#!/bin/bash
# Windsurf Model Extractor - Complete Script
# This script guides you through extracting actual Windsurf models

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_FILE="$SCRIPT_DIR/windsurf-models-actual.json"

echo "🌊 Windsurf Model Extractor"
echo "========================================="
echo ""

# Check if Windsurf is running
if ! pgrep -f "Windsurf" > /dev/null; then
    echo "⚠️  Windsurf is not running. Starting it..."
    open -a "Windsurf"
    sleep 3
else
    echo "✅ Windsurf is running"
fi

echo ""
echo "📋 STEP-BY-STEP INSTRUCTIONS:"
echo "========================================="
echo ""
echo "1️⃣  **Open Developer Tools in Windsurf:**"
echo "   - Go to: View → Toggle Developer Tools"
echo "   - OR press: Cmd+Option+I"
echo ""
echo "2️⃣  **Go to Network Tab:**"
echo "   - Click the 'Network' tab at the top"
echo "   - Make sure 'Preserve log' is checked"
echo ""
echo "3️⃣  **Open Cascade Panel:**"
echo "   - Make sure Cascade panel is visible (right side)"
echo ""
echo "4️⃣  **Click Model Dropdown:**"
echo "   - At the bottom of Cascade, click the model selector"
echo "   - This will show all available models"
echo ""
echo "5️⃣  **Find the API Request:**"
echo "   - Look in Network tab for request containing 'model'"
echo "   - Common endpoints:"
echo "     • /api/models"
echo "     • /v1/models"
echo "     • /cascade/models"
echo ""
echo "6️⃣  **Copy the Response:**
echo "   - Click on the request"
echo "   - Go to 'Response' tab"
echo "   - Right-click → Copy Response"
echo ""
echo "7️⃣  **Save to File:**"
echo "   - Paste the JSON into: $OUTPUT_FILE"
echo ""
echo "========================================="
echo ""
echo "💡 ALTERNATIVE METHOD (Faster):"
echo "========================================="
echo ""
echo "1. Open DevTools Console (Cmd+Option+I, then Console tab)"
echo "2. Paste and run:"
echo ""
echo "   // Intercept fetch requests"
echo "   const original = window.fetch;"
echo "   window.fetch = async (...args) => {"
echo "     const response = await original(...args);"
echo "     if (args[0].includes('model')) {"
echo "       const clone = response.clone();"
echo "       const json = await clone.json();"
echo "       console.log('MODELS:', JSON.stringify(json, null, 2));"
echo "     }"
echo "     return response;"
echo "   };"
echo ""
echo "3. Click model dropdown"
echo "4. Copy the logged JSON"
echo ""
echo "========================================="
echo ""
read -p "Press Enter when you've saved the JSON to $OUTPUT_FILE..."
echo ""

# Check if file was created
if [ -f "$OUTPUT_FILE" ]; then
    echo "✅ Found $OUTPUT_FILE"
    echo ""
    echo "📊 Parsing models..."
    
    # Parse and display models
    python3 << 'PYTHON_EOF'
import json
import sys

try:
    with open('windsurf-models-actual.json') as f:
        data = json.load(f)
    
    # Try different possible structures
    models = []
    
    if isinstance(data, list):
        models = data
    elif isinstance(data, dict):
        if 'models' in data:
            models = data['models']
        elif 'data' in data:
            models = data['data']
    
    if models:
        print(f"\n🎯 Found {len(models)} models:\n")
        print("=" * 80)
        
        for model in models:
            if isinstance(model, dict):
                model_id = model.get('id', model.get('model_id', model.get('name', 'Unknown')))
                provider = model.get('provider', model.get('owned_by', 'N/A'))
                credits = model.get('credits', model.get('cost', 'N/A'))
                
                print(f"• {model_id}")
                print(f"  Provider: {provider}")
                print(f"  Credits: {credits}")
                print()
            elif isinstance(model, str):
                print(f"• {model}")
        
        print("=" * 80)
        print(f"\n✅ Successfully parsed {len(models)} models!")
        print(f"💾 Data saved in: windsurf-models-actual.json")
    else:
        print("❌ Could not find models array in JSON")
        print("   Please check the structure of the file")
        
except FileNotFoundError:
    print("❌ File not found: windsurf-models-actual.json")
    sys.exit(1)
except json.JSONDecodeError as e:
    print(f"❌ Invalid JSON: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
PYTHON_EOF

else
    echo "❌ File not found. Please create: $OUTPUT_FILE"
    echo ""
    echo "📝 Expected format:"
    echo '{"models": [{"id": "model-name", "provider": "...", "credits": 0}, ...]}'
    exit 1
fi

echo ""
echo "========================================="
echo "✨ DONE! Models extracted successfully."
echo "========================================="
