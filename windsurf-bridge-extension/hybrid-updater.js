#!/usr/bin/env node

/**
 * Hybrid Windsurf Model Updater
 * Tries multiple sources: web scraping, internal config, and cached data
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class HybridModelUpdater {
  constructor() {
    this.models = [];
    this.outputFile = path.join(__dirname, 'windsurf-models-actual.json');
    this.extensionFile = path.join(__dirname, 'src', 'cascadeController.ts');
  }

  async update() {
    console.log('🚀 Starting hybrid model update...\n');
    
    // Try Method 1: Fetch from Windsurf API endpoint
    console.log('1️⃣ Trying Windsurf API...');
    if (await this.tryWindsurfAPI()) {
      console.log('✅ Success via API\n');
      return await this.finalize();
    }
    
    // Try Method 2: Parse from documentation page
    console.log('2️⃣ Trying documentation page...');
    if (await this.tryDocumentation()) {
      console.log('✅ Success via documentation\n');
      return await this.finalize();
    }
    
    // Try Method 3: Read Windsurf internal config
    console.log('3️⃣ Trying internal configuration...');
    if (await this.tryInternalConfig()) {
      console.log('✅ Success via internal config\n');
      return await this.finalize();
    }
    
    // Try Method 4: Use cached data
    console.log('4️⃣ Using cached data...');
    if (await this.loadCached()) {
      console.log('✅ Using cached models\n');
      return await this.finalize();
    }
    
    console.error('❌ All methods failed!');
    return false;
  }

  async tryWindsurfAPI() {
    try {
      // Try common API endpoints
      const endpoints = [
        'https://api.windsurf.ai/models',
        'https://windsurf.com/api/models',
        'https://docs.windsurf.com/api/models',
      ];
      
      for (const endpoint of endpoints) {
        try {
          const data = await this.fetchJSON(endpoint);
          if (data && Array.isArray(data.models)) {
            data.models.forEach(m => {
              if (m.name && m.cost) {
                this.addModel(m.name, m.cost, m.promo || false, m.badges || []);
              }
            });
            if (this.models.length > 0) return true;
          }
        } catch (e) {
          // Try next endpoint
        }
      }
    } catch (error) {
      console.log('   ⚠️  API not available');
    }
    return false;
  }

  async tryDocumentation() {
    try {
      // Fetch the documentation page
      const html = await this.fetchURL('https://docs.windsurf.com/windsurf/models');
      
      // Look for model data in various formats
      
      // Pattern 1: Table rows
      const tableMatches = html.matchAll(/<tr[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>([^<]+)<\/td>/gi);
      for (const match of tableMatches) {
        const name = this.cleanText(match[1]);
        const cost = this.cleanText(match[2]);
        if (this.isValidModel(name, cost)) {
          const context = html.substring(Math.max(0, match.index - 300), match.index + 300);
          const isPromo = context.includes('🎁') || context.toLowerCase().includes('promo');
          this.addModel(name, cost, isPromo);
        }
      }
      
      // Pattern 2: JSON embedded in script tags
      const scriptMatches = html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi);
      for (const match of scriptMatches) {
        try {
          const jsonMatch = match[1].match(/\{[\s\S]*"models"[\s\S]*\}/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            if (data.models) {
              data.models.forEach(m => {
                if (m.name && m.cost) {
                  this.addModel(m.name, m.cost, m.promo || false);
                }
              });
            }
          }
        } catch (e) {
          // Not valid JSON
        }
      }
      
      // Pattern 3: Direct text patterns
      const textMatches = html.matchAll(/([A-Z][A-Za-z0-9\s\.\-()]+?)\s*[:\-]\s*(\d+(?:\.\d+)?x|Free|BYOK)/gi);
      for (const match of textMatches) {
        const name = this.cleanText(match[1]);
        const cost = this.cleanText(match[2]);
        if (this.isValidModel(name, cost)) {
          const context = html.substring(Math.max(0, match.index - 200), match.index + 200);
          const isPromo = context.includes('🎁') || context.toLowerCase().includes('promo');
          this.addModel(name, cost, isPromo);
        }
      }
      
      return this.models.length > 0;
      
    } catch (error) {
      console.log('   ⚠️  Documentation page unavailable:', error.message);
      return false;
    }
  }

  async tryInternalConfig() {
    try {
      const homeDir = require('os').homedir();
      const configPaths = [
        path.join(homeDir, '.windsurf', 'models.json'),
        path.join(homeDir, '.windsurf', 'config.json'),
        path.join(homeDir, 'Library', 'Application Support', 'Windsurf', 'models.json'),
        path.join(homeDir, 'Library', 'Application Support', 'Windsurf', 'User', 'settings.json'),
      ];
      
      for (const configPath of configPaths) {
        if (fs.existsSync(configPath)) {
          console.log(`   📂 Found: ${configPath}`);
          const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          
          if (data.models) {
            data.models.forEach(m => {
              if (m.name && m.cost) {
                this.addModel(m.name, m.cost, m.promo || false);
              }
            });
          }
          
          if (this.models.length > 0) return true;
        }
      }
      
      // Try to extract from VS Code settings
      const vscodeSettings = path.join(homeDir, '.vscode', 'settings.json');
      if (fs.existsSync(vscodeSettings)) {
        const settings = JSON.parse(fs.readFileSync(vscodeSettings, 'utf8'));
        if (settings['windsurf.models'] || settings['codeium.models']) {
          const models = settings['windsurf.models'] || settings['codeium.models'];
          if (Array.isArray(models)) {
            models.forEach(m => {
              if (m.name && m.cost) {
                this.addModel(m.name, m.cost, m.promo || false);
              }
            });
          }
        }
      }
      
      return this.models.length > 0;
      
    } catch (error) {
      console.log('   ⚠️  Internal config not accessible');
      return false;
    }
  }

  async loadCached() {
    if (fs.existsSync(this.outputFile)) {
      try {
        const cached = JSON.parse(fs.readFileSync(this.outputFile, 'utf8'));
        if (cached.models && cached.models.length > 0) {
          this.models = cached.models;
          console.log(`   📦 Loaded ${this.models.length} models from cache`);
          console.log(`   ⏰ Last updated: ${cached.extracted_at}`);
          return true;
        }
      } catch (e) {
        console.log('   ⚠️  Cache file corrupted');
      }
    }
    return false;
  }

  addModel(name, cost, isPromo = false, badges = []) {
    // Avoid duplicates
    if (this.models.find(m => m.name === name)) {
      return;
    }
    
    if (!badges.includes('Promo') && isPromo) {
      badges.push('Promo');
    }
    
    this.models.push({ name, cost, badges });
    console.log(`   ✅ ${name}: ${cost}${badges.length > 0 ? ' [' + badges.join(', ') + ']' : ''}`);
  }

  isValidModel(name, cost) {
    if (!name || !cost) return false;
    if (name.length < 3 || name.length > 100) return false;
    if (!cost.match(/^\d+(?:\.\d+)?x$|^Free$|^BYOK$/i)) return false;
    return true;
  }

  cleanText(text) {
    return text.trim().replace(/\s+/g, ' ').replace(/[<>]/g, '');
  }

  async fetchURL(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  async fetchJSON(url) {
    const data = await this.fetchURL(url);
    return JSON.parse(data);
  }

  async finalize() {
    if (this.models.length === 0) {
      console.error('❌ No models to save!');
      return false;
    }
    
    // Save to JSON
    const data = {
      extracted_at: new Date().toISOString(),
      source: 'Hybrid updater (multiple sources)',
      total_models: this.models.length,
      models: this.models
    };
    
    fs.writeFileSync(this.outputFile, JSON.stringify(data, null, 2));
    console.log(`💾 Saved ${this.models.length} models to ${this.outputFile}`);
    
    // Update extension
    await this.updateExtension();
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Total models: ${this.models.length}`);
    const promoModels = this.models.filter(m => m.badges.includes('Promo'));
    console.log(`   Promo models: ${promoModels.length}`);
    
    if (promoModels.length > 0) {
      console.log('\n🎁 Current promotions:');
      promoModels.forEach(m => {
        console.log(`   - ${m.name}: ${m.cost}`);
      });
    }
    
    console.log('\n✅ Update completed successfully!');
    return true;
  }

  async updateExtension() {
    console.log('🔄 Updating extension...');
    
    if (!fs.existsSync(this.extensionFile)) {
      console.error('   ⚠️  Extension file not found');
      return;
    }
    
    let content = fs.readFileSync(this.extensionFile, 'utf8');
    const modelDefs = this.generateModelDefinitions();
    
    // Find ALL_WINDSURF_MODELS and replace
    const startMarker = 'export const ALL_WINDSURF_MODELS: Record<string, ModelInfo> = {';
    const startIdx = content.indexOf(startMarker);
    
    if (startIdx === -1) {
      console.error('   ⚠️  Could not find ALL_WINDSURF_MODELS');
      return;
    }
    
    // Find matching closing brace
    let braceCount = 0;
    let endIdx = startIdx + startMarker.length;
    let inString = false;
    
    for (let i = endIdx; i < content.length; i++) {
      const char = content[i];
      const prevChar = i > 0 ? content[i-1] : '';
      
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        inString = !inString;
      }
      
      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') {
          if (braceCount === 0) {
            endIdx = i + 1;
            break;
          }
          braceCount--;
        }
      }
    }
    
    const newContent = content.substring(0, startIdx) +
                      startMarker + '\n' +
                      modelDefs + '\n' +
                      content.substring(endIdx);
    
    fs.writeFileSync(this.extensionFile, newContent);
    console.log('   ✅ Extension updated');
  }

  generateModelDefinitions() {
    return this.models.map(model => {
      const id = model.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const tier = this.determineTier(model.cost);
      const credits = model.cost === 'Free' || model.cost === 'BYOK' ? 0 : parseFloat(model.cost) || model.cost;
      const strengths = this.generateStrengths(model.name);
      
      let def = `  "${id}": {\n`;
      def += `    id: "${id}",\n`;
      def += `    name: "${model.name}",\n`;
      def += `    tier: "${tier}",\n`;
      def += `    credits: ${typeof credits === 'number' ? credits : `"${credits}"`},\n`;
      def += `    description: "${model.name} - ${model.cost}",\n`;
      def += `    strengths: [${strengths.map(s => `"${s}"`).join(', ')}]`;
      
      if (model.badges.includes('Promo')) {
        const original = this.estimateOriginalCost(model.name, model.cost);
        def += `,\n    isPromo: true,\n`;
        def += `    promoDescription: "Limited time promotional pricing!",\n`;
        def += `    originalCost: "${original}"`;
      }
      
      def += '\n  }';
      return def;
    }).join(',\n');
  }

  determineTier(cost) {
    if (cost === 'Free' || cost === 'BYOK') return 'free';
    const num = parseFloat(cost);
    if (isNaN(num)) return 'standard';
    if (num === 0) return 'free';
    if (num <= 0.5) return 'cheap';
    if (num <= 1) return 'cheap';
    if (num <= 2) return 'standard';
    if (num <= 4) return 'smart';
    return 'premium';
  }

  generateStrengths(name) {
    const strengths = [];
    const lower = name.toLowerCase();
    
    if (lower.includes('claude')) strengths.push('Advanced reasoning');
    if (lower.includes('gpt')) strengths.push('General purpose');
    if (lower.includes('gemini')) strengths.push('Fast processing');
    if (lower.includes('deepseek')) strengths.push('Code generation');
    if (lower.includes('swe')) strengths.push('Software engineering');
    if (lower.includes('opus')) strengths.push('Premium quality');
    if (lower.includes('sonnet')) strengths.push('Balanced performance');
    
    return strengths.length > 0 ? strengths : ['General coding'];
  }

  estimateOriginalCost(name, current) {
    const lower = name.toLowerCase();
    if (lower.includes('sonnet 4.5')) return '4x';
    if (lower.includes('opus')) return '20x';
    if (lower.includes('kimi')) return '1x';
    
    const num = parseFloat(current);
    return !isNaN(num) ? `${num * 2}x` : 'Standard';
  }
}

if (require.main === module) {
  const updater = new HybridModelUpdater();
  updater.update().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = HybridModelUpdater;
