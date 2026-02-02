#!/usr/bin/env python3
"""
Windsurf Model Extractor
Extracts available models from Windsurf's local storage and API
"""

import os
import json
import sqlite3
from pathlib import Path
import sys

def find_windsurf_data():
    """Find Windsurf data directories"""
    home = Path.home()
    
    paths = {
        'app_support': home / 'Library/Application Support/Windsurf',
        'codeium': home / '.codeium/windsurf',
        'windsurf_ext': home / '.windsurf/extensions'
    }
    
    return {k: v for k, v in paths.items() if v.exists()}

def check_workspace_storage():
    """Check workspace storage for model selections"""
    home = Path.home()
    workspace_dir = home / 'Library/Application Support/Windsurf/User/workspaceStorage'
    
    models_found = set()
    
    if not workspace_dir.exists():
        return models_found
    
    print("🔍 Checking workspace storage...")
    
    # Check all workspace databases
    for db_path in workspace_dir.rglob('state.vscdb'):
        try:
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            
            # Look for keys related to models or cascade
            cursor.execute("""
                SELECT key, value FROM ItemTable 
                WHERE key LIKE '%model%' OR key LIKE '%cascade%'
            """)
            
            for key, value in cursor.fetchall():
                try:
                    # Try to parse JSON values
                    data = json.loads(value)
                    if isinstance(data, dict):
                        # Look for model references
                        extract_models_from_dict(data, models_found)
                except:
                    pass
            
            conn.close()
        except Exception as e:
            continue
    
    return models_found

def extract_models_from_dict(data, models_set, prefix=''):
    """Recursively extract model IDs from dict"""
    if isinstance(data, dict):
        for key, value in data.items():
            if key in ['model', 'modelId', 'model_id', 'selectedModel']:
                if isinstance(value, str):
                    models_set.add(value)
            elif isinstance(value, (dict, list)):
                extract_models_from_dict(value, models_set, f"{prefix}.{key}")
    elif isinstance(data, list):
        for item in data:
            if isinstance(item, (dict, list)):
                extract_models_from_dict(item, models_set, prefix)

def check_settings():
    """Check Windsurf settings for model preferences"""
    settings_path = Path.home() / 'Library/Application Support/Windsurf/User/settings.json'
    
    if not settings_path.exists():
        return {}
    
    print("⚙️  Checking settings.json...")
    
    try:
        with open(settings_path) as f:
            settings = json.load(f)
        
        # Look for model-related settings
        model_settings = {}
        for key, value in settings.items():
            if 'model' in key.lower() or 'cascade' in key.lower():
                model_settings[key] = value
        
        return model_settings
    except json.JSONDecodeError as e:
        print(f"   ⚠️  Settings has malformed JSON (trailing comma?): {e}")
        return {}
    except Exception as e:
        print(f"   ⚠️  Could not read settings: {e}")
        return {}

def check_extension_storage():
    """Check extension storage for model data"""
    ext_dir = Path.home() / '.windsurf/extensions'
    
    models_info = {}
    
    if not ext_dir.exists():
        return models_info
    
    print("🔧 Checking extensions...")
    
    # Look for cascade/windsurf extensions
    for ext_path in ext_dir.iterdir():
        if 'windsurf' in ext_path.name.lower() or 'cascade' in ext_path.name.lower():
            print(f"   Found: {ext_path.name}")
            
            # Check for package.json or config files
            for json_file in ext_path.rglob('*.json'):
                if json_file.stat().st_size < 1024 * 1024:  # Skip large files
                    try:
                        with open(json_file) as f:
                            data = json.load(f)
                            if 'models' in data or 'model' in data:
                                models_info[str(json_file)] = data
                    except:
                        pass
    
    return models_info

def generate_instructions():
    """Generate instructions for manual extraction"""
    print("\n" + "="*60)
    print("📚 MANUAL EXTRACTION METHODS")
    print("="*60)
    print("""
1. **DevTools Method (Most Reliable):**
   - Open Windsurf
   - View → Toggle Developer Tools (Cmd+Option+I)
   - Go to Network tab
   - Click model dropdown in Cascade
   - Look for API request (e.g., /api/models)
   - Copy JSON response
   
2. **Console Method:**
   - Open DevTools Console
   - Run: `localStorage` to see stored data
   - Run: `indexedDB.databases()` to see databases
   
3. **Storage Inspection:**
   - DevTools → Application tab
   - Check: IndexedDB, LocalStorage, SessionStorage
   - Look for model-related keys

4. **Network Capture:**
   ```bash
   # Monitor network traffic
   sudo tcpdump -i any -A 'host server.self-serve.windsurf.com'
   # Then open model dropdown
   ```

5. **Direct API Query:**
   - Find auth token in: Developer Tools → Application → LocalStorage
   - Query: https://server.self-serve.windsurf.com/api/models
   - Include auth header
    """)

def main():
    print("🌊 Windsurf Model Extractor")
    print("="*60)
    print()
    
    # Check if Windsurf is installed
    paths = find_windsurf_data()
    if not paths:
        print("❌ Windsurf installation not found")
        sys.exit(1)
    
    print("✅ Windsurf installation found")
    for name, path in paths.items():
        print(f"   {name}: {path}")
    print()
    
    # Check workspace storage
    workspace_models = check_workspace_storage()
    if workspace_models:
        print(f"\n📦 Found {len(workspace_models)} model references:")
        for model in sorted(workspace_models):
            print(f"   - {model}")
    print()
    
    # Check settings
    settings = check_settings()
    if settings:
        print("\n⚙️  Model-related settings:")
        print(json.dumps(settings, indent=2))
    print()
    
    # Check extensions
    ext_info = check_extension_storage()
    if ext_info:
        print(f"\n🔧 Found model data in {len(ext_info)} extension files")
    print()
    
    # Generate manual instructions
    generate_instructions()
    
    print("\n" + "="*60)
    print("💡 NEXT STEPS:")
    print("="*60)
    print("""
    1. Follow DevTools method above to capture actual API response
    2. Save response to: ~/clawd/windsurf-models-actual.json
    3. Run this script again to parse it
    
    Or create windsurf-models-actual.json manually with model dropdown screenshot
    """)

if __name__ == '__main__':
    main()
