#!/usr/bin/env node
/**
 * Test script to verify Windsurf badge functionality
 */

const http = require('http');

// Test 1: Check if MCP server is running
async function testMcpServer() {
  console.log('🧪 Testing MCP Server connection...');
  
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3100/health', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('✅ MCP Server is running');
        console.log('   Response:', data);
        resolve(true);
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ MCP Server not responding:', err.message);
      console.log('   Tip: Make sure VS Code is running with the extension activated');
      resolve(false);
    });
    
    req.setTimeout(3000, () => {
      req.destroy();
      console.log('⏱️  MCP Server connection timeout');
      resolve(false);
    });
  });
}

// Test 2: Try to get promotional models
async function testGetPromoModels() {
  console.log('\n🧪 Testing promotional models retrieval...');
  
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'windsurf_get_models',
        arguments: {
          promo_only: true
        }
      },
      id: 1
    });
    
    const options = {
      hostname: 'localhost',
      port: 3100,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ Promotional models retrieved');
          
          if (result.result && result.result.content) {
            const models = JSON.parse(result.result.content[0].text);
            console.log(`   Found ${models.length} promotional models:`);
            models.forEach(m => {
              console.log(`   🎁 ${m.name} - ${m.credits}`);
            });
          }
          resolve(true);
        } catch (err) {
          console.log('❌ Error parsing response:', err.message);
          console.log('   Raw response:', data);
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ Request failed:', err.message);
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}

// Test 3: Check VS Code extension status
async function testExtensionStatus() {
  console.log('\n🧪 Checking VS Code extension status...');
  
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    exec('code --list-extensions | grep windsurf', (error, stdout, stderr) => {
      if (stdout.includes('windsurf-bridge') || stdout.includes('windsurf')) {
        console.log('✅ Extension is installed');
        console.log('   ID:', stdout.trim());
        resolve(true);
      } else {
        console.log('❌ Extension not found in VS Code');
        resolve(false);
      }
    });
  });
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Windsurf Badge Functionality Tests\n');
  console.log('='.repeat(50));
  
  const results = {
    extension: await testExtensionStatus(),
    mcpServer: await testMcpServer(),
    promoModels: false
  };
  
  // Only test promo models if MCP server is running
  if (results.mcpServer) {
    results.promoModels = await testGetPromoModels();
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Results Summary:');
  console.log(`   Extension installed: ${results.extension ? '✅' : '❌'}`);
  console.log(`   MCP Server running: ${results.mcpServer ? '✅' : '❌'}`);
  console.log(`   Promo models working: ${results.promoModels ? '✅' : '❌'}`);
  
  const allPassed = Object.values(results).every(r => r === true);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Badge functionality is working.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the details above.');
    
    if (!results.mcpServer) {
      console.log('\n💡 To fix:');
      console.log('   1. Open VS Code');
      console.log('   2. Press Cmd+Shift+P');
      console.log('   3. Run: "Windsurf Bridge: Start MCP Server"');
      console.log('   4. Re-run this test');
    }
  }
  
  console.log('\n📝 Manual tests to perform in VS Code:');
  console.log('   1. Check status bar (bottom right) for cost badge (💰)');
  console.log('   2. Click the badge to see cost-efficient models');
  console.log('   3. Press Cmd+Shift+P and try:');
  console.log('      - "Windsurf Bridge: Show Promotional Models"');
  console.log('      - "Windsurf Bridge: Show Cost Breakdown"');
  console.log('      - "Windsurf Bridge: Toggle Cost Display"');
}

runTests().catch(console.error);
