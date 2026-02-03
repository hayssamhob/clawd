# TOOLS.md - Local Notes

Skills define *how* tools work. This file is for *your* specifics — the stuff that's unique to your setup.

## ⚠️ CRITICAL: Token Preservation Policy

**USE EXCLUSIVELY WINDSURF FOR ALL CODING TASKS - NO EXCEPTIONS**

**ABSOLUTE RULES:**
- ✅ **WINDSURF ONLY** - All coding, scripts, debugging, refactoring
- ❌ **NEVER Claude Code, Codex, OpenCode, Pi, or any other tool**
- ❌ **NEVER write code directly with Claude Sonnet tokens**
- ✅ Use Windsurf via: `node /path/to/windsurf-execute.cjs "task"`

**Why:** Claude Sonnet tokens are for conversation. Coding burns them fast. Windsurf has dedicated credits (500/month).

- ✅ **Windsurf** → All coding, refactoring, debugging (any code changes)
- ✅ **Claude Sonnet** → Conversation, planning, research, non-coding tasks only
- ❌ **Direct coding via Claude** → FORBIDDEN (locks Hayssam out of conversation)

**Rule:** If you're about to write/edit code directly, STOP and use Windsurf instead.

## What Goes Here

Things like:
- Camera names and locations
- SSH hosts and aliases  
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## 🧠 Brain + Muscles Architecture

**Philosophy:** I use **Claude Sonnet 4.5 as my brain** (thinking, planning, communication), but **specialized models as muscles** for specific tasks:

### Current Muscles
- **Coding:** **Windsurf** (primary - preserves Claude tokens), Codex CLI / DeepSeek / Qwen (fallback)
- **Web Search:** Gemini 2.0 Flash (fast, reliable search)
- **Social Search:** Grok (X/Twitter data)
- **Vision:** Claude Sonnet 4.5 (built-in)
- **Reasoning:** QwQ (local Ollama, when needed)

### Model Preferences
**Anthropic Models (Full List):**
- **Primary (Brain):** 
  - anthropic/claude-3-5-haiku-20241022 (default)
  - anthropic/claude-3-5-sonnet-20241022
  - anthropic/claude-sonnet-4-5-20250929
  - anthropic/claude-3-haiku-20240307
  - anthropic/claude-3-sonnet-20240229

- **Fallbacks:** 
  - bedrock/qwen3-coder
  - bedrock/gpt-oss
  - bedrock/deepseek-v3

- **Image:** Built into primary model
- **Coding (Windsurf):** 
  - DeepSeek V3 
  - Claude 3.5 Haiku (default)
  - Upgrade to Sonnet only if needed
- **Coding CLI:** Use `codex` or `opencode` when available (Windsurf preferred)
- **Web Search:** Brave API (already configured)

## Windsurf Workflow - FULLY AUTOMATED 🤖

**Token Preservation Rule:** If coding task > 20 lines, ALWAYS use Windsurf.

### Autonomous Model Selection System
**Location:** `~/.nvm/versions/node/v22.12.0/lib/node_modules/openclaw/skills/windsurf-automation/selector.cjs`

**Usage (Internal):**
```bash
node selector.cjs "task description"  # Analyzes and selects optimal model
node selector.cjs --usage              # Check credit usage
```

**Task Classification (Automatic):**
- **Quick** → Fast Arena (FREE) - Simple fixes, bugs, typos
- **Daily** → Hybrid Arena (FREE) - Standard features, implementations
- **Complex** → Claude Sonnet 4.5 (2x) or Frontier Arena - Architecture, algorithms
- **Emergency** → Claude Opus 4.5 (4x) - Production issues, security

**Budget Tracking:**
- Monthly: 500 credits
- Warning: 400 credits (80%)
- Daily limit: 50 credits
- Usage tracked in: `~/clawd/memory/windsurf-usage.json`

**Model Priority (Auto-Selected):**
1. **FREE Models (95% of tasks):**
   - Hybrid Arena (daily work)
   - Fast Arena (quick tasks)
   - Frontier Arena (complex, budget-conscious)
   - SWE-1.5, DeepSeek V3, GPT-5.1-Codex

2. **Cheap Reasoning (< 1 credit):**
   - Grok-3 mini (Thinking) - 0.125x
   - GLM 4.7 - 0.25x
   - SWE-1.5 Fast - 0.5x

3. **Premium (Auto-approved if within budget):**
   - Claude Sonnet 4.5 - 2x (complex work)
   - Claude Opus 4.5 - 4x (emergencies only)

**Modes:**
- `cascade --mode agent` → Full autonomous coding
- `cascade --mode edit` → Targeted changes
- `cascade --arena "Frontier"` → Arena category selection

## Examples

```markdown
### Cameras
- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH
- home-server → 192.168.1.100, user: admin

### TTS
- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.
