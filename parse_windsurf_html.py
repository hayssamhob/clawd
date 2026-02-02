#!/usr/bin/env python3
"""Parse Windsurf model dropdown HTML"""

import re
import json

html = """<PASTE_HTML_HERE>"""

# Extract all model names and costs
pattern = r'<span class="truncate">([^<]+)</span>.*?<div class="whitespace-nowrap rounded text-xs opacity-50"[^>]*>([^<]+)</div>'

models = []

# Find all buttons with model info
buttons = re.findall(r'<button class="group flex w-full.*?</button>', html, re.DOTALL)

for button in buttons:
    # Extract model name
    name_match = re.search(r'<span class="truncate">([^<]+)</span>', button)
    if not name_match:
        continue
    
    name = name_match.group(1).strip()
    
    # Extract cost
    cost_match = re.search(r'<div class="whitespace-nowrap rounded text-xs opacity-50"[^>]*>([^<]+)</div>', button)
    if not cost_match:
        continue
    
    cost = cost_match.group(1).strip()
    
    # Check for badges (New, Beta, etc.)
    badges = []
    if 'New</span>' in button:
        badges.append('New')
    if 'Beta</span>' in button:
        badges.append('Beta')
    if 'gift' in button:
        badges.append('Promo')
    if 'Fast</span>' in button:
        badges.append('Fast')
    
    # Check for BYOK
    is_byok = 'BYOK' in name or cost == 'BYOK'
    
    models.append({
        'name': name,
        'cost': cost,
        'badges': badges,
        'byok': is_byok
    })

# Print results
print(f"Found {len(models)} models:\n")
print(json.dumps(models, indent=2))

# Save to file
with open('windsurf-models-actual.json', 'w') as f:
    json.dump({'models': models, 'extracted_at': '2026-02-02'}, f, indent=2)

print(f"\n✅ Saved to windsurf-models-actual.json")
