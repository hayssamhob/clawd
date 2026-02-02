#!/usr/bin/env node
/**
 * Benchmark models for Augustus persona adherence
 */

const fs = require('fs');
const path = require('path');

// Read persona files
const SOUL = fs.readFileSync('SOUL.md', 'utf-8');
const USER = fs.readFileSync('USER.md', 'utf-8');
const AGENTS = fs.readFileSync('AGENTS.md', 'utf-8');

const TEST_PROMPT = "Who are you? Describe yourself in 2-3 sentences.";

const MODELS = [
  { id: 'llama3.2:latest', name: 'Llama 3.2 (Ollama)', baseUrl: 'http://127.0.0.1:11434/v1', key: 'ollama-local' },
  { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder (OpenRouter)', baseUrl: 'https://openrouter.ai/api/v1', key: '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' },
  { id: 'mistralai/devstral-2512:free', name: 'Devstral (OpenRouter)', baseUrl: 'https://openrouter.ai/api/v1', key: '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' },
  { id: 'stepfun/step-3.5-flash:free', name: 'Step 3.5 Flash (OpenRouter)', baseUrl: 'https://openrouter.ai/api/v1', key: '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' }
];

const SYSTEM_CONTEXT = `# Project Context
${SOUL}

${USER}

${AGENTS}

You are Augustus, Hayssam's AI assistant. Embody the persona defined in SOUL.md.`;

async function testModel(model) {
  console.log(`\n📊 Testing: ${model.name}`);
  console.log('─'.repeat(60));
  
  const modelId = model.id.includes('/') ? model.id.split('/').slice(-1)[0] : model.id;
  
  try {
    const response = await fetch(`${model.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${model.key}`
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: SYSTEM_CONTEXT },
          { role: 'user', content: TEST_PROMPT }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Error: ${response.status} - ${error.substring(0, 100)}`);
      return;
    }
    
    const data = await response.json();
    const reply = data.choices[0].message.content;
    
    console.log(`✅ Response:`);
    console.log(reply);
    
    // Score the response
    const hasAugustus = /augustus/i.test(reply);
    const hasSoul = /soul|persona|creative|proposition/i.test(reply);
    const hasHayssam = /hayssam/i.test(reply);
    
    const score = (hasAugustus ? 1 : 0) + (hasSoul ? 1 : 0) + (hasHayssam ? 1 : 0);
    
    console.log(`\n📈 Score: ${score}/3`);
    console.log(`   - Mentions "Augustus": ${hasAugustus ? '✓' : '✗'}`);
    console.log(`   - References persona/traits: ${hasSoul ? '✓' : '✗'}`);
    console.log(`   - Mentions Hayssam: ${hasHayssam ? '✓' : '✗'}`);
    
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
  }
}

(async () => {
  console.log('🧪 Augustus Persona Benchmark');
  console.log('═'.repeat(60));
  
  for (const model of MODELS) {
    await testModel(model);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limit
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('✅ Benchmark complete!');
})();
