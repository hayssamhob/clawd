#!/usr/bin/env python3
"""
Extract auth tokens from Windsurf Local Storage and fetch models
"""

import os
import json
import subprocess
from pathlib import Path

def extract_leveldb_data():
    """Extract data from LevelDB Local Storage"""
    storage_path = Path.home() / "Library/Application Support/Windsurf/Local Storage/leveldb"
    
    if not storage_path.exists():
        print("❌ Local Storage not found")
        return {}
    
    print("🔍 Scanning Local Storage...")
    
    # Read all .ldb and .log files
    data = {}
    for file in storage_path.glob("*.*db"):
        try:
            with open(file, 'rb') as f:
                content = f.read()
                # Look for JSON-like patterns
                text = content.decode('utf-8', errors='ignore')
                
                # Extract anything that looks like a token or session
                import re
                
                # Look for auth tokens
                tokens = re.findall(r'"(?:token|auth|session|api[_-]?key)":\s*"([^"]+)"', text)
                for token in tokens:
                    data['token'] = token
                
                # Look for user session
                sessions = re.findall(r'"session":\s*"([^"]+)"', text)
                for session in sessions:
                    data['session'] = session
                    
        except Exception as e:
            continue
    
    return data

def check_windsurf_config():
    """Check Windsurf configuration files for auth"""
    config_paths = [
        Path.home() / "Library/Application Support/Windsurf/User/globalStorage/storage.json",
        Path.home() / ".codeium/windsurf/config.json",
        Path.home() / ".windsurf/config.json",
    ]
    
    for path in config_paths:
        if path.exists():
            print(f"📄 Checking {path.name}...")
            try:
                with open(path) as f:
                    data = json.load(f)
                    # Look for auth-related fields
                    return data
            except:
                pass
    
    return {}

def try_api_endpoints():
    """Try common Windsurf API endpoints"""
    import requests
    
    # Known Windsurf API endpoints
    endpoints = [
        "https://server.self-serve.windsurf.com/api/models",
        "https://server.self-serve.windsurf.com/v1/models",
        "https://api.windsurf.com/models",
        "https://inference.codeium.com/models",
    ]
    
    headers = {
        'User-Agent': 'Windsurf/1.106.0',
        'Accept': 'application/json',
    }
    
    print("\n🌐 Trying API endpoints (without auth)...")
    
    for endpoint in endpoints:
        try:
            print(f"   Trying: {endpoint}")
            response = requests.get(endpoint, headers=headers, timeout=5)
            
            if response.status_code == 200:
                print(f"   ✅ Success!")
                return response.json()
            elif response.status_code == 401:
                print(f"   🔒 Requires authentication")
            else:
                print(f"   ❌ {response.status_code}")
        except Exception as e:
            print(f"   ❌ Failed: {e}")
    
    return None

def main():
    print("🌊 Windsurf Auth & Model Extractor")
    print("=" * 60)
    print()
    
    # Try to extract auth from Local Storage
    storage_data = extract_leveldb_data()
    if storage_data:
        print(f"\n✅ Found {len(storage_data)} items in Local Storage")
        for key, value in storage_data.items():
            print(f"   {key}: {value[:50]}..." if len(value) > 50 else f"   {key}: {value}")
    else:
        print("⚠️  No auth data found in Local Storage")
    
    print()
    
    # Check config files
    config_data = check_windsurf_config()
    if config_data:
        print("\n✅ Found configuration data")
    
    # Try API endpoints
    models = try_api_endpoints()
    
    if models:
        print("\n🎯 MODELS FOUND:")
        print("=" * 60)
        print(json.dumps(models, indent=2))
        
        # Save to file
        output_file = Path.home() / "clawd/windsurf-models-actual.json"
        with open(output_file, 'w') as f:
            json.dump(models, f, indent=2)
        
        print(f"\n💾 Saved to: {output_file}")
    else:
        print("\n❌ Could not fetch models automatically")
        print("\n💡 Next step: Manual extraction required")
        print("   Run: cd ~/clawd && ./get-windsurf-models.sh")

if __name__ == '__main__':
    # Check if requests is available
    try:
        import requests
    except ImportError:
        print("Installing requests...")
        subprocess.run(["pip3", "install", "requests"], check=True)
        import requests
    
    main()
