#!/usr/bin/env python3
"""
OpenClaw Broker Integration Test
"""
import argparse
import json
import time

import requests

# Configuration
MCP_SERVER_URL = "http://localhost:9100"
TEST_PROMPT = """
Analyze this arbitrage opportunity:
- Exchange A: ETH price $3000
- Exchange B: ETH price $2950
- Transfer fee: $20
Calculate profit potential and recommend action.
"""

def call_mcp_tool(tool_name, params=None):
    """Call an MCP tool and return parsed JSON response"""
    try:
        response = requests.post(
            f"{MCP_SERVER_URL}/call_tool",
            json={"name": tool_name, "arguments": params or {}}
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"❌ Error calling {tool_name}: {str(e)}")
        return None

def test_phase_3a():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=9100, help='MCP server port')
    args = parser.parse_args()
    
    base_url = f"http://localhost:{args.port}"
    
    print("🚀 Starting OpenClaw Broker Integration Tests")
    print("="*60)
    
    # 1. Check broker health
    print("TEST 1: Broker Health Check")
    health = requests.post(
        f"{base_url}/call_tool",
        json={"name": "windsurf_broker_health", "arguments": {}}
    )
    health.raise_for_status()
    health = health.json()
    if health and health.get("healthy"):
        print(f"✅ Broker healthy | Mode: {health.get('mode')} | Bridge: {'connected' if health.get('bridge_connected') else 'disconnected'}")
    else:
        print("❌ Broker health check failed")
        return
    
    # 2. List available instances
    print("\nTEST 2: List Available Instances")
    instances = requests.post(
        f"{base_url}/call_tool",
        json={"name": "list_windsurf_instances", "arguments": {}}
    )
    instances.raise_for_status()
    instances = instances.json()
    if instances:
        print(f"✅ Found {instances.get('online', 0)} online instances")
        for instance in instances.get("instances", [])[:3]:  # Show first 3
            print(f" - {instance.get('id')}: {instance.get('model')} ({instance.get('status')})")
    
    # 3. Submit test task
    print("\nTEST 3: Submit Arbitrage Task")
    task = requests.post(
        f"{base_url}/call_tool",
        json={"name": "submit_windsurf_task", "arguments": {
            "prompt": TEST_PROMPT,
            "complexity": "medium",
            "priority": "high"
        }}
    )
    task.raise_for_status()
    task = task.json()
    if not task or not task.get("taskId"):
        print("❌ Failed to submit task")
        return
        
    task_id = task["taskId"]
    print(f"✅ Task submitted (ID: {task_id})")
    
    # 4. Wait for completion
    print(f"\nTEST 4: Waiting for task completion (ID: {task_id})")
    for _ in range(30):  # 30 checks with 2s interval = 1 minute timeout
        status = requests.post(
            f"{base_url}/call_tool",
            json={"name": "check_windsurf_task", "arguments": {"task_id": task_id}}
        )
        status.raise_for_status()
        status = status.json()
        if status.get("status") in ["completed", "failed"]:
            break
        time.sleep(2)
    
    if status:
        print(f"\n📊 Task Result:")
        print(json.dumps(status, indent=2))
        
        if status.get("status") == "completed":
            print("✅ Task completed successfully")
        else:
            print(f"❌ Task failed: {status.get('error', 'Unknown error')}")
    
    print("\n" + "="*60)
    print("🔥 Phase 3a Testing Complete")

if __name__ == "__main__":
    test_phase_3a()
