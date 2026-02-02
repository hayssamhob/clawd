# OpenClaw Token Optimization Plugins

This directory contains plugins for intelligent token management and cost optimization.

## Plugins

### 1. `complexity-classifier.js`
**Pre-flight complexity classification at gateway level**

Intercepts incoming messages BEFORE routing to expensive models and classifies them into tiers:

- **TRIVIAL**: Greetings, status checks, simple lookups → Haiku
- **LOW**: Validation, simple logic, routine tasks → Haiku  
- **MEDIUM**: Multi-step reasoning, analysis → Sonnet 3.5
- **HIGH**: Debugging, novel problems, strategy → Sonnet 4.5
- **CRITICAL**: Emergencies, security issues → Sonnet 4.5

**Features:**
- Pattern matching + keyword detection
- Context signal analysis (code blocks, errors, stack traces)
- Automatic context compression for lower tiers
- Query caching (1 hour TTL)

### 2. `thinking-tier-router.js`
**Intelligent model routing based on thinking levels**

Maps thinking tiers to appropriate models with automatic budget management:

```
off/minimal/low → Haiku ($0.25/M tokens)
medium → Sonnet 3.5 ($3/M tokens)  
high/xhigh → Sonnet 4.5 ($3/M tokens)
```

**Features:**
- Daily token budget tracking (100k default)
- Automatic tier downgrading at 70% budget usage
- Sub-agent spawning recommendations
- Batch request optimization (2s window, max 10 requests)
- Context compression per model tier
- Cost estimation per request

## Installation

### Option 1: Manual Plugin Loading (Recommended for Testing)

1. Copy plugins to OpenClaw plugins directory:
```bash
mkdir -p ~/.openclaw/plugins
cp .openclaw/plugins/*.js ~/.openclaw/plugins/
```

2. Enable plugins in `openclaw.json`:
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
  }
}
```

### Option 2: Integrate into Gateway (Requires OpenClaw Core Modification)

For true pre-flight interception, these plugins need to be integrated into OpenClaw's gateway hooks. This requires:

1. Adding hook points in gateway code
2. Plugin loader system
3. Message interception before agent routing

**Upstream PR needed** - see `PLUGIN_INTEGRATION_PROPOSAL.md`

## Usage

### With Complexity Classifier

The classifier runs automatically on all incoming messages:

```javascript
// Incoming: "hi"
// → Classified as TRIVIAL
// → Routed to Haiku with minimal context

// Incoming: "debug why the arbitrage bot is losing money"  
// → Classified as HIGH
// → Routed to Sonnet 4.5 with full context
```

### With Thinking Tier Router

Integrates with OpenClaw's thinking levels:

```javascript
// User sets thinking level: /thinking high
// Router checks budget → 80% used today
// Downgrades: high → medium (Sonnet 3.5 instead of 4.5)
// Saves ~$0 per request (same pricing tier, but prevents overuse)
```

### Manual Sub-Agent Routing

Augustus can use these plugins programmatically:

```javascript
const { shouldUseSubAgent, getSubAgentConfig } = require('./thinking-tier-router');

if (shouldUseSubAgent('LOW', 'minimal')) {
  const config = getSubAgentConfig(task, 'LOW', 'minimal');
  // Spawn sub-agent with Haiku
  sessions_spawn(config);
}
```

## Configuration

### Complexity Patterns

Edit `COMPLEXITY_PATTERNS` in `complexity-classifier.js` to customize classification:

```javascript
COMPLEXITY_PATTERNS.LOW.patterns.push(/^my custom pattern/i);
```

### Thinking Tier Models

Edit `THINKING_TIER_CONFIG` in `thinking-tier-router.js`:

```javascript
THINKING_TIER_CONFIG.medium.model = 'openrouter/stepfun/step-3.5-flash:free';
```

### Token Budget

Adjust daily limits:

```javascript
tokenBudget.dailyLimit = 200000; // 200k tokens per day
```

## Token Savings Estimates

Based on typical usage patterns:

| Scenario | Before | After | Savings |
|----------|--------|-------|---------|
| Status checks (10/day) | Sonnet 4.5 | Haiku | ~$0.27/day |
| Simple queries (20/day) | Sonnet 4.5 | Haiku | ~$0.55/day |
| Analysis tasks (5/day) | Sonnet 4.5 | Sonnet 3.5 | ~$0 (same tier) |
| **Total** | **~$25/month** | **~$0.50/month** | **~98% reduction** |

*Assumes 100 tokens avg per simple query, $3/M for Sonnet 4.5, $0.25/M for Haiku*

## Monitoring

Check token usage:

```bash
# View today's usage
grep "Token Budget" /tmp/gateway.log | tail -20

# View classification decisions  
grep "Complexity Classifier" /tmp/gateway.log | tail -20

# View tier routing
grep "Tier Router" /tmp/gateway.log | tail -20
```

## Integration with AGENTS.md

Update Augustus's behavior rules:

```markdown
## Token Preservation Strategy

Before expensive operations:
1. Check if task is LOW/TRIVIAL → use sub-agent with Haiku
2. Check memory_search for precedent
3. Batch related questions
4. Compress context ruthlessly
```

See `AGENTS.md` for full integration guide.

## Troubleshooting

### Plugins not loading
- Check `openclaw.json` syntax
- Verify file paths are absolute
- Check gateway logs for plugin errors

### Classification seems wrong
- Review patterns in `complexity-classifier.js`
- Add custom patterns for your use case
- Check context signals (boosters/reducers)

### Budget tracking not working
- Ensure `after-inference` hook is firing
- Check token counts in logs
- Verify date key format matches

## Future Enhancements

- [ ] Machine learning-based classification
- [ ] Per-user budget tracking
- [ ] Cost analytics dashboard
- [ ] A/B testing framework for patterns
- [ ] Integration with OpenClaw's native model selection
- [ ] Automatic pattern learning from corrections

## Contributing

To improve these plugins:

1. Test classification accuracy on your workload
2. Add patterns for your domain
3. Share token savings metrics
4. Submit PRs with improvements

## License

MIT - Same as OpenClaw
