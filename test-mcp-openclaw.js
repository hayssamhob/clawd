#!/usr/bin/env node

/**
 * Test Windsurf MCP Server through OpenClaw
 * This simulates how OpenClaw will interact with the MCP server
 */

const { spawn } = require('child_process');
const path = require('path');

const MCP_SERVER = path.join(__dirname, '../openclaw-mcp/windsurf/dist/index.js');

console.log('🧪 Testing Windsurf MCP Server\n');
console.log(`Server: ${MCP_SERVER}\n`);

// Start the MCP server
const server = spawn('node', [MCP_SERVER], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let responseBuffer = '';
let requestId = 1;

function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: "2.0",
    id: requestId++,
    method,
    params
  };
  
  server.stdin.write(JSON.stringify(request) + '\n');
}

server.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop() || '';
  
  lines.forEach(line => {
    if (!line.trim()) return;
    
    try {
      const response = JSON.parse(line);
      
      if (response.result) {
        console.log('✅ Response received:');
        
        if (response.result.tools) {
          console.log(`   Found ${response.result.tools.length} tools:`);
          response.result.tools.forEach(tool => {
            console.log(`   - ${tool.name}: ${tool.description.substring(0, 80)}...`);
          });
        } else if (response.result.content) {
          const content = response.result.content[0].text;
          try {
            const data = JSON.parse(content);
            if (data.count !== undefined) {
              console.log(`   Models: ${data.count} total, ${data.promo_count} promotional`);
              if (data.promotional_models) {
                console.log(`\n   🎁 Promotional Models:`);
                data.promotional_models.forEach(m => {
                  console.log(`      - ${m.name}: ${m.cost}`);
                });
              }
            } else {
              console.log(`   ${content.substring(0, 200)}...`);
            }
          } catch (e) {
            console.log(`   ${content.substring(0, 200)}...`);
          }
        }
        console.log('');
      }
    } catch (e) {
      // Not JSON, ignore
    }
  });
});

// Run tests
setTimeout(() => {
  console.log('1️⃣ Listing available tools...\n');
  sendRequest('tools/list');
}, 1000);

setTimeout(() => {
  console.log('2️⃣ Getting all models...\n');
  sendRequest('tools/call', {
    name: 'windsurf_get_models'
  });
}, 2000);

setTimeout(() => {
  console.log('3️⃣ Getting promotional models only...\n');
  sendRequest('tools/call', {
    name: 'windsurf_get_models',
    arguments: { promo_only: true }
  });
}, 3000);

setTimeout(() => {
  console.log('4️⃣ Getting free tier models...\n');
  sendRequest('tools/call', {
    name: 'windsurf_get_models',
    arguments: { tier: 'free' }
  });
}, 4000);

setTimeout(() => {
  console.log('\n✅ All tests completed!\n');
  server.kill();
  process.exit(0);
}, 5000);
