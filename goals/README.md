# Goals - Task Workflows

This directory contains your task definitions, workflows, and SOPs (Standard Operating Procedures).

## Purpose

Each goal is a structured workflow that defines:
- **What** you want to accomplish
- **How** to accomplish it systematically
- **Success criteria** for completion
- **Tools** needed
- **Expected output**

## Current Goals

### build_app.md
Full ATLAS framework for building robust applications.

**Use when:** Building any app, website, or software project.

**Phases:**
1. Architect - Define problem and success criteria
2. Trace - Map data, integrations, stack
3. Link - Validate connections
4. Assemble - Build in layers
5. Stress Test - Validate quality

## How to Use

**From chat:**
```
"Build me an app that does X"
→ Augustus loads build_app.md
→ Follows ATLAS phases
→ Delivers working app
```

**Create new goal:**
```markdown
# Goal Name

## Objective
What are we trying to achieve?

## Success Criteria
How do we know we're done?

## Tools Required
- tool_name_1
- tool_name_2

## Workflow
1. Step one
2. Step two
3. ...

## Output
What gets delivered?
```

## Goal Ideas

**Business:**
- `lead_generation.md` - Automated outreach pipeline
- `content_creation.md` - Social media workflow
- `email_marketing.md` - Email campaign process

**Development:**
- `code_review.md` - Systematic code review
- `deploy_prod.md` - Production deployment checklist
- `bug_triage.md` - Bug investigation workflow

**Operations:**
- `weekly_review.md` - Weekly planning process
- `onboard_client.md` - Client onboarding steps
- `backup_restore.md` - Data backup procedure

## Best Practices

1. **Define success clearly** - If you can't describe "done", you don't understand the problem
2. **List tools needed** - Check manifests first, build if missing
3. **Include examples** - Show what good output looks like
4. **Version control** - Goals evolve, track changes in git
5. **Keep focused** - One goal per file, specific purpose

## Maintenance

- Review goals monthly
- Update based on learnings
- Archive outdated workflows
- Share successful patterns

---

*Goals are your playbook. Build it up over time.*
