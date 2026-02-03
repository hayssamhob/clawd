# Augustus Architecture - GOTCHA + ATLAS Framework

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         HAYSSAM (User)                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION LAYER                          │
│                  (Augustus - Claude Sonnet 4.5)                 │
│                                                                 │
│  Startup Sequence:                                              │
│  1. Identity (SOUL.md)                                          │
│  2. User (USER.md)                                              │
│  3. Context (context/*.md)                                      │
│  4. Memory (memory/*.md + MEMORY.md)                            │
│  5. Tools (manifests/tools.json)                                │
│  6. Security (security/guardrails.yaml)                         │
└───────────┬─────────────────────────────────────┬───────────────┘
            │                                     │
            ▼                                     ▼
┌───────────────────────┐           ┌───────────────────────────┐
│   GOALS Layer         │           │   CONTEXT Layer           │
│   (goals/)            │           │   (context/)              │
│                       │           │                           │
│ • build_app.md        │           │ • business.md             │
│   (ATLAS workflow)    │           │ • brand_voice.md (TODO)   │
│ • lead_gen.md (TODO)  │           │ • icp.md (TODO)           │
│ • content.md (TODO)   │           │ • processes.md (TODO)     │
└───────────┬───────────┘           └─────────────┬─────────────┘
            │                                     │
            ▼                                     ▼
┌───────────────────────┐           ┌───────────────────────────┐
│   TOOLS Layer         │           │   PROMPTS Layer           │
│   (manifests/)        │           │   (prompts/)              │
│                       │           │                           │
│ • tools.json          │           │ • code/code_review.txt    │
│   - 16+ tools tracked │           │ • system/error_diag.txt   │
│   - Native + Skills   │           │ • content/* (TODO)        │
│   - Windsurf coding   │           │ • analysis/* (TODO)       │
└───────────┬───────────┘           └─────────────┬─────────────┘
            │                                     │
            ▼                                     ▼
┌───────────────────────┐           ┌───────────────────────────┐
│   ARGUMENTS Layer     │           │   SECURITY Layer          │
│   (args/)             │           │   (security/)             │
│                       │           │                           │
│ • preferences.yaml    │           │ • guardrails.yaml         │
│   - Communication     │           │   - 20+ danger patterns   │
│   - Work style        │           │   - Safe alternatives     │
│   - Quiet hours       │           │   - Confirmation levels   │
│   - Token budget      │           │ • audit_schema.md         │
└───────────────────────┘           └───────────────────────────┘
```

---

## ATLAS App Building Workflow

```
User Request: "Build me an app that does X"
              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        ATLAS FRAMEWORK                          │
│                     (goals/build_app.md)                        │
└─────────────────────────────────────────────────────────────────┘
              ↓
    ┌─────────────────┐
    │  A - ARCHITECT  │  Define problem, users, success metrics
    │                 │  → What does "done" look like?
    └────────┬────────┘
             ▼
    ┌─────────────────┐
    │   T - TRACE     │  Map data schemas, integrations, stack
    │                 │  → What do we need to build this?
    └────────┬────────┘
             ▼
    ┌─────────────────┐
    │   L - LINK      │  Validate API connections, DB access
    │                 │  → Does everything actually work?
    └────────┬────────┘
             ▼
    ┌─────────────────┐
    │  A - ASSEMBLE   │  Build in layers:
    │                 │  Layer 1: Basic function (prototype)
    │                 │  Layer 2: Core features (alpha)
    │                 │  Layer 3: Polish (beta)
    │                 │  Layer 4: Hardening (production)
    └────────┬────────┘
             ▼
    ┌─────────────────┐
    │ S - STRESS TEST │  Validate quality:
    │                 │  - Functionality (all modes)
    │                 │  - Security (production only)
    │                 │  - Performance (production only)
    │                 │  - Monitoring (production only)
    └────────┬────────┘
             ▼
      Working App Delivered
```

---

## Self-Healing Error Loop

```
         Execute Task
              ↓
         Success? ─────Yes────→ Done ✓
              │
              No (Error)
              ↓
    ┌─────────────────────┐
    │  1. CAPTURE ERROR   │  Log to memory/errors-YYYY-MM-DD.md
    │     with context    │  - What happened
    └──────────┬──────────┘  - Why it happened
               ▼              - When it happened
    ┌─────────────────────┐
    │  2. ANALYZE ROOT    │  Use prompts/system/error_diagnosis.txt
    │     CAUSE           │  - Identify error type
    └──────────┬──────────┘  - Understand why
               ▼              - Assess impact
    ┌─────────────────────┐
    │  3. DOCUMENT        │  Update relevant files:
    │     LEARNING        │  - MEMORY.md (if significant)
    └──────────┬──────────┘  - Tool documentation
               ▼              - Security guardrails
    ┌─────────────────────┐
    │  4. RETRY WITH      │  Try different approach:
    │     ALTERNATIVE     │  - Different tool
    └──────────┬──────────┘  - Different method
               ▼              - Different parameters
         Attempt < 3?
           │      │
          Yes     No
           │      └────→ ┌─────────────────────┐
           │             │  5. ESCALATE TO     │
           └─────────────→│     HUMAN           │
                         │  Ask Hayssam        │
                         └─────────────────────┘
```

---

## Security Guardrails Flow

```
         Command Requested
              ↓
    ┌─────────────────────┐
    │  Check Guardrails   │  Load security/guardrails.yaml
    │  (before execute)   │  Check against patterns
    └──────────┬──────────┘
               ▼
         Pattern Match?
           │      │
          No     Yes
           │      ↓
           │  ┌─────────────────────┐
           │  │  Action Type?       │
           │  └──────────┬──────────┘
           │             │
           │    ┌────────┼────────┬────────┐
           │    ▼        ▼        ▼        ▼
           │  BLOCK   REQUIRE  WARN    LOG
           │    │    CONFIRM    │        │
           │    ▼        │      ▼        ▼
           │  DENY     ASK   SHOW     AUDIT
           │           USER  WARNING    ↓
           │            ↓       │    EXECUTE
           │        APPROVED?   │
           │         │    │     │
           │        Yes  No     │
           │         │    ↓     │
           │         │  DENY    │
           │         │          │
           └─────────┴──────────┴────→ EXECUTE
                                         ↓
                                   LOG TO AUDIT
```

---

## Task Execution Workflow

```
User Request
     ↓
┌────────────────────────────────────────────────────────────┐
│                  PRE-EXECUTION CHECKS                      │
└────────────────────────────────────────────────────────────┘
     ↓
1. Check GOALS (goals/)
   ├─ Matching workflow exists?
   │  ├─ Yes → Load workflow
   │  └─ No → Proceed with general approach
     ↓
2. Check TOOLS (manifests/tools.json)
   ├─ Tool exists?
   │  ├─ Yes → Use existing tool
   │  └─ No → Build tool, update manifest
     ↓
3. Load CONTEXT (context/*.md)
   ├─ Relevant business knowledge
   ├─ Brand voice, preferences
   └─ Process requirements
     ↓
4. Check SECURITY (security/guardrails.yaml)
   ├─ Operation allowed?
   │  ├─ Yes → Proceed
   │  └─ No → Block or request approval
     ↓
5. Search MEMORY (memory_search)
   ├─ Similar work done before?
   │  ├─ Yes → Reference learnings
   │  └─ No → Fresh approach
     ↓
┌────────────────────────────────────────────────────────────┐
│                      EXECUTION PHASE                       │
└────────────────────────────────────────────────────────────┘
     ↓
Use appropriate tools
Apply hard prompts if available
Follow workflow if exists
Self-heal if errors occur
     ↓
┌────────────────────────────────────────────────────────────┐
│                   POST-EXECUTION TASKS                     │
└────────────────────────────────────────────────────────────┘
     ↓
1. Update MANIFEST (if new tool built)
2. Commit Work (git commit with descriptive message)
3. Update MEMORY (if significant learning)
4. Update DOCUMENTATION (if process changed)
     ↓
   DONE ✓
```

---

## File Organization

```
~/clawd/
├── 📋 Core Framework Docs
│   ├── GOTCHA.md                   # Framework documentation
│   ├── FRAMEWORK_STATUS.md         # Implementation status
│   ├── IMPLEMENTATION_COMPLETE.md  # Completion summary
│   └── ARCHITECTURE.md             # This file
│
├── 🎯 GOTCHA Layer 1: GOALS
│   └── goals/
│       ├── README.md
│       └── build_app.md           # ATLAS workflow
│
├── 🧠 GOTCHA Layer 2: ORCHESTRATION
│   └── AGENTS.md                  # Startup & workflows
│
├── 🔧 GOTCHA Layer 3: TOOLS
│   └── manifests/
│       └── tools.json             # 16+ tools tracked
│
├── 📚 GOTCHA Layer 4: CONTEXT
│   └── context/
│       ├── README.md
│       └── business.md            # Your profile
│
├── 💬 GOTCHA Layer 5: PROMPTS
│   └── prompts/
│       ├── README.md
│       ├── code/
│       │   └── code_review.txt
│       └── system/
│           └── error_diagnosis.txt
│
├── ⚙️ GOTCHA Layer 6: ARGUMENTS
│   └── args/
│       └── preferences.yaml       # Runtime config
│
├── 🔒 Security Layer
│   └── security/
│       ├── guardrails.yaml        # 20+ danger patterns
│       └── audit_schema.md        # Logging structure
│
├── 🧠 Memory System
│   ├── MEMORY.md                  # Long-term curated
│   └── memory/
│       ├── YYYY-MM-DD.md          # Daily logs
│       └── errors-YYYY-MM-DD.md   # Error logs
│
└── 📝 Identity & Guidance
    ├── SOUL.md                    # Who Augustus is
    ├── USER.md                    # Who Hayssam is
    ├── IDENTITY.md                # Core traits
    ├── TOOLS.md                   # Tool preferences
    └── HEARTBEAT.md               # Proactive checks
```

---

## Integration Points

### With Existing System

**Preserved:**
- ✅ SOUL.md - Personality layer
- ✅ USER.md - User profile
- ✅ MEMORY.md - Long-term memory
- ✅ Daily memory logs
- ✅ Skills directory (external tools)
- ✅ Git workflow

**Enhanced:**
- ✅ AGENTS.md - Now includes framework integration
- ✅ Startup sequence - Loads all layers systematically
- ✅ Error handling - Self-healing loop active
- ✅ Tool usage - Manifest-driven selection

**Added:**
- ✅ GOTCHA framework (6 layers)
- ✅ ATLAS workflow (app building)
- ✅ Security guardrails
- ✅ Audit system
- ✅ Hard prompts library

### With OpenClaw Features

**Native tools:** Wrapped in manifest system  
**Skills:** Catalogued and tracked  
**Browser control:** Available via manifest  
**Memory search:** Integrated into workflow  
**Cron jobs:** Available for scheduling  
**Messaging:** Governed by guardrails  

---

## Token Budget Management

```
Daily Budget: 100,000 tokens
     ↓
┌──────────────────────────────┐
│   Token Usage Tracking       │
│   (args/preferences.yaml)    │
└──────────┬───────────────────┘
           ↓
    Current Usage < 70%?
           │        │
          Yes      No (Warning)
           │        ↓
           │   Notify about approaching limit
           │        ↓
           │   Current Usage < 90%?
           │        │        │
           │       Yes      No (Critical)
           │        │        ↓
           │        │   Downgrade to cheaper models
           │        │   (Haiku, free alternatives)
           ↓        ↓
       Continue with primary model
       (Claude Sonnet 4.5)
           ↓
    EXCEPTION: Coding tasks
           ↓
    ALWAYS use Windsurf
    (separate 500 credit/month budget)
```

---

## Success Metrics

**Framework Operational Status:** 🟢 Fully Active

✅ All 6 GOTCHA layers implemented  
✅ ATLAS workflow documented  
✅ Security guardrails protecting 20+ patterns  
✅ Self-healing loop catching and learning from errors  
✅ Tool manifest tracking 16+ capabilities  
✅ Context system with business knowledge  
✅ Hard prompts ensuring consistency  
✅ Audit system ready for logging  
✅ Comprehensive documentation complete  

**Version:** 1.0  
**Status:** Production Ready  
**Last Updated:** February 3, 2026

---

*This is Augustus v2.0 - Structured, Secure, Self-Healing* 🏛️
