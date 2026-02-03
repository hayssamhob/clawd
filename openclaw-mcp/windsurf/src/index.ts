#!/usr/bin/env node
/**
 * Windsurf MCP Server - Standalone
 * Provides Windsurf model information and basic integration for OpenClaw
 * Updated with complete 82-model list and promotional tracking
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";

// Complete Windsurf model data (82 models)
const WINDSURF_MODELS_FILE = path.join(
  process.env.HOME || "",
  "clawd",
  "windsurf-models-actual.json",
);

interface WindsurfModel {
  name: string;
  cost: string;
  badges: string[];
}

interface ModelData {
  extracted_at: string;
  source: string;
  total_models: number;
  models: WindsurfModel[];
}

let cachedModels: ModelData | null = null;

function loadModels(): ModelData {
  if (cachedModels) return cachedModels;

  try {
    if (fs.existsSync(WINDSURF_MODELS_FILE)) {
      const data = fs.readFileSync(WINDSURF_MODELS_FILE, "utf8");
      cachedModels = JSON.parse(data);
      return cachedModels!;
    }
  } catch (e) {
    console.error("Failed to load models:", e);
  }

  // Fallback minimal data
  return {
    extracted_at: new Date().toISOString(),
    source: "Fallback",
    total_models: 0,
    models: [],
  };
}

// Simple JSONL logger
const logDir = path.join(process.env.HOME || "", "clawd", "mcp_logs");
const logFile = path.join(logDir, "windsurf-mcp.log");

function writeLog(event: Record<string, unknown>) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
    const entry = {
      ts: new Date().toISOString(),
      ...event,
    };
    fs.appendFileSync(logFile, JSON.stringify(entry) + "\n", "utf8");
  } catch (err) {
    console.error("Failed to write log", err);
  }
}

function emitConsole(summary: string) {
  console.error(`[windsurf-mcp] ${summary}`);
}

// MCP Tool Definitions
const TOOLS: Tool[] = [
  {
    name: "windsurf_get_models",
    description:
      "Get complete list of 82 Windsurf models with pricing and promotional information. Returns models with their costs, tiers, and promo status.",
    inputSchema: {
      type: "object",
      properties: {
        promo_only: {
          type: "boolean",
          description: "If true, return only models with promotional pricing",
        },
        tier: {
          type: "string",
          description: "Filter by tier: free, cheap, standard, smart, premium",
        },
      },
      required: [],
    },
  },
  {
    name: "windsurf_switch_model",
    description:
      "Switch Windsurf to use a specific LLM model. Note: This requires Windsurf to be running.",
    inputSchema: {
      type: "object",
      properties: {
        modelId: {
          type: "string",
          description:
            "Model identifier (e.g., 'claude-sonnet-45', 'deepseek-v3', 'gpt-5-low-reasoning')",
        },
      },
      required: ["modelId"],
    },
  },
  {
    name: "windsurf_execute_prompt",
    description:
      "Execute a coding prompt through Windsurf's Cascade. Requires Windsurf to be running.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The coding task or question",
        },
        modelId: {
          type: "string",
          description: "Optional: specific model to use for this prompt",
        },
      },
      required: ["prompt"],
    },
  },
];

// Main server
async function main() {
  const server = new Server(
    {
      name: "windsurf-mcp",
      version: "2.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Load models on startup
  const modelData = loadModels();
  console.error(
    `Loaded ${modelData.total_models} Windsurf models from ${modelData.source}`,
  );
  writeLog({
    event: "startup",
    status: "ready",
    modelCount: modelData.total_models,
  });
  emitConsole(`startup: ready with ${modelData.total_models} models`);

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "windsurf_get_models": {
          const { promo_only, tier } =
            (args as {
              promo_only?: boolean;
              tier?: string;
            }) || {};

          writeLog({ tool: name, args: { promo_only, tier } });

          const modelData = loadModels();
          let models = modelData.models;

          // Filter by promo
          if (promo_only) {
            models = models.filter((m) => m.badges.includes("Promo"));
          }

          // Filter by tier (approximate based on cost)
          if (tier) {
            models = models.filter((m) => {
              const cost = m.cost.toLowerCase();
              if (tier === "free")
                return cost === "free" || cost === "0x" || cost === "byok";
              if (tier === "cheap")
                return (
                  cost.includes("0.") || cost === "0.5x" || cost === "0.25x"
                );
              if (tier === "standard") return cost === "1x" || cost === "1.5x";
              if (tier === "smart")
                return cost === "2x" || cost === "3x" || cost === "4x";
              if (tier === "premium") return parseFloat(cost) >= 5;
              return true;
            });
          }

          const promoModels = models.filter((m) => m.badges.includes("Promo"));

          const response: any = {
            count: models.length,
            total_available: modelData.total_models,
            promo_count: promoModels.length,
            extracted_at: modelData.extracted_at,
            source: modelData.source,
            daily_reminder:
              "Check daily for new promotional pricing! 🎁 = limited time offer",
            models: models.map((m) => ({
              name: m.name,
              cost: m.cost,
              badges: m.badges,
              isPromo: m.badges.includes("Promo"),
              isNew: m.badges.includes("New"),
              isBeta: m.badges.includes("Beta"),
            })),
          };

          if (promoModels.length > 0) {
            response.promotional_models = promoModels.map((m) => ({
              name: m.name,
              cost: m.cost,
              description: "Limited time promotional pricing!",
            }));
          }

          writeLog({
            tool: name,
            resultCount: models.length,
            promoCount: promoModels.length,
          });
          emitConsole(
            `models.list -> ${models.length} models (${promoModels.length} promos)`,
          );

          return {
            content: [
              { type: "text", text: JSON.stringify(response, null, 2) },
            ],
          };
        }

        case "windsurf_switch_model": {
          const { modelId } = args as { modelId: string };
          writeLog({ tool: name, args: { modelId } });

          // For now, just acknowledge - actual switching requires Windsurf integration
          const message = `Model switch requested: ${modelId}\n\nNote: To actually switch models in Windsurf, you need to:\n1. Open Windsurf IDE\n2. Use the model selector in Cascade\n3. Or use the VS Code extension if installed\n\nThis MCP server provides model information but cannot directly control Windsurf.`;

          emitConsole(`model.switch ${modelId} -> acknowledged`);

          return {
            content: [{ type: "text", text: message }],
          };
        }

        case "windsurf_execute_prompt": {
          const { prompt, modelId } = args as {
            prompt: string;
            modelId?: string;
          };
          writeLog({
            tool: name,
            args: { modelId, promptPreview: prompt.slice(0, 120) },
          });

          const message = `Prompt execution requested${modelId ? ` with model ${modelId}` : ""}\n\nPrompt: ${prompt}\n\nNote: To execute prompts in Windsurf, you need to:\n1. Open Windsurf IDE\n2. Use Cascade chat interface\n3. Or use the VS Code extension for automation\n\nThis MCP server provides model information but cannot directly execute prompts.`;

          emitConsole(
            `prompt.execute model=${modelId ?? "default"} -> acknowledged`,
          );

          return {
            content: [{ type: "text", text: message }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      writeLog({ tool: name, error: error?.message });
      emitConsole(`tool ${name} -> error: ${error?.message}`);
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Windsurf MCP Server running on stdio");
}

main().catch(console.error);
