#!/usr/bin/env python3
"""
OpenClaw Test: Use MCP Broker for Polymarket Arbitrage Task
Tests real execution via Windsurf Cascade
"""

import json
import subprocess
import time
from typing import Dict, Any

class OpenClawBrokerTest:
    """Test OpenClaw integration with Windsurf MCP broker"""
    
    def __init__(self):
        self.mcp_server_path = "/Users/hayssamhoballah/clawd/openclaw-mcp/windsurf/dist/index.js"
        self.process = None
    
    def start_mcp_server(self):
        """Start the MCP server subprocess"""
        print("🚀 Starting Windsurf MCP server...")
        self.process = subprocess.Popen(
            ["node", self.mcp_server_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        time.sleep(1)  # Let it initialize
        print("✅ MCP server started\n")
    
    def send_mcp_request(self, tool_name: str, arguments: Dict[str, Any]) -> Dict:
        """Send a request to the MCP server"""
        request = {
            "jsonrpc": "2.0",
            "id": int(time.time() * 1000),
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            }
        }
        
        request_json = json.dumps(request)
        print(f"📤 Sending: {tool_name}")
        print(f"   Args: {json.dumps(arguments, indent=6)}\n")
        
        self.process.stdin.write(request_json + "\n")
        self.process.stdin.flush()
        
        # Read response
        response_line = self.process.stdout.readline()
        if response_line:
            response = json.loads(response_line)
            return response
        return None
    
    def parse_response(self, response: Dict) -> Any:
        """Extract actual data from MCP response"""
        if not response:
            return None
        
        if "error" in response:
            return {"error": response["error"]}
        
        if "result" in response:
            result = response["result"]
            # Extract from nested content if present
            if isinstance(result, dict) and "content" in result:
                content = result["content"]
                if isinstance(content, list) and len(content) > 0:
                    text = content[0].get("text", "")
                    try:
                        return json.loads(text)
                    except:
                        return {"text": text}
            return result
        
        return response
    
    def test_broker_health(self):
        """Test 1: Check broker health"""
        print("=" * 70)
        print("TEST 1: Broker Health Check")
        print("=" * 70)
        
        response = self.send_mcp_request("windsurf_broker_health", {})
        data = self.parse_response(response)
        
        print("📥 Response:")
        print(json.dumps(data, indent=2))
        print()
        
        return data
    
    def test_list_instances(self):
        """Test 2: List execution instances"""
        print("=" * 70)
        print("TEST 2: List Available Instances")
        print("=" * 70)
        
        response = self.send_mcp_request("list_windsurf_instances", {})
        data = self.parse_response(response)
        
        print("📥 Response:")
        print(json.dumps(data, indent=2))
        print()
        
        return data
    
    def test_submit_arbitrage_task(self):
        """Test 3: Submit a real arbitrage task"""
        print("=" * 70)
        print("TEST 3: Submit Arbitrage Task")
        print("=" * 70)
        
        arbitrage_prompt = """
Build a Python script for Polymarket arbitrage detection:

1. Fetch all markets from Polymarket API
2. For each market, get YES/NO prices
3. Calculate: combined_cost = yes_price + no_price
4. Flag markets where combined_cost < $0.99 (arbitrage opportunity)
5. Calculate profit margin = (1.00 - combined_cost) / combined_cost * 100
6. Return top 10 opportunities sorted by profit margin
7. Include market ID, description, prices, and profit %

Use the Polymarket free API endpoint.
Return results as JSON.
"""
        
        response = self.send_mcp_request("submit_windsurf_task", {
            "prompt": arbitrage_prompt,
            "complexity": "complex",
            "preferred_model": "free",  # Use free tier
            "priority": "high"
        })
        
        data = self.parse_response(response)
        print("📥 Response:")
        print(json.dumps(data, indent=2))
        print()
        
        return data
    
    def test_wait_for_result(self, task_id: str):
        """Test 4: Wait for task result"""
        print("=" * 70)
        print(f"TEST 4: Wait for Task Result (ID: {task_id})")
        print("=" * 70)
        
        response = self.send_mcp_request("wait_windsurf_task", {
            "task_id": task_id,
            "timeout_seconds": 30
        })
        
        data = self.parse_response(response)
        print("📥 Response:")
        print(json.dumps(data, indent=2))
        print()
        
        return data
    
    def run_full_test(self):
        """Run complete test sequence"""
        try:
            self.start_mcp_server()
            
            # Test 1: Health
            health = self.test_broker_health()
            
            if not health or not health.get("bridge_connected"):
                print("⚠️  Bridge not connected - results will be simulated")
            else:
                print("✅ Bridge connected - real execution will be attempted")
            
            # Test 2: Instances
            instances = self.test_list_instances()
            
            # Test 3: Submit arbitrage task
            task_result = self.test_submit_arbitrage_task()
            task_id = task_result.get("taskId") if isinstance(task_result, dict) else None
            
            if not task_id:
                print("❌ Failed to get task ID")
                return
            
            print(f"✅ Task created: {task_id}")
            print(f"   Mode: {task_result.get('mode', 'unknown')}")
            print()
            
            # Test 4: Wait for result
            final_result = self.test_wait_for_result(task_id)
            
            print("=" * 70)
            print("📊 FINAL SUMMARY")
            print("=" * 70)
            print(f"Task ID: {task_id}")
            print(f"Status: {final_result.get('status', 'unknown')}")
            print(f"Mode: {final_result.get('mode', 'unknown')}")
            print(f"Execution Time: {final_result.get('executionTime', 'N/A')}ms")
            
            if final_result.get('status') == 'completed':
                print("\n✅ TASK COMPLETED SUCCESSFULLY")
                print("\nResult Preview:")
                result_text = final_result.get('result', 'No result')
                if isinstance(result_text, str):
                    print(result_text[:500] + ("..." if len(result_text) > 500 else ""))
            elif final_result.get('error'):
                print(f"\n⚠️  Task failed: {final_result.get('error')}")
            
            print()
        
        finally:
            if self.process:
                print("Stopping MCP server...")
                self.process.terminate()
                self.process.wait(timeout=5)


if __name__ == "__main__":
    tester = OpenClawBrokerTest()
    tester.run_full_test()
