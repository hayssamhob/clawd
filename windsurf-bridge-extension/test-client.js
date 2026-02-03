#!/usr/bin/env node

/**
 * Test client for Windsurf Bridge MCP server
 */

const net = require('net');
const { spawn } = require('child_process');

class TestClient {
  constructor(port = 3100) {
    this.port = port;
    this.client = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.client = net.createConnection({ port: this.port }, () => {
        console.log('✅ Connected to MCP server');
        resolve();
      });

      this.client.on('error', (err) => {
        console.error('❌ Connection error:', err.message);
        reject(err);
      });
    });
  }

  async sendRequest(method, params = {}) {
    const request = {
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params
    };

    const requestStr = JSON.stringify(request) + '\n';
    
    return new Promise((resolve, reject) => {
      let response = '';
      
      this.client.write(requestStr);
      
      const onData = (data) => {
        response += data.toString();
        
        try {
          const lines = response.trim().split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const parsed = JSON.parse(line);
              if (parsed.id === request.id) {
                this.client.removeListener('data', onData);
                resolve(parsed);
                return;
              }
            }
          }
        } catch (e) {
          // Not a complete JSON yet, continue waiting
        }
      };

      this.client.on('data', onData);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        this.client.removeListener('data', onData);
        reject(new Error('Request timeout'));
      }, 5000);
    });
  }

  async testListModels() {
    console.log('\n🔍 Testing list_models tool...');
    
    try {
      // Test 1: Get all models
      console.log('\n📋 Getting all models...');
      const allModels = await this.sendRequest('tools/call', {
        name: 'list_models'
      });
      
      const result = JSON.parse(allModels.result.content[0].text);
      console.log(`✅ Found ${result.count} models`);
      console.log(`🎁 Promo models: ${result.promoCount}`);
      
      if (result.promoModels) {
        console.log('\n🎁 Promotional models:');
        result.promoModels.forEach(model => {
          console.log(`   - ${model.name}: ${model.credits}x (was ${model.originalCost})`);
        });
      }
      
      // Test 2: Get only promo models
      console.log('\n🎁 Getting promo models only...');
      const promoModels = await this.sendRequest('tools/call', {
        name: 'list_models',
        arguments: { promo_only: true }
      });
      
      const promoResult = JSON.parse(promoModels.result.content[0].text);
      console.log(`✅ Found ${promoResult.count} promotional models`);
      
      // Test 3: Get models by tier
      console.log('\n💰 Getting free models...');
      const freeModels = await this.sendRequest('tools/call', {
        name: 'list_models',
        arguments: { tier: 'free' }
      });
      
      const freeResult = JSON.parse(freeModels.result.content[0].text);
      console.log(`✅ Found ${freeResult.count} free models`);
      
      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      this.client.end();
      console.log('\n🔌 Disconnected');
    }
  }
}

async function runTest() {
  const client = new TestClient();
  
  try {
    await client.connect();
    const success = await client.testListModels();
    
    if (success) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n❌ Some tests failed');
    }
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await client.disconnect();
    process.exit(0);
  }
}

runTest();
