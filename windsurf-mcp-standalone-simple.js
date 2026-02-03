#!/usr/bin/env node

/**
 * Simple Standalone Windsurf MCP Server
 * Provides model listing from actual Windsurf data
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3101;
const MODELS_FILE = path.join(__dirname, 'windsurf-bridge-extension/windsurf-models-actual.json');

// Load and process models
let rawModels = [];
try {
  const data = JSON.parse(fs.readFileSync(MODELS_FILE, 'utf8'));
  rawModels = data.models || [];
  console.log(`✅ Loaded ${rawModels.length} models`);
} catch (error) {
  console.error(`❌ Error loading models: ${error.message}`);
  process.exit(1);
}

// Process models into usable format
const models = rawModels.map((m, idx) => {
  const id = m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const hasPromo = m.badges && m.badges.includes('🎁');
  const cost = m.cost;
  
  // Classify tier based on cost
  let tier = 'standard';
  if (cost === 'BYOK' || cost === 'FREE') tier = 'free';
  else if (cost === '0x' || cost === '0.5x') tier = 'cheap';
  else if (cost === '1x') tier = 'cheap';
  else if (cost === '2x') tier = 'standard';
  else if (parseFloat(cost) >= 3 && parseFloat(cost) <= 5) tier = 'smart';
  else if (parseFloat(cost) > 5) tier = 'premium';
  
  return {
    id,
    name: m.name,
    cost,
    tier,
    isPromo: hasPromo,
    badges: m.badges || []
  };
});

console.log(`📊 Processed ${models.length} models`);
console.log(`🎁 Promo models: ${models.filter(m => m.isPromo).length}`);

// HTTP Server
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({
      service: 'Windsurf MCP Server',
      version: '0.1.0',
      models: models.length,
      promos: models.filter(m => m.isPromo).length,
      status: 'running',
      endpoints: {
        '/': 'This status page',
        '/models': 'GET - List all models',
        '/models/promo': 'GET - List promotional models',
        '/models/tier/:tier': 'GET - List models by tier (free/cheap/standard/smart/premium)'
      }
    }, null, 2));
    return;
  }
  
  if (req.method === 'GET' && req.url === '/models') {
    res.writeHead(200);
    res.end(JSON.stringify({ count: models.length, models }, null, 2));
    return;
  }
  
  if (req.method === 'GET' && req.url === '/models/promo') {
    const promos = models.filter(m => m.isPromo);
    res.writeHead(200);
    res.end(JSON.stringify({ count: promos.length, models: promos }, null, 2));
    return;
  }
  
  if (req.method === 'GET' && req.url.startsWith('/models/tier/')) {
    const tier = req.url.split('/').pop();
    const filtered = models.filter(m => m.tier === tier);
    res.writeHead(200);
    res.end(JSON.stringify({ tier, count: filtered.length, models: filtered }, null, 2));
    return;
  }
  
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log('');
  console.log('🚀 Windsurf MCP Server');
  console.log('======================');
  console.log(`📡 Listening: http://localhost:${PORT}`);
  console.log('');
  console.log('✅ Ready!');
  console.log('');
  console.log('Test:');
  console.log(`  curl http://localhost:${PORT}/`);
  console.log(`  curl http://localhost:${PORT}/models`);
  console.log(`  curl http://localhost:${PORT}/models/promo`);
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} already in use`);
    console.error('   Try: killall -9 node');
  } else {
    console.error(`❌ Server error: ${err.message}`);
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Stopping...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});
