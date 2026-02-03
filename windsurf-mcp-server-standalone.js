#!/usr/bin/env node

/**
 * Standalone Windsurf MCP Server
 * 
 * Provides model information and control for Windsurf via MCP protocol.
 * Runs independently of VS Code/Windsurf extension system.
 * 
 * Usage: node windsurf-mcp-server-standalone.js [--port 3101]
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = process.argv.includes('--port') 
  ? parseInt(process.argv[process.argv.indexOf('--port') + 1]) 
  : 3101;

const MODELS_FILE = path.join(__dirname, 'windsurf-bridge-extension/windsurf-models-actual.json');

// Load model data
let modelsData = [];
try {
  const rawData = fs.readFileSync(MODELS_FILE, 'utf8');
  const parsed = JSON.parse(rawData);
  modelsData = parsed.models || parsed;
  console.log(`✅ Loaded ${modelsData.length} Windsurf models`);
} catch (error) {
  console.error(`❌ Failed to load models: ${error.message}`);
  console.error(`   Looking for: ${MODELS_FILE}`);
  process.exit(1);
}

// Model database with tier classification
const models = {};
modelsData.forEach(model => {
  models[model.id] = {
    id: model.id,
    name: model.name,
    tier: model.tier,
    credits: model.credits,
    description: model.description || '',
    strengths: model.strengths || [],
    isPromo: model.isPromo || false,
    promoDescription: model.promoDescription,
    originalCost: model.originalCost
  };
});

// Helper functions
function getPromoModels() {
  return Object.values(models).filter(m => m.isPromo);
}

function getModelsByTier(tier) {
  return Object.values(models).filter(m => m.tier === tier);
}

function getAllModels() {
  return models;
}

function findModel(query) {
  query = query.toLowerCase();
  
  // Exact match by ID
  if (models[query]) return models[query];
  
  // Partial match by ID
  const partialMatch = Object.values(models).find(m => m.id.toLowerCase().includes(query));
  if (partialMatch) return partialMatch;
  
  // Match by name
  const nameMatch = Object.values(models).find(m => m.name.toLowerCase().includes(query));
  return nameMatch;
}

// MCP Request Handlers
const handlers = {
  'tools/list': () => {
    return {
      tools: [
        {
          name: 'list_models',
          description: 'Get list of all available Windsurf models with details (credits, strengths, promos)',
          inputSchema: {
            type: 'object',
            properties: {
              tier: {
                type: 'string',
                description: 'Filter by tier: free, cheap, smart, fast, byok, premium, standard'
              },
              promo_only: {
                type: 'boolean',
                description: 'Only return promotional models'
              }
            }
          }
        },
        {
          name: 'get_model_info',
          description: 'Get detailed information about a specific model',
          inputSchema: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: 'Model ID or partial name'
              }
            },
            required: ['model']
          }
        },
        {
          name: 'get_promo_models',
          description: 'Get all promotional models (limited-time offers)',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    };
  },
  
  'tools/call': (params) => {
    const { name, arguments: args } = params;
    
    switch (name) {
      case 'list_models': {
        const tier = args?.tier;
        const promoOnly = args?.promo_only;
        
        let modelsList;
        if (promoOnly) {
          modelsList = getPromoModels();
        } else if (tier) {
          modelsList = getModelsByTier(tier);
        } else {
          modelsList = Object.values(getAllModels());
        }
        
        const promoModels = modelsList.filter(m => m.isPromo);
        const regularModels = modelsList.filter(m => !m.isPromo);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              count: modelsList.length,
              tier: tier || 'all',
              promoCount: promoModels.length,
              promoModels: promoModels.length > 0 ? promoModels : undefined,
              regularModels: regularModels,
              usage: 'Use model ID or tier for selection. PROMO models offer best value!'
            }, null, 2)
          }]
        };
      }
      
      case 'get_model_info': {
        const query = args?.model;
        if (!query) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Missing model parameter' }, null, 2) }],
            isError: true
          };
        }
        
        const model = findModel(query);
        if (!model) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Model not found: ${query}` }, null, 2) }],
            isError: true
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(model, null, 2)
          }]
        };
      }
      
      case 'get_promo_models': {
        const promos = getPromoModels();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              count: promos.length,
              models: promos,
              note: 'These are limited-time offers - use them while available!'
            }, null, 2)
          }]
        };
      }
      
      default:
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2) }],
          isError: true
        };
    }
  }
};

// HTTP Server
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: 'Windsurf MCP Server (Standalone)',
      version: '0.1.0',
      models: modelsData.length,
      promos: getPromoModels().length,
      status: 'running'
    }, null, 2));
    return;
  }
  
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const request = JSON.parse(body);
        const { method, params } = request;
        
        if (!handlers[method]) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Unknown method: ${method}` }));
          return;
        }
        
        const result = handlers[method](params);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result, null, 2));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }
  
  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log('');
  console.log('🚀 Windsurf MCP Server (Standalone)');
  console.log('====================================');
  console.log(`📡 Listening on: http://localhost:${PORT}`);
  console.log(`📊 Models loaded: ${modelsData.length}`);
  console.log(`🎁 Promo models: ${getPromoModels().length}`);
  console.log('');
  console.log('✅ Server is ready!');
  console.log('');
  console.log('Test with:');
  console.log(`  curl http://localhost:${PORT}/`);
  console.log('');
});

server.on('error', (error) => {
  console.error(`❌ Server error: ${error.message}`);
  if (error.code === 'EADDRINUSE') {
    console.error(`   Port ${PORT} is already in use.`);
    console.error(`   Try: node windsurf-mcp-server-standalone.js --port 3102`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});
