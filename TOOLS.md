# TOOLS.md - Local Notes

Skills define *how* tools work. This file is for *your* specifics — the stuff that's unique to your setup.

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
- **Primary (Brain):** anthropic/claude-sonnet-4-5-20250929
- **Fallbacks:** bedrock/qwen3-coder, bedrock/gpt-oss, bedrock/deepseek-v3
- **Image:** Built into primary model
- **Coding (Windsurf):** DeepSeek V3 or Claude 3.5 Haiku (default), upgrade to Sonnet only if needed
- **Coding CLI:** Use `codex` or `opencode` when available (Windsurf preferred)
- **Web Search:** Brave API (already configured)

## Windsurf Workflow

**Token Preservation Rule:** If coding task > 20 lines, ALWAYS use Windsurf.

**Default Models (Priority Order):**
1. **SWE-1.5** - PRIMARY (FREE, near-frontier, promo for 3 months)
2. **DeepSeek V3** - BACKUP (FREE, strong for coding)
3. **GPT-5.1-Codex** - CODE SPECIALIST (FREE)
4. **Kimi K2.5** - NEW OPTION (FREE, promo)

**Cheap Upgrades (< 1 credit):**
- **Grok-3 mini (Thinking)** - 0.125x (CHEAPEST reasoning!)
- **GLM 4.7** - 0.25x (beta, very cheap)
- **SWE-1.5 (Fast)** - 0.5x (speed upgrade, promo)

**Mid-Tier (Inform Hayssam First):**
- **Claude Haiku 4.5** - 1x (balanced option)
- **Claude Sonnet 4.5** - 2x (promo pricing, latest)

**Emergency Only (Ask Permission):**
- **Claude Opus 4.5** - 4x (complex architecture)
- ⚠️ **AVOID Claude Opus 4.1** - 20x (way too expensive!)

**📖 Full Benchmark:** See `WINDSURF_MODELS_FINAL.md` for all 82 models

**Modes:**
- `--mode agent` → Full autonomous coding (default for features)
- `--mode edit` → Targeted changes (refactoring, bug fixes)
- `--mode ask` → Code review, questions (read-only)

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
