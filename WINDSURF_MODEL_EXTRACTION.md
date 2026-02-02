# Windsurf Model Extraction Guide

## 🎯 Objective
Extract the ACTUAL list of available models in your Windsurf installation, including real-time pricing and availability.

## 🤔 Why Manual Extraction?

**Windsurf stores model data dynamically:**
- Models are fetched from API: `https://server.self-serve.windsurf.com`
- List changes based on:
  - Your subscription tier (Free/Pro/Teams/Enterprise)
  - Current promotions
  - Regional availability
  - Admin restrictions (Teams/Enterprise)
- No local cache of complete model list
- No CLI command to query models

**What we built:**
- ✅ Automated checker (finds what's cached locally)
- ✅ DevTools extraction guide (captures API response)
- ✅ Reusable script for future updates

---

## 📋 Quick Start (Recommended Method)

### Option 1: Interactive Script
```bash
cd ~/clawd
./get-windsurf-models.sh
```

Then follow the on-screen instructions to:
1. Open DevTools in Windsurf
2. Capture the API response
3. Save it to `windsurf-models-actual.json`

### Option 2: Console Method (Fastest)

1. **Open Windsurf DevTools:**
   - `View` → `Toggle Developer Tools`
   - OR `Cmd+Option+I`

2. **Go to Console tab**

3. **Paste this code:**
```javascript
// Intercept fetch requests to capture model list
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  const url = args[0];
  
  if (typeof url === 'string' && url.includes('model')) {
    const clone = response.clone();
    try {
      const json = await clone.json();
      console.log('🎯 MODELS FOUND:');
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {}
  }
  
  return response;
};

console.log('✅ Interceptor active. Now click the model dropdown!');
```

4. **Click model dropdown in Cascade**

5. **Copy the logged JSON** and save to `~/clawd/windsurf-models-actual.json`

### Option 3: Network Tab (Most Detailed)

1. DevTools → **Network** tab
2. Enable "Preserve log"
3. Click model dropdown
4. Find request (look for `/models`, `/api/models`, etc.)
5. Click request → **Response** tab
6. Right-click → **Copy Response**
7. Save to `~/clawd/windsurf-models-actual.json`

---

## 🛠️ Tools We Built

### 1. `windsurf_get_models.py`
Python script that:
- Checks local cache
- Scans workspace storage
- Provides extraction instructions

**Run it:**
```bash
python3 ~/clawd/windsurf_get_models.py
```

### 2. `get-windsurf-models.sh`
Interactive bash script that:
- Guides you through extraction
- Parses the JSON
- Displays model list

**Run it:**
```bash
cd ~/clawd
./get-windsurf-models.sh
```

### 3. `windsurf-models-devtools.md`
Detailed guide for manual extraction using DevTools.

---

## 📦 Expected JSON Format

Once extracted, your `windsurf-models-actual.json` should look like:

```json
{
  "models": [
    {
      "id": "swe-1.5-free",
      "name": "SWE-1.5 Free",
      "provider": "cognition",
      "credits": 0,
      "status": "active",
      "capabilities": ["code", "agent"],
      "context_window": 128000
    },
    {
      "id": "claude-3.5-sonnet",
      "name": "Claude 3.5 Sonnet",
      "provider": "anthropic",
      "credits": "token-based",
      "status": "active"
    },
    // ... more models
  ]
}
```

Or simpler format:
```json
[
  "swe-1.5-free",
  "claude-3.5-sonnet",
  "gpt-4o",
  "deepseek-v3",
  // ... etc
]
```

---

## 🔄 Keeping Models Updated

Since Windsurf models change frequently, run this process:

### Weekly/Monthly Check:
```bash
cd ~/clawd
./get-windsurf-models.sh
```

### After Windsurf Updates:
```bash
# Check Windsurf version
windsurf --version

# Re-extract models
./get-windsurf-models.sh
```

### When Promotions Change:
Watch for announcements at:
- https://windsurf.com/changelog
- https://docs.windsurf.com/windsurf/models

---

## 🎯 What Happens Next

Once you have `windsurf-models-actual.json`:

1. **Augustus will parse it** and update `WINDSURF_MODELS.md`
2. **Decision matrix updated** with real costs
3. **TOOLS.md updated** with current model priorities
4. **Automated model selection** based on actual availability

---

## 💡 Pro Tips

### Find Your Subscription Tier:
```bash
# In Windsurf, check:
# Settings (Cmd+,) → Search "cascade usage"
# Or visit: https://windsurf.com/subscription/manage-plan
```

### Check Current Credits:
- Windsurf → Cascade panel → Bottom status bar
- Shows: "X credits remaining"

### Monitor API Calls:
```bash
# Terminal window 1: Run Windsurf
# Terminal window 2: Monitor traffic
sudo tcpdump -i any -A 'host server.self-serve.windsurf.com' | grep -i model
```

---

## 🚨 Troubleshooting

### DevTools won't open?
```bash
# Reset Windsurf
rm -rf ~/Library/Application\ Support/Windsurf/User/workspaceStorage
# Then restart Windsurf
```

### No API requests visible?
- Clear Network tab
- Reload Windsurf window (Cmd+R)
- Try clicking model dropdown again

### JSON parse error?
- Check for trailing commas
- Validate at: https://jsonlint.com
- Or use: `cat windsurf-models-actual.json | jq .`

---

## 📊 Current Knowledge (As of Feb 2, 2026)

**What we know from docs:**
- SWE-1.5 Free (0 credits) - NEW default
- DeepSeek V3 (0.5 credits)
- Gemini 2.0 Flash (0.5 credits)
- Claude 3.5/3.7/4 series (token-based)
- GPT-4o/GPT-5 series (varies)
- Grok, Codex, etc.

**What we need YOU to confirm:**
- Exact models in YOUR dropdown
- Real credit costs
- Current promo status
- Available vs. grayed-out models

---

## ✅ Checklist

- [ ] Run `./get-windsurf-models.sh`
- [ ] Open Windsurf DevTools
- [ ] Capture model API response
- [ ] Save to `windsurf-models-actual.json`
- [ ] Verify JSON is valid
- [ ] Update benchmark docs
- [ ] Test Augustus model selection

---

## 🏗️ Future Improvements

Possible enhancements:
1. **Automated API scraper** (if auth token can be extracted safely)
2. **Browser automation** (Playwright/Puppeteer to click dropdown)
3. **MCP server** for Windsurf that exposes models
4. **GitHub Action** to check for model updates weekly

---

**Ready to extract? Run:**
```bash
cd ~/clawd && ./get-windsurf-models.sh
```

🏛️ Augustus
