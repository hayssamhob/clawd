#!/usr/bin/env node

/**
 * Windsurf Network Monitor
 * 
 * This script monitors Windsurf's network traffic to capture model pricing data
 * when the application loads the models page.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');

class WindsurfNetworkMonitor {
  constructor() {
    this.capturedData = [];
    this.isMonitoring = false;
    this.outputFile = path.join(__dirname, 'windsurf-models-actual.json');
  }

  async startMonitoring() {
    console.log('🔍 Starting Windsurf network monitor...');
    console.log('📋 Instructions:');
    console.log('1. Open Windsurf');
    console.log('2. Navigate to the models page (Settings > Models)');
    console.log('3. The monitor will capture model data automatically');
    console.log('4. Press Ctrl+C to stop monitoring');
    console.log('');

    this.isMonitoring = true;

    // Method 1: Monitor system network connections
    this.monitorNetworkConnections();

    // Method 2: Monitor common log files
    this.monitorLogFiles();

    // Method 3: Set up a simple HTTP proxy
    this.setupProxy();
  }

  monitorNetworkConnections() {
    console.log('🌐 Monitoring network connections...');
    
    const checkConnections = () => {
      if (!this.isMonitoring) return;

      // Look for connections to windsurf.com or related domains
      const { exec } = require('child_process');
      exec('netstat -an | grep -E "(windsurf|docs\\.windsurf)" | head -5', (error, stdout) => {
        if (stdout && !error) {
          console.log('🔗 Found Windsurf connections');
        }
      });

      setTimeout(checkConnections, 5000);
    };

    checkConnections();
  }

  monitorLogFiles() {
    console.log('📝 Monitoring log files...');
    
    const logPaths = [
      path.join(require('os').homedir(), '.windsurf', 'logs'),
      path.join(require('os').homedir(), 'Library', 'Logs', 'Windsurf'),
      '/tmp/windsurf-logs',
    ];

    logPaths.forEach(logPath => {
      if (fs.existsSync(logPath)) {
        console.log(`📂 Watching: ${logPath}`);
        this.watchDirectory(logPath);
      }
    });
  }

  watchDirectory(dir) {
    try {
      fs.watch(dir, { recursive: true }, (eventType, filename) => {
        if (filename && filename.includes('model') || filename.includes('cascade')) {
          const fullPath = path.join(dir, filename);
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            this.extractModelsFromText(content, fullPath);
          } catch (e) {
            // File might be locked, ignore
          }
        }
      });
    } catch (e) {
      // Can't watch directory, ignore
    }
  }

  setupProxy() {
    console.log('🔧 Setting up local proxy on port 8080...');
    
    const server = net.createServer((clientSocket) => {
      console.log('🔗 Client connected to proxy');
      
      clientSocket.on('data', (data) => {
        const request = data.toString();
        
        // Check if this is a request to windsurf.com
        if (request.includes('windsurf.com') || request.includes('models')) {
          console.log('🎯 Intercepted Windsurf models request');
          
          // Forward the request and capture response
          this.forwardRequest(clientSocket, request);
        }
      });
    });

    server.listen(8080, () => {
      console.log('✅ Proxy listening on port 8080');
      console.log('💡 Configure Windsurf to use HTTP proxy: localhost:8080');
    });
  }

  forwardRequest(clientSocket, request) {
    // Parse the request to get the target host
    const hostMatch = request.match(/Host:\s*([^\r\n]+)/);
    if (!hostMatch) return;

    const host = hostMatch[1];
    const [hostname, port] = host.split(':');
    const targetPort = port || 443;

    const serverSocket = net.createConnection(targetPort, hostname, () => {
      // Forward the request
      serverSocket.write(request);
    });

    serverSocket.on('data', (data) => {
      const response = data.toString();
      
      // Extract model data from response
      if (response.includes('model') || response.includes('credits') || response.includes('pricing')) {
        this.extractModelsFromText(response, 'network-response');
      }
      
      // Forward to client
      clientSocket.write(data);
    });

    serverSocket.on('error', (err) => {
      console.log('⚠️  Proxy error:', err.message);
    });
  }

  extractModelsFromText(text, source) {
    const modelPatterns = [
      /"name":\s*"([^"]+)".*?"cost":\s*"([^"]+)"/gi,
      /([A-Za-z][A-Za-z0-9\s\.\-]+\d(?:\.\d)?)\s*[:\-]?\s*(\d+(?:\.\d+)?x|Free|BYOK)/gi,
      /"model":\s*{[^}]*"name":\s*"([^"]+)"[^}]*"price":\s*"([^"]+)"/gi,
    ];

    modelPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const model = {
          name: match[1].trim(),
          cost: match[2].trim(),
          badges: [],
          source: source
        };
        
        // Check for promo indicators
        const surroundingText = text.substring(Math.max(0, match.index - 100), match.index + 100);
        if (surroundingText.toLowerCase().includes('promo') || 
            surroundingText.includes('🎁') ||
            surroundingText.toLowerCase().includes('gift')) {
          model.badges.push('Promo');
        }

        // Avoid duplicates
        if (!this.capturedData.find(m => m.name === model.name)) {
          this.capturedData.push(model);
          console.log(`✅ Captured model: ${model.name} (${model.cost}) from ${source}`);
          this.saveModels();
        }
      }
    });
  }

  saveModels() {
    if (this.capturedData.length === 0) return;

    const data = {
      extracted_at: new Date().toISOString(),
      source: 'Windsurf Network Monitor',
      total_models: this.capturedData.length,
      models: this.capturedData
    };

    fs.writeFileSync(this.outputFile, JSON.stringify(data, null, 2));
    console.log(`💾 Saved ${this.capturedData.length} models to ${this.outputFile}`);
  }

  stop() {
    console.log('\n🛑 Stopping monitor...');
    this.isMonitoring = false;
    
    if (this.capturedData.length > 0) {
      console.log(`📊 Captured ${this.capturedData.length} models total`);
      this.saveModels();
      
      // Show summary
      console.log('\n📋 Models captured:');
      this.capturedData.forEach(m => {
        console.log(`   - ${m.name}: ${m.cost}${m.badges.length > 0 ? ' [' + m.badges.join(', ') + ']' : ''}`);
      });
    } else {
      console.log('⚠️  No models captured. Try:');
      console.log('   - Opening Windsurf and navigating to models page');
      console.log('   - Configuring proxy settings if needed');
    }
    
    process.exit(0);
  }
}

// Handle Ctrl+C
if (require.main === module) {
  const monitor = new WindsurfNetworkMonitor();
  
  process.on('SIGINT', () => {
    monitor.stop();
  });
  
  monitor.startMonitoring().catch(console.error);
}

module.exports = WindsurfNetworkMonitor;
