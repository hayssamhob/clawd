#!/usr/bin/env node

/**
 * Windsurf Internal Model Price Scraper
 *
 * This script reads Windsurf's internal model configuration
 * by monitoring the application's data files and extracting
 * current pricing information.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

class WindsurfInternalScraper {
  constructor() {
    this.models = [];
    this.windsurfPaths = this.findWindsurfPaths();
  }

  findWindsurfPaths() {
    const homeDir = os.homedir();
    const possiblePaths = [
      path.join(homeDir, ".windsurf"),
      path.join(homeDir, "Library", "Application Support", "Windsurf"),
      path.join(homeDir, ".config", "Windsurf"),
      path.join(homeDir, "AppData", "Roaming", "Windsurf"),
    ];

    return possiblePaths.filter((p) => fs.existsSync(p));
  }

  async scrapeModels() {
    console.log("🔍 Searching for Windsurf model data...");

    // Method 1: Look for model configuration files
    await this.searchModelConfigs();

    // Method 2: Look for cached web data
    await this.searchWebCache();

    // Method 3: Look for extension data
    await this.searchExtensionData();

    if (this.models.length === 0) {
      console.log(
        "⚠️  No models found internally. Falling back to web scraping...",
      );
      await this.fallbackWebScrape();
    }
  }

  async searchModelConfigs() {
    for (const basePath of this.windsurfPaths) {
      const configPaths = [
        path.join(basePath, "models.json"),
        path.join(basePath, "config", "models.json"),
        path.join(basePath, "User", "models.json"),
        path.join(basePath, "settings.json"),
        path.join(basePath, "cascade-models.json"),
      ];

      for (const configPath of configPaths) {
        if (fs.existsSync(configPath)) {
          try {
            const content = fs.readFileSync(configPath, "utf8");
            const data = JSON.parse(content);
            this.extractModelsFromData(data, configPath);
          } catch (e) {
            // Not valid JSON, continue
          }
        }
      }
    }
  }

  async searchWebCache() {
    for (const basePath of this.windsurfPaths) {
      const cachePaths = [
        path.join(basePath, "Cache"),
        path.join(basePath, "Caches"),
        path.join(basePath, "Code Cache"),
      ];

      for (const cachePath of cachePaths) {
        if (fs.existsSync(cachePath)) {
          await this.searchCacheFiles(cachePath);
        }
      }
    }
  }

  async searchCacheFiles(cacheDir) {
    const searchCache = (dir) => {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          searchCache(fullPath);
        } else if (
          item.includes("model") ||
          item.includes("windsurf") ||
          item.includes("cascade")
        ) {
          try {
            const content = fs.readFileSync(fullPath, "utf8");
            if (
              content.includes("credits") ||
              content.includes("pricing") ||
              content.includes("model")
            ) {
              this.extractModelsFromText(content, fullPath);
            }
          } catch (e) {
            // Binary file, skip
          }
        }
      }
    };

    searchCache(cacheDir);
  }

  async searchExtensionData() {
    // Look for VS Code extension data
    const vscodePaths = [
      path.join(os.homedir(), ".vscode", "extensions"),
      path.join(os.homedir(), ".vscode-server"),
    ];

    for (const vscodePath of vscodePaths) {
      if (fs.existsSync(vscodePath)) {
        await this.searchInDirectory(vscodePath, "windsurf");
      }
    }
  }

  async searchInDirectory(dir, keyword) {
    if (!fs.existsSync(dir)) return;

    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (item.toLowerCase().includes(keyword)) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            await this.searchInDirectory(fullPath, keyword);
          } else if (item.endsWith(".json")) {
            try {
              const content = fs.readFileSync(fullPath, "utf8");
              const data = JSON.parse(content);
              this.extractModelsFromData(data, fullPath);
            } catch (e) {
              // Not valid JSON
            }
          }
        }
      }
    } catch (e) {
      // Permission denied, continue
    }
  }

  extractModelsFromData(data, source) {
    if (Array.isArray(data)) {
      data.forEach((item) => this.extractModelsFromItem(item, source));
    } else if (typeof data === "object") {
      this.extractModelsFromItem(data, source);
    }
  }

  extractModelsFromItem(item, source) {
    // Look for model-like objects
    if (item.name && (item.cost || item.credits || item.price)) {
      const model = {
        name: item.name,
        cost: item.cost || item.credits || item.price || "Unknown",
        badges: [],
      };

      if (item.promo || item.isPromo || item.gift) model.badges.push("Promo");
      if (item.beta) model.badges.push("Beta");
      if (item.new) model.badges.push("New");

      this.models.push(model);
      console.log(
        `✅ Found model: ${model.name} (${model.cost}) from ${source}`,
      );
    }

    // Recursively search nested objects
    if (typeof item === "object" && item !== null) {
      Object.values(item).forEach((value) => {
        if (typeof value === "object") {
          this.extractModelsFromData(value, source);
        }
      });
    }
  }

  extractModelsFromText(text, source) {
    // Look for model patterns in text
    const modelPatterns = [
      /([A-Za-z][A-Za-z0-9\s\.\-]+\d(?:\.\d)?)\s*[:\-]?\s*(\d+(?:\.\d+)?x|Free|BYOK)/gi,
      /"name":\s*"([^"]+)".*?"cost":\s*"([^"]+)"/gi,
      /Model:\s*([^\n,]+).*?Cost:\s*([^\n,]+)/gi,
    ];

    modelPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const model = {
          name: match[1].trim(),
          cost: match[2].trim(),
          badges: [],
        };

        // Check for promo indicators in surrounding text
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

        // Avoid duplicates
        if (!this.models.find((m) => m.name === model.name)) {
          this.models.push(model);
          console.log(
            `✅ Found model: ${model.name} (${model.cost}) from ${source}`,
          );
        }
      }
    });
  }

  async fallbackWebScrape() {
    console.log("🌐 Attempting direct web scraping...");

    // Use a simpler approach with curl and grep
    const { exec } = require("child_process");
    const util = require("util");
    const execPromise = util.promisify(exec);

    try {
      const { stdout } = await execPromise(
        'curl -s "https://docs.windsurf.com/windsurf/models" | grep -oE "[A-Za-z][A-Za-z0-9\s\.\-]+\d(?:\.\d+)?\s*[:\-]?\s*(\d+(?:\.\d+)?x|Free|BYOK)" | head -20',
      );

      const lines = stdout.split("\n").filter((line) => line.trim());
      lines.forEach((line) => {
        const match = line.match(
          /([A-Za-z][A-Za-z0-9\s\.\-]+\d(?:\.\d)?)\s*[:\-]?\s*(\d+(?:\.\d+)?x|Free|BYOK)/,
        );
        if (match) {
          const model = {
            name: match[1].trim(),
            cost: match[2].trim(),
            badges: [],
          };

          if (!this.models.find((m) => m.name === model.name)) {
            this.models.push(model);
            console.log(
              `✅ Found model: ${model.name} (${model.cost}) from web`,
            );
          }
        }
      });
    } catch (e) {
      console.log("❌ Web scraping failed:", e.message);
    }
  }

  async saveModels() {
    const outputPath = path.join(__dirname, "windsurf-models-actual.json");
    const data = {
      extracted_at: new Date().toISOString(),
      source: "Windsurf Internal Scraper",
      total_models: this.models.length,
      models: this.models,
    };

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`💾 Saved ${this.models.length} models to ${outputPath}`);

    // Update extension if we have models
    if (this.models.length > 0) {
      await this.updateExtensionModels();
    }
  }

  async updateExtensionModels() {
    console.log("🔄 Updating extension models...");

    // This would integrate with the existing cascadeController.ts update logic
    // For now, just save the data
    console.log("✅ Model data ready for extension update");
  }

  async run() {
    try {
      console.log("🚀 Starting Windsurf internal price scraper...");
      await this.scrapeModels();
      await this.saveModels();

      console.log("🎉 Scraping completed!");
      console.log(`📊 Found ${this.models.length} models`);

      if (this.models.length > 0) {
        console.log("\n📋 Models found:");
        this.models.forEach((m) => {
          console.log(
            `   - ${m.name}: ${m.cost}${m.badges.length > 0 ? " [" + m.badges.join(", ") + "]" : ""}`,
          );
        });
      }
    } catch (error) {
      console.error("❌ Scraping failed:", error);
      throw error;
    }
  }
}

// Run the scraper
if (require.main === module) {
  const scraper = new WindsurfInternalScraper();
  scraper.run().catch(console.error);
}

module.exports = WindsurfInternalScraper;
