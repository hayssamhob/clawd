# Hard Prompts - Reusable Templates

Pre-tested, regression-tested prompts for specific tasks.

## Why Hard Prompts?

**Benefits:**
- **Consistency** - Same task, same approach every time
- **Optimization** - Test and refine prompts over time
- **Versioning** - Track what works, what doesn't
- **Reusability** - Call from tools or workflows
- **Determinism** - Reduce probabilistic variation

## Directory Structure

```
prompts/
├── code/
│   ├── code_review.txt
│   ├── refactor.txt
│   └── debug.txt
├── content/
│   ├── blog_post.txt
│   ├── email_outreach.txt
│   └── social_post.txt
├── analysis/
│   ├── data_analysis.txt
│   ├── user_research.txt
│   └── competitor_analysis.txt
└── system/
    ├── error_diagnosis.txt
    ├── security_audit.txt
    └── performance_review.txt
```

## Usage

### In Tools (Python example)
```python
import open

def analyze_code(code):
    with open('prompts/code/code_review.txt', 'r') as f:
        prompt_template = f.read()
    
    prompt = prompt_template.replace('{{CODE}}', code)
    return llm_call(prompt)
```

### In Goals
```markdown
When reviewing code:
1. Load prompt: `prompts/code/code_review.txt`
2. Insert code into {{CODE}} placeholder
3. Execute with LLM
4. Return structured feedback
```

### Direct Call
```bash
# Augustus can load and use directly
cat prompts/code/code_review.txt | sed "s/{{CODE}}/$actual_code/"
```

## Template Format

Use `{{PLACEHOLDER}}` syntax for variables:

```
Analyze the following code for:
- Performance issues
- Security vulnerabilities
- Best practice violations

Code:
{{CODE}}

Provide specific, actionable feedback with line numbers.
```

## Prompt Categories

### Code
- Code review
- Refactoring suggestions
- Debug assistance
- Test generation

### Content
- Blog posts
- Email templates
- Social media posts
- Documentation

### Analysis
- Data analysis
- User research
- Competitive analysis
- System diagnostics

### System
- Error diagnosis
- Security audits
- Performance reviews
- Configuration validation

## Best Practices

1. **Be specific** - Clear instructions, expected format
2. **Include examples** - Show desired output
3. **Define constraints** - Length, tone, format
4. **Version prompts** - Keep working versions
5. **Test variations** - A/B test for best results

## Maintenance

- Review prompt effectiveness monthly
- Update based on results
- Archive outdated prompts
- Document changes in git commits

---

*Hard prompts = deterministic AI behavior*
