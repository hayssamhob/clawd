cat > README.md << 'EOF'
# Clawd: Deterministic AI Systems

Built on the **GOTCHA Framework** - Six layers of intelligent system design.

## 📋 System Constitution

- **AGENTS.md** - How AI agents behave and operate
- **GOTCHA.md** - The 6-layer architectural framework
- **ARCHITECTURE.md** - Technical system design
- **IDENTITY.md** - What this system is
- **SOUL.md** - Why this system exists

See `/docs/` for all system documentation.

## GOTCHA Architecture
```
       ORCHESTRATION
       (OpenClaw MCP)
             ↓
    ┌─────────────────────┐
    │ GOALS               │
    │ CONTEXT             │
    │ TOOLS               │
    │ PROMPTS             │
    │ ARGUMENTS           │
    └─────────────────────┘
```

## Six Layers

1. **GOALS** (`/goals/`) - Desired outcomes and workflows
2. **ORCHESTRATION** - Central coordination (Claude + MCP)
3. **TOOLS** (`/tools/`) - Executables and integrations
4. **CONTEXT** (`/context/`) - Domain knowledge and patterns
5. **HARD PROMPTS** (`/prompts/`) - Reusable prompt templates
6. **ARGUMENTS** (`/args/`) - Runtime configuration

## Active Projects

- **OpenClaw MCP** (`/openclaw-mcp/`) - Core reasoning engine with Windsurf delegation
- **Polymarket Arbitrage** (`/polymarket-arbitrage/`) - Trading bot
- **Windsurf Integration** - Task broker + orchestrator

## Quick Start
```bash
# 1. Start Windsurf broker
cd windsurf-task-broker && npm install && npm run start:broker

# 2. Start OpenClaw MCP
cd openclaw-mcp/windsurf && npm install && npm run build && npm run start

# 3. Start trading bot
cd polymarket-arbitrage && pip install -r requirements.txt && python run.py
```

See `/docs/` for detailed setup and architecture documentation.
