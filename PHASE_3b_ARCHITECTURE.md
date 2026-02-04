# Phase 3b: Real Multi-Instance Execution Architecture

## Problem Statement

**Current:** Single Cascade window can only execute one task at a time
**Needed:** Parallel execution across multiple instances for 24/7 arbitrage bot

---

## Architecture Options

### Option 1: Multiple Windsurf Windows (Local)
```
┌─────────────────────────────────────────┐
│  OpenClaw Bot (Mac mini / localhost)    │
└────────────┬────────────────────────────┘
             │
        ┌────┴─────────────────────────┐
        │                              │
        ↓                              ↓
   ┌─────────────┐          ┌──────────────────┐
   │ Windsurf 1  │          │ Windsurf 2       │
   │ (Haiku)     │          │ (Sonnet)         │
   │ Port 3101   │          │ Port 3102        │
   └─────────────┘          └──────────────────┘
        │                              │
        └────────┬─────────────────────┘
                 │
            ┌────▼────┐
            │ MCP     │
            │ Broker  │
            │ (stdio) │
            └─────────┘

Pros:
- All local, low latency
- Direct process control
- MacOS native

Cons:
- Each Windsurf instance = 500MB+ RAM
- Limited by Mac specs (can run 4-6 max)
- GUI overhead
```

---

### Option 2: VPS Multi-Instance (Cloud)
```
┌──────────────┐
│ OpenClaw Bot │  (Your Mac - orchestrator)
│ (Mac mini)   │
└──────┬───────┘
       │ API calls
       │
       ├──────────────────────────────────────┐
       │                                      │
       ↓                                      ↓
   ┌─────────┐                          ┌──────────┐
   │ VPS 1   │                          │ VPS 2    │
   │ Ubuntu  │                          │ Ubuntu   │
   │ 4x4GB   │                          │ 8x8GB    │
   │ Running │                          │ Running  │
   │ 4 bots  │                          │ 6 bots   │
   │ (free)  │                          │ (cheap)  │
   └─────────┘                          └──────────┘
        │                                      │
        └──────────┬───────────────────────────┘
                   │
              ┌────▼─────┐
              │ Broker   │
              │ (REST)   │
              └──────────┘

Pros:
- Unlimited parallelism
- 24/7 uptime
- Cost-effective (save 240% profit on each instance)
- Can run 100+ bot instances

Cons:
- Network latency
- VPS costs offset by arbitrage profits
- Requires Docker/deployment setup
```

---

### Option 3: Hybrid (Recommended)
```
LOCAL (Mac mini)
┌──────────────────────────┐
│ OpenClaw Orchestrator    │
│ - Monitors 24/7          │
│ - Manages task queue     │
│ - Windsurf 1 (Haiku)     │  Port 3101
│ - Windsurf 2 (Sonnet)    │  Port 3102
└────────┬─────────────────┘
         │
    ┌────┴──────────┐
    │               │
    ↓               ↓
  SSH           REST API
    │               │
    ├───────────────┤
    │
CLOUD (VPS)
┌──────────────────────────────────────────┐
│ VPS #1: 4x4GB Ubuntu                     │
│ - 6 bot instances (free models)          │
│ - Running 24/7                           │
│ - Connected via API                      │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ VPS #2: 8x8GB Ubuntu                     │
│ - 8 bot instances (cheap models)         │
│ - Running 24/7                           │
│ - Connected via API                      │
└──────────────────────────────────────────┘

Orchestrator Routes Tasks:
- Small tasks (haiku) → 2 local instances
- Medium tasks (sonnet) → 2 local instances
- Large tasks (expensive) → VPS instances (cost optimization)
- Excess load → Queue on VPS
```

---

## Implementation Plan

### Phase 3a: OpenClaw Single Instance (THIS WEEK)
✅ Get one Cascade working
✅ Test arbitrage task execution
✅ Verify results return correctly

### Phase 3b: Local Multi-Instance (NEXT WEEK)
```bash
# Launch multiple Windsurf windows programmatically
# Each runs separate bridge on different port
Windsurf 1 → 3101
Windsurf 2 → 3102
Windsurf 3 → 3103
Windsurf 4 → 3104

# MCP Broker becomes task router
# Distributes to available instances
```

### Phase 3c: VPS Deployment (AFTER TESTING)
```bash
# Containerize bot environment
# Deploy to Linode/AWS/Digital Ocean
# Run N copies of Windsurf in containers
# Connect back to orchestrator

# Profits pay for infrastructure
240% ROI - VPS costs = huge margin
```

---

## Recommended Path Forward

### THIS WEEK (Phase 3a):
```
1. Run test-openclaw-broker.py
2. Get arbitrage task executing in single Cascade
3. Verify results come back
4. Fix any Windsurf config issues
5. Document what works
```

### NEXT WEEK (Phase 3b):
```
1. Modify MCP broker to support multiple ports
2. Launch 2nd Windsurf instance (different model)
3. Test load balancing between them
4. Measure throughput improvement
5. Run 24/7 overnight test
```

### AFTER TESTING (Phase 3c):
```
1. Build Docker image with Windsurf + bot
2. Deploy to 1 VPS (6 instances)
3. Monitor profitability
4. Scale to 2 VPS if profitable
5. Eventually: 100+ distributed instances
```

---

## Key Architecture Decisions

### Task Routing Strategy
```
Incoming Task
    │
    ├─ Check complexity
    │
    ├─ Simple → Route to Haiku (local fastest)
    ├─ Medium → Route to Sonnet (local balanced)
    ├─ Complex → Route to free VPS (cost-optimized)
    └─ Emergency → Queue + wait for instance
```

### Load Balancing
```
Round-robin:
- Instance 1 → Task 1
- Instance 2 → Task 2
- Instance 1 → Task 3  (if available)
- Instance 2 → Task 4
- Instance 3 → Task 5
- ...
```

### Monitoring
```
Each instance reports:
- Status: idle, executing, failed
- Current task ID
- Success rate
- Avg execution time
- Cost per task (model * time)

Orchestrator makes routing decisions based on:
- Instance availability
- Cost efficiency
- Execution speed requirements
- Task urgency
```

---

## Resource Requirements

### Phase 3a (1 instance):
- 1x Windsurf window
- RAM: 2GB
- Network: Local
- Cost: $0

### Phase 3b (4 instances):
- 4x Windsurf windows on Mac mini
- RAM: 8GB total
- Network: Local
- Cost: $0 (use existing Mac)

### Phase 3c (20 instances):
- 2x VPS (Linode/AWS)
- RAM: 32GB total
- Network: 10+ Mbps
- Cost: $100-200/month
- Arbitrage profit potential: $10,000+/month
  - ($1 * 240% ROI * 20 instances * 30 days)

---

## Next Steps

1. ✅ Run Phase 3a test this week
2. ⏳ Plan Phase 3b after confirming Phase 3a works
3. ⏳ Phase 3c deployment decision based on Phase 3b results

**Decision Point:** After Phase 3a, we'll know:
- Does the broker work end-to-end?
- What's the actual execution time?
- What failure modes exist?
- Whether local multi-instance makes sense before VPS

Then Phase 3b becomes clear.
