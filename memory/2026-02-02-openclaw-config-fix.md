# OpenClaw Configuration Fix - 2026-02-02

## Problem
Hayssam was locked out of conversation for hours because Claude Sonnet tokens were exhausted on coding tasks. The fallback chain wasn't working correctly.

## Root Causes Identified

1. **Missing allowlist entry**: `openrouter/stepfun/step-3.5-flash:free` was in fallbacks but NOT in `agents.defaults.models` allowlist
   - OpenClaw docs: "Models must be in `agents.defaults.models` allowlist to be used"
   - Result: Failover skipped OpenRouter and went straight to Ollama

2. **Session stickiness**: Session was pinned to `anthropic:default` which recently hit rate limits
   - Prevented proper rotation through fallback chain

3. **Persona injection**: ✅ Already configured correctly!
   - OpenRouter profile has `systemPrompt` with Augustus persona in `auth-profiles.json`

## Fixes Applied

### 1. Added Missing Model to Allowlist
```bash
openclaw config patch
```
Added: `"openrouter/stepfun/step-3.5-flash:free": {}` to `agents.defaults.models`

### 2. Cleared Session Cache
```bash
rm ~/.openclaw/agents/main/sessions/sessions.json
```
Reset pinned auth profile to allow fresh failover routing

### 3. Added Token Preservation Policy to TOOLS.md
Added prominent warning at the top:
- ✅ Windsurf → All coding work
- ✅ Claude Sonnet → Conversation only
- ❌ Direct coding via Claude → FORBIDDEN

## Expected Behavior After Fix

**Failover Chain:**
1. **Primary**: Claude Sonnet 4.5 (anthropic)
2. **Fallback 1**: OpenRouter StepFun 3.5 Flash (FREE) ← NOW ENABLED
3. **Fallback 2**: Ollama Llama 3.2

**Persona Persistence:**
- Augustus persona is injected via `systemPrompt` in OpenRouter profile
- Should stick across all fallback models

**Token Management:**
- Coding tasks → Windsurf (preserves Claude tokens)
- Conversation → Claude Sonnet (brain work only)

## Files Modified
- `~/.openclaw/openclaw.json` (added model to allowlist)
- `~/.openclaw/agents/main/sessions/sessions.json` (deleted to clear cache)
- `~/clawd/TOOLS.md` (added token preservation policy)

## Test Commands
```bash
# Verify model is in allowlist
openclaw config get | grep "stepfun"

# Test failover with simulated rate limit
openclaw agent --agent main --message "Who are you?"

# Check which model responded
# Should show: openrouter/stepfun/step-3.5-flash:free if Claude is rate limited
```

## References
- OpenClaw Docs: https://docs.openclaw.ai/concepts/model-failover
- Auth Profiles: `~/.openclaw/agents/main/agent/auth-profiles.json`
- Models Config: `~/.openclaw/agents/main/agent/models.json`

## Lesson Learned
**Always check the allowlist!** Fallbacks must exist in both:
1. `agents.defaults.model.fallbacks` (order)
2. `agents.defaults.models` (allowlist) ← THIS WAS MISSING

Without the allowlist entry, OpenClaw silently skips the model during failover.
