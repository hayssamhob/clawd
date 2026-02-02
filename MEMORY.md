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

*Last updated: February 2, 2026 18:45 WITA*
