#!/usr/bin/env node

const http = require('http');

console.log('🧪 Testing Windsurf Bridge Extension');
console.log('====================================\n');

// Test 1: Check if extension MCP server is running on port 3101
function testMcpServer() {
  return new Promise((resolve) => {
    console.log('Testing MCP Server on port 3101...');
    
    const req = http.request({
      hostname: 'localhost',
      port: 3101,
      path: '/',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      console.log('✅ MCP Server is responding on port 3101');
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log('❌ MCP Server not responding:', err.message);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log('⏱️  MCP Server connection timeout');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Test 2: Check if port 3100 is still used by Windsurf
const { exec } = require('child_process');

function checkPort3100() {
  return new Promise((resolve) => {
    exec('lsof -i :3100', (error, stdout) => {
      if (stdout.includes('Windsurf')) {
        console.log('✅ Port 3100 is used by Windsurf (expected)');
        resolve(true);
      } else {
        console.log('❓ Port 3100 status unclear');
        resolve(false);
      }
    });
  });
}

async function runTests() {
  console.log('Step 1: Checking original Windsurf port');
  await checkPort3100();
  
  console.log('\nStep 2: Checking Extension MCP server');
  const mcpWorking = await testMcpServer();
  
  console.log('\n====================================');
  console.log('📊 Test Results:');
  console.log('   Extension installed: ✅ (confirmed earlier)');
  console.log(`   MCP Server (port 3101): ${mcpWorking ? '✅' : '❌'}`);
  console.log('\n💡 Next steps:');
  if (!mcpWorking) {
    console.log('   1. Make sure Windsurf is running');
    console.log('   2. Open any folder/workspace in Windsurf');
    console.log('   3. Wait a few seconds for extension to activate');
    console.log('   4. Check status bar (bottom right) for cost badge');
    console.log('   5. Run this test again');
  } else {
    console.log('   ✨ Extension is working! Check Windsurf status bar for badge.');
  }
}

runTests();
