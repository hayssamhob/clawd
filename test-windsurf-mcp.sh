#!/bin/bash
# Comprehensive MCP Test for Windsurf Automation

echo "==================================================="
echo "🧪 Windsurf MCP Integration Test Suite"
echo "==================================================="
echo ""

SELECTOR="$HOME/.nvm/versions/node/v22.12.0/lib/node_modules/openclaw/skills/windsurf-automation/selector.cjs"

# Test 1: Quick Task
echo "Test 1: Quick Task Classification"
echo "-----------------------------------"
node "$SELECTOR" "Fix typo in variable name"
echo ""

# Test 2: Daily Task
echo "Test 2: Daily Task Classification"
echo "-----------------------------------"
node "$SELECTOR" "Implement user authentication"
echo ""

# Test 3: Complex Task
echo "Test 3: Complex Task Classification"
echo "-----------------------------------"
node "$SELECTOR" "Design distributed caching architecture"
echo ""

# Test 4: Emergency Task
echo "Test 4: Emergency Task Classification"
echo "-----------------------------------"
node "$SELECTOR" "URGENT: Production database connection failing"
echo ""

# Test 5: Usage Report
echo "Test 5: Usage Report"
echo "-----------------------------------"
node "$SELECTOR" --usage
echo ""

echo "==================================================="
echo "✅ All tests complete!"
echo "==================================================="
