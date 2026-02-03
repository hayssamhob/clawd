#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔄 Interactive Windsurf Model Updater');
console.log('Please open Windsurf and go to Settings > Models');
console.log('');

async function updateModels() {
  const answer = await new Promise(resolve => {
    rl.question('How many models do you see in Windsurf? ', resolve);
  });
  
  const modelCount = parseInt(answer);
  if (isNaN(modelCount) || modelCount <= 0) {
    console.log('❌ Invalid number');
    rl.close();
    return;
  }
  
  console.log(`\n📝 Please enter the models one by one (or paste all at once):`);
  console.log('Format: Model Name - Cost (e.g., "Claude Sonnet 4.5 - 2x")');
  console.log('Type "done" when finished or paste multiple lines and press Enter twice\n');
  
  const models = [];
  let inputBuffer = '';
  
  const processInput = (input) => {
    if (input.toLowerCase().trim() === 'done') {
      saveModels(models);
      rl.close();
      return;
    }
    
    if (input.trim() === '' && inputBuffer.trim() !== '') {
      // Process buffered input
      const lines = inputBuffer.trim().split('\n');
      lines.forEach(line => {
        const model = parseModelLine(line);
        if (model) models.push(model);
      });
      inputBuffer = '';
      
      if (models.length > 0) {
        console.log(`✅ Added ${models.length} models. Type "done" to save or add more.\n`);
      }
    } else {
      inputBuffer += input + '\n';
    }
  };
  
  rl.on('line', processInput);
}

function parseModelLine(line) {
  const match = line.match(/^\s*([^-]+?)\s*-\s*(.+?)\s*$/);
  if (!match) return null;
  
  const name = match[1].trim();
  const cost = match[2].trim();
  
  // Check for promo indicators
  const badges = [];
  if (line.toLowerCase().includes('promo') || line.includes('🎁')) badges.push('Promo');
  if (line.toLowerCase().includes('beta')) badges.push('Beta');
  if (line.toLowerCase().includes('new')) badges.push('New');
  
  return { name, cost, badges };
}

function saveModels(models) {
  const data = {
    extracted_at: new Date().toISOString(),
    source: 'Interactive Manual Update',
    total_models: models.length,
    models: models
  };
  
  const outputFile = path.join(__dirname, 'windsurf-models-actual.json');
  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
  
  console.log(`\n✅ Saved ${models.length} models to ${outputFile}`);
  console.log('🔄 Now run: npm run scrape-and-compile');
}

updateModels();
