# Tools Manifest

Index of all available tools and scripts.

## MCP Tools (via OpenClaw)

These are callable via the MCP interface:

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| submit_windsurf_task | Submit coding task to broker | prompt, complexity, model | taskId |
| wait_windsurf_task | Wait for task completion | taskId, timeout | result, status, model |
| check_windsurf_task | Check task status | taskId | status, progress |
| windsurf_quick_code | Submit + wait in one call | prompt, timeout | result, executionTime |
| list_windsurf_instances | Get available instances | - | instances[], online count |
| windsurf_broker_health | Check broker health | - | health status, error |

## Python Tools (in /tools/)

### Memory System
- `memory/memory_read.py` - Load persistent memory at session start
- `memory/memory_write.py` - Append to daily logs and database
- `memory/semantic_search.py` - Search memory by meaning
- `memory/hybrid_search.py` - Combined keyword + semantic search
- `memory/memory_db.py` - SQLite backend

### Windsurf Integration
- (Future: Python wrappers for task submission)

## Adding New Tools

Before creating a new tool:
1. Check this manifest - tool might exist
2. If creating new: Add entry to this manifest
3. Document: Purpose, inputs, outputs, usage
4. Test: Verify it works standalone
5. Reference: Update relevant goals

## Tool Organization
```
/tools/
├── memory/          # Persistent memory system
├── windsurf/        # Windsurf integration
├── manifest.md      # This file
└── (organize by workflow)
```

*Last updated: Feb 4, 2026*
