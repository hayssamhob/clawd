#!/bin/bash
# Benchmark models for Augustus persona adherence

MODELS=(
  "ollama/qwq:latest"
  "openrouter/qwen/qwen3-coder:free"
  "openrouter/mistralai/devstral-2512:free"
  "kimi/moonshot-v1-auto"
)

echo "🧪 Benchmarking Models for Augustus Persona"
echo "============================================"
echo ""

for model in "${MODELS[@]}"; do
  echo "📊 Testing: $model"
  echo "---"
  
  # Switch model
  openclaw model set "$model" 2>&1 | grep -v "^$"
  
  # Wait for model switch
  sleep 2
  
  # Send test prompt via stdin
  response=$(echo "Who are you? Answer in one sentence." | openclaw chat --stdin 2>&1)
  
  echo "Response: $response"
  echo ""
  echo "---"
  echo ""
  
  sleep 2
done

# Reset to Claude
echo "🔄 Resetting to Claude Sonnet..."
openclaw model set anthropic/claude-sonnet-4-5-20250929

echo ""
echo "✅ Benchmark complete!"
