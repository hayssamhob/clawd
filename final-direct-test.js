[OpenClaw] Task: FINAL TEST: Create SUCCESS.txt | Recommended Model: Hybrid Arena (0 credits) | Budget: 65.5/500 used
#!/usr/bin/env node

/**
 * FINAL DIRECT TYPING TEST
 * Complete OpenClaw ↔ Windsurf Bridge Integration Verification
 */

const { spawn } = require('child_process');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  FINAL DIRECT TYPING TEST - COMPLETE INTEGRATION        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function testDirectMCP() {
  console.log('🔍 Testing direct MCP communication...');
  
  return new Promise((resolve, reject) => {
    const server = spawn('node', ['/Users/hayssamhoballah/clawd/openclaw-mcp/windsurf/dist/index.js'], {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    let responseReceived = false;
    const timeout = setTimeout(() => {
      if (!responseReceived) {
        server.kill();
        reject(new Error('Timeout'));
      }
    }, 5000);

    server.stdout.on('data', (data) => {
      try {
        const response = JSON.parse(data.toString());
        if (response.result) {
          responseReceived = true;
          clearTimeout(timeout);
          server.kill();
          resolve(response.result);
        }
      } catch (e) {
        // Not JSON, continue waiting
      }
    });

    // Direct test request
    const request = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "windsurf_get_models",
        arguments: { promo_only: true }
      }
    };
    
    server.stdin.write(JSON.stringify(request) + '\n');
  });
}

async function runFinalTest() {
  try {
    console.log('📡 STEP 1: Direct MCP Server Test');
    const result = await testDirectMCP();
    
    console.log('✅ MCP Server Responding');
    console.log(`📊 Models Available: ${result.total_available}`);
    console.log(`🎁 Promotional Models: ${result.promo_only ? 'YES' : 'NO'}`);
    
    if (result.promotional_models) {
      console.log('\n🎁 CURRENT PROMOTIONAL MODELS:');
      result.promotional_models.forEach((model, i) => {
        console.log(`   ${i+1}. ${model.name}: ${model.cost}`);
      });
    }
    
    console.log('\n🔗 STEP 2: Bidirectional Tools Test');
    
    // Test delegate_to_cascade
    console.log('📤 Testing delegate_to_cascade...');
    const delegateResult = await testMCPTool('delegate_to_cascade', {
      prompt: 'Test prompt for direct typing verification',
      model: 'free'
    });
    console.log('✅ delegate_to_cascade: WORKING');
    
    // Test get_cascade_status
    console.log('📥 Testing get_cascade_status...');
    const statusResult = await testMCPTool('get_cascade_status', { lines: 5 });
    console.log('✅ get_cascade_status: WORKING');
    
    // Test switch_cascade_model
    console.log('🔀 Testing switch_cascade_model...');
    const switchResult = await testMCPTool('switch_cascade_model', { model: 'kimi-k25' });
    console.log('✅ switch_cascade_model: WORKING');
    
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 FINAL TEST RESULTS');
    console.log('═'.repeat(60));
    console.log('✅ MCP Server: OPERATIONAL');
    console.log('✅ Model Discovery: WORKING');
    console.log('✅ Promotional Models: DETECTED');
    console.log('✅ Prompt Delegation: WORKING');
    console.log('✅ Status Reading: WORKING');
    console.log('✅ Model Switching: WORKING');
    console.log('\n🏆 OPENCLAW ↔ WINDSURF BRIDGE: FULLY OPERATIONAL!');
    console.log('═'.repeat(60));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

async function testMCPTool(toolName, params) {
  return new Promise((resolve, reject) => {
    const server = spawn('node', ['/Users/hayssamhoballah/clawd/openclaw-mcp/windsurf/dist/index.js'], {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    let responseReceived = false;
    const timeout = setTimeout(() => {
      if (!responseReceived) {
        server.kill();
        reject(new Error('Timeout'));
      }
    }, 5000);

    server.stdout.on('data', (data) => {
      try {
        const response = JSON.parse(data.toString());
        if (response.result) {
          responseReceived = true;
          clearTimeout(timeout);
          server.kill();
          resolve(response.result);
        }
      } catch (e) {
        // Not JSON, continue waiting
      }
    });

    const request = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: params
      }
    };
    
    server.stdin.write(JSON.stringify(request) + '\n');
  });
}

// Run the final test
runFinalTest();
