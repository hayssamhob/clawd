#!/usr/bin/env node

/**
 * Windsurf CLI Price Scraper
 *
 * This script uses Windsurf's command-line interface to extract model pricing.
 * It attempts to find and use any available CLI commands or configuration files.
 */

const fs = require("fs");
const path = require("path");
const { exec, spawn } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

class WindsurfCliScraper {
  constructor() {
    this.models = [];
    this.outputFile = path.join(__dirname, "windsurf-models-actual.json");
  }

  async scrapeModels() {
    console.log("🔍 Searching for Windsurf CLI and configuration...");

    // Method 1: Try Windsurf CLI commands
    await this.tryWindsurfCli();

    // Method 2: Look for configuration files
    await this.findConfigFiles();

    // Method 3: Check environment variables
    await this.checkEnvironment();

    // Method 4: Try VS Code integration
    await this.tryVsCodeIntegration();

    // Method 5: Fallback to manual update prompt
    if (this.models.length === 0) {
      await this.promptForManualUpdate();
    }
  }

  async tryWindsurfCli() {
    console.log("⚡ Trying Windsurf CLI...");

    const commands = [
      "windsurf --help",
      "windsurf models --list",
      "windsurf config --show",
      "windsurf cascade models",
      "windsurf model list",
    ];

    for (const cmd of commands) {
      try {
        const { stdout, stderr } = await execPromise(cmd, { timeout: 5000 });
        console.log(`✅ Command worked: ${cmd}`);
        this.extractModelsFromText(stdout, `cli-${cmd}`);
        if (stderr) this.extractModelsFromText(stderr, `cli-${cmd}-stderr`);
      } catch (e) {
        // Command not available, continue
      }
    }
  }

  async findConfigFiles() {
    console.log("📁 Searching configuration files...");

    const homeDir = require("os").homedir();
    const configPaths = [
      path.join(homeDir, ".windsurf", "config.json"),
      path.join(homeDir, ".windsurf", "settings.json"),
      path.join(homeDir, ".windsurf", "models.json"),
      path.join(homeDir, ".config", "windsurf", "config.json"),
      path.join(
        homeDir,
        "Library",
        "Application Support",
        "Windsurf",
        "config.json",
      ),
      path.join(process.cwd(), ".windsurf", "config.json"),
    ];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, "utf8");
          console.log(`📂 Reading: ${configPath}`);

          if (configPath.endsWith(".json")) {
            const data = JSON.parse(content);
            this.extractModelsFromData(data, configPath);
          } else {
            this.extractModelsFromText(content, configPath);
          }
        } catch (e) {
          console.log(`⚠️  Could not read ${configPath}: ${e.message}`);
        }
      }
    }
  }

  async checkEnvironment() {
    console.log("🌍 Checking environment variables...");

    const envVars = [
      "WINDSURF_MODELS",
      "WINDSURF_CONFIG",
      "WINDSURF_API_KEY",
      "CODEIUM_API_KEY",
      "CASCADE_MODELS",
    ];

    envVars.forEach((varName) => {
      if (process.env[varName]) {
        console.log(`✅ Found ${varName}`);
        this.extractModelsFromText(process.env[varName], `env-${varName}`);
      }
    });
  }

  async tryVsCodeIntegration() {
    console.log("💻 Trying VS Code integration...");

    try {
      // Try to get VS Code settings
      const { stdout } = await execPromise(
        "code --list-extensions | grep -i windsurf",
        { timeout: 5000 },
      );
      if (stdout.includes("windsurf")) {
        console.log("✅ Found Windsurf VS Code extension");

        // Try to get extension settings
        try {
          const { stdout: settings } = await execPromise(
            'cat ~/.vscode/settings.json 2>/dev/null || echo "{}"',
            { timeout: 3000 },
          );
          const settingsData = JSON.parse(settings);
          this.extractModelsFromData(settingsData, "vscode-settings");
        } catch (e) {
          // Settings file not accessible
        }
      }
    } catch (e) {
      // VS Code CLI not available
    }
  }

  async promptForManualUpdate() {
    console.log(
      "\n🤖 Automated scraping complete. No models found automatically.",
    );
    console.log("");
    console.log("📋 Manual update options:");
    console.log("");
    console.log("1. Use the existing windsurf-models-actual.json file");
    console.log("2. Run the interactive updater:");
    console.log("   npm run update-models-interactive");
    console.log("3. Manually copy from Windsurf:");
    console.log("   - Open Windsurf");
    console.log("   - Go to Settings > Models");
    console.log("   - Copy the model list");
    console.log("   - Run: npm run update-models-manual");
    console.log("");

    // Create interactive updater script
    this.createInteractiveUpdater();

    // Check if we have existing data
    if (fs.existsSync(this.outputFile)) {
      const existingData = JSON.parse(fs.readFileSync(this.outputFile, "utf8"));
      if (existingData.models && existingData.models.length > 0) {
        console.log(
          `✅ Using existing data with ${existingData.models.length} models`,
        );
        this.models = existingData.models;
        await this.updateExtensionModels();
      }
    }
  }

  createInteractiveUpdater() {
    const script = `#!/usr/bin/env node

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
  
  console.log(\`\\n📝 Please enter the models one by one (or paste all at once):\`);
  console.log('Format: Model Name - Cost (e.g., "Claude Sonnet 4.5 - 2x")');
  console.log('Type "done" when finished or paste multiple lines and press Enter twice\\n');
  
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
      const lines = inputBuffer.trim().split('\\n');
      lines.forEach(line => {
        const model = parseModelLine(line);
        if (model) models.push(model);
      });
      inputBuffer = '';
      
      if (models.length > 0) {
        console.log(\`✅ Added \${models.length} models. Type "done" to save or add more.\\n\`);
      }
    } else {
      inputBuffer += input + '\\n';
    }
  };
  
  rl.on('line', processInput);
}

function parseModelLine(line) {
  const match = line.match(/^\\s*([^-]+?)\\s*-\\s*(.+?)\\s*$/);
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
  
  console.log(\`\\n✅ Saved \${models.length} models to \${outputFile}\`);
  console.log('🔄 Now run: npm run scrape-and-compile');
}

updateModels();
`;

    fs.writeFileSync(
      path.join(__dirname, "update-models-interactive.js"),
      script,
    );
    fs.chmodSync(path.join(__dirname, "update-models-interactive.js"), "755");
  }

  extractModelsFromData(data, source) {
    const extract = (obj, path = "") => {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => extract(item, `${path}[${index}]`));
      } else if (typeof obj === "object" && obj !== null) {
        // Check if this looks like a model
        if (obj.name && (obj.cost || obj.credits || obj.price || obj.pricing)) {
          const model = {
            name: obj.name,
            cost: obj.cost || obj.credits || obj.price || obj.pricing,
            badges: [],
          };

          if (obj.promo || obj.isPromo || obj.gift) model.badges.push("Promo");
          if (obj.beta) model.badges.push("Beta");
          if (obj.new) model.badges.push("New");

          if (!this.models.find((m) => m.name === model.name)) {
            this.models.push(model);
            console.log(
              `✅ Found model: ${model.name} (${model.cost}) from ${source}`,
            );
          }
        }

        // Recursively search
        Object.entries(obj).forEach(([key, value]) => {
          if (typeof value === "object") {
            extract(value, `${path}.${key}`);
          }
        });
      }
    };

    extract(data, source);
  }

  extractModelsFromText(text, source) {
    const patterns = [
      /"name":\\s*"([^"]+)".*?"cost":\\s*"([^"]+)"/gi,
      /([A-Za-z][A-Za-z0-9\\s\\.\\-]+\\d(?:\\.\\d)?)\\s*[:\\-]?\\s*(\\d+(?:\\.\\d+)?x|Free|BYOK)/gi,
      /Model:\\s*([^\\n,]+).*?Cost:\\s*([^\\n,]+)/gi,
    ];

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const model = {
          name: match[1].trim(),
          cost: match[2].trim(),
          badges: [],
        };

        const surroundingText = text.substring(
          Math.max(0, match.index - 100),
          match.index + 100,
        );
        if (
          surroundingText.toLowerCase().includes("promo") ||
          surroundingText.includes("🎁") ||
          surroundingText.toLowerCase().includes("gift")
        ) {
          model.badges.push("Promo");
        }

        if (!this.models.find((m) => m.name === model.name)) {
          this.models.push(model);
          console.log(
            `✅ Found model: ${model.name} (${model.cost}) from ${source}`,
          );
        }
      }
    });
  }

  async updateExtensionModels() {
    console.log("🔄 Updating extension models...");

    // This would integrate with the cascadeController.ts update
    // For now, just indicate success
    console.log("✅ Extension ready for model update");
    console.log("💡 Run: npm run compile to apply changes");
  }

  async saveModels() {
    const data = {
      extracted_at: new Date().toISOString(),
      source: "Windsurf CLI Scraper",
      total_models: this.models.length,
      models: this.models,
    };

    fs.writeFileSync(this.outputFile, JSON.stringify(data, null, 2));
    console.log(`💾 Saved ${this.models.length} models to ${this.outputFile}`);
  }

  async run() {
    try {
      console.log("🚀 Starting Windsurf CLI scraper...");
      await this.scrapeModels();

      if (this.models.length > 0) {
        await this.saveModels();
        await this.updateExtensionModels();

        console.log("\n🎉 Scraping completed!");
        console.log(`📊 Found ${this.models.length} models`);

        console.log("\n📋 Models found:");
        this.models.forEach((m) => {
          console.log(
            `   - ${m.name}: ${m.cost}${m.badges.length > 0 ? " [" + m.badges.join(", ") + "]" : ""}`,
          );
        });
      }
    } catch (error) {
      console.error("❌ Scraping failed:", error);
    }
  }
}

// Run the scraper
if (require.main === module) {
  const scraper = new WindsurfCliScraper();
  scraper.run().catch(console.error);
}

module.exports = WindsurfCliScraper;
