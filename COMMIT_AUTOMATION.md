# Automated Commit Guide for OpenClaw

**Purpose:** Guidelines for Augustus to autonomously manage Git commits and branches.

---

## 🤖 Autonomous Commit Rules

### When to Commit Automatically

✅ **Always commit when:**
- Completing a feature or sub-feature
- Finishing a bug fix
- Adding/updating documentation
- Making configuration changes
- End of work session (before sleep/restart)
- After successful tests pass
- Before attempting risky refactoring

❌ **Never commit automatically:**
- Broken/failing code
- Incomplete features (use feature branch)
- Experimental code (use experiment branch)
- Secrets or credentials
- Large binary files without approval

---

## 📝 Commit Message Templates

### Feature Addition
```
feat(<scope>): <short description>

<what was added and why>

Technical details:
- Implementation approach
- Key components
- Testing status

<optional footer: closes #issue>
```

### Bug Fix
```
fix(<scope>): <what was broken>

<how it was fixed>

Root cause: <explanation>
Impact: <severity and affected areas>
Testing: <verification steps>
```

### Documentation
```
docs: <what was documented>

<summary of changes>

Includes:
- <specific additions>
- <updates>
```

### Refactoring
```
refactor(<scope>): <what was improved>

<why the refactor was needed>

Changes:
- <specific improvements>
- Performance impact if any
- No functional changes
```

### Maintenance
```
chore: <maintenance task>

<what was maintained/updated>

Reason: <why this was needed>
```

---

## 🌿 Branching Decisions

### Use Feature Branch When:
- Work will take multiple sessions
- Adding significant new functionality
- Making complex changes
- Want to test before merging

### Commit to Main When:
- Quick fixes (< 30 minutes)
- Documentation updates
- Small improvements
- Maintenance tasks
- Main is stable and tests pass

### Branch Naming
```
feature/descriptive-name        # New features
fix/issue-description           # Bug fixes
experiment/idea-to-test         # Experiments
refactor/area-being-improved    # Refactoring
```

---

## 🔄 Automated Workflow

### Standard Commit Flow
```bash
# 1. Check status
git status

# 2. Stage relevant files
git add <specific-files>  # Avoid 'git add .'

# 3. Commit with descriptive message
git commit -m "type(scope): description

Detailed explanation of changes.

Technical notes if needed."

# 4. If feature branch, merge when complete
git checkout main
git merge feature/name --no-ff -m "merge message"
```

### Feature Branch Flow
```bash
# 1. Create branch for feature
git checkout -b feature/autonomous-coding

# 2. Work and commit regularly
git add <files>
git commit -m "feat: progress on feature"

# 3. When complete and tested
git checkout main
git merge feature/autonomous-coding --no-ff -m "Merge feature/autonomous-coding

Complete description of feature."

# 4. Delete branch
git branch -d feature/autonomous-coding
```

---

## 🎯 Decision Matrix

| Scenario | Branch | Commit Frequency | Message Type |
|----------|--------|------------------|--------------|
| Small bug fix | main | Once (when fixed) | fix |
| New feature (complex) | feature/* | After each logical step | feat |
| Documentation | main | Once (when complete) | docs |
| Refactoring | refactor/* | After each safe checkpoint | refactor |
| Experiment | experiment/* | Frequently | feat/test |
| Config change | main | Once | chore |
| Security fix | fix/security-* | Immediately | fix |

---

## 📊 Commit Quality Checklist

Before each commit:
- [ ] Code works as expected
- [ ] Tests pass (if applicable)
- [ ] No debugging code left behind
- [ ] No secrets/credentials included
- [ ] Files staged are relevant to commit message
- [ ] Commit message is descriptive
- [ ] Breaking changes noted in message
- [ ] Related issues referenced

---

## 🚨 Emergency Procedures

### Critical Production Issue
```bash
# 1. Immediately create fix branch
git checkout -b fix/critical-production-issue

# 2. Fix and test
# ... make fix ...

# 3. Commit with high priority
git commit -m "fix(critical): resolve production issue

Description of issue and fix.

Impact: Production
Severity: Critical
Testing: [verification steps]"

# 4. Merge immediately
git checkout main
git merge fix/critical-production-issue --no-ff

# 5. Push (if remote configured)
git push origin main
```

### Rollback if Needed
```bash
# View recent commits
git log --oneline -5

# Revert specific commit
git revert <commit-hash>

# Or reset to previous state (use with caution)
git reset --hard <commit-hash>
```

---

## 💡 Smart Commit Strategies

### Group Related Changes
```bash
# Bad: Multiple unrelated changes in one commit
git add .
git commit -m "updates"

# Good: Separate logical commits
git add src/auth.js tests/auth.test.js
git commit -m "feat(auth): add OAuth2 support"

git add docs/authentication.md
git commit -m "docs: document OAuth2 integration"
```

### Atomic Commits
Each commit should:
- Represent one logical change
- Be self-contained
- Not break the build
- Have a clear purpose

### Progressive Enhancement
```bash
# Commit 1: Basic structure
git commit -m "feat(api): add basic REST endpoints"

# Commit 2: Add validation
git commit -m "feat(api): add request validation"

# Commit 3: Add authentication
git commit -m "feat(api): add JWT authentication"

# Commit 4: Add tests
git commit -m "test(api): add endpoint tests"
```

---

## 📝 Scope Guidelines

Common scopes for commits:
- `auth` - Authentication/authorization
- `api` - API endpoints
- `db` - Database changes
- `ui` - User interface
- `config` - Configuration
- `tests` - Test additions/changes
- `deps` - Dependency updates
- `build` - Build system
- `ci` - Continuous integration
- `docs` - Documentation
- `windsurf` - Windsurf integration
- `openclaw` - OpenClaw core

---

## 🎯 Hayssam's Expectations

1. **Regular commits** - Don't let work pile up uncommitted
2. **Descriptive messages** - Explain what and why, not just what
3. **Clean history** - Use branches for complex work
4. **Feature branches** - Merge cleanly into main with `--no-ff`
5. **No junk** - Don't commit logs, PIDs, temp files
6. **Test before commit** - Ensure code works
7. **Document context** - Future-you should understand the commit

---

## 🔍 Pre-Commit Checklist

```bash
# 1. Review changes
git diff

# 2. Stage specific files
git add <files>

# 3. Review staged changes
git diff --staged

# 4. Check commit message
# Is it descriptive? Will it make sense in 6 months?

# 5. Verify no junk included
git status

# 6. Commit
git commit -m "proper message"

# 7. View result
git log --oneline -1
```

---

**Remember:** Clean commits = clean history = easier debugging, maintenance, and collaboration! 🏛️
