# GOTCHA Framework - Core System Architecture

## Purpose
Bridge the gap between probabilistic AI and deterministic execution. Get the same reliable results every time for business-critical operations.

## The Six Layers

### 1. GOALS (What to Achieve)
**Location:** `goals/`

Tasks, SOPs, and workflows you want to accomplish. Each goal is a `.md` file describing:
- Objective
- Success criteria (definition of done)
- Required tools
- Expected output

**Example goals:**
- `build_app.md` - Full-stack app development with ATLAS
- `lead_generation.md` - Automated outreach pipeline
- `content_creation.md` - Social media content workflow

### 2. ORCHESTRATION (The Brain)
**Current:** Claude Sonnet 4.5 (Augustus)

The LLM layer that coordinates everything. Reads goals, selects tools, manages context, applies prompts, and handles arguments.

**Responsibilities:**
- Parse user intent
- Select appropriate goal/workflow
- Coordinate tool execution
- Handle errors and retry logic
- Maintain conversation coherence

### 3. TOOLS (Deterministic Actions)
**Location:** `tools/`

Scripts (Python, Node.js, Bash, etc.) that perform specific, repeatable actions.

**Tool Requirements:**
- Single responsibility
- Idempotent when possible
- Clear input/output contracts
- Error handling built-in
- Logged in manifest

**Tool Types:**
- Data manipulation (CRUD operations)
- API integrations (external services)
- File operations (read, write, transform)
- System commands (controlled execution)
- Analysis (data processing, reporting)

### 4. CONTEXT (Knowledge Base)
**Location:** `context/`

Business-specific information that informs decisions:
- `business.md` - Company info, mission, values
- `icp.md` - Ideal customer profile
- `brand_voice.md` - Tone, style guidelines
- `products.md` - What you offer
- `team.md` - Who's who, roles
- `processes.md` - Standard operating procedures

**Why Critical:**
Without context, AI just guesses. With context, it knows your business like an employee.

### 5. HARD PROMPTS (Reusable Templates)
**Location:** `prompts/`

Pre-tested, regression-tested prompts for specific tasks:
- `email_outreach.txt` - Cold email template
- `code_review.txt` - Code analysis prompt
- `content_brief.txt` - Content creation template
- `data_analysis.txt` - Analytics prompt

**Benefits:**
- Consistency across executions
- Easy to A/B test and optimize
- Versioned and trackable
- Can be called from tools

### 6. ARGUMENTS (Runtime Variables)
**Location:** `args/`

Behavioral settings and variables that change at runtime:
- `security.yaml` - Security settings
- `preferences.yaml` - User preferences
- `limits.yaml` - Rate limits, quotas
- `feature_flags.yaml` - Enable/disable features

## The Self-Healing Loop

When errors occur:

1. **Capture** - Log the error with full context
2. **Analyze** - Determine root cause
3. **Document** - Update memory so it doesn't repeat
4. **Retry** - Try alternative approach
5. **Escalate** - Ask human if stuck after N attempts

**Implementation:**
```
Try action
  ↓
Error occurs
  ↓
Log to memory
  ↓
Understand why
  ↓
Try different approach
  ↓
Success or escalate
```

## Hallucination Prevention

**Rule:** If you don't understand something, DON'T MAKE IT UP.

Instead:
1. Explain what's missing
2. Why you can't proceed
3. Ask clarifying questions
4. Suggest alternatives

## Tool Manifests

**Location:** `manifests/tools.json`

Track all available tools to avoid rebuilding:

```json
{
  "tools": [
    {
      "name": "memory_write",
      "path": "tools/memory_write.py",
      "purpose": "Write to persistent memory",
      "args": ["type", "content"],
      "created": "2026-02-03"
    }
  ]
}
```

**Benefits:**
- Fast lookup (check manifest first)
- Avoid duplicate builds
- Version tracking
- Dependency mapping

## Integration with Existing System

GOTCHA complements your current setup:
- **AGENTS.md** - Orchestration rules
- **SOUL.md** - Personality layer
- **MEMORY.md** - Long-term context
- **Skills** - External tools (read-only)
- **GOTCHA** - Internal tools (you build)

## Usage Flow

```
User request
  ↓
Check GOALS/ for matching workflow
  ↓
Load CONTEXT/ for relevant knowledge
  ↓
Select TOOLS/ needed
  ↓
Apply PROMPTS/ templates
  ↓
Use ARGS/ for runtime config
  ↓
Execute with ORCHESTRATION
  ↓
Self-heal if errors
  ↓
Deliver result
```

---

*This framework ensures you get deterministic, reliable results from probabilistic AI.*
