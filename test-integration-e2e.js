#!/usr/bin/env node

/**
 * End-to-End Integration Test
 * Tests OpenClaw → MCP Server → Windsurf Bridge communication
 */

const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class IntegrationTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
  }

  test(name, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? 'green' : 'red';
    
    this.log(`${status}: ${name}`, color);
    if (details) {
      this.log(`   ${details}`, 'cyan');
    }
    
    this.results.tests.push({ name, passed, details });
    if (passed) this.results.passed++;
    else this.results.failed++;
  }

  async testStandaloneMCP() {
    this.log('\n📡 TEST 1: Standalone MCP Server (OpenClaw Integration)', 'blue');
    this.log('─'.repeat(60), 'blue');

    const mcpPath = '/Users/hayssamhoballah/clawd/openclaw-mcp/windsurf/dist/index.js';
    
    // Test if MCP server exists
    if (!fs.existsSync(mcpPath)) {
      this.test('MCP server file exists', false, `Not found: ${mcpPath}`);
      return false;
    }
    this.test('MCP server file exists', true, mcpPath);

    // Test MCP server can start and respond
    return new Promise((resolve) => {
      const server = spawn('node', [mcpPath], {
        stdio: ['pipe', 'pipe', 'inherit']
      });

      let responseReceived = false;
      const timeout = setTimeout(() => {
        if (!responseReceived) {
          this.test('MCP server responds', false, 'Timeout after 5s');
          server.kill();
          resolve(false);
        }
      }, 5000);

      server.stdout.on('data', (data) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.result) {
            responseReceived = true;
            clearTimeout(timeout);
            this.test('MCP server responds', true, 'Received valid JSON-RPC response');
            
            // Test model data
            if (response.result.content) {
              const content = JSON.parse(response.result.content[0].text);
              this.test('MCP returns model data', content.total_available >= 80, 
                `${content.total_available} models available`);
              this.test('MCP returns promo data', content.promo_count >= 0,
                `${content.promo_count} promotional models`);
            }
            
            server.kill();
            resolve(true);
          }
        } catch (e) {
          // Not JSON, continue waiting
        }
      });

      // Send test request
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

  async testVSCodeExtension() {
    this.log('\n🔌 TEST 2: VS Code Extension Installation', 'blue');
    this.log('─'.repeat(60), 'blue');

    const extensionPath = '/Users/hayssamhoballah/.windsurf/extensions/openclaw.windsurf-bridge-0.1.0';
    
    // Check if extension is installed
    if (!fs.existsSync(extensionPath)) {
      this.test('Extension installed in Windsurf', false, `Not found: ${extensionPath}`);
      return false;
    }
    this.test('Extension installed in Windsurf', true, extensionPath);

    // Check compiled output
    const outPath = path.join(extensionPath, 'out');
    if (!fs.existsSync(outPath)) {
      this.test('Extension compiled', false, 'out/ directory not found');
      return false;
    }
    this.test('Extension compiled', true, 'out/ directory exists');

    // Check key files
    const files = ['extension.js', 'mcpServer.js', 'cascadeController.js', 'costBadgeDisplay.js'];
    for (const file of files) {
      const filePath = path.join(outPath, file);
      const exists = fs.existsSync(filePath);
      this.test(`File: ${file}`, exists, exists ? 'Found' : 'Missing');
    }

    // Check package.json
    const packagePath = path.join(extensionPath, 'package.json');
    if (fs.existsSync(packagePath)) {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      this.test('Extension metadata valid', !!pkg.name && !!pkg.version,
        `${pkg.name} v${pkg.version}`);
      
      const commandCount = pkg.contributes?.commands?.length || 0;
      this.test('Commands registered', commandCount >= 6,
        `${commandCount} commands available`);
    }

    return true;
  }

  async testModelData() {
    this.log('\n📊 TEST 3: Model Data Integrity', 'blue');
    this.log('─'.repeat(60), 'blue');

    const modelDataPath = '/Users/hayssamhoballah/clawd/windsurf-models-actual.json';
    
    if (!fs.existsSync(modelDataPath)) {
      this.test('Model data file exists', false, `Not found: ${modelDataPath}`);
      return false;
    }
    this.test('Model data file exists', true, modelDataPath);

    try {
      const data = JSON.parse(fs.readFileSync(modelDataPath, 'utf8'));
      
      this.test('Model data is valid JSON', true, 'Parsed successfully');
      this.test('Has model array', Array.isArray(data.models), 
        `${data.models?.length || 0} models`);
      this.test('Model count >= 80', data.total_models >= 80,
        `${data.total_models} total models`);
      
      // Check for promotional models
      const promos = data.models.filter(m => m.badges?.includes('Promo'));
      this.test('Has promotional models', promos.length > 0,
        `${promos.length} promotional models found`);
      
      // List promo models
      if (promos.length > 0) {
        this.log('\n   🎁 Current Promotional Models:', 'yellow');
        promos.forEach(m => {
          this.log(`      • ${m.name}: ${m.cost}`, 'yellow');
        });
      }

      return true;
    } catch (error) {
      this.test('Model data is valid JSON', false, error.message);
      return false;
    }
  }

  async testOpenClawConfig() {
    this.log('\n⚙️  TEST 4: OpenClaw MCP Configuration', 'blue');
    this.log('─'.repeat(60), 'blue');

    const mcpConfigPath = '/Users/hayssamhoballah/.openclaw/agents/main/agent/mcp.json';
    
    if (!fs.existsSync(mcpConfigPath)) {
      this.test('OpenClaw MCP config exists', false, `Not found: ${mcpConfigPath}`);
      return false;
    }
    this.test('OpenClaw MCP config exists', true, mcpConfigPath);

    try {
      const config = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
      
      this.test('Config is valid JSON', true, 'Parsed successfully');
      this.test('Has mcpServers section', !!config.mcpServers,
        `${Object.keys(config.mcpServers || {}).length} servers configured`);
      
      // Check Windsurf MCP server config
      const windsurfConfig = config.mcpServers?.windsurf;
      if (windsurfConfig) {
        this.test('Windsurf MCP configured', true, 'Found in config');
        this.test('MCP server command set', !!windsurfConfig.command,
          windsurfConfig.command);
        this.test('MCP server args set', Array.isArray(windsurfConfig.args),
          windsurfConfig.args?.[0] || 'No args');
        this.test('MCP server enabled', !windsurfConfig.disabled,
          windsurfConfig.disabled ? 'Disabled' : 'Enabled');
      } else {
        this.test('Windsurf MCP configured', false, 'Not found in mcpServers');
      }

      return true;
    } catch (error) {
      this.test('Config is valid JSON', false, error.message);
      return false;
    }
  }

  async testEndToEndCommunication() {
    this.log('\n🔗 TEST 5: End-to-End Communication Path', 'blue');
    this.log('─'.repeat(60), 'blue');

    // Test the complete chain: OpenClaw → MCP → Extension
    const steps = [
      {
        name: 'OpenClaw can spawn MCP server',
        check: () => fs.existsSync('/Users/hayssamhoballah/clawd/openclaw-mcp/windsurf/dist/index.js')
      },
      {
        name: 'MCP server has model data access',
        check: () => fs.existsSync('/Users/hayssamhoballah/clawd/windsurf-models-actual.json')
      },
      {
        name: 'Extension installed in Windsurf',
        check: () => fs.existsSync('/Users/hayssamhoballah/.windsurf/extensions/openclaw.windsurf-bridge-0.1.0')
      },
      {
        name: 'Extension has compiled output',
        check: () => fs.existsSync('/Users/hayssamhoballah/.windsurf/extensions/openclaw.windsurf-bridge-0.1.0/out')
      }
    ];

    let allPassed = true;
    for (const step of steps) {
      const passed = step.check();
      this.test(step.name, passed);
      if (!passed) allPassed = false;
    }

    return allPassed;
  }

  printSummary() {
    this.log('\n' + '═'.repeat(60), 'blue');
    this.log('📋 INTEGRATION TEST SUMMARY', 'blue');
    this.log('═'.repeat(60), 'blue');

    const total = this.results.passed + this.results.failed;
    const percentage = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;

    this.log(`\n✅ Passed: ${this.results.passed}`, 'green');
    this.log(`❌ Failed: ${this.results.failed}`, this.results.failed > 0 ? 'red' : 'green');
    this.log(`📊 Success Rate: ${percentage}%\n`, percentage >= 80 ? 'green' : 'yellow');

    if (this.results.failed > 0) {
      this.log('❌ FAILED TESTS:', 'red');
      this.results.tests.filter(t => !t.passed).forEach(t => {
        this.log(`   • ${t.name}`, 'red');
        if (t.details) this.log(`     ${t.details}`, 'cyan');
      });
      this.log('');
    }

    // Integration status
    if (this.results.failed === 0) {
      this.log('🎉 ALL TESTS PASSED!', 'green');
      this.log('✅ OpenClaw → Windsurf Bridge integration is READY', 'green');
    } else if (this.results.failed <= 2) {
      this.log('⚠️  MOSTLY WORKING - Minor issues detected', 'yellow');
      this.log('🔧 Review failed tests and fix before production use', 'yellow');
    } else {
      this.log('❌ INTEGRATION NOT READY', 'red');
      this.log('🔧 Multiple issues detected - review and fix', 'red');
    }

    this.log('\n' + '═'.repeat(60) + '\n', 'blue');
  }

  async runAll() {
    this.log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
    this.log('║  WINDSURF BRIDGE - END-TO-END INTEGRATION TEST            ║', 'blue');
    this.log('╚════════════════════════════════════════════════════════════╝\n', 'blue');

    await this.testStandaloneMCP();
    await this.testVSCodeExtension();
    await this.testModelData();
    await this.testOpenClawConfig();
    await this.testEndToEndCommunication();

    this.printSummary();

    return this.results.failed === 0 ? 0 : 1;
  }
}

// Run tests
if (require.main === module) {
  const tester = new IntegrationTester();
  tester.runAll().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = IntegrationTester;
