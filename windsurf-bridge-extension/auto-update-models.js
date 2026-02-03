#!/usr/bin/env node

/**
 * Production-ready Windsurf Model Price Scraper
 * Scrapes https://docs.windsurf.com/windsurf/models for current pricing and promos
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class WindsurfModelScraper {
  constructor() {
    this.models = [];
    this.outputFile = path.join(__dirname, 'windsurf-models-actual.json');
    this.extensionFile = path.join(__dirname, 'src', 'cascadeController.ts');
  }

  async fetchPage(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  async scrapeModels() {
    console.log('🔍 Fetching Windsurf models from official documentation...');
    
    try {
      const html = await this.fetchPage('https://docs.windsurf.com/windsurf/models');
      
      // Extract model data from HTML
      this.extractModelsFromHTML(html);
      
      // Also try the text version
      try {
        const textData = await this.fetchPage('https://docs.windsurf.com/llms-full.txt');
        this.extractModelsFromText(textData);
      } catch (e) {
        console.log('⚠️  Text endpoint not available, using HTML only');
      }
      
      console.log(`✅ Extracted ${this.models.length} models`);
      
    } catch (error) {
      console.error('❌ Failed to fetch from web:', error.message);
      console.log('📦 Using existing cached data...');
      await this.loadCachedData();
    }
  }

  extractModelsFromHTML(html) {
    // Pattern 1: Look for model entries in tables or lists
    const tablePattern = /<tr[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>(\d+(?:\.\d+)?x|Free|BYOK)[^<]*<\/td>/gi;
    let match;
    
    while ((match = tablePattern.exec(html)) !== null) {
      const name = this.cleanText(match[1]);
      const cost = this.cleanText(match[2]);
      
      if (name && cost) {
        this.addModel(name, cost, html.substring(Math.max(0, match.index - 200), match.index + 200));
      }
    }

    // Pattern 2: Look for model cards or divs
    const cardPattern = /<div[^>]*class="[^"]*model[^"]*"[^>]*>[\s\S]*?([A-Z][A-Za-z0-9\s\.\-]+\d(?:\.\d)?)[\s\S]*?(\d+(?:\.\d+)?x|Free|BYOK)/gi;
    
    while ((match = cardPattern.exec(html)) !== null) {
      const name = this.cleanText(match[1]);
      const cost = this.cleanText(match[2]);
      
      if (name && cost) {
        this.addModel(name, cost, html.substring(Math.max(0, match.index - 200), match.index + 200));
      }
    }

    // Pattern 3: JSON-LD or script tags with model data
    const scriptPattern = /<script[^>]*type="application\/(?:ld\+)?json"[^>]*>([\s\S]*?)<\/script>/gi;
    
    while ((match = scriptPattern.exec(html)) !== null) {
      try {
        const jsonData = JSON.parse(match[1]);
        this.extractModelsFromJSON(jsonData);
      } catch (e) {
        // Not valid JSON
      }
    }
  }

  extractModelsFromText(text) {
    const lines = text.split('\n');
    
    for (const line of lines) {
      // Pattern: "Model Name - Cost" or "Model Name: Cost"
      const match = line.match(/^([A-Z][A-Za-z0-9\s\.\-()]+?)\s*[:\-]\s*(\d+(?:\.\d+)?x|Free|BYOK)/);
      
      if (match) {
        const name = this.cleanText(match[1]);
        const cost = this.cleanText(match[2]);
        this.addModel(name, cost, line);
      }
    }
  }

  extractModelsFromJSON(data) {
    if (Array.isArray(data)) {
      data.forEach(item => this.extractModelsFromJSON(item));
    } else if (typeof data === 'object' && data !== null) {
      if (data.name && (data.cost || data.credits || data.price)) {
        this.addModel(
          data.name,
          data.cost || data.credits || data.price,
          JSON.stringify(data)
        );
      }
      
      Object.values(data).forEach(value => {
        if (typeof value === 'object') {
          this.extractModelsFromJSON(value);
        }
      });
    }
  }

  addModel(name, cost, context) {
    // Check for duplicates
    if (this.models.find(m => m.name === name)) {
      return;
    }

    const badges = [];
    const contextLower = context.toLowerCase();
    
    // Detect promo indicators
    if (contextLower.includes('promo') || 
        contextLower.includes('gift') || 
        context.includes('🎁') ||
        contextLower.includes('limited time') ||
        contextLower.includes('special offer')) {
      badges.push('Promo');
    }
    
    if (contextLower.includes('beta')) badges.push('Beta');
    if (contextLower.includes('new')) badges.push('New');
    if (contextLower.includes('fast')) badges.push('Fast');
    
    this.models.push({ name, cost, badges });
    console.log(`   ✅ ${name}: ${cost}${badges.length > 0 ? ' [' + badges.join(', ') + ']' : ''}`);
  }

  cleanText(text) {
    return text.trim().replace(/\s+/g, ' ').replace(/[^\w\s\.\-()]/g, '');
  }

  async loadCachedData() {
    if (fs.existsSync(this.outputFile)) {
      const cached = JSON.parse(fs.readFileSync(this.outputFile, 'utf8'));
      this.models = cached.models || [];
      console.log(`📦 Loaded ${this.models.length} models from cache`);
    }
  }

  async saveModels() {
    const data = {
      extracted_at: new Date().toISOString(),
      source: 'https://docs.windsurf.com/windsurf/models',
      total_models: this.models.length,
      models: this.models
    };

    fs.writeFileSync(this.outputFile, JSON.stringify(data, null, 2));
    console.log(`💾 Saved to ${this.outputFile}`);

    // Create backup
    const backupFile = this.outputFile.replace('.json', `-backup-${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
  }

  async updateExtension() {
    console.log('🔄 Updating extension with latest models...');
    
    if (!fs.existsSync(this.extensionFile)) {
      console.error('❌ Extension file not found:', this.extensionFile);
      return;
    }

    let content = fs.readFileSync(this.extensionFile, 'utf8');
    
    // Generate new model definitions
    const modelDefs = this.generateModelDefinitions();
    
    // Find and replace ALL_WINDSURF_MODELS
    const startMarker = 'export const ALL_WINDSURF_MODELS: Record<string, ModelInfo> = {';
    const endMarker = '};';
    
    const startIdx = content.indexOf(startMarker);
    if (startIdx === -1) {
      console.error('❌ Could not find ALL_WINDSURF_MODELS in extension file');
      return;
    }
    
    // Find the matching closing brace
    let braceCount = 0;
    let endIdx = startIdx + startMarker.length;
    let inString = false;
    let stringChar = '';
    
    for (let i = endIdx; i < content.length; i++) {
      const char = content[i];
      
      if ((char === '"' || char === "'") && content[i-1] !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
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
    console.log('✅ Extension updated successfully');
  }

  generateModelDefinitions() {
    const definitions = [];
    
    this.models.forEach(model => {
      const id = this.nameToId(model.name);
      const tier = this.determineTier(model.cost, model.badges);
      const credits = this.parseCredits(model.cost);
      const strengths = this.generateStrengths(model.name, model.badges);
      
      let def = `  "${id}": {\n`;
      def += `    id: "${id}",\n`;
      def += `    name: "${model.name}",\n`;
      def += `    tier: "${tier}",\n`;
      def += `    credits: ${typeof credits === 'number' ? credits : `"${credits}"`},\n`;
      def += `    description: "${model.name} - ${model.cost}",\n`;
      def += `    strengths: [${strengths.map(s => `"${s}"`).join(', ')}]`;
      
      if (model.badges.includes('Promo')) {
        const originalCost = this.estimateOriginalCost(model.name, model.cost);
        def += `,\n    isPromo: true,\n`;
        def += `    promoDescription: "Limited time promotional pricing!",\n`;
        def += `    originalCost: "${originalCost}"`;
      }
      
      def += '\n  },';
      definitions.push(def);
    });
    
    return definitions.join('\n');
  }

  nameToId(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  determineTier(cost, badges) {
    if (cost === 'Free' || cost === 'BYOK') return 'free';
    
    const numCost = parseFloat(cost);
    if (isNaN(numCost)) return 'standard';
    
    if (numCost === 0) return 'free';
    if (numCost <= 0.5) return 'cheap';
    if (numCost <= 1) return 'cheap';
    if (numCost <= 2) return 'standard';
    if (numCost <= 4) return 'smart';
    return 'premium';
  }

  parseCredits(cost) {
    if (cost === 'Free' || cost === 'BYOK') return 0;
    const num = parseFloat(cost);
    return isNaN(num) ? cost : num;
  }

  generateStrengths(name, badges) {
    const strengths = [];
    
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('claude')) strengths.push('Advanced reasoning');
    if (nameLower.includes('gpt')) strengths.push('General purpose');
    if (nameLower.includes('gemini')) strengths.push('Fast processing');
    if (nameLower.includes('deepseek')) strengths.push('Code generation');
    if (nameLower.includes('swe')) strengths.push('Software engineering');
    if (nameLower.includes('codex')) strengths.push('Code-specialized');
    
    if (nameLower.includes('opus')) strengths.push('Premium quality');
    if (nameLower.includes('sonnet')) strengths.push('Balanced performance');
    if (nameLower.includes('haiku')) strengths.push('Quick tasks');
    if (nameLower.includes('thinking')) strengths.push('Enhanced reasoning');
    if (nameLower.includes('fast')) strengths.push('Speed optimized');
    
    if (badges.includes('Promo')) strengths.push('Great value');
    if (badges.includes('New')) strengths.push('Latest features');
    
    return strengths.length > 0 ? strengths : ['General coding'];
  }

  estimateOriginalCost(name, currentCost) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('sonnet 4.5')) return '4x';
    if (nameLower.includes('opus')) return '20x+';
    if (nameLower.includes('kimi')) return '0.5x-1x';
    if (nameLower.includes('swe-1.5')) return 'Premium';
    
    const num = parseFloat(currentCost);
    if (!isNaN(num)) return `${num * 2}x`;
    
    return 'Standard pricing';
  }

  async run() {
    try {
      console.log('🚀 Starting Windsurf model scraper...\n');
      
      await this.scrapeModels();
      
      if (this.models.length === 0) {
        console.error('❌ No models found!');
        return false;
      }
      
      await this.saveModels();
      await this.updateExtension();
      
      console.log('\n🎉 Update completed successfully!');
      console.log(`📊 Total models: ${this.models.length}`);
      
      const promoModels = this.models.filter(m => m.badges.includes('Promo'));
      if (promoModels.length > 0) {
        console.log(`🎁 Promotional models: ${promoModels.length}`);
        promoModels.forEach(m => {
          console.log(`   - ${m.name}: ${m.cost}`);
        });
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Scraper failed:', error);
      return false;
    }
  }
}

if (require.main === module) {
  const scraper = new WindsurfModelScraper();
  scraper.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = WindsurfModelScraper;
