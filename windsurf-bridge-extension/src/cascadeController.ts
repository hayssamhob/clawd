import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

// Complete list of all Windsurf models based on official documentation
// Users can specify any modelId directly, or use tier shortcuts
export const ALL_WINDSURF_MODELS: Record<string, ModelInfo> = {
  // FREE MODELS (0 Credits)
  "swe-1.5-free": {
    id: "swe-1.5-free",
    name: "SWE-1.5 Free",
    tier: "free",
    credits: 0,
    description:
      "Near-frontier performance, free for 3 months. Best default choice.",
    strengths: ["General coding", "Features", "Bug fixes", "Refactoring"],
  },
  "swe-1-lite": {
    id: "swe-1-lite",
    name: "SWE-1 Lite",
    tier: "free",
    credits: 0,
    description: "Ultra-fast, always free. Good for quick edits.",
    strengths: ["Quick edits", "Simple fixes", "Code completion"],
  },
  "grok-fast-code": {
    id: "grok-fast-code",
    name: "Grok Fast Code",
    tier: "free",
    credits: 0,
    description: "Fast, code-optimized. Good for experiments.",
    strengths: ["Quick experiments", "Simple tasks"],
  },

  // LOW COST MODELS (0.5 Credits)
  "deepseek-v3": {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    tier: "cheap",
    credits: 0.5,
    description: "Excellent coding, competitive with GPT-4. Great value.",
    strengths: ["Complex coding", "Algorithm implementation", "Reasoning"],
  },
  "gemini-2.0-flash": {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    tier: "cheap",
    credits: 0.5,
    description: "Very fast, efficient, good reasoning.",
    strengths: ["Fast iterations", "Agentic workflows", "Speed critical"],
  },
  codex: {
    id: "codex",
    name: "Codex (GPT-5.2-Codex)",
    tier: "cheap",
    credits: 0,
    description: "Code-specialized GPT variant. Good for documentation.",
    strengths: ["Documentation", "API integration", "Complex codebases"],
  },
  "gpt-5-low-reasoning": {
    id: "gpt-5-low-reasoning",
    name: "GPT-5 Low Reasoning",
    tier: "cheap",
    credits: 0.5,
    description: "Fast GPT-5 variant. Simple tasks only.",
    strengths: ["Simple coding", "Fast results", "Predictable cost"],
  },

  // PREMIUM MODELS (Token-based, higher cost)
  "claude-3.5-haiku": {
    id: "claude-3.5-haiku",
    name: "Claude 3.5 Haiku",
    tier: "smart",
    credits: "token-based",
    description: "Best reasoning in Claude 3.5 family. Use sparingly.",
    strengths: [
      "Complex architecture",
      "Critical bug fixes",
      "High-stakes code",
    ],
  },
  "claude-3.5-sonnet": {
    id: "claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    tier: "smart",
    credits: "token-based",
    description: "Top-tier reasoning. Most capable Claude 3.5 model.",
    strengths: [
      "Critical architecture",
      "Complex debugging",
      "Large codebases",
    ],
  },
  "claude-4-sonnet": {
    id: "claude-4-sonnet",
    name: "Claude 4 Sonnet (BYOK)",
    tier: "smart",
    credits: 0,
    description: "Latest Claude model. Requires own API key.",
    strengths: [
      "Latest features",
      "Advanced reasoning",
      "Avoids Windsurf credits",
    ],
  },
  "claude-4-opus": {
    id: "claude-4-opus",
    name: "Claude 4 Opus (BYOK)",
    tier: "smart",
    credits: 0,
    description: "Most powerful Claude. Very expensive via API.",
    strengths: ["Ultra-complex tasks", "Emergency only"],
  },

  // SPECIALIZED MODELS
  "swe-1.5-paid": {
    id: "swe-1.5-paid",
    name: "SWE-1.5 (Paid)",
    tier: "fast",
    credits: "premium",
    description: "13x faster than Claude. Cerebras hardware.",
    strengths: [
      "Tight deadlines",
      "Real-time pair programming",
      "Speed critical",
    ],
  },
  "gpt-4.5": {
    id: "gpt-4.5",
    name: "GPT-4.5",
    tier: "experimental",
    credits: "variable",
    description: "Beta model. Use cautiously.",
    strengths: ["Testing new features"],
  },
};

// Tier mappings for convenience - OpenClaw can use these or specify exact model
export const TIER_MODELS: Record<string, string> = {
  free: "swe-1.5-free",
  cheap: "deepseek-v3",
  smart: "claude-3.5-haiku",
  fast: "gemini-2.0-flash",
};

interface ModelInfo {
  id: string;
  name: string;
  tier: string;
  credits: number | string;
  description: string;
  strengths: string[];
}

interface ModelConfig {
  tier: "cheap" | "smart" | "free";
  modelId: string;
  displayName: string;
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  cheap: {
    tier: "cheap",
    modelId: "deepseek-v3",
    displayName: "DeepSeek V3",
  },
  smart: {
    tier: "smart",
    modelId: "claude-3.5-sonnet",
    displayName: "Claude 3.5 Sonnet",
  },
  free: {
    tier: "free",
    modelId: "swe-1.5-free",
    displayName: "SWE-1.5 Free",
  },
};

export class CascadeController {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Get list of all available models
   */
  getAllModels(): Record<string, ModelInfo> {
    return ALL_WINDSURF_MODELS;
  }

  /**
   * Get models filtered by tier
   */
  getModelsByTier(tier: string): ModelInfo[] {
    return Object.values(ALL_WINDSURF_MODELS).filter((m) => m.tier === tier);
  }

  /**
   * Resolve model ID - handles both tier shortcuts and direct model IDs
   */
  resolveModelId(
    modelOrTier: string,
  ): { modelId: string; modelInfo: ModelInfo } | null {
    // Check if it's a tier shortcut
    if (TIER_MODELS[modelOrTier]) {
      const modelId = TIER_MODELS[modelOrTier];
      return {
        modelId,
        modelInfo: ALL_WINDSURF_MODELS[modelId],
      };
    }

    // Check if it's a direct model ID
    if (ALL_WINDSURF_MODELS[modelOrTier]) {
      return {
        modelId: modelOrTier,
        modelInfo: ALL_WINDSURF_MODELS[modelOrTier],
      };
    }

    // Try to find by name (case-insensitive partial match)
    const model = Object.values(ALL_WINDSURF_MODELS).find((m) =>
      m.name.toLowerCase().includes(modelOrTier.toLowerCase()),
    );

    if (model) {
      return {
        modelId: model.id,
        modelInfo: model,
      };
    }

    return null;
  }

  /**
   * Switch to any model by ID or tier
   */
  async switchModel(modelOrTier: string): Promise<{
    success: boolean;
    model: string;
    modelId: string;
    credits: number | string;
    message: string;
  }> {
    const resolved = this.resolveModelId(modelOrTier);

    if (!resolved) {
      return {
        success: false,
        model: "",
        modelId: "",
        credits: 0,
        message: `Unknown model or tier: ${modelOrTier}. Use 'list_models' to see available options.`,
      };
    }

    const { modelId, modelInfo } = resolved;

    try {
      const vsConfig = vscode.workspace.getConfiguration();

      // Try multiple possible setting keys
      const possibleKeys = [
        "codeium.chat.model",
        "windsurf.cascade.model",
        "codeium.model",
        "windsurf.ai.model",
        "codeium.cascade.model",
      ];

      let keyFound = false;
      for (const key of possibleKeys) {
        const inspection = vsConfig.inspect(key);
        if (inspection !== undefined) {
          await vsConfig.update(
            key,
            modelId,
            vscode.ConfigurationTarget.Global,
          );
          keyFound = true;
          console.log(`Updated ${key} to ${modelId}`);
        }
      }

      // If no key found, try the most common one anyway
      if (!keyFound) {
        await vsConfig.update(
          "codeium.chat.model",
          modelId,
          vscode.ConfigurationTarget.Global,
        );
      }

      // Also save to globalState as backup
      await this.context.globalState.update(
        "windsurf.cascade.selectedModel",
        modelId,
      );

      return {
        success: true,
        model: modelInfo.name,
        modelId: modelId,
        credits: modelInfo.credits,
        message: `Switched to ${modelInfo.name} (${modelId}) - ${modelInfo.description}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        model: "",
        modelId: "",
        credits: 0,
        message: `Failed to switch model: ${errorMessage}`,
      };
    }
  }

  async focusCascade(): Promise<{ success: boolean; message: string }> {
    try {
      const possibleCommands = [
        "codeium.chat.focus",
        "windsurf.cascade.focus",
        "workbench.view.extension.codeium",
        "codeium.openChat",
      ];

      for (const cmd of possibleCommands) {
        try {
          await vscode.commands.executeCommand(cmd);
          return {
            success: true,
            message: `Focused Cascade using command: ${cmd}`,
          };
        } catch (e) {
          continue;
        }
      }

      return {
        success: false,
        message: "Could not find Cascade focus command",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to focus Cascade: ${errorMessage}`,
      };
    }
  }

  async sendPromptToCascade(
    prompt: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.focusCascade();

      await new Promise((resolve) => setTimeout(resolve, 500));

      const possibleCommands = [
        "codeium.chat.sendMessage",
        "windsurf.cascade.sendPrompt",
        "codeium.sendChatMessage",
      ];

      for (const cmd of possibleCommands) {
        try {
          await vscode.commands.executeCommand(cmd, prompt);
          return {
            success: true,
            message: `Sent prompt using command: ${cmd}`,
          };
        } catch (e) {
          continue;
        }
      }

      await vscode.env.clipboard.writeText(prompt);
      await vscode.commands.executeCommand(
        "editor.action.clipboardPasteAction",
      );

      await new Promise((resolve) => setTimeout(resolve, 200));

      const terminalCommands = [
        "workbench.action.terminal.acceptSelectedSuggestion",
        "workbench.action.acceptSelectedSuggestion",
      ];

      for (const cmd of terminalCommands) {
        try {
          await vscode.commands.executeCommand(cmd);
          break;
        } catch (e) {
          continue;
        }
      }

      return {
        success: true,
        message: "Sent prompt via clipboard paste (fallback method)",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to send prompt: ${errorMessage}`,
      };
    }
  }

  /**
   * Delegate task with automatic model selection support
   * OpenClaw can specify: tier (free/cheap/smart/fast) OR exact model ID OR partial model name
   */
  async delegateTask(
    prompt: string,
    modelOrTier: string = "free",
  ): Promise<{
    success: boolean;
    model: string;
    modelId: string;
    credits: number | string;
    promptSent: boolean;
    message: string;
  }> {
    const modelSwitch = await this.switchModel(modelOrTier);
    if (!modelSwitch.success) {
      return {
        success: false,
        model: "",
        modelId: "",
        credits: 0,
        promptSent: false,
        message: modelSwitch.message,
      };
    }

    const promptResult = await this.sendPromptToCascade(prompt);

    return {
      success: promptResult.success,
      model: modelSwitch.model,
      modelId: modelSwitch.modelId,
      credits: modelSwitch.credits,
      promptSent: promptResult.success,
      message: `Model: ${modelSwitch.model}. ${promptResult.message}`,
    };
  }

  async getCascadeStatus(lines: number = 10): Promise<string> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return "No workspace folder open";
      }

      const config = vscode.workspace.getConfiguration("windsurf-bridge");
      const resultFile = config.get<string>("resultFile", "OPENCLAW_RESULT.md");
      const resultPath = path.join(workspaceFolders[0].uri.fsPath, resultFile);

      if (!fs.existsSync(resultPath)) {
        return `Result file not found: ${resultPath}`;
      }

      const content = fs.readFileSync(resultPath, "utf-8");
      const allLines = content.split("\n");
      const lastLines = allLines.slice(-lines);

      return lastLines.join("\n");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return `Error reading cascade status: ${errorMessage}`;
    }
  }
}
