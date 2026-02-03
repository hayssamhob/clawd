#!/usr/bin/env node

/**
 * Detailed test for Windsurf Bridge MCP server
 */

const net = require('net');

class DetailedTestClient {
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

      this.client.on('error', reject);
    });
  }

  async sendRequest(method, params = {}) {
    const request = {
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params
    };

    return new Promise((resolve, reject) => {
      let response = '';
      
      this.client.write(JSON.stringify(request) + '\n');
      
      const onData = (data) => {
        response += data.toString();
        try {
          const parsed = JSON.parse(response.trim());
          if (parsed.id === request.id) {
            this.client.removeListener('data', onData);
            resolve(parsed);
          }
        } catch (e) {
          // Not complete yet
        }
      };

      this.client.on('data', onData);
      setTimeout(() => {
        this.client.removeListener('data', onData);
        reject(new Error('Timeout'));
      }, 5000);
    });
  }

  async testModels() {
    console.log('\n=== Testing Model Data Retrieval ===\n');
    
    try {
      // Test 1: List all models
      console.log('1️⃣ Getting ALL models...');
      const allResponse = await this.sendRequest('tools/call', {
        name: 'list_models'
      });
      
      const allData = JSON.parse(allResponse.result.content[0].text);
      console.log(`   ✅ Total models: ${allData.count}`);
      console.log(`   🎁 Promo models: ${allData.promoCount}`);
      console.log(`   📊 Tier: ${allData.tier}`);
      
      if (allData.promoModels && allData.promoModels.length > 0) {
        console.log('\n   🎁 PROMOTIONAL MODELS:');
        allData.promoModels.forEach(m => {
          console.log(`      - ${m.name}: ${m.credits}x (was ${m.originalCost})`);
          console.log(`        ${m.promoDescription}`);
        });
      }
      
      // Test 2: Only promo models
      console.log('\n2️⃣ Getting PROMO models only...');
      const promoResponse = await this.sendRequest('tools/call', {
        name: 'list_models',
        arguments: { promo_only: true }
      });
      
      const promoData = JSON.parse(promoResponse.result.content[0].text);
      console.log(`   ✅ Promo models found: ${promoData.count}`);
      
      if (promoData.models && promoData.models.length > 0) {
        console.log('\n   🎁 PROMO-ONLY RESULTS:');
        promoData.models.forEach(m => {
          console.log(`      - ${m.name}: ${m.credits}x`);
          if (m.isPromo) console.log(`        🎁 PROMO: ${m.promoDescription}`);
        });
      }
      
      // Test 3: Free models
      console.log('\n3️⃣ Getting FREE models...');
      const freeResponse = await this.sendRequest('tools/call', {
        name: 'list_models',
        arguments: { tier: 'free' }
      });
      
      const freeData = JSON.parse(freeResponse.result.content[0].text);
      console.log(`   ✅ Free models: ${freeData.count}`);
      
      if (freeData.models) {
        console.log('\n   💰 FREE MODELS:');
        freeData.models.forEach(m => {
          console.log(`      - ${m.name}: ${m.credits}`);
          if (m.isPromo) console.log(`        🎁 Limited time promo!`);
        });
      }
      
      // Test 4: Smart models
      console.log('\n4️⃣ Getting SMART models...');
      const smartResponse = await this.sendRequest('tools/call', {
        name: 'list_models',
        arguments: { tier: 'smart' }
      });
      
      const smartData = JSON.parse(smartResponse.result.content[0].text);
      console.log(`   ✅ Smart models: ${smartData.count}`);
      
      if (smartData.models) {
        console.log('\n   🧠 SMART MODELS:');
        smartData.models.forEach(m => {
          console.log(`      - ${m.name}: ${m.credits}x`);
          if (m.isPromo) console.log(`        🎁 Promo deal!`);
        });
      }
      
      console.log('\n✅ All tests completed successfully!');
      console.log('\n📋 Summary:');
      console.log(`   - Total models available: ${allData.count}`);
      console.log(`   - Promotional models: ${allData.promoCount}`);
      console.log(`   - Free models: ${freeData.count}`);
      console.log(`   - Smart models: ${smartData.count}`);
      console.log('\n💡 Daily reminder: ' + allData.dailyCheckReminder);
      
      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      this.client.end();
    }
  }
}

async function runDetailedTest() {
  const client = new DetailedTestClient();
  
  try {
    await client.connect();
    await client.testModels();
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  } finally {
    await client.disconnect();
    process.exit(0);
  }
}

runDetailedTest();
