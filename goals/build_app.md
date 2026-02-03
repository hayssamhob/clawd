# ATLAS Workflow - Full-Stack Application Development

## Goal
Build robust, production-ready full-stack applications using AI assistance within the GOTCHA framework.

## Philosophy
**Don't vibe-code.** Use a structured software development lifecycle that includes testing, monitoring, and observability from day one.

---

## The ATLAS Framework

### A - ARCHITECT (Define the Problem)

**Before writing ANY code:**

1. **Define the Problem**
   - What problem are we solving?
   - Who are the users?
   - What are their pain points?

2. **Success Metrics**
   - What does "done" look like?
   - How will we measure success?
   - What are the acceptance criteria?

3. **Definition of Done**
   - Feature complete?
   - Tests passing?
   - Deployed?
   - Documented?

**If you can't clearly describe your definition of done, you don't understand the problem well enough.**

**Outputs:**
- Problem statement (1-2 paragraphs)
- User personas
- Success criteria
- Definition of done checklist

---

### T - TRACE (Map the System)

**Design before building:**

1. **Data Schemas**
   - What data do we need?
   - How is it structured?
   - Relationships between entities

2. **Integration Map**
   - What APIs/services do we need?
   - Authentication methods
   - Rate limits and constraints

3. **Stack Proposal**
   - Frontend framework
   - Backend framework
   - Database choice
   - Hosting platform
   - Why each choice?

4. **Architecture Diagram**
   - Components and their relationships
   - Data flow
   - External dependencies

**Outputs:**
- Database schema (SQL/JSON)
- API integration list
- Tech stack document
- System architecture diagram (ASCII or draw.io)

---

### L - LINK (Validate Connections)

**Test integrations BEFORE building features:**

1. **API Validation**
   - Can we authenticate?
   - Can we make test calls?
   - What are the rate limits?

2. **Database Connection**
   - Can we connect?
   - Can we create tables?
   - Can we run migrations?

3. **Service Health Checks**
   - Are all external services accessible?
   - Do we have valid credentials?
   - Are there any blockers?

**Rule:** Don't build features on top of unvalidated integrations.

**Outputs:**
- Connection test scripts
- API health check results
- Credential validation report
- Blockers document (if any)

---

### A - ASSEMBLE (Layered Architecture)

**Build in layers - prototype to production:**

#### Layer 1: Basic Functionality (Prototype)
**Goal:** Prove the concept works

- Minimal viable features
- No styling, just function
- Hardcoded test data OK
- Console logging for debugging

**Success:** It does the thing, even if ugly.

#### Layer 2: Core Features (Alpha)
**Goal:** Real functionality with real data

- Database integration
- API connections
- Basic error handling
- Simple UI (functional, not pretty)

**Success:** Works with real data, handles happy path.

#### Layer 3: Polish (Beta)
**Goal:** Production-ready UX

- Full styling and design
- Responsive layout
- Loading states
- User feedback (toasts, notifications)

**Success:** Looks good, feels smooth.

#### Layer 4: Hardening (Production)
**Goal:** Bulletproof reliability

- Comprehensive error handling
- Edge case coverage
- Performance optimization
- Security hardening

**Success:** Handles failure gracefully, scales well.

**Outputs:**
- Working prototype (Layer 1)
- Functional alpha (Layer 2)
- Polished beta (Layer 3)
- Production build (Layer 4)

---

### S - STRESS TEST (Validate Quality)

**For PROTOTYPE builds (default):**

1. **Functionality Testing**
   - Does it do what it should?
   - Happy path works?
   - Basic error handling?

2. **Quick Validation**
   - Manual testing
   - Smoke tests
   - Console inspection

**For PRODUCTION builds (when explicitly requested):**

1. **Validation Layer**
   - Input sanitization
   - SQL injection prevention
   - XSS protection
   - CSRF tokens
   - Authentication/authorization
   - Rate limiting

2. **Edge Case Testing**
   - Null/undefined handling
   - Empty arrays/objects
   - Invalid input types
   - Boundary conditions
   - Race conditions

3. **Monitoring & Observability**
   - Error tracking (Sentry, etc.)
   - Performance monitoring (Helicone, etc.)
   - Usage analytics
   - Log aggregation
   - Health check endpoints

4. **Load Testing**
   - Can it handle concurrent users?
   - What's the breaking point?
   - Database query performance
   - API response times

**Outputs:**
- Test results document
- Security audit report (prod only)
- Performance benchmarks (prod only)
- Monitoring dashboard links (prod only)

---

## Build Type Selection

**When user says:** "Build me an app..."
- Default to **PROTOTYPE** mode (Layers 1-2, basic testing)
- Fast iteration, prove concept

**When user says:** "Build me a PRODUCTION app..." or "This needs to be production-ready..."
- Use **PRODUCTION** mode (All layers, full testing, monitoring)
- Slower, but bulletproof

---

## Integration with GOTCHA

1. **Goals** - This file (`build_app.md`)
2. **Orchestration** - Claude manages the ATLAS phases
3. **Tools** - Scripts for testing, deployment, monitoring
4. **Context** - Tech stack preferences, brand guidelines
5. **Prompts** - Code review templates, testing checklists
6. **Arguments** - Build type (prototype/prod), target platform

---

## Example: Building a Todo App

### ARCHITECT
```markdown
Problem: Users need to track tasks
Users: Busy professionals
Success: Can add/complete/delete tasks
Done: CRUD works, data persists, responsive UI
```

### TRACE
```markdown
Data: Task (id, title, completed, created_at)
Stack: React + Node + PostgreSQL
APIs: None needed for MVP
```

### LINK
```markdown
✅ PostgreSQL connected
✅ Can create tasks table
✅ Can run migrations
```

### ASSEMBLE
```markdown
Layer 1: Console CRUD (works)
Layer 2: API + DB (works with Postman)
Layer 3: React UI (looks good)
Layer 4: Error handling, loading states
```

### STRESS TEST
```markdown
✅ Add task works
✅ Complete task works
✅ Delete task works
✅ Handles empty list
✅ Validates required fields
```

**Result:** Production-ready todo app in structured phases.

---

## Guardrails

**Never skip ARCHITECT phase.** If you don't have a clear definition of done, you'll build the wrong thing.

**Never assume integrations work.** Always LINK first.

**Never ship without STRESS TEST.** Even prototypes need basic validation.

---

*Use this workflow for ALL application builds. Structured > chaotic.*
