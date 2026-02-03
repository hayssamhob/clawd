#!/usr/bin/env node

const net = require('net');

const client = new net.Socket();
const PORT = 3100;

console.log(`🔌 Connecting to Windsurf MCP Bridge on port ${PORT}...\n`);

client.connect(PORT, 'localhost', () => {
  console.log('✅ Connected!\n');
  
  // Send switch model request
  const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "switch_cascade_model",
      arguments: {
        model: "claude-sonnet-45"
      }
    }
  };
  
  console.log('📤 Sending model switch request...');
  console.log(JSON.stringify(request, null, 2));
  console.log('');
  
  client.write(JSON.stringify(request) + '\n');
});

let buffer = '';

client.on('data', (data) => {
  buffer += data.toString();
  
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  lines.forEach(line => {
    if (!line.trim()) return;
    
    try {
      const response = JSON.parse(line);
      console.log('📥 Response received:');
      console.log(JSON.stringify(response, null, 2));
      console.log('');
      
      // Close after response
      client.destroy();
      process.exit(0);
    } catch (e) {
      console.log('Raw:', line);
    }
  });
});

client.on('error', (err) => {
  console.error(`❌ Connection error: ${err.message}`);
  process.exit(1);
});

client.on('close', () => {
  console.log('🔌 Connection closed');
});

// Timeout
setTimeout(() => {
  console.log('⏱️  Timeout - no response');
  client.destroy();
  process.exit(1);
}, 5000);
