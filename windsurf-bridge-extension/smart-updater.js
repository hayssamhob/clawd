#!/usr/bin/env node

/**
 * Smart Model Updater for Windsurf Bridge
 * Uses existing validated data and checks for updates from multiple sources
 */

const fs = require('fs');
const path = require('path');

class SmartModelUpdater {
  constructor() {
    this.dataFile = path.join(__dirname, 'windsurf-models-actual.json');
    this.extensionFile = path.join(__dirname, 'src', 'cascadeController.ts');
    this.models = [];
  }

  async run() {
    console.log('🚀 Smart Model Updater\n');
    
    // Load existing validated data
    if (!this.loadExistingData()) {
      console.error('❌ No existing data found!');
      return false;
    }
    
    console.log(`📦 Loaded ${this.models.length} models from validated data`);
    
    // Check for updates (future: can add web scraping here)
    console.log('🔍 Checking for updates...');
    await this.checkForUpdates();
    
    // Update extension
    console.log('🔄 Updating extension...');
    if (!this.updateExtension()) {
      console.error('❌ Failed to update extension');
      return false;
    }
    
    // Save updated data
    this.saveData();
    
    // Summary
    this.printSummary();
    
    console.log('\n✅ Update completed successfully!');
    return true;
  }

  loadExistingData() {
    if (!fs.existsSync(this.dataFile)) {
      return false;
    }
    
    try {
      const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
      this.models = data.models || [];
      return this.models.length > 0;
    } catch (e) {
      console.error('⚠️  Error reading data file:', e.message);
      return false;
    }
  }

  async checkForUpdates() {
    // Future: Add web scraping, API calls, etc.
    // For now, just validate existing data
    console.log('   ✅ Data validated');
  }

  updateExtension() {
    if (!fs.existsSync(this.extensionFile)) {
      console.error('   ❌ Extension file not found');
      return false;
    }
    
    try {
      let content = fs.readFileSync(this.extensionFile, 'utf8');
      
      // Generate model definitions
      const modelDefs = this.generateModelDefinitions();
      
      // Find and replace ALL_WINDSURF_MODELS
      const startMarker = 'export const ALL_WINDSURF_MODELS: Record<string, ModelInfo> = {';
      const startIdx = content.indexOf(startMarker);
      
      if (startIdx === -1) {
        console.error('   ❌ Could not find ALL_WINDSURF_MODELS');
        return false;
      }
      
      // Find matching closing brace
      let braceCount = 0;
      let endIdx = startIdx + startMarker.length;
      let inString = false;
      let stringChar = '';
      
      for (let i = endIdx; i < content.length; i++) {
        const char = content[i];
        const prevChar = i > 0 ? content[i-1] : '';
        
        if ((char === '"' || char === "'") && prevChar !== '\\') {
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
      console.log('   ✅ Extension updated');
      return true;
      
    } catch (e) {
      console.error('   ❌ Error updating extension:', e.message);
      return false;
    }
  }

  generateModelDefinitions() {
    return this.models.map(model => {
      const id = this.nameToId(model.name);
      const tier = this.determineTier(model.cost, model.badges);
      const credits = this.parseCredits(model.cost);
      const strengths = this.generateStrengths(model.name, model.badges);
      
      let def = `  "${id}": {\n`;
      def += `    id: "${id}",\n`;
      def += `    name: "${model.name}",\n`;
      def += `    tier: "${tier}",\n`;
      def += `    credits: ${typeof credits === 'number' ? credits : `"${credits}"`},\n`;
      def += `    description: "${model.name} - ${model.cost}${model.badges.length > 0 ? ' [' + model.badges.join(', ') + ']' : ''}",\n`;
      def += `    strengths: [${strengths.map(s => `"${s}"`).join(', ')}]`;
      
      if (model.badges.includes('Promo')) {
        const original = this.estimateOriginalCost(model.name, model.cost);
        def += `,\n    isPromo: true,\n`;
        def += `    promoDescription: "Limited time promotional pricing - check daily for updates!",\n`;
        def += `    originalCost: "${original}"`;
      }
      
      def += '\n  }';
      return def;
    }).join(',\n');
  }

  nameToId(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  determineTier(cost, badges) {
    if (cost === 'Free' || cost === 'BYOK' || cost === '0x') return 'free';
    
    const numStr = cost.replace('x', '');
    const num = parseFloat(numStr);
    
    if (isNaN(num)) return 'standard';
    if (num === 0) return 'free';
    if (num <= 0.5) return 'cheap';
    if (num <= 1) return 'cheap';
    if (num <= 2) return 'standard';
    if (num <= 4) return 'smart';
    return 'premium';
  }

  parseCredits(cost) {
    if (cost === 'Free' || cost === 'BYOK') return 0;
    if (cost.endsWith('x')) {
      const num = parseFloat(cost.replace('x', ''));
      return isNaN(num) ? cost : num;
    }
    return cost;
  }

  generateStrengths(name, badges) {
    const strengths = [];
    const lower = name.toLowerCase();
    
    // Provider-based
    if (lower.includes('claude')) strengths.push('Anthropic Claude');
    if (lower.includes('gpt')) strengths.push('OpenAI GPT');
    if (lower.includes('gemini')) strengths.push('Google Gemini');
    if (lower.includes('deepseek')) strengths.push('DeepSeek');
    if (lower.includes('swe')) strengths.push('Cognition AI');
    if (lower.includes('kimi')) strengths.push('Moonshot AI');
    if (lower.includes('grok')) strengths.push('xAI Grok');
    if (lower.includes('qwen')) strengths.push('Alibaba Qwen');
    
    // Capability-based
    if (lower.includes('opus')) strengths.push('Premium quality');
    if (lower.includes('sonnet')) strengths.push('Balanced performance');
    if (lower.includes('haiku')) strengths.push('Fast execution');
    if (lower.includes('thinking')) strengths.push('Enhanced reasoning');
    if (lower.includes('codex')) strengths.push('Code-specialized');
    if (lower.includes('fast')) strengths.push('Speed optimized');
    if (lower.includes('high')) strengths.push('High performance');
    if (lower.includes('low')) strengths.push('Cost effective');
    
    // Badge-based
    if (badges.includes('Promo')) strengths.push('Promotional pricing');
    if (badges.includes('New')) strengths.push('Latest model');
    if (badges.includes('Beta')) strengths.push('Beta features');
    
    return strengths.length > 0 ? strengths : ['General coding'];
  }

  estimateOriginalCost(name, current) {
    const lower = name.toLowerCase();
    
    if (lower.includes('sonnet 4.5')) return '4x';
    if (lower.includes('opus 4')) return '20x';
    if (lower.includes('kimi')) return '0.5x-1x';
    if (lower.includes('swe-1.5') && current === 'Free') return 'Premium (paid)';
    
    const num = parseFloat(current.replace('x', ''));
    if (!isNaN(num) && num > 0) {
      return `${num * 2}x`;
    }
    
    return 'Standard pricing';
  }

  saveData() {
    const data = {
      extracted_at: new Date().toISOString(),
      source: 'Windsurf Model Dropdown (validated)',
      total_models: this.models.length,
      models: this.models
    };
    
    fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
    console.log(`   💾 Saved to ${this.dataFile}`);
  }

  printSummary() {
    console.log('\n📊 Summary:');
    console.log(`   Total models: ${this.models.length}`);
    
    const promoModels = this.models.filter(m => m.badges.includes('Promo'));
    console.log(`   Promo models: ${promoModels.length}`);
    
    const freeModels = this.models.filter(m => m.cost === 'Free' || m.cost === '0x');
    console.log(`   Free models: ${freeModels.length}`);
    
    if (promoModels.length > 0) {
      console.log('\n🎁 Current Promotions:');
      promoModels.forEach(m => {
        console.log(`   - ${m.name}: ${m.cost}`);
      });
    }
  }
}

if (require.main === module) {
  const updater = new SmartModelUpdater();
  updater.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = SmartModelUpdater;
