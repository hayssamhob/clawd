# Windsurf Models Benchmark & Selection Guide

**Last Updated:** February 2, 2026  
**Source:** Official Windsurf docs + community research

## 📊 Model Economics

**Credit System:**
- 1 credit = $0.04
- Pro plan: $15/month → 500 credits (~$20 value)
- Cost only on initial prompt, NOT per-action
- Add-on credits: $10 for 250 (Pro users)

---

## 🆓 FREE MODELS (0 Credits)

### SWE-1.5 Free ⭐ **NEW DEFAULT**
**Credits:** 0 (FREE for 3 months)  
**Provider:** Cognition AI (Windsurf in-house)  
**Performance:** Near-frontier, Claude 3.5 Sonnet-level on SWE-Bench-Pro

**Strengths:**
- 🎯 **Best value** - Frontier performance at 0 cost
- ⚡ Fast coding tasks
- 🏆 Near-SOTA on software engineering benchmarks
- 🔄 Standard throughput (vs. faster paid SWE-1.5)
- 🧠 Full agentic capabilities

**Weaknesses:**
- Slower than paid SWE-1.5 (on Cerebras hardware)
- Limited to 3-month promotional period
- May have higher latency during peak usage

**Use For:**
- ✅ All standard coding tasks
- ✅ Feature implementation
- ✅ Bug fixes
- ✅ Refactoring
- ✅ Code reviews
- ✅ **Default choice for most work**

**Augustus Priority:** 🥇 **PRIMARY MUSCLE** (while free)

---

### SWE-1 Lite
**Credits:** 0 (FREE permanently)  
**Provider:** Cognition AI (Windsurf in-house)  
**Performance:** Optimized for real-time latency

**Strengths:**
- ⚡ Ultra-fast responses
- 💰 Always free
- 🔄 Powers Windsurf Tab autocomplete
- Good for quick edits

**Weaknesses:**
- Less capable than SWE-1.5
- Limited reasoning for complex tasks
- Better for autocomplete than full features

**Use For:**
- ✅ Quick edits
- ✅ Simple bug fixes
- ✅ Code completion
- ✅ When speed > intelligence

**Augustus Priority:** 🥉 Fallback when SWE-1.5 feels slow

---

### DeepSeek V3
**Credits:** 0.25 per prompt + 0.25 per flow action  
**Provider:** DeepSeek  
**Performance:** Excellent for coding, competitive with GPT-4

**Strengths:**
- 💪 Strong coding capabilities
- 🧠 Good reasoning
- 💰 Very cost-effective (0.5 credits total typical)
- 🌍 Open-source backed

**Weaknesses:**
- Not completely free (uses some credits)
- May have China-based data concerns for some users
- Slightly slower than GPT models

**Use For:**
- ✅ Complex coding tasks
- ✅ Algorithm implementation
- ✅ When SWE models struggle
- ✅ Backup for paid models

**Augustus Priority:** 🥈 **SECONDARY MUSCLE** (cost-effective paid option)

---

### Gemini 2.0 Flash
**Credits:** 0.25 per prompt + 0.25 per flow action  
**Provider:** Google  
**Performance:** Fast, efficient, good reasoning

**Strengths:**
- ⚡ Very fast responses
- 🧠 Gemini 2 Pro-grade reasoning at Flash speed
- 💰 Low cost (0.5 credits typical)
- 🎯 Great for agentic workflows
- 🔄 Recently added (Dec 2024)

**Weaknesses:**
- Not completely free
- May struggle with very complex code architecture
- Less coding-specialized than SWE models

**Use For:**
- ✅ Fast iterations
- ✅ Simple-to-moderate coding
- ✅ When speed matters
- ✅ Agentic workflows

**Augustus Priority:** 🥈 Good backup option

---

### Grok Fast Code
**Credits:** 0 (FREE)  
**Provider:** xAI  
**Performance:** Fast, code-optimized

**Strengths:**
- 💰 Completely free
- ⚡ Fast responses
- 🎯 Code-optimized

**Weaknesses:**
- Less proven than other models
- Limited documentation
- May not match SWE/Claude quality

**Use For:**
- ✅ Quick experiments
- ✅ When credits are depleted
- ✅ Simple tasks

**Augustus Priority:** 🥉 Experimental backup

---

### Codex (GPT-5.2-Codex)
**Credits:** 0 (FREE for paid users during promo)  
**Provider:** OpenAI  
**Performance:** Code-specialized GPT variant

**Strengths:**
- 🎯 Code-specialized
- 💰 Free during promo (paid users)
- 🧠 Strong reasoning
- 📚 Excellent documentation understanding

**Weaknesses:**
- Promo pricing (may change)
- Requires paid plan for free access
- Free tier: 0.5 credits

**Use For:**
- ✅ Complex codebases
- ✅ Documentation-heavy projects
- ✅ API integration

**Augustus Priority:** 🥈 Good option if promo active

---

## 💰 PAID MODELS (Premium Credits Required)

### Claude 3.5 Sonnet (Haiku)
**Credits:** Token-based (API price + 20% margin)  
**Cost:** ~$3.60 per 1M input tokens, ~$18 per 1M output tokens  
**Provider:** Anthropic  
**Performance:** Excellent reasoning, strong coding

**Strengths:**
- 🧠 Best reasoning in Claude 3.5 family
- 💻 Strong code generation
- 📖 Excellent instruction following
- 🎯 Great for complex tasks
- ⚡ Fast (Haiku variant)

**Weaknesses:**
- Costs credits
- Can be expensive for long conversations
- Haiku less capable than Sonnet

**Use For:**
- ✅ Complex architecture decisions
- ✅ When free models struggle
- ✅ Critical bug fixes
- ✅ High-stakes code

**Augustus Priority:** ⚠️ **USE SPARINGLY** - Inform Hayssam first

---

### Claude 3.5 Sonnet (Full)
**Credits:** Token-based (higher cost)  
**Cost:** ~2x Haiku pricing  
**Provider:** Anthropic  
**Performance:** Top-tier reasoning and coding

**Strengths:**
- 🏆 Best Claude model
- 🧠 Exceptional reasoning
- 💪 Handles very complex tasks
- 📚 Great at understanding large codebases

**Weaknesses:**
- 💸 Expensive
- Overkill for simple tasks
- Drains credits quickly

**Use For:**
- ✅ Critical architecture design
- ✅ When everything else fails
- ✅ Extremely complex debugging

**Augustus Priority:** 🚨 **EMERGENCY ONLY** - Always ask Hayssam first

---

### Claude 4 Sonnet (BYOK)
**Credits:** 0 Windsurf credits (use your own API key)  
**Cost:** Direct API pricing from Anthropic  
**Provider:** Anthropic  
**Performance:** Latest Claude model

**Strengths:**
- 🎯 Latest model
- 💰 No Windsurf credit cost (BYOK)
- 🧠 Advanced reasoning
- 🔄 Can use with thinking mode

**Weaknesses:**
- Requires separate API key setup
- Direct API costs apply
- More setup complexity

**Use For:**
- ✅ When you have Claude API credits
- ✅ Avoiding Windsurf credit usage
- ✅ Latest model features

**Augustus Priority:** 🔧 **SETUP REQUIRED** - Good if we have API key

---

### Claude 4 Opus (BYOK)
**Credits:** 0 Windsurf credits (use your own API key)  
**Cost:** Direct API pricing (expensive)  
**Provider:** Anthropic  
**Performance:** Most capable Claude model

**Strengths:**
- 🏆 Most powerful Claude
- 🧠 Best reasoning
- 💪 Handles most complex tasks

**Weaknesses:**
- 💸 Very expensive via API
- Overkill for most tasks
- Requires BYOK setup

**Use For:**
- ✅ Absolute top-tier tasks only
- ✅ When everything else fails

**Augustus Priority:** 🚨 **ULTRA RARE** - Extreme cases only

---

### GPT-5 Low Reasoning
**Credits:** 0.5 per prompt (flat rate)  
**Provider:** OpenAI  
**Performance:** Fast GPT-5 variant

**Strengths:**
- ⚡ Fast
- 💰 Cheap (0.5 credits flat)
- 🧠 Good general capabilities
- 📊 Predictable cost

**Weaknesses:**
- "Low reasoning" means simpler tasks only
- Not code-specialized
- May struggle with complex logic

**Use For:**
- ✅ Simple coding tasks
- ✅ When speed + cost matter
- ✅ General-purpose coding

**Augustus Priority:** 🥈 Decent backup option

---

### GPT-4.5
**Credits:** Variable (beta pricing)  
**Provider:** OpenAI  
**Performance:** Beta model

**Strengths:**
- 🆕 Latest features
- 🧠 Good reasoning

**Weaknesses:**
- Beta status
- Pricing unclear
- May have bugs

**Use For:**
- ✅ Testing new features
- ✅ When curious about latest

**Augustus Priority:** 🧪 **EXPERIMENTAL** - Use cautiously

---

### SWE-1.5 (Paid)
**Credits:** TBD (premium pricing)  
**Provider:** Cognition AI  
**Performance:** Near-frontier, 13x faster than Claude

**Strengths:**
- 🚀 **13x faster** than Claude 4 Sonnet
- 🏆 Near-SOTA performance
- 🎯 Built for software engineering
- ⚡ Powered by Cerebras hardware

**Weaknesses:**
- Costs credits (free version available)
- Only speed advantage over free version

**Use For:**
- ✅ When speed is critical
- ✅ Tight deadlines
- ✅ Real-time pair programming

**Augustus Priority:** ⚠️ **SPEED UPGRADE** - Use when deadlines tight

---

### SWE-1 (Paid)
**Credits:** 0 (but deprecated in favor of SWE-1.5)  
**Provider:** Cognition AI  
**Performance:** Claude 3.5-level at lower cost

**Strengths:**
- 🎯 Code-specialized
- 💰 Lower cost than Claude

**Weaknesses:**
- Superseded by SWE-1.5
- No longer recommended

**Use For:**
- ❌ Use SWE-1.5 instead

**Augustus Priority:** ⚠️ **DEPRECATED** - Skip this

---

## 🎯 Augustus Decision Matrix

### Default Strategy (Follow This):

```
1. Task < 20 lines + simple?
   → Use Claude directly (me, Augustus)

2. Task > 20 lines OR complex coding?
   → Use Windsurf

3. Which Windsurf model?

   A. Simple-to-moderate coding:
      → SWE-1.5 Free (DEFAULT)
      
   B. Need more reasoning:
      → DeepSeek V3 (0.5 credits)
      
   C. Need speed:
      → Gemini 2.0 Flash (0.5 credits)
      
   D. Free models struggling:
      → Claude 3.5 Haiku ⚠️ (INFORM HAYSSAM FIRST)
      
   E. Critical/complex architecture:
      → Claude 3.5 Sonnet ⚠️ (ASK HAYSSAM FIRST)
      
   F. Emergency/everything failing:
      → Claude 4 Sonnet/Opus 🚨 (ONLY WITH PERMISSION)
```

---

## 📋 Quick Reference Table

| Model | Credits | Speed | Quality | Use Case | Priority |
|-------|---------|-------|---------|----------|----------|
| **SWE-1.5 Free** | 0 | Fast | 🏆 High | All coding | 🥇 Default |
| **DeepSeek V3** | 0.5 | Fast | 🎯 High | Complex code | 🥈 Backup |
| **Gemini 2.0 Flash** | 0.5 | ⚡ Very Fast | 🎯 Good | Fast iterations | 🥈 Backup |
| **SWE-1 Lite** | 0 | ⚡ Ultra Fast | ⭐ OK | Quick edits | 🥉 Speed |
| **Grok Fast Code** | 0 | Fast | ⭐ OK | Experiments | 🥉 Backup |
| **Codex** | 0* | Fast | 🎯 Good | Documentation | 🥈 Promo |
| **GPT-5 Low** | 0.5 | Fast | 🎯 Good | Simple tasks | 🥈 Backup |
| **Claude Haiku** | Token | Fast | 🏆 High | Complex tasks | ⚠️ Ask first |
| **Claude Sonnet** | Token | Medium | 🏆 Highest | Critical work | ⚠️ Ask first |
| **Claude 4 (BYOK)** | 0** | Fast | 🏆 Highest | Latest features | 🔧 Setup |
| **SWE-1.5 Paid** | TBD | 🚀 13x faster | 🏆 High | Tight deadlines | ⚠️ Speed boost |

*Free for paid users during promo  
**Requires API key, direct API costs apply

---

## 🎭 Model Personalities

**SWE-1.5 Free:** The reliable workhorse. Gets it done without drama.  
**DeepSeek V3:** The clever problem-solver. Thinks outside the box.  
**Gemini Flash:** The speedster. Fast and efficient, no waiting.  
**Claude Haiku:** The thoughtful expert. Costs money but worth it when needed.  
**Claude Sonnet:** The sage. Only call when facing the impossible.  
**Grok:** The wild card. Experimental, surprising results.  
**Codex:** The documentation whisperer. Reads the manual so you don't have to.

---

## 💡 Cost Optimization Tips

1. **Always start with SWE-1.5 Free** - It's free and near-frontier quality
2. **Batch related tasks** - One prompt can trigger multiple actions at no extra cost
3. **Use DeepSeek V3 for reasoning-heavy tasks** - Only 0.5 credits, excellent value
4. **Reserve Claude for emergencies** - Token-based pricing adds up fast
5. **Monitor credit usage** - Check Windsurf settings regularly
6. **BYOK for Claude 4** - If you have API credits, avoid Windsurf costs
7. **Avoid Opus unless critical** - Extremely expensive, rarely necessary

---

## 🚨 Red Flags (When to Escalate)

Inform Hayssam BEFORE using paid models if:
- Task is exploratory (use free models first)
- Multiple attempts with free models haven't been tried
- Cost would exceed 10 credits (~$0.40)
- Not time-critical

Always ask BEFORE using:
- Claude 3.5 Sonnet (full)
- Claude 4 Opus
- Any model for > 50 credits worth of work

---

## 🔄 Model Selection Flowchart

```
Start: Coding task arrives
  ↓
Is it < 20 lines & simple?
  YES → Use Claude (Augustus) directly
  NO → Continue
  ↓
Use Windsurf - Which model?
  ↓
Is it standard coding (features/bugs/refactoring)?
  YES → SWE-1.5 Free 🥇
  NO → Continue
  ↓
Does it need complex reasoning?
  YES → DeepSeek V3 (0.5 credits) 🥈
  NO → Continue
  ↓
Is speed critical?
  YES → Gemini 2.0 Flash (0.5 credits) 🥈
  NO → Continue
  ↓
Did free models fail?
  YES → Inform Hayssam → Use Claude Haiku ⚠️
  NO → Continue
  ↓
Is it critical architecture?
  YES → Ask Hayssam → Use Claude Sonnet ⚠️
  NO → Continue
  ↓
Is everything failing?
  YES → Emergency escalation → Claude 4 🚨
```

---

## 📝 Usage Logging

For transparency, Augustus will log model selections:

```
Date: 2026-02-02
Task: Build REST API with Express
Model Selected: SWE-1.5 Free
Reasoning: Standard coding task, default choice
Credits Used: 0
Result: Success ✅

Date: 2026-02-02
Task: Complex authentication architecture
Model Selected: DeepSeek V3
Reasoning: Needs reasoning, free model first
Credits Used: 0.5
Result: Success ✅

Date: 2026-02-02
Task: Critical bug in production code
Model Selected: Claude 3.5 Haiku
Reasoning: Emergency, informed Hayssam first
Credits Used: ~3
Result: Success ✅
```

---

## 🎯 Summary: The Augustus Way

**Default Path:**
1. SWE-1.5 Free for everything
2. DeepSeek V3 if SWE struggles
3. Claude only with permission

**Emergency Path:**
1. Try SWE-1.5 Free
2. Try DeepSeek V3
3. Inform Hayssam
4. Use Claude Haiku
5. If still failing, ask for Sonnet

**Never Path:**
1. Jump to expensive models
2. Use Opus without discussion
3. Burn through credits carelessly

---

**Remember:** We're building great things together. That means being smart about resources. Free models are incredibly capable now. Use them first, escalate wisely, and preserve Hayssam's Claude tokens for being Augustus. 🏛️
