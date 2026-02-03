# Claude Code Setup Guide (Beginner Friendly)

A step-by-step guide to set up Claude Code in VS Code from scratch.

---

## Prerequisites

Before you start, you need:

1. **A computer** (Mac, Windows, or Linux)
2. **Claude subscription** - this gives you unlimited Claude Code usage
   - Sign up at: https://claude.ai
3. **VS Code** (free) - download from: https://code.visualstudio.com

---

## Step 1: Install VS Code

1. Go to https://code.visualstudio.com
2. Click the big download button
3. Install it like any other app
4. Open VS Code

---

## Step 2: Install Claude Code Extension

1. In VS Code, look at the left sidebar
2. Click the **Extensions icon** (looks like 4 squares/puzzle piece)
3. In the search bar, type: `Claude Code`
4. Find the official one by **Anthropic**
5. Click **Install**
6. Wait for it to finish

---

## Step 3: Sign In to Claude

1. After installing, you'll see a Claude icon in the left sidebar
2. Click it
3. Click **Sign In**
4. It will open your browser - log in with your Claude account
5. Authorize the connection
6. You're connected!

---

## Step 4: Create Your Project Folder

1. On your computer, create a new folder somewhere (e.g., Desktop or Documents)
2. Name it something like `my-agent` or `claude-workspace`
3. In VS Code, go to **File → Open Folder**
4. Select the folder you just created
5. Click **Open**

---

## Step 5: Add the Framework Files

Download these files and drag them into your folder:

### Required Files:
- `ATLAS_CLAUDE.md` - The handbook for how the system operates
- Framework structure: goals/, tools/, context/, args/, prompts/, memory/

See ATLAS_CLAUDE.md for complete setup instructions.

---

## Step 6: Initialize Your Environment

1. Click the **Claude icon** in the chat sidebar
2. Start a new chat
3. Type: "Initialize this environment using ATLAS_CLAUDE.md as the handbook"
4. Claude will create all necessary folders and set up the memory system

---

## You're Ready!

You can now:
- Ask Claude to execute goals from `goals/manifest.md`
- Create reusable tools in `tools/`
- Add domain knowledge to `context/`
- Query semantic memory with `tools/memory/`

See ATLAS_CLAUDE.md for detailed operations guide.
