# Token Optimization Plugin Integration Guide

## Quick Start

### 1. Install Plugins

```bash
# Copy plugins to OpenClaw directory
mkdir -p ~/.openclaw/plugins
cp .openclaw/plugins/*.js ~/.openclaw/plugins/

# Verify files
ls -la ~/.openclaw/plugins/
```

### 2. Update OpenClaw Configuration

Add to `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "complexity-classifier": {
        "enabled": true,
        "path": "~/.openclaw/plugins/complexity-classifier.js"
      },
      "thinking-tier-router": {
        "enabled": true,
        "path": "~/.openclaw/plugins/thinking-tier-router.js"
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-5-20250929",
        "fallbacks": [
          "openrouter/stepfun/step-3.5-flash:free",
          "ollama/llama3.2:latest"
        ]
      },
      "thinkingDefault": "medium",
      "subagents": {
        "model": {
          "primary": "anthropic/claude-3-5-haiku-20241022",
          "fallbacks": [
            "openrouter/stepfun/step-3.5-flash:free",
            "ollama/llama3.2:latest"
          ]
        }
      }
    }
  }
}
```

### 3. Restart Gateway

```bash
pkill -f openclaw-gateway
openclaw gateway --port 18789 > /tmp/gateway.log 2>&1 &
```

### 4. Test the System

```bash
# Test TRIVIAL classification (should use Haiku)
openclaw agent --agent main --message "hi"

# Test LOW classification (should use Haiku sub-agent)
openclaw agent --agent main --message "check if the bot is running"

# Test HIGH classification (should use Sonnet 4.5)
openclaw agent --agent main --message "debug why the arbitrage bot is losing money"

# Check logs
grep "Complexity Classifier" /tmp/gateway.log | tail -5
grep "Token Budget" /tmp/gateway.log | tail -5
```

## Current Limitation: Manual Routing

**Important**: OpenClaw's gateway doesn't currently support pre-flight plugin hooks. The plugins are designed for the architecture but need Augustus to manually invoke them.

### Workaround: Augustus Self-Routes

Augustus (Claude Sonnet 4.5) acts as the intelligent router:

1. Receives all messages (unavoidable initial token cost)
2. Classifies complexity internally
3. Routes to appropriate sub-agent or handles directly
4. Coordinates results

This still saves tokens because:
- Augustus's classification is fast (~50 tokens)
- Sub-agents do the heavy lifting with cheaper models
- Batch processing reduces total calls
- Memory-first approach avoids redundant reasoning

## Integration with Augustus Behavior

Augustus now follows these rules (from AGENTS.md):

### Before Every Response

```javascript
// 1. Check memory first
const precedent = memory_search(query);
if (precedent) return precedent;

// 2. Classify complexity
const complexity = classifyComplexity(message);

// 3. Route intelligently
if (complexity === 'LOW' || complexity === 'TRIVIAL') {
  // Spawn Haiku sub-agent
  const result = await sessions_spawn({
    agentId: 'worker',
    model: 'anthropic/claude-3-5-haiku-20241022',
    thinking: 'minimal',
    task: compressedTask,
    promptMode: 'minimal'
  });
  return result;
}

// 4. Handle directly if HIGH/CRITICAL
return handleWithFullReasoning(message);
```

## Token Savings Projections

### Baseline (No Optimization)
- All requests → Sonnet 4.5
- 100 requests/day × 1000 tokens avg = 100k tokens/day
- Cost: ~$0.30/day = ~$9/month

### With Optimization
- 60% TRIVIAL/LOW → Haiku (60 requests × 200 tokens = 12k tokens)
- 30% MEDIUM → Sonnet 3.5 (30 requests × 1000 tokens = 30k tokens)
- 10% HIGH/CRITICAL → Sonnet 4.5 (10 requests × 2000 tokens = 20k tokens)
- Total: 62k tokens/day
- Cost: ~$0.05/day = ~$1.50/month

**Savings: ~83% reduction**

## Monitoring & Tuning

### Check Classification Accuracy

```bash
# View recent classifications
grep "Complexity Classifier" /tmp/gateway.log | tail -20

# Look for patterns
grep "TRIVIAL" /tmp/gateway.log | wc -l
grep "LOW" /tmp/gateway.log | wc -l
grep "MEDIUM" /tmp/gateway.log | wc -l
grep "HIGH" /tmp/gateway.log | wc -l
```

### Adjust Patterns

If classifications seem wrong, edit patterns in `complexity-classifier.js`:

```javascript
COMPLEXITY_PATTERNS.LOW.patterns.push(/^your custom pattern/i);
```

### Track Token Usage

```bash
# Daily usage
grep "Token Budget" /tmp/gateway.log | grep $(date +%Y-%m-%d)

# Budget warnings
grep "Budget constraint" /tmp/gateway.log | tail -10
```

## Advanced: Custom Complexity Rules

### Add Domain-Specific Patterns

```javascript
// In complexity-classifier.js
COMPLEXITY_PATTERNS.LOW.patterns.push(
  /^(check|verify) arbitrage (opportunity|position)/i,
  /^what('s| is) the (current|latest) (price|rate)/i
);

COMPLEXITY_PATTERNS.HIGH.patterns.push(
  /^(optimize|improve) (trading|arbitrage) (strategy|algorithm)/i,
  /^(analyze|investigate) (unusual|unexpected) (behavior|pattern)/i
);
```

### Adjust Budget Thresholds

```javascript
// In thinking-tier-router.js
tokenBudget.dailyLimit = 200000; // Increase daily limit

// Modify downgrade logic
shouldDowngrade() {
  const percentUsed = this.getPercentUsed();
  return percentUsed > 80; // More aggressive (was 70%)
}
```

## Troubleshooting

### Plugins Not Loading

**Symptom**: No classification logs in gateway output

**Fix**:
1. Check plugin paths are absolute: `~/.openclaw/plugins/...`
2. Verify JSON syntax in `openclaw.json`
3. Check gateway logs for plugin errors: `grep "plugin" /tmp/gateway.log`

### Wrong Classifications

**Symptom**: Simple queries classified as HIGH

**Fix**:
1. Review patterns in `complexity-classifier.js`
2. Add more TRIVIAL/LOW patterns for your domain
3. Adjust context signal weights

### Budget Not Tracking

**Symptom**: No "Token Budget" logs

**Fix**:
1. Ensure `after-inference` hook is enabled
2. Check token counts are being reported
3. Verify date key format matches system date

### Sub-Agents Not Spawning

**Symptom**: All requests handled by main agent

**Fix**:
1. Check `shouldUseSubAgent()` logic
2. Verify sub-agent model is in allowlist
3. Check gateway logs for spawn errors

## Future Enhancements

### Phase 1: Current (Manual Routing)
- ✅ Augustus classifies and routes
- ✅ Sub-agent spawning for cheap tasks
- ✅ Memory-first approach
- ✅ Token budget tracking

### Phase 2: Gateway Integration (Requires PR)
- [ ] Pre-flight classification hook
- [ ] Automatic model selection before agent invocation
- [ ] Request metadata for complexity hints
- [ ] Channel-level routing rules

### Phase 3: ML-Based Classification
- [ ] Train classifier on actual usage patterns
- [ ] Automatic pattern learning from corrections
- [ ] Confidence scores for routing decisions
- [ ] A/B testing framework

## Contributing

Improve these plugins:

1. Test on your workload
2. Add domain-specific patterns
3. Share token savings metrics
4. Submit PRs with improvements

## Support

Issues or questions:
- Check logs: `/tmp/gateway.log`
- Review AGENTS.md for behavior rules
- Test with: `openclaw agent --agent main --message "test"`
- Document findings in memory files
