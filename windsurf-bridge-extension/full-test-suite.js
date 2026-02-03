#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Windsurf Bridge
 * Tests all MCP tools and functionality
 */

const net = require('net');
const fs = require('fs');
const path = require('path');

class BridgeTestSuite {
  constructor(port = 3100) {
    this.port = port;
    this.client = null;
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.client = net.createConnection({ port: this.port }, () => {
        console.log('✅ Connected to MCP server\n');
        resolve();
      });
      this.client.on('error', reject);
      this.client.setTimeout(10000);
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
          // Continue waiting
        }
      };

      this.client.on('data', onData);
      setTimeout(() => {
        this.client.removeListener('data', onData);
        reject(new Error('Request timeout'));
      }, 5000);
    });
  }

  logTest(name, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${name}`);
    if (details) console.log(`   ${details}`);
    
    this.results.push({ name, passed, details });
    if (passed) this.passed++;
    else this.failed++;
  }

  async testListTools() {
    console.log('\n🧪 TEST 1: List Available Tools\n');
    
    try {
      const response = await this.sendRequest('tools/list');
      const tools = response.result.tools;
      
      const expectedTools = ['delegate_to_cascade', 'get_cascade_status', 'switch_cascade_model', 'list_models', 'focus_cascade'];
      const foundTools = tools.map(t => t.name);
      
      const allFound = expectedTools.every(tool => foundTools.includes(tool));
      this.logTest('All expected tools available', allFound, `Found: ${foundTools.join(', ')}`);
      
      // Check list_models has promo_only parameter
      const listModelsTool = tools.find(t => t.name === 'list_models');
      const hasPromoFilter = listModelsTool && JSON.stringify(listModelsTool.inputSchema).includes('promo_only');
      this.logTest('list_models has promo_only filter', hasPromoFilter, 'Promo filtering supported');
      
    } catch (error) {
      this.logTest('List tools', false, error.message);
    }
  }

  async testListModelsAll() {
    console.log('\n🧪 TEST 2: List All Models\n');
    
    try {
      const response = await this.sendRequest('tools/call', {
        name: 'list_models'
      });
      
      const result = JSON.parse(response.result.content[0].text);
      
      this.logTest('Returns model count', result.count > 0, `${result.count} models found`);
      this.logTest('Has models array', Array.isArray(result.models) && result.models.length > 0, `${result.models.length} models in array`);
      this.logTest('Has daily reminder', result.dailyCheckReminder && result.dailyCheckReminder.includes('daily'), 'Daily check reminder included');
      
      // Check model structure
      if (result.models.length > 0) {
        const firstModel = result.models[0];
        this.logTest('Model has id', !!firstModel.id, `ID: ${firstModel.id}`);
        this.logTest('Model has name', !!firstModel.name, `Name: ${firstModel.name}`);
        this.logTest('Model has tier', !!firstModel.tier, `Tier: ${firstModel.tier}`);
        this.logTest('Model has credits', firstModel.credits !== undefined, `Credits: ${firstModel.credits}`);
        this.logTest('Model has description', !!firstModel.description, 'Description present');
        this.logTest('Model has strengths', Array.isArray(firstModel.strengths), `${firstModel.strengths.length} strengths`);
      }
      
      return result;
    } catch (error) {
      this.logTest('List all models', false, error.message);
      return null;
    }
  }

  async testListModelsPromoOnly() {
    console.log('\n🧪 TEST 3: List Promo Models Only\n');
    
    try {
      const response = await this.sendRequest('tools/call', {
        name: 'list_models',
        arguments: { promo_only: true }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      
      this.logTest('Returns promo models', result.count >= 0, `${result.count} promo models`);
      
      if (result.models && result.models.length > 0) {
        const allHavePromo = result.models.every(m => m.isPromo === true);
        this.logTest('All returned models have isPromo=true', allHavePromo, `${result.models.length} promo models verified`);
        
        // Check promo model structure
        const firstPromo = result.models[0];
        this.logTest('Promo model has promoDescription', !!firstPromo.promoDescription, `Description: ${firstPromo.promoDescription}`);
        this.logTest('Promo model has originalCost', !!firstPromo.originalCost, `Original: ${firstPromo.originalCost}`);
      } else {
        this.logTest('No promo models found', true, 'Either no promos currently or data needs refresh');
      }
      
    } catch (error) {
      this.logTest('List promo models', false, error.message);
    }
  }

  async testListModelsByTier() {
    console.log('\n🧪 TEST 4: List Models by Tier\n');
    
    const tiers = ['free', 'cheap', 'standard', 'smart', 'premium'];
    
    for (const tier of tiers) {
      try {
        const response = await this.sendRequest('tools/call', {
          name: 'list_models',
          arguments: { tier }
        });
        
        const result = JSON.parse(response.result.content[0].text);
        
        if (result.models && result.models.length > 0) {
          const allMatchTier = result.models.every(m => m.tier === tier);
          this.logTest(`Tier "${tier}" filtering`, allMatchTier, `${result.count} models with tier "${tier}"`);
        } else {
          this.logTest(`Tier "${tier}" (empty)`, true, `No models in tier "${tier}"`);
        }
      } catch (error) {
        this.logTest(`Tier "${tier}"`, false, error.message);
      }
    }
  }

  async testSwitchModel() {
    console.log('\n🧪 TEST 5: Switch Model\n');
    
    try {
      // Test with tier shortcut
      const response1 = await this.sendRequest('tools/call', {
        name: 'switch_cascade_model',
        arguments: { model: 'free' }
      });
      
      const result1 = JSON.parse(response1.result.content[0].text);
      this.logTest('Switch to tier "free"', result1.success, result1.message);
      
      // Test with model ID
      const response2 = await this.sendRequest('tools/call', {
        name: 'switch_cascade_model',
        arguments: { model: 'deepseek-v3' }
      });
      
      const result2 = JSON.parse(response2.result.content[0].text);
      this.logTest('Switch to model ID "deepseek-v3"', result2.success, result2.message);
      
      // Test invalid model
      const response3 = await this.sendRequest('tools/call', {
        name: 'switch_cascade_model',
        arguments: { model: 'invalid-model-123' }
      });
      
      const result3 = JSON.parse(response3.result.content[0].text);
      this.logTest('Invalid model handling', !result3.success, 'Correctly rejected invalid model');
      
    } catch (error) {
      this.logTest('Switch model', false, error.message);
    }
  }

  async testDelegateTask() {
    console.log('\n🧪 TEST 6: Delegate Task\n');
    
    try {
      const response = await this.sendRequest('tools/call', {
        name: 'delegate_to_cascade',
        arguments: {
          prompt: 'Test prompt for bridge verification',
          model: 'cheap'
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      this.logTest('Delegate task', result.success !== undefined, result.message);
      
    } catch (error) {
      this.logTest('Delegate task', false, error.message);
    }
  }

  async testGetCascadeStatus() {
    console.log('\n🧪 TEST 7: Get Cascade Status\n');
    
    try {
      const response = await this.sendRequest('tools/call', {
        name: 'get_cascade_status'
      });
      
      const result = response.result.content[0].text;
      this.logTest('Get status', result.length > 0, `Status length: ${result.length} chars`);
      
    } catch (error) {
      this.logTest('Get status', false, error.message);
    }
  }

  async testFocusCascade() {
    console.log('\n🧪 TEST 8: Focus Cascade\n');
    
    try {
      const response = await this.sendRequest('tools/call', {
        name: 'focus_cascade'
      });
      
      const result = JSON.parse(response.result.content[0].text);
      this.logTest('Focus cascade', result.success !== undefined, result.message);
      
    } catch (error) {
      this.logTest('Focus cascade', false, error.message);
    }
  }

  async verifyModelCount() {
    console.log('\n🧪 TEST 9: Verify Model Count\n');
    
    try {
      const response = await this.sendRequest('tools/call', {
        name: 'list_models'
      });
      
      const result = JSON.parse(response.result.content[0].text);
      
      // We expect at least 82 models from the updated data
      const hasEnoughModels = result.count >= 80;
      this.logTest('Has 80+ models', hasEnoughModels, `Found ${result.count} models`);
      
      // Check for specific models
      const modelIds = result.models.map(m => m.id);
      
      const expectedModels = [
        'claude-sonnet-45',
        'claude-opus-41',
        'gpt-5-low-reasoning',
        'deepseek-v3',
        'kimi-k25'
      ];
      
      for (const modelId of expectedModels) {
        const found = modelIds.some(id => id.includes(modelId.replace(/-/g, '')) || id === modelId);
        this.logTest(`Model "${modelId}" exists`, found, found ? 'Found' : 'Not found');
      }
      
    } catch (error) {
      this.logTest('Verify model count', false, error.message);
    }
  }

  async runAllTests() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║     WINDSURF BRIDGE - COMPREHENSIVE TEST SUITE        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    try {
      await this.connect();
      
      await this.testListTools();
      await this.testListModelsAll();
      await this.testListModelsPromoOnly();
      await this.testListModelsByTier();
      await this.testSwitchModel();
      await this.testDelegateTask();
      await this.testGetCascadeStatus();
      await this.testFocusCascade();
      await this.verifyModelCount();
      
      this.printSummary();
      
    } catch (error) {
      console.error('\n❌ Connection failed:', error.message);
      console.log('\n💡 Make sure the MCP server is running:');
      console.log('   node out/mcpServer.js');
    } finally {
      if (this.client) {
        this.client.end();
        console.log('\n🔌 Disconnected');
      }
    }
  }

  printSummary() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📊 Total:  ${this.passed + this.failed}\n`);
    
    if (this.failed > 0) {
      console.log('❌ FAILED TESTS:\n');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`   • ${r.name}`);
        if (r.details) console.log(`     ${r.details}`);
      });
    }
    
    const successRate = ((this.passed / (this.passed + this.failed)) * 100).toFixed(1);
    console.log(`\n🎯 Success Rate: ${successRate}%`);
    
    if (this.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Bridge is fully operational.');
    } else if (this.failed <= 2) {
      console.log('\n⚠️  MOSTLY WORKING - Minor issues detected.');
    } else {
      console.log('\n❌ SIGNIFICANT ISSUES - Review failed tests above.');
    }
  }
}

// Run tests
if (require.main === module) {
  const tester = new BridgeTestSuite();
  tester.runAllTests().then(() => {
    process.exit(tester.failed > 0 ? 1 : 0);
  });
}

module.exports = BridgeTestSuite;
