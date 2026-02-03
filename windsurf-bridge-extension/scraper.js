#!/usr/bin/env node

/**
 * Automated Windsurf Model Price Scraper
 * 
 * This script scrapes the Windsurf models page to extract current pricing
 * and promotional information, then updates the model list automatically.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const WINDSURF_MODELS_URL = 'https://docs.windsurf.com/windsurf/models';
const OUTPUT_FILE = path.join(__dirname, 'windsurf-models-actual.json');
const EXTENSION_MODELS_FILE = path.join(__dirname, 'src', 'cascadeController.ts');

class WindsurfPriceScraper {
  constructor() {
    this.models = [];
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 Starting Windsurf price scraper...');
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Set user agent to avoid blocking
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
  }

  async scrapeModels() {
    console.log(`📊 Scraping models from ${WINDSURF_MODELS_URL}...`);
    
    try {
      await this.page.goto(WINDSURF_MODELS_URL, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for the models table to load
      await this.page.waitForSelector('[data-testid="models-table"], table, .models-grid, .model-list', { timeout: 10000 });

      // Extract model data using multiple selectors
      const modelsData = await this.page.evaluate(() => {
        const models = [];
        
        // Try different selectors for model rows
        const selectors = [
          'table tr',
          '[data-testid="model-row"]',
          '.model-item',
          '.model-row',
          '[class*="model"]'
        ];

        let modelElements = [];
        for (const selector of selectors) {
          modelElements = document.querySelectorAll(selector);
          if (modelElements.length > 0) break;
        }

        console.log(`Found ${modelElements.length} model elements`);

        modelElements.forEach((row, index) => {
          try {
            // Skip header rows
            if (row.querySelector('th, [class*="header"]')) return;

            const text = row.textContent || '';
            const nameMatch = text.match(/^([^(]+)/);
            const costMatch = text.match(/(\d+(?:\.\d+)?x|Free|BYOK)/);
            
            // Look for promo indicators
            const hasGiftIcon = row.querySelector('svg[title*="promo"], [title*="gift"], .promo-icon, .gift-icon') ||
                               text.toLowerCase().includes('promo') ||
                               row.innerHTML.includes('🎁') ||
                               row.querySelector('[class*="promo"], [class*="gift"]');

            if (nameMatch && costMatch) {
              const name = nameMatch[1].trim();
              const cost = costMatch[1];
              const badges = [];

              if (hasGiftIcon) badges.push('Promo');
              if (text.toLowerCase().includes('beta')) badges.push('Beta');
              if (text.toLowerCase().includes('new')) badges.push('New');
              if (text.toLowerCase().includes('selected')) badges.push('Selected');
              if (text.toLowerCase().includes('fast')) badges.push('Fast');

              models.push({
                name,
                cost,
                badges
              });
            }
          } catch (e) {
            console.warn(`Error processing row ${index}:`, e);
          }
        });

        return models;
      });

      this.models = modelsData;
      console.log(`✅ Extracted ${this.models.length} models`);

    } catch (error) {
      console.error('❌ Error scraping models:', error);
      throw error;
    }
  }

  async saveModels() {
    const data = {
      extracted_at: new Date().toISOString(),
      source: WINDSURF_MODELS_URL,
      total_models: this.models.length,
      models: this.models
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
    console.log(`💾 Saved ${this.models.length} models to ${OUTPUT_FILE}`);

    // Also save a backup with timestamp
    const backupFile = OUTPUT_FILE.replace('.json', `-${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
    console.log(`📦 Backup saved to ${backupFile}`);
  }

  async updateExtensionModels() {
    console.log('🔄 Updating extension models...');
    
    try {
      // Read the current cascadeController.ts
      let content = fs.readFileSync(EXTENSION_MODELS_FILE, 'utf8');
      
      // Generate new model definitions
      const newModelDefinitions = this.generateModelDefinitions();
      
      // Replace the ALL_WINDSURF_MODELS constant
      const startMarker = 'export const ALL_WINDSURF_MODELS: Record<string, ModelInfo> = {';
      const endMarker = '};';
      
      const startIndex = content.indexOf(startMarker);
      const endIndex = content.indexOf(endMarker, startIndex) + endMarker.length;
      
      if (startIndex === -1 || endIndex === -1) {
        throw new Error('Could not find ALL_WINDSURF_MODELS constant in cascadeController.ts');
      }
      
      const newContent = content.substring(0, startIndex) + 
                        startMarker + '\n' + 
                        newModelDefinitions + '\n' + 
                        content.substring(endIndex);
      
      fs.writeFileSync(EXTENSION_MODELS_FILE, newContent);
      console.log('✅ Updated cascadeController.ts with latest models');
      
    } catch (error) {
      console.error('❌ Error updating extension models:', error);
      throw error;
    }
  }

  generateModelDefinitions() {
    const definitions = [];
    
    this.models.forEach(model => {
      const id = this.modelNameToId(model.name);
      const tier = this.determineTier(model.cost, model.badges);
      const credits = this.parseCredits(model.cost);
      const description = `${model.name} - Cost: ${model.cost}${model.badges.length > 0 ? ' [' + model.badges.join(', ') + ']' : ''}`;
      const strengths = this.generateStrengths(model.name, model.badges);
      
      let modelDef = `  "${id}": {
    id: "${id}",
    name: "${model.name}",
    tier: "${tier}",
    credits: ${typeof credits === 'number' ? credits : `"${credits}"`},
    description: "${description}",
    strengths: [${strengths.map(s => `"${s}"`).join(', ')}]`;
      
      // Add promo fields if applicable
      if (model.badges.includes('Promo')) {
        const originalCost = this.estimateOriginalCost(model.name, model.cost);
        modelDef += `,
    isPromo: true,
    promoDescription: "Promotional pricing - limited time offer!",
    originalCost: "${originalCost}"`;
      }
      
      modelDef += '\n  },';
      definitions.push(modelDef);
    });
    
    return definitions.join('\n');
  }

  modelNameToId(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  determineTier(cost, badges) {
    if (cost === 'Free' || cost === 'BYOK') return 'free';
    if (cost === '0.125x' || cost === '0.25x') return 'cheap';
    if (cost === '0.5x' || cost === '0.75x') return 'cheap';
    if (cost === '1x') return 'cheap';
    if (cost === '1.5x' || cost === '1.75x') return 'standard';
    if (cost === '2x' || cost === '3x') return 'smart';
    if (cost >= '4x') return 'premium';
    if (badges.includes('Fast')) return 'fast';
    return 'standard';
  }

  parseCredits(cost) {
    if (cost === 'Free' || cost === 'BYOK') return 0;
    if (cost.includes('x')) return cost;
    return parseFloat(cost) || 0;
  }

  generateStrengths(name, badges) {
    const strengths = [];
    
    // Provider-based strengths
    if (name.toLowerCase().includes('claude')) strengths.push('Anthropic Claude');
    if (name.toLowerCase().includes('gpt')) strengths.push('OpenAI GPT');
    if (name.toLowerCase().includes('gemini')) strengths.push('Google Gemini');
    if (name.toLowerCase().includes('deepseek')) strengths.push('DeepSeek');
    if (name.toLowerCase().includes('swe')) strengths.push('Cognition AI');
    if (name.toLowerCase().includes('kimi')) strengths.push('Moonshot AI');
    if (name.toLowerCase().includes('grok')) strengths.push('xAI');
    if (name.toLowerCase().includes('qwen')) strengths.push('Alibaba');
    
    // Capability-based strengths
    if (name.toLowerCase().includes('thinking')) strengths.push('Enhanced reasoning');
    if (name.toLowerCase().includes('codex')) strengths.push('Code-specialized');
    if (name.toLowerCase().includes('fast')) strengths.push('Fast processing');
    if (name.toLowerCase().includes('high')) strengths.push('High performance');
    if (name.toLowerCase().includes('opus')) strengths.push('Premium quality');
    
    // Badge-based strengths
    if (badges.includes('Promo')) strengths.push('Promotional pricing');
    if (badges.includes('New')) strengths.push('Latest model');
    if (badges.includes('Beta')) strengths.push('Beta features');
    if (badges.includes('Free')) strengths.push('No cost');
    
    // Default strength if none found
    if (strengths.length === 0) strengths.push('General purpose');
    
    return strengths;
  }

  estimateOriginalCost(name, currentCost) {
    // Estimate original cost based on model type
    if (name.includes('Sonnet 4.5')) return '4x';
    if (name.includes('Kimi')) return '0.5x-1x';
    if (name.includes('SWE-1.5')) return 'Premium (paid)';
    return 'Standard pricing';
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser closed');
    }
  }

  async run() {
    try {
      await this.init();
      await this.scrapeModels();
      await this.saveModels();
      await this.updateExtensionModels();
      
      console.log('🎉 Scraping completed successfully!');
      console.log(`📊 Processed ${this.models.length} models`);
      
      // Show promo models
      const promoModels = this.models.filter(m => m.badges.includes('Promo'));
      if (promoModels.length > 0) {
        console.log('🎁 Found promotional models:');
        promoModels.forEach(m => {
          console.log(`   - ${m.name}: ${m.cost}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Scraping failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the scraper
if (require.main === module) {
  const scraper = new WindsurfPriceScraper();
  scraper.run().catch(console.error);
}

module.exports = WindsurfPriceScraper;
