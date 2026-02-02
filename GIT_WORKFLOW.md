# Git Workflow Guide

**Purpose:** Maintain clean commit history with proper branching and descriptive messages.

---

## 🌿 Branching Strategy

### Branch Types

1. **`main`** - Production-ready code
   - Always stable
   - Merged feature branches only
   - Tagged releases

2. **`feature/*`** - New features
   - Example: `feature/windsurf-autonomous-model-selection`
   - Branch from: `main`
   - Merge to: `main`

3. **`fix/*`** - Bug fixes
   - Example: `fix/authentication-token-expiry`
   - Branch from: `main`
   - Merge to: `main`

4. **`experiment/*`** - Experimental work
   - Example: `experiment/new-ml-model`
   - May not merge back
   - Can be deleted after evaluation

5. **`refactor/*`** - Code improvements
   - Example: `refactor/database-connection-pooling`
   - Branch from: `main`
   - Merge to: `main`

---

## 📝 Commit Message Format

### Structure
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- **feat:** New feature
- **fix:** Bug fix
- **docs:** Documentation changes
- **style:** Code style changes (formatting, no logic change)
- **refactor:** Code refactoring
- **test:** Adding or updating tests
- **chore:** Maintenance tasks (dependencies, config)
- **perf:** Performance improvements

### Examples

**Good commit:**
```
feat(windsurf): Add autonomous model selection system

Implements intelligent model selection based on task complexity:
- Automatic classification (Quick/Daily/Complex/Emergency)
- Budget-aware selection (500 credits/month limit)
- Arena category optimization for cost savings

Technical details:
- Core engine: selector.cjs
- Test coverage: 100% (9 scenarios)
- FREE model usage: 55.6%

Closes #42
Related: #38, #40
```

**Simple commit:**
```
fix(auth): Resolve token expiry edge case

Fixed issue where refresh tokens expired 1 minute early
due to timezone calculation error.
```

**Documentation commit:**
```
docs: Update README with installation instructions

Added step-by-step setup guide for new users.
```

---

## 🔄 Workflow Steps

### 1. Starting New Work

```bash
# Update main first
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name
```

### 2. During Development

```bash
# Check status frequently
git status

# Stage changes
git add <files>

# Commit with descriptive message
git commit -m "feat(scope): description

Detailed explanation of changes.

Technical notes if needed."

# Commit regularly (logical checkpoints)
# - After completing a sub-feature
# - Before trying risky changes
# - At end of work session
```

### 3. Preparing for Merge

```bash
# Ensure all work is committed
git status

# Update from main (if needed)
git checkout main
git pull origin main
git checkout feature/your-feature-name
git rebase main  # or merge main if preferred

# Resolve conflicts if any
# Test everything works
```

### 4. Merging to Main

```bash
# Switch to main
git checkout main

# Merge with no-fast-forward (preserves branch history)
git merge feature/your-feature-name --no-ff -m "Merge feature/your-feature-name

Summary of feature and its impact."

# Delete feature branch (optional)
git branch -d feature/your-feature-name
```

### 5. Pushing Changes

```bash
# Push to remote
git push origin main

# Push branches if collaborating
git push origin feature/your-feature-name
```

---

## 🎯 Best Practices

### Commit Frequency
- ✅ **Commit often:** Logical checkpoints
- ✅ **Atomic commits:** One logical change per commit
- ❌ **Avoid:** "WIP" commits on main
- ❌ **Avoid:** Massive commits with multiple unrelated changes

### Commit Messages
- ✅ **Descriptive:** Explain *what* and *why*
- ✅ **Present tense:** "Add feature" not "Added feature"
- ✅ **Clear subject:** 50 chars or less
- ✅ **Detailed body:** Explain technical details
- ❌ **Avoid:** "Update", "Fix stuff", "Changes"

### Branching
- ✅ **Feature branches:** For all non-trivial work
- ✅ **Descriptive names:** `feature/autonomous-model-selection`
- ✅ **Clean merges:** Use `--no-ff` to preserve history
- ❌ **Avoid:** Working directly on main
- ❌ **Avoid:** Long-lived branches (merge frequently)

### .gitignore
- ✅ **Ignore:** Logs, PIDs, local config
- ✅ **Commit:** `.gitignore` itself
- ❌ **Don't ignore:** Documentation, configs
- ❌ **Don't commit:** Secrets, credentials

---

## 🔧 Useful Commands

```bash
# View commit history
git log --oneline --graph --all

# View changes
git diff
git diff --staged

# Undo uncommitted changes
git restore <file>
git restore --staged <file>

# Amend last commit (before push)
git commit --amend

# View branches
git branch -a

# Clean up merged branches
git branch -d feature/old-feature

# Stash changes temporarily
git stash
git stash pop

# Cherry-pick specific commit
git cherry-pick <commit-hash>
```

---

## 📊 Example Workflow

### Scenario: Adding new feature

```bash
# 1. Start feature
git checkout main
git pull
git checkout -b feature/email-notifications

# 2. Develop and commit regularly
# ... make changes ...
git add src/notifications.js
git commit -m "feat(notifications): Add email service integration

Implemented SendGrid integration for transactional emails.
- Added EmailService class
- Configured templates
- Added retry logic"

# ... more changes ...
git add tests/notifications.test.js
git commit -m "test(notifications): Add email service tests

Added unit tests for:
- Email sending
- Template rendering
- Retry mechanism

Coverage: 95%"

# 3. Update from main
git checkout main
git pull
git checkout feature/email-notifications
git rebase main

# 4. Merge to main
git checkout main
git merge feature/email-notifications --no-ff -m "Merge feature/email-notifications

Added email notification system with SendGrid integration.
Includes comprehensive tests and retry logic."

# 5. Push
git push origin main

# 6. Clean up
git branch -d feature/email-notifications
```

---

## 🚨 Emergency Fixes

For critical production issues:

```bash
# Create fix branch from main
git checkout main
git checkout -b fix/critical-security-issue

# Fix and test
# ... make fix ...
git add .
git commit -m "fix(security): Patch authentication bypass vulnerability

Fixed SQL injection vulnerability in login endpoint.

Security impact: High
Affected versions: 1.0.0 - 1.2.3

CVE: Pending"

# Fast merge to main
git checkout main
git merge fix/critical-security-issue --no-ff

# Push immediately
git push origin main

# Tag if release
git tag -a v1.2.4 -m "Security patch release"
git push origin v1.2.4
```

---

## 📝 Daily Routine

**Start of day:**
```bash
git checkout main
git pull origin main
git checkout -b feature/todays-work
```

**During work:**
```bash
# Commit after each logical unit
git add <changed-files>
git commit -m "feat(scope): description"
```

**End of day:**
```bash
# Commit all work
git status
git add .
git commit -m "feat(scope): progress on feature X

Completed:
- Part A
- Part B

TODO:
- Part C
- Testing"

# Push branch to backup
git push origin feature/todays-work
```

**When feature complete:**
```bash
git checkout main
git merge feature/todays-work --no-ff
git push origin main
```

---

**Remember:** Clean commits = clean history = easier debugging, collaboration, and maintenance! 🎯
