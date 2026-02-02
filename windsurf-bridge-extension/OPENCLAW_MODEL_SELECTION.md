# Updated OpenClaw MCP Configuration

{
  "mcpServers": {
    "windsurf-bridge": {
      "command": "nc",
      "args": ["localhost", "3100"],
      "env": {},
      "description": "Windsurf Cascade control - OpenClaw can choose ANY model based on task requirements"
    }
  }
}

## Model Selection - OpenClaw Decides

OpenClaw can now specify ANY model:

### 1. Tier Shortcuts (Recommended for most cases)
- `"free"` → SWE-1.5 Free (0 credits, best default)
- `"cheap"` → DeepSeek V3 (0.5 credits, good reasoning)
- `"smart"` → Claude 3.5 Haiku (token-based, best quality)
- `"fast"` → Gemini 2.0 Flash (0.5 credits, speed)

### 2. Exact Model IDs (For specific requirements)
- `"swe-1.5-free"` - Best free option
- `"swe-1-lite"` - Ultra-fast, always free
- `"deepseek-v3"` - Great value reasoning
- `"gemini-2.0-flash"` - Fast iterations
- `"claude-3.5-haiku"` - Premium reasoning
- `"claude-3.5-sonnet"` - Top-tier quality
- `"claude-4-sonnet"` - Latest (BYOK)
- `"claude-4-opus"` - Most powerful (BYOK)
- `"swe-1.5-paid"` - 13x faster
- `"codex"` - Documentation specialist
- `"gpt-5-low-reasoning"` - Simple tasks
- `"grok-fast-code"` - Experiments
- `"gpt-4.5"` - Beta testing

### 3. Partial Names (Fuzzy matching)
- `"claude"` matches any Claude model
- `"swe"` matches SWE models
- `"deepseek"` matches DeepSeek

## Usage Examples

```javascript
// OpenClaw decides based on task complexity
const taskComplexity = analyzeTask(task); // Your logic

if (taskComplexity === 'simple') {
  await mcp.call('windsurf-bridge', 'delegate_to_cascade', {
    prompt: task,
    model: 'free'  // SWE-1.5 Free, 0 credits
  });
} else if (taskComplexity === 'complex') {
  await mcp.call('windsurf-bridge', 'delegate_to_cascade', {
    prompt: task,
    model: 'deepseek-v3'  // Specific model
  });
} else if (taskComplexity === 'critical') {
  await mcp.call('windsurf-bridge', 'delegate_to_cascade', {
    prompt: task,
    model: 'claude-3.5-sonnet'  // Best quality
  });
}
```

## Available Tools

### 1. `list_models` - See all options
```javascript
// Get all models
await mcp.call('windsurf-bridge', 'list_models');

// Filter by tier
await mcp.call('windsurf-bridge', 'list_models', { tier: 'free' });
await mcp.call('windsurf-bridge', 'list_models', { tier: 'smart' });
```

### 2. `delegate_to_cascade` - Delegate with model choice
```javascript
await mcp.call('windsurf-bridge', 'delegate_to_cascade', {
  prompt: 'Your task here',
  model: 'swe-1.5-free'  // Any model ID or tier
});
```

### 3. `switch_cascade_model` - Change model only
```javascript
await mcp.call('windsurf-bridge', 'switch_cascade_model', {
  model: 'gemini-2.0-flash'
});
```

### 4. `get_cascade_status` - Read results
```javascript
await mcp.call('windsurf-bridge', 'get_cascade_status', { lines: 20 });
```

### 5. `focus_cascade` - Focus panel
```javascript
await mcp.call('windsurf-bridge', 'focus_cascade');
```

## Decision Framework for OpenClaw

```
Task Analysis:
├── Simple (< 20 lines, straightforward)
│   └── Use: 'free' (SWE-1.5 Free)
│
├── Standard coding (features, bugs, refactoring)
│   └── Use: 'free' (SWE-1.5 Free)
│
├── Complex reasoning (algorithms, architecture)
│   └── Use: 'cheap' (DeepSeek V3) or 'deepseek-v3'
│
├── Speed critical (tight deadlines)
│   └── Use: 'fast' (Gemini 2.0 Flash)
│
├── Documentation/API heavy
│   └── Use: 'codex'
│
├── Critical/High-stakes code
│   └── Use: 'smart' (Claude 3.5 Haiku) or 'claude-3.5-haiku'
│
└── Everything else fails
    └── Use: 'claude-3.5-sonnet' (ask user first)
```

## Model Registry (14 Models Total)

### Free Models (0 Credits)
- `swe-1.5-free` - Best default, near-frontier
- `swe-1-lite` - Ultra-fast
- `grok-fast-code` - Experimental

### Low Cost (0.5 Credits)
- `deepseek-v3` - Excellent coding
- `gemini-2.0-flash` - Very fast
- `gpt-5-low-reasoning` - Simple tasks

### Free with Promo
- `codex` - Code-specialized GPT

### Premium (Token-based)
- `claude-3.5-haiku` - Best Claude 3.5 value
- `claude-3.5-sonnet` - Top tier

### BYOK (Your API Key)
- `claude-4-sonnet` - Latest features
- `claude-4-opus` - Most powerful

### Specialized
- `swe-1.5-paid` - 13x faster (premium)
- `gpt-4.5` - Beta model
