# Goal: Submit Coding Tasks to Windsurf

## Objective

Delegate coding work (refactoring, optimization, generation, debugging) to Windsurf instances via the task broker, with intelligent model routing based on task complexity.

## Why This Goal Exists

- **Reliability**: Windsurf is deterministic for coding tasks
- **Cost Optimization**: Route cheap tasks to Haiku, complex tasks to best available
- **Parallelization**: Multiple instances execute simultaneously
- **Scalability**: Add instances without code changes

## When to Use This Goal

Use Windsurf when you need:
- Code refactoring or optimization
- Feature generation or scaffolding
- Bug fixes or debugging
- Architecture improvements
- Test writing

Do NOT use Windsurf for:
- Pure reasoning/analysis (use Claude directly)
- Non-coding tasks
- Time-critical tasks (use local tools instead)

## Inputs Required
```
prompt: str              # Detailed coding task description
complexity: str         # auto, simple, medium, complex
preferredModel: str     # haiku, sonnet, deepseek, auto
priority: str          # low, normal, high
timeout_seconds: int   # How long to wait (default 30)
```

## Expected Outputs
```
taskId: str            # Unique identifier for tracking
status: str            # pending, executing, completed, failed
result: str            # Code output or error message
model: str             # Which model was used
executionTime: int     # Seconds to complete
```

## Workflow

### Step 1: Check Args
Read `args/windsurf.yaml` for:
- Broker URL
- Default timeout
- Routing strategy
- Model preferences

### Step 2: Determine Complexity
Analyze the prompt:
- < 500 tokens + straightforward → `simple`
- 500-2000 tokens → `medium`
- > 2000 tokens OR contains "refactor"/"optimize"/"rewrite" → `complex`

### Step 3: Route to Model
Use routing strategy from `context/windsurf_capabilities.md`:
- **Simple** → Haiku (cheapest)
- **Medium** → Sonnet (balanced)
- **Complex** → Auto (best available)

### Step 4: Submit Task
Call MCP tool: `submit_windsurf_task`
- Pass prompt, complexity, preferred model
- Receive taskId

### Step 5: Wait for Completion
Call MCP tool: `wait_windsurf_task`
- Pass taskId
- Wait up to timeout_seconds
- Return result when done

### Step 6: Handle Failures
If task fails:
- Check error message
- Retry with different model (up to 3 times)
- If all retries fail, escalate to direct Claude

## Error Handling

| Error | Action |
|-------|--------|
| Broker unavailable | Fallback to direct Claude API |
| Task timeout | Retry with simpler prompt or different model |
| Windsurf crash | Auto-retry, escalate if persists |
| Rate limit | Throttle submissions, add delay |

## Examples

### Example 1: Simple Refactor
```
Prompt: Clean up this React component (200 tokens)
Complexity: simple
Model: auto
→ Routes to Haiku
→ Fast execution, low cost
```

### Example 2: Complex Architecture
```
Prompt: Refactor authentication system with OAuth2, OIDC, MFA support (2500 tokens)
Complexity: complex
Model: auto
→ Routes to best available
→ Deep reasoning applied
```

### Example 3: Medium Feature
```
Prompt: Create TypeScript utility for parsing CSV files with validation (1200 tokens)
Complexity: medium
Model: auto
→ Routes to Sonnet
→ Good balance of speed and capability
```

## Success Criteria

✅ Task submitted without errors
✅ Result returned within timeout
✅ Code is syntactically valid
✅ Task completed with specified model
✅ Execution time logged

## Known Constraints

- Max task size: 4000 tokens (prompt)
- Max wait time: 30 minutes default
- Max retries: 3 per task
- Instance pool: Check `windsurf_instances` before submitting
- Rate limit: No more than 10 tasks/minute

## Living Documentation

**Last updated:** Feb 4, 2026

**Updates trigger when:**
- New Windsurf model available
- Broker performance changes
- New routing strategy needed
- Error patterns emerge

**Maintain this by:**
- Adding failures to "Known Constraints"
- Recording performance metrics
- Updating routing rules quarterly
