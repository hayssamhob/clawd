# Windsurf Cascade Transparency System

**Purpose:** Capture and display all AI interactions in Windsurf Cascade, including prompts, model selection, LLM reasoning, and responses.

---

## 🎯 What Gets Captured

1. **User Prompts** - What you ask Cascade to do
2. **Model Selection** - Which AI model is chosen
3. **LLM Reasoning** - The model's thinking process
4. **Generated Code** - Code changes proposed
5. **Credit Usage** - How many credits each interaction uses
6. **Timestamps** - When each interaction occurred

---

## 🛠️ Tools Available

### 1. Verbose Windsurf Launcher
**File:** `windsurf-verbose`  
**Location:** `~/.nvm/versions/node/v22.12.0/lib/node_modules/openclaw/skills/windsurf-automation/`

**Usage:**
```bash
# Launch Windsurf with verbose logging
windsurf-verbose

# Launch with specific project
windsurf-verbose /path/to/project
```

**What it does:**
- Enables `VSCODE_LOGS=trace`
- Enables `ELECTRON_ENABLE_LOGGING`
- Captures all output to timestamped log file
- Saves logs to `~/clawd/windsurf-cascade-logs/`

### 2. Cascade Logger
**File:** `windsurf-cascade-logger.cjs`

**Usage:**
```bash
# Watch logs in real-time
node windsurf-cascade-logger.cjs --watch

# Tail today's log
node windsurf-cascade-logger.cjs --tail

# Show summary report
node windsurf-cascade-logger.cjs --summary

# Parse specific log file
node windsurf-cascade-logger.cjs --parse /path/to/log.file
```

**Features:**
- Real-time monitoring of Windsurf logs
- Extracts AI-related interactions
- Creates daily summaries
- Identifies models used

### 3. Transparency Tool
**File:** `cascade-transparency.cjs`

**Usage:**
```bash
# Generate full transparency report
node cascade-transparency.cjs

# Export chat history
node cascade-transparency.cjs --export
```

**Features:**
- Reads Windsurf's internal databases
- Extracts Cascade configuration
- Finds workspace chat histories
- Exports data to JSON

---

## 📁 Output Locations

All logs and exports are saved to:
```
~/clawd/windsurf-cascade-logs/
├── cascade-2026-02-02.log          # Daily interaction log
├── cascade-verbose-20260202_140530.log  # Verbose session log
└── chat-export-2026-02-02.json     # Exported chat data
```

---

## 🚀 Quick Start

### Method 1: Real-Time Monitoring
```bash
# Terminal 1: Launch Windsurf with verbose logging
windsurf-verbose /path/to/project

# Terminal 2: Watch for interactions
node windsurf-cascade-logger.cjs --watch

# Terminal 3: Tail the output
node windsurf-cascade-logger.cjs --tail
```

### Method 2: Post-Session Analysis
```bash
# Use Windsurf normally
# Then run transparency report
node cascade-transparency.cjs

# Export for detailed analysis
node cascade-transparency.cjs --export
```

---

## 📊 What You'll See

### Example Interaction Log
```
[2026-02-02T14:05:30.123Z] exthost/codeium.windsurf:42
User Prompt: "Build a REST API with authentication"

[2026-02-02T14:05:30.456Z] exthost/codeium.windsurf:43
Model Selected: Hybrid Arena (Free)

[2026-02-02T14:05:31.789Z] exthost/codeium.windsurf:44
LLM Reasoning: Breaking down the task into components:
1. Express server setup
2. JWT authentication middleware
3. User routes
4. Database integration

[2026-02-02T14:05:35.012Z] exthost/codeium.windsurf:45
Generated Code: [200 lines of implementation]

[2026-02-02T14:05:35.234Z] exthost/codeium.windsurf:46
Credits Used: 0 (Free model)
```

### Transparency Report
```
🔍 Windsurf Cascade Transparency Report
========================================

📦 Cascade-Related Storage:
  - Selected Model: "Hybrid Arena"
  - Credit Balance: 448.5
  - Recent Prompts: [...]

📁 Workspace Storage:
  - Project: /Users/.../clawd
  - Chat Files: cascade-chat.json, state.json

💾 State Database:
  - Tables: conversations, models, settings
  - Last Interaction: 2026-02-02T14:05:35Z

📋 Summary:
  - Total Interactions: 12
  - Models Used: Hybrid Arena (10), Claude Sonnet 4.5 (2)
  - Credits Used: 4.0
```

---

## 🔧 Advanced Usage

### Custom Log Parsing
```javascript
const CascadeTransparency = require('./cascade-transparency.cjs');
const tool = new CascadeTransparency();

// Read all workspaces
const workspaces = tool.readWorkspaceStorage();
console.log(workspaces);

// Extract Cascade data
const storage = tool.readGlobalStorage();
const cascadeData = tool.extractCascadeData(storage);
console.log(cascadeData);
```

### Filter Specific Interactions
```bash
# Show only Claude Sonnet interactions
grep "Claude Sonnet" ~/clawd/windsurf-cascade-logs/cascade-2026-02-02.log

# Show credit usage
grep "Credits Used" ~/clawd/windsurf-cascade-logs/cascade-2026-02-02.log

# Show reasoning steps
grep "Reasoning:" ~/clawd/windsurf-cascade-logs/cascade-2026-02-02.log
```

---

## 💡 Tips

### For Daily Use
1. **Start logger before working:**
   ```bash
   node windsurf-cascade-logger.cjs --watch &
   ```

2. **Review at end of day:**
   ```bash
   node windsurf-cascade-logger.cjs --summary
   ```

### For Debugging
1. **Enable verbose mode:**
   ```bash
   windsurf-verbose
   ```

2. **Check specific logs:**
   ```bash
   ls -lt ~/Library/Application\ Support/Windsurf/logs/
   ```

### For Analysis
1. **Export chat history:**
   ```bash
   node cascade-transparency.cjs --export
   ```

2. **Analyze with jq:**
   ```bash
   cat ~/clawd/windsurf-cascade-logs/chat-export-*.json | jq .
   ```

---

## 🎯 Use Cases

### 1. Understanding Model Selection
**See which model Cascade chose and why**
```bash
grep "Model" ~/clawd/windsurf-cascade-logs/*.log
```

### 2. Reviewing Reasoning
**Understand how the LLM approached your problem**
```bash
grep -A 10 "Reasoning" ~/clawd/windsurf-cascade-logs/*.log
```

### 3. Tracking Credit Usage
**Monitor costs in real-time**
```bash
grep "Credits" ~/clawd/windsurf-cascade-logs/*.log | tail -20
```

### 4. Learning from AI
**Review how the model structures code**
```bash
grep -A 50 "Generated Code" ~/clawd/windsurf-cascade-logs/*.log
```

---

## 🔒 Privacy

All logs are stored **locally** in `~/clawd/windsurf-cascade-logs/`

- ✅ Never sent to external servers
- ✅ Excluded from Git (via .gitignore)
- ✅ Full control over data
- ✅ Can be deleted anytime

---

## 🐛 Troubleshooting

### No logs appearing?
```bash
# Check if logger is running
ps aux | grep windsurf-cascade-logger

# Verify Windsurf logs exist
ls -la ~/Library/Application\ Support/Windsurf/logs/
```

### Can't find interactions?
```bash
# Generate full report
node cascade-transparency.cjs

# Check all log files
find ~/Library/Application\ Support/Windsurf/logs/ -name "*.log" -newer ~/clawd/windsurf-cascade-logs/cascade-*.log
```

### Empty transparency report?
- Windsurf might store data differently per version
- Try using verbose mode: `windsurf-verbose`
- Check workspace storage manually:
  ```bash
  ls -la ~/Library/Application\ Support/Windsurf/User/workspaceStorage/
  ```

---

## 📚 Reference

### Log File Locations
- **Windsurf Logs:** `~/Library/Application Support/Windsurf/logs/`
- **Global Storage:** `~/Library/Application Support/Windsurf/User/globalStorage/`
- **Workspace Storage:** `~/Library/Application Support/Windsurf/User/workspaceStorage/`
- **State DB:** `~/Library/Application Support/Windsurf/User/globalStorage/state.vscdb`

### Output Locations
- **Interaction Logs:** `~/clawd/windsurf-cascade-logs/cascade-YYYY-MM-DD.log`
- **Verbose Logs:** `~/clawd/windsurf-cascade-logs/cascade-verbose-TIMESTAMP.log`
- **Exports:** `~/clawd/windsurf-cascade-logs/chat-export-YYYY-MM-DD.json`

---

## 🎉 Benefits

1. **Full Transparency** - See exactly what the AI is doing
2. **Learning Tool** - Understand AI reasoning patterns
3. **Cost Control** - Track credit usage precisely
4. **Debugging** - Identify why certain decisions were made
5. **Accountability** - Review all AI suggestions
6. **Optimization** - Learn which prompts work best

---

**Last Updated:** 2026-02-02  
**Status:** Operational  
**Maintainer:** Augustus 🏛️
