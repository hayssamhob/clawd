# Windsurf Capabilities & Model Reference

## Available Models

### Tier 1: Budget (Fast & Cheap)
- **Claude Haiku** - $0.80/M input, $4/M output
  - Best for: Simple refactoring, formatting, small fixes
  - Speed: Instant
  - Max tokens: 200K context
  - Use when: Task is straightforward, budget constrained

### Tier 2: Balanced (Speed + Capability)
- **Claude Sonnet** - $3/M input, $15/M output
  - Best for: Feature generation, medium refactoring, debugging
  - Speed: Fast (2-5 seconds)
  - Max tokens: 200K context
  - Use when: Good balance needed between cost and capability

### Tier 3: Advanced (Deep Reasoning)
- **Claude Opus** - $15/M input, $75/M output
  - Best for: Complex architecture, optimization, critical systems
  - Speed: Slower (5-15 seconds)
  - Max tokens: 200K context
  - Use when: Task requires advanced reasoning

### Tier 4: Experimental (Cheap Deep Thinking)
- **DeepSeek V3** - $0.27/M input, $1.10/M output
  - Best for: Complex logic, deep thinking at low cost
  - Speed: Medium (3-10 seconds)
  - Max tokens: Varies
  - Use when: Complex + budget-conscious

## Routing Strategy

**Complexity-Based Routing** (default):
```
Token Count Analysis:
< 500 tokens
  → Simple
  → Use Haiku

500-2000 tokens
  → Medium
  → Use Sonnet

> 2000 tokens OR "refactor"/"optimize"/"rewrite"
  → Complex
  → Use best available (Opus preferred, Sonnet fallback, DeepSeek for budget)
```

## Model Selection Matrix

| Task Type | Tokens | Complexity | Recommended | Fallback |
|-----------|--------|-----------|-------------|----------|
| Format cleanup | 100-300 | Simple | Haiku | Sonnet |
| Small feature | 300-800 | Simple | Haiku | Sonnet |
| Bug fix | 400-1000 | Medium | Sonnet | Haiku if simple, Opus if complex |
| Refactoring | 1000-2000 | Medium | Sonnet | Haiku if simple, Opus if needs depth |
| Architecture | 2000+ | Complex | Opus | DeepSeek, Sonnet as last resort |
| Type definitions | 500-1500 | Medium | Sonnet | Haiku |
| Testing suite | 1500-3000 | Complex | Opus | Sonnet |

## Performance Benchmarks

### Latency (P50)
- Haiku: 800ms
- Sonnet: 2.5s
- Opus: 8s
- DeepSeek: 4s

### Quality (1-10 scale)
- Haiku: 7 (great for simple, weak on complex)
- Sonnet: 8.5 (balanced, reliable)
- Opus: 9.5 (excellent, slower)
- DeepSeek: 8 (good for logic, great value)

### Cost per 1000 tokens
- Haiku: $0.0008
- Sonnet: $0.0045
- Opus: $0.0225
- DeepSeek: $0.0014

## Instance Configuration

### Typical Setup
- 1x Opus instance (for complex tasks)
- 2x Sonnet instances (for medium tasks, parallelization)
- 1x Haiku instance (for simple, high-volume tasks)
- 1x DeepSeek instance (for budget-conscious complex work)

### Scaling Rules
- If queue > 5 tasks: Add Sonnet instance
- If queue > 10 tasks: Add Haiku instance
- If complex tasks fail: Check Opus health

## Known Limitations

### Model Limits
- No file I/O (must pass content as strings)
- No network calls
- No real-time data
- Max execution: 30 minutes per task

### Instance Limits
- Max concurrent tasks per instance: 1
- Max queue depth: 100 tasks
- Max task size: 4000 tokens prompt

### Broker Limits
- Max instances: 10 (hard limit)
- Max tasks/minute: 60
- Memory per instance: 2GB
- Uptime guarantee: 99% (best effort)

## Preferred Prompt Structure

Windsurf works best with:
```
## Task
Brief 1-sentence summary

## Context
What's the background/why?

## Requirements
- Requirement 1
- Requirement 2
- Requirement 3

## Constraints
- Framework/language must be X
- Must avoid Y
- Performance target: Z

## Examples (if applicable)
Input → Expected output
```

## Fallback Strategy

If Windsurf unavailable:
1. Check broker health
2. If broker down, route to direct Claude API
3. If queue full, queue for later
4. If timeout, escalate to human

## Cost Optimization Tips

1. **Use Haiku for high-volume work** - 10x cheaper than Opus
2. **Batch small tasks** - Submit together to reduce overhead
3. **Cache results** - Don't re-submit identical prompts
4. **Use DeepSeek for complex logic** - 15x cheaper than Opus for similar reasoning

## Last Updated
Feb 4, 2026

## Performance Tracking
- Monitor avg task time per model
- Track cost per completed task
- Log failures and retries
- Quarterly model comparison
