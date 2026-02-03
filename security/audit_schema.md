# Audit Database Schema

Track all significant operations for security, debugging, and learning.

## Purpose

- **Security:** Know what actions were taken and by whom
- **Debugging:** Trace issues back to their source
- **Learning:** Analyze patterns and improve workflows
- **Compliance:** Maintain records of automated actions

## Database Schema

### audit_log table

```sql
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_key TEXT,
    action_type TEXT NOT NULL,
    action_category TEXT,
    command TEXT,
    tool_used TEXT,
    status TEXT,  -- success, failed, blocked, requires_approval
    error_message TEXT,
    user_approved BOOLEAN DEFAULT 0,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_timestamp ON audit_log(timestamp);
CREATE INDEX idx_action_type ON audit_log(action_type);
CREATE INDEX idx_status ON audit_log(status);
CREATE INDEX idx_session ON audit_log(session_key);
```

## Action Categories

### Critical (Always audit)
- `destructive_operation` - File deletions, database drops
- `external_communication` - Emails, messages, posts
- `security_change` - Permission changes, credential updates
- `production_deploy` - Deploying to production
- `api_call_with_cost` - Operations that incur charges

### Important (Audit when enabled)
- `file_modification` - Code changes, config updates
- `git_operation` - Commits, pushes, merges
- `database_query` - Read/write operations
- `tool_execution` - Running scripts or commands
- `context_access` - Loading business context

### Informational (Optional)
- `web_search` - Research activities
- `file_read` - Reading files
- `memory_search` - Context retrieval
- `session_start` - New conversation begins

## Status Values

- `success` - Completed without issues
- `failed` - Attempted but encountered error
- `blocked` - Prevented by guardrails
- `requires_approval` - Waiting for human confirmation
- `approved` - Human gave permission
- `rejected` - Human denied permission

## Metadata JSON Structure

```json
{
    "tool": "windsurf-execute",
    "task": "Build login form",
    "duration_ms": 45000,
    "tokens_used": 1200,
    "cost_usd": 0.024,
    "files_affected": ["src/login.tsx", "src/api/auth.ts"],
    "error_details": null,
    "guardrail_triggered": null,
    "retry_count": 0
}
```

## Usage Examples

### Log successful operation
```python
audit_log(
    action_type="file_modification",
    action_category="critical",
    command="windsurf-execute 'Build todo app'",
    tool_used="windsurf-execute",
    status="success",
    metadata={
        "files_affected": ["app.tsx"],
        "duration_ms": 30000
    }
)
```

### Log blocked operation
```python
audit_log(
    action_type="destructive_operation",
    action_category="critical",
    command="rm -rf /important/data",
    tool_used="exec",
    status="blocked",
    metadata={
        "guardrail_triggered": "rm -rf pattern",
        "severity": "critical",
        "reason": "Destructive operation requires confirmation"
    }
)
```

### Log failed operation with retry
```python
audit_log(
    action_type="api_call",
    action_category="important",
    command="fetch https://api.example.com/data",
    tool_used="web_fetch",
    status="failed",
    error_message="Network timeout after 30s",
    metadata={
        "retry_count": 2,
        "will_retry": True,
        "next_attempt_in_ms": 5000
    }
)
```

## Querying Audit Logs

### All destructive operations
```sql
SELECT * FROM audit_log 
WHERE action_category = 'critical' 
  AND action_type = 'destructive_operation'
ORDER BY timestamp DESC;
```

### Failed operations in last 24 hours
```sql
SELECT * FROM audit_log 
WHERE status = 'failed' 
  AND timestamp > datetime('now', '-24 hours')
ORDER BY timestamp DESC;
```

### Operations requiring approval
```sql
SELECT * FROM audit_log 
WHERE status = 'requires_approval' 
  AND user_approved = 0
ORDER BY timestamp DESC;
```

### Tool usage statistics
```sql
SELECT tool_used, COUNT(*) as usage_count, 
       SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count
FROM audit_log 
WHERE timestamp > datetime('now', '-7 days')
GROUP BY tool_used
ORDER BY usage_count DESC;
```

## Retention Policy

- **Critical logs:** Keep forever (or 7 years for compliance)
- **Important logs:** Keep 1 year
- **Informational logs:** Keep 90 days

## Privacy Considerations

**Do NOT log:**
- API keys or credentials
- Personal identifiable information (PII)
- Full email content
- Password attempts

**DO log:**
- Action taken
- Tool used
- Success/failure
- Anonymized metadata

## Implementation

See `tools/audit_log.py` for the implementation.

To enable auditing:
```yaml
# args/audit.yaml
enabled: true
categories:
  - critical
  - important
retention_days:
  critical: -1  # forever
  important: 365
  informational: 90
```

---

*Track everything. Trust nothing. Verify always.*
