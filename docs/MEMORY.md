# MEMORY.md - Long-Term Memory

This is Augustus's curated long-term memory. Distilled learnings, rules, and context worth keeping permanently.

---

## ⚠️ CRITICAL RULES

### WINDSURF ONLY FOR CODING

**ESTABLISHED:** February 2, 2026 (emphasized 3 times by Hayssam)

**ABSOLUTE RULE - NO EXCEPTIONS:**
- ✅ **USE EXCLUSIVELY WINDSURF** for ALL coding tasks
- ❌ **NEVER** use Claude Code, Codex CLI, OpenCode, Pi, or any other coding tool
- ❌ **NEVER** write code directly using Claude Sonnet tokens
- ✅ Use: `node /path/to/windsurf-execute.cjs "task description"`

**Rationale:**
- Claude Sonnet tokens = conversation budget (precious, limited)
- Coding burns tokens extremely fast
- Windsurf has dedicated coding credits (500/month separate budget)
- Keeps Claude free for planning, communication, coordination

**Implementation:**
Located at: `/Users/hayssamhoballah/.nvm/versions/node/v22.12.0/lib/node_modules/openclaw/skills/windsurf-automation/windsurf-execute.cjs`

**This rule was repeated 3 times. It's non-negotiable.**

### Primary Model Strategy (Updated Feb 2, 2026)

**Current Setup:**
- **Primary Model:** Claude 3.5 Haiku (`anthropic/claude-3-5-haiku-20241022`)
- **Token Optimizer:** Enabled (intelligently escalates to Sonnet/Opus when needed)
- **Cost Savings:** ~80% cheaper than Sonnet 4.5 baseline
- **Fallbacks:** Step 3.5 Flash (free) → Llama 3.2 (local)

**Philosophy:**
Start cheap (Haiku), escalate smart (token-optimizer decides when to use Sonnet/Opus based on complexity). Best of both worlds - cost efficiency + capability when needed.

---

## System Architecture

### Workspace
- **Location:** `/Users/hayssamhoballah/clawd`
- **Agent Name:** Augustus
- **Primary Model:** anthropic/claude-sonnet-4-5-20250929
- **Timezone:** Asia/Makassar (WITA, UTC+8)

### Memory System
- **Daily logs:** `memory/YYYY-MM-DD.md` - raw capture of events
- **Long-term:** `MEMORY.md` - curated distilled wisdom (this file)
- **Session history:** Searchable via `memory_search` tool

---

## Learnings

### February 2, 2026

**Windsurf Autonomous System Built:**
- Created full model selection engine with 82 models catalogued
- Budget tracking (500 credits/month, currently at 448.5 remaining)
- Arena categories: Frontier (powerful), Fast (quick), Hybrid (balanced)
- Task classification: Quick/Daily/Complex/Emergency
- Visual integration: Prompts appear in Windsurf Cascade UI

**Git Workflow Established:**
- Autonomous commits authorized
- Conventional commit format
- Feature branching for complex work
- Clean merge strategy

**Token Preservation Policy:**
- Windsurf ONLY for coding (rule established today, emphasized 3x)
- Claude Sonnet for conversation, planning, coordination
- Separate budget pools = sustainable operation

---

## Preferences & Style

**Hayssam wants:**
- Force of proposition (suggest, don't just answer)
- Proactive work (build while he sleeps)
- Reverse prompting (ask what he needs)
- Sharp, clear communication
- Creative lateral thinking
- Surprises (wake up to new features)

**Communication style:**
- Friendly but business-ready
- Cut the fluff, be precise
- No ambiguity
- Document everything

---

## Important Context

**Privacy boundaries:**
- Private data stays private
- Ask before external actions (emails, posts, messages)
- Use `trash` not `rm` (recoverable > gone)
- Respect quiet hours (23:00-08:00 WITA)

**Work philosophy:**
- Text > Brain (write it down, mental notes don't persist)
- Commit regularly
- Test before commit
- Document context for future-me

---

## System Upgrades

### February 3, 2026: GOTCHA + ATLAS Framework Implementation

**MAJOR ARCHITECTURAL UPGRADE** - Implemented complete structured framework system based on video guidelines.

**What Changed:**
- Added **GOTCHA Framework** (6 layers) for deterministic AI execution
- Added **ATLAS Framework** (5 phases) for robust app development
- Created security guardrails system (20+ dangerous patterns blocked)
- Implemented self-healing error loop
- Built tool manifest system (16+ tools tracked)
- Created context system for business knowledge
- Added hard prompt templates for consistency
- Established audit logging schema

**Files Created:** 13 new files (~48KB)
- `GOTCHA.md` - Framework documentation
- `FRAMEWORK_STATUS.md` - Implementation guide
- `goals/build_app.md` - ATLAS workflow
- `security/guardrails.yaml` - Dangerous operation protection
- `security/audit_schema.md` - Logging structure
- `manifests/tools.json` - Tool tracking
- `context/business.md` - Business profile
- `prompts/` templates - Reusable prompt library
- `args/preferences.yaml` - Runtime config

**Key Benefits:**
1. **More secure** - Guardrails prevent destructive operations
2. **More deterministic** - Structured workflows reduce randomness
3. **More robust** - Self-healing loop learns from errors
4. **More maintainable** - Tool manifests prevent duplicate builds
5. **More intelligent** - Business context informs decisions

**New Workflows:**
- Task execution: Check goals → tools → context → security → memory
- App building: ATLAS phases (Architect → Trace → Link → Assemble → Stress Test)
- Error handling: Log → Analyze → Document → Retry → Escalate

**Status:** 🟢 Fully operational, all layers integrated

### February 3, 2026: Augustus ↔ Windsurf Communication Established

**CRITICAL BREAKTHROUGH** - Autonomous communication with Windsurf Cascade now fully operational.

**The Problem:**
- `windsurf chat` CLI doesn't send messages to Cascade (returns silently)
- Need to preserve Claude Sonnet tokens (Windsurf ONLY for coding - absolute rule)
- Multiple Windsurf windows open simultaneously
- Must work while user focuses on other apps

**The Solution:**
```bash
# Peekaboo focuses workspace window + osascript sends keystrokes
peekaboo window focus --app Windsurf --window-title <workspace> &&
osascript -e 'tell application "Windsurf" to activate' &&
Cmd+L (open chat) → Type prompt → Enter
```

**What Works Now:**
- ✅ Autonomous prompt delivery to Windsurf Cascade
- ✅ Multi-workspace targeting (focuses correct window by workspace name)
- ✅ Model switching confirmed working
- ✅ Response reading (OPENCLAW_RESULT.md for some tasks)
- ✅ Works while user multitasks elsewhere

**Implementation:**
- File: `~/.nvm/versions/node/v22.12.0/lib/node_modules/openclaw/skills/windsurf-automation/windsurf-execute.cjs`
- Method: Peekaboo (window focus) + osascript (keyboard automation)
- Requirements: Accessibility permission (NOT Screen Recording)

**Key Learnings:**
1. **CLI ≠ Reliable** - Documented CLIs can fail silently; UI automation more robust
2. **Direct typing > Clipboard** - Cascade doesn't accept Cmd+V paste
3. **Window targeting critical** - Must specify workspace when multiple windows exist
4. **Test incrementally** - Build up from simple to complex
5. **Listen to user** - Hayssam caught issues I didn't see

**Impact:**
This breakthrough enables the core "Windsurf ONLY for coding" rule to actually work. Augustus can now delegate all coding tasks autonomously without burning Claude tokens.

**Status:** 🟢 Production ready

**Model Switching Added (16:06-16:20):**
- MCP bridge `switch_cascade_model` doesn't work (settings API not exposed)
- Solution: Keyboard shortcut Cmd+Shift+ù opens searchable model selector
- Created `windsurf-switch-model.cjs` for programmatic model switching
- Updated `windsurf-execute.cjs` with `--model` flag
- Complete flow: switch model → send task → read response
- All tested and working (Claude Sonnet 4.5, DeepSeek V3, Claude Haiku 4.5)

**Critical Fixes (21:30-21:47):**
- **Arena models don't work** - "Free Arena", "Fast Arena", "Hybrid Arena" are meta-averages, not real models
- **Fixed:** Replaced with actual free models we know work:
  - Quick tasks → SWE-1.5
  - Daily tasks → DeepSeek V3 (0324)
  - Complex tasks → DeepSeek V3 (0324) (fallback from Claude Sonnet 4.5)
- **Response reading alternative** - OPENCLAW_RESULT.md unreliable
- **Fixed:** Added Peekaboo-based response capture (optional `--capture` flag, requires Screen Recording permission)
  - Uses `peekaboo see --analyze` to extract UI text
  - Not needed for coding tasks (files created directly)
- **Auto-model switching** - Now always switches to recommended model before sending prompt
- **Simplified window focus** - Removed brittle window title matching, uses app activation
- **Removed Cmd+L** - Assumes Cascade chat is already open (toggle causes issues)

**END-TO-END TEST PASSED (21:47):**
```bash
node windsurf-execute.cjs "Create hello world function" --workspace ~/clawd
```
Result: SWE-1.5 successfully created `hello.js` with proper code in 20 seconds.

**Status:** 🟢 Fully operational, production ready

---

*Last updated: February 3, 2026 21:47 WITA*
