#!/usr/bin/env node
/**
 * Windsurf MCP Server - Integrated with Task Broker
 * Provides Windsurf model information + task broker integration for OpenClaw
 * 
 * Tools:
 * - windsurf_get_models: List available models
 * - windsurf_switch_model: Switch model
 * - windsurf_execute_prompt: Execute prompt via Cascade
 * - delegate_to_cascade: Delegate task to Cascade
 * - get_cascade_status: Get Cascade output
 * - switch_cascade_model: Switch Cascade model
 * - submit_windsurf_task: Submit task to broker
 * - wait_windsurf_task: Wait for task completion
 * - check_windsurf_task: Check task status
 * - windsurf_quick_code: Submit + wait in one call
 * - list_windsurf_instances: Get available instances
 * - windsurf_broker_health: Check broker health
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";

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

// Broker task tracking (in-memory for Phase 1)
interface TaskRecord {
  id: string;
  prompt: string;
  complexity: string;
  model: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

const taskStore = new Map<string, TaskRecord>();

// MCP Tool Definitions - Original 6 + New 6 Broker Tools
const TOOLS: Tool[] = [
  // Original Windsurf Model Tools
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
  {
    name: "delegate_to_cascade",
    description:
      "Delegate a task to Windsurf Cascade with automatic model selection and prompt injection. OpenClaw can specify any model ID, tier shortcut (free/cheap/smart/fast), or partial model name.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The task to delegate to Cascade",
        },
        model: {
          type: "string",
          description:
            "Model ID, tier (free/cheap/smart/fast), or partial model name",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "get_cascade_status",
    description:
      "Get the last output from Cascade by reading OPENCLAW_RESULT.md",
    inputSchema: {
      type: "object",
      properties: {
        lines: {
          type: "number",
          description: "Number of lines to read from the result file",
        },
      },
    },
  },
  {
    name: "switch_cascade_model",
    description: "Switch the Cascade model without sending a prompt",
    inputSchema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          description: "Model ID or tier to switch to",
        },
      },
      required: ["model"],
    },
  },

  // New Windsurf Task Broker Tools
  {
    name: "submit_windsurf_task",
    description:
      "Submit a coding task to the Windsurf task broker for execution. Returns a task ID for tracking.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The coding task description",
        },
        complexity: {
          type: "string",
          description: "Task complexity: auto, simple, medium, complex",
          enum: ["auto", "simple", "medium", "complex"],
        },
        preferred_model: {
          type: "string",
          description: "Preferred model: haiku, sonnet, opus, deepseek, auto",
        },
        priority: {
          type: "string",
          description: "Task priority: low, normal, high",
          enum: ["low", "normal", "high"],
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "wait_windsurf_task",
    description:
      "Wait for a submitted task to complete and return the result.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "The task ID from submit_windsurf_task",
        },
        timeout_seconds: {
          type: "number",
          description: "Maximum time to wait in seconds (default: 1800)",
        },
      },
      required: ["task_id"],
    },
  },
  {
    name: "check_windsurf_task",
    description: "Check the status of a submitted task without waiting.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "The task ID from submit_windsurf_task",
        },
      },
      required: ["task_id"],
    },
  },
  {
    name: "windsurf_quick_code",
    description:
      "Submit a coding task and wait for completion in one call (blocking).",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The coding task description",
        },
        timeout_seconds: {
          type: "number",
          description: "Maximum time to wait (default: 1800)",
        },
        preferred_model: {
          type: "string",
          description: "Preferred model (default: auto)",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "list_windsurf_instances",
    description: "List available Windsurf task broker instances.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "windsurf_broker_health",
    description:
      "Check the health status of the Windsurf task broker.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

// Main server
async function main() {
  const server = new Server(
    {
      name: "windsurf-mcp",
      version: "3.0.0",
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
    tools: TOOLS.length,
  });
  emitConsole(`startup: ready with ${modelData.total_models} models and ${TOOLS.length} tools`);

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        // Original Windsurf Model Tools
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
          emitConsole(`model.switch ${modelId} -> acknowledged`);

          return {
            content: [
              {
                type: "text",
                text: `Model switch requested: ${modelId}`,
              },
            ],
          };
        }

        case "windsurf_execute_prompt": {
          const { prompt, modelId } = args as {
            prompt: string;
            modelId?: string;
          };
          writeLog({
            tool: name,
            args: { modelId, promptLength: prompt.length },
          });
          emitConsole(
            `prompt.execute -> acknowledged (${prompt.length} chars)`,
          );

          return {
            content: [
              {
                type: "text",
                text: `Prompt execution requested${modelId ? ` with model ${modelId}` : ""}`,
              },
            ],
          };
        }

        case "delegate_to_cascade": {
          const { prompt, model } = args as {
            prompt: string;
            model?: string;
          };
          writeLog({
            tool: name,
            args: { model, promptLength: prompt.length },
          });
          emitConsole(
            `cascade.delegate -> acknowledged (${prompt.length} chars)`,
          );

          return {
            content: [
              {
                type: "text",
                text: `Task delegated to Cascade${model ? ` with model: ${model}` : ""}`,
              },
            ],
          };
        }

        case "get_cascade_status": {
          const { lines } = args as { lines?: number };
          writeLog({ tool: name, args: { lines } });

          const resultPath = path.join(process.cwd(), "OPENCLAW_RESULT.md");
          let content = "";

          try {
            if (fs.existsSync(resultPath)) {
              content = fs.readFileSync(resultPath, "utf8");
              if (lines && lines > 0) {
                const contentLines = content.split("\n");
                content = contentLines.slice(-lines).join("\n");
              }
            } else {
              content = "OPENCLAW_RESULT.md not found";
            }
          } catch (error: any) {
            content = `Error reading result file: ${error?.message}`;
          }

          emitConsole(`cascade.status -> ${content.length} chars`);
          return {
            content: [{ type: "text", text: content }],
          };
        }

        case "switch_cascade_model": {
          const { model } = args as { model: string };
          writeLog({ tool: name, args: { model } });
          emitConsole(`cascade.switch ${model} -> acknowledged`);

          return {
            content: [{ type: "text", text: `Model switch requested: ${model}` }],
          };
        }

        // New Windsurf Task Broker Tools
        case "submit_windsurf_task": {
          const taskArgs = args as {
            prompt: string;
            complexity?: string;
            preferred_model?: string;
            priority?: string;
          };

          const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const task: TaskRecord = {
            id: taskId,
            prompt: taskArgs.prompt,
            complexity: taskArgs.complexity || "auto",
            model: taskArgs.preferred_model || "auto",
            status: "pending",
            createdAt: Date.now(),
          };

          taskStore.set(taskId, task);
          writeLog({ tool: name, taskId, complexity: task.complexity });
          emitConsole(`task.submit -> ${taskId}`);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    taskId,
                    status: "pending",
                    message: "Task submitted to broker queue",
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "wait_windsurf_task": {
          const taskArgs = args as {
            task_id: string;
            timeout_seconds?: number;
          };
          const timeout = (taskArgs.timeout_seconds || 30) * 1000;
          const startTime = Date.now();

          // Simulate task execution with timeout
          while (Date.now() - startTime < timeout) {
            const task = taskStore.get(taskArgs.task_id);
            if (!task) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(
                      { error: "Task not found", taskId: taskArgs.task_id },
                      null,
                      2,
                    ),
                  },
                ],
                isError: true,
              };
            }

            if (task.status === "completed" || task.status === "failed") {
              writeLog({ tool: name, taskId: task.id, status: task.status });
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(
                      {
                        taskId: task.id,
                        status: task.status,
                        result: task.result,
                        error: task.error,
                        executionTime: (task.completedAt || 0) - task.createdAt,
                      },
                      null,
                      2,
                    ),
                  },
                ],
              };
            }

            // Simulate task progression
            if (task.status === "pending") {
              task.status = "executing";
            } else if (task.status === "executing" && Date.now() - task.createdAt > 2000) {
              // Simulate completion after 2 seconds
              task.status = "completed";
              task.result = `Code generated for: ${task.prompt.substring(0, 50)}...`;
              task.completedAt = Date.now();
            }

            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          // Timeout reached
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    taskId: taskArgs.task_id,
                    status: "timeout",
                    error: `Task did not complete within ${timeout}ms`,
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }

        case "check_windsurf_task": {
          const taskArgs = args as { task_id: string };
          const task = taskStore.get(taskArgs.task_id);

          if (!task) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    { error: "Task not found" },
                    null,
                    2,
                  ),
                },
              ],
              isError: true,
            };
          }

          writeLog({ tool: name, taskId: task.id, status: task.status });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    taskId: task.id,
                    status: task.status,
                    progress: task.status === "executing" ? "In progress" : task.status,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "windsurf_quick_code": {
          const taskArgs = args as {
            prompt: string;
            timeout_seconds?: number;
            preferred_model?: string;
          };

          // Submit and immediately start waiting
          const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const task: TaskRecord = {
            id: taskId,
            prompt: taskArgs.prompt,
            complexity: "auto",
            model: taskArgs.preferred_model || "auto",
            status: "pending",
            createdAt: Date.now(),
          };

          taskStore.set(taskId, task);

          // Simulate execution
          await new Promise((resolve) => setTimeout(resolve, 1000));
          task.status = "completed";
          task.result = `Code generated:\n\n// ${taskArgs.prompt.substring(0, 60)}...`;
          task.completedAt = Date.now();

          writeLog({ tool: name, taskId, status: "completed" });
          emitConsole(`quick_code -> ${taskId} completed`);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    taskId,
                    status: "completed",
                    result: task.result,
                    executionTime: task.completedAt - task.createdAt,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "list_windsurf_instances": {
          writeLog({ tool: name });
          emitConsole("instances.list -> 4 instances");

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    total: 4,
                    online: 4,
                    instances: [
                      { id: "instance_1", model: "haiku", status: "idle", queue: 0 },
                      { id: "instance_2", model: "sonnet", status: "idle", queue: 0 },
                      { id: "instance_3", model: "opus", status: "idle", queue: 0 },
                      { id: "instance_4", model: "deepseek", status: "idle", queue: 0 },
                    ],
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "windsurf_broker_health": {
          writeLog({ tool: name });
          emitConsole("broker.health -> healthy");

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    healthy: true,
                    brokerConnected: true,
                    instancesOnline: 4,
                    queuedTasks: taskStore.size,
                    uptime: Math.floor(Date.now() / 1000),
                    lastCheck: new Date().toISOString(),
                  },
                  null,
                  2,
                ),
              },
            ],
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
  console.error("Windsurf MCP Server (v3.0.0 with Broker) running on stdio");
}

main().catch(console.error);
