# Windsurf Model Extraction via DevTools

## Quick Method (Recommended)

1. **Open Windsurf**
2. **Open Developer Tools:**
   - `View` → `Toggle Developer Tools`  
   - OR Press `Cmd+Option+I`
3. **Go to Network Tab**
4. **Click on model dropdown** in Cascade panel
5. **Look for API request** named something like:
   - `/api/models`
   - `/models/list`
   - `/cascade/models`
6. **Click the request → Response tab**
7. **Copy the JSON response**

## Alternative: Console Method

1. Open Developer Tools (`Cmd+Option+I`)
2. Go to **Console** tab
3. Run this JavaScript:

```javascript
// Method 1: Check localStorage
console.log('LocalStorage:', localStorage);

// Method 2: Check Windsurf API client
console.log('Available models:', window);

// Method 3: Intercept model fetch
const originalFetch = window.fetch;
window.fetch = function(...args) {
    console.log('Fetch:', args[0]);
    return originalFetch.apply(this, args);
};
```

4. Then click the model dropdown - you'll see the API call logged

## Extraction Script

Once you have the API endpoint, run:

```bash
# Example (replace with actual endpoint & token)
curl 'https://server.self-serve.windsurf.com/api/models' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json'
```

## Storage Inspection

Check IndexedDB:
1. Developer Tools → Application tab
2. Storage → IndexedDB
3. Look for database named like `windsurf` or `cascade`
4. Expand and look for `models` object store

## What We're Looking For

```json
{
  "models": [
    {
      "id": "swe-1.5-free",
      "name": "SWE-1.5 Free",
      "provider": "cognition",
      "credits": 0,
      "status": "active"
    },
    // ... more models
  ]
}
```
