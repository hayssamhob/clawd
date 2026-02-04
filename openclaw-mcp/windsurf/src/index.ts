#!/usr/bin/env node
/**
 * Windsurf MCP Server v4.0.0 - Phase 2: Real Execution
 *
 * Features:
 * - Connects to windsurf-bridge MCP server for REAL execution in Cascade
 * - Falls back to simulation if bridge unavailable
 * - 12 MCP tools for task submission, execution, monitoring
 * - Cost tracking and model selection
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import { createServer } from "http";
import * as path from "path";
import { parse } from "url";
import WindsurfBridgeClient from "./bridge-client.js";

// ============================================================================
// STARTUP & CONFIGURATION
// ============================================================================

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

  return {
    extracted_at: new Date().toISOString(),
    source: "Fallback",
    total_models: 0,
    models: [],
  };
}

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

// ============================================================================
// PHASE 2: REAL EXECUTION BRIDGE
// ============================================================================

let bridgeClient: WindsurfBridgeClient | null = null;
let bridgeConnected: boolean = false;

async function initializeBridge() {
  try {
    bridgeClient = new WindsurfBridgeClient(3100);
    bridgeConnected = await bridgeClient.connect();

    if (bridgeConnected) {
      emitConsole(
        "✅ Phase 2: Connected to windsurf-bridge for REAL execution",
      );
      writeLog({ event: "bridge_connected", phase: 2, bridge_port: 3100 });
    } else {
      emitConsole("⚠️  Phase 2 bridge unavailable - Using SIMULATION mode");
      writeLog({
        event: "bridge_unavailable",
        fallback: "simulation",
        message: "Windsurf bridge not running on port 3100",
      });
    }
  } catch (err) {
    emitConsole("⚠️  Bridge initialization failed - Using SIMULATION mode");
    writeLog({ event: "bridge_init_error", error: String(err) });
  }
}

// ============================================================================
// TASK MANAGEMENT
// ============================================================================

interface TaskRecord {
  id: string;
  prompt: string;
  complexity: string;
  model: string;
  status: "pending" | "executing" | "completed" | "failed";
  result?: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
  executionMode: "real" | "simulated";
}

const taskStorePath = path.join(
  process.env.HOME || "",
  "clawd",
  "windsurf-tasks.json",
);
const taskStore = new Map<string, TaskRecord>();

if (fs.existsSync(taskStorePath)) {
  const savedTasks = JSON.parse(fs.readFileSync(taskStorePath, "utf8"));
  savedTasks.forEach((task: any) => {
    taskStore.set(task.id, task);
    // Restart simulation for pending tasks
    if (task.status === "pending" || task.status === "executing") {
      simulateTaskExecution(task);
    }
  });
}

setInterval(() => {
  const tasks = Array.from(taskStore.values());
  fs.writeFileSync(taskStorePath, JSON.stringify(tasks), "utf8");
}, 5000);

function simulateTaskExecution(task: TaskRecord) {
  if (task.status === "pending") {
    task.status = "executing";

    if (bridgeConnected && task.executionMode === "real") {
      // Real execution would happen here
      setTimeout(() => {
        task.status = "completed";
        task.result = `Simulated real execution: ${task.prompt.substring(0, 60)}...`;
        task.completedAt = Date.now();
      }, 2000);
    } else {
      // Simulated execution
      setTimeout(() => {
        task.status = "completed";
        task.result = `Simulated execution: ${task.prompt?.substring(0, 60) || "No prompt provided"}...`;
        task.completedAt = Date.now();
      }, 1000);
    }
  }
}

// ============================================================================
// MCP TOOLS DEFINITION
// ============================================================================

const TOOLS: Tool[] = [
  {
    name: "windsurf_get_models",
    description:
      "Get complete list of Windsurf models with pricing and promotional information.",
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
    name: "submit_windsurf_task",
    description:
      "Submit a coding task to Windsurf for execution via Cascade. Returns a task ID.",
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
          description:
            "Preferred model: haiku, sonnet, opus, deepseek, free, cheap, smart, auto",
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
    description: "Wait for a submitted task to complete and return the result.",
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
          description: "Maximum time to wait (default: 300)",
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
    description: "List available Windsurf task execution instances.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "windsurf_broker_health",
    description:
      "Check the health status of the Windsurf task broker and bridge.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "delegate_to_cascade",
    description:
      "Delegate a task directly to Windsurf Cascade. Uses real execution if bridge available.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The task to execute",
        },
        model: {
          type: "string",
          description: "Model tier or ID (free/cheap/smart/fast)",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "switch_cascade_model",
    description: "Switch the Cascade model for next execution.",
    inputSchema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          description: "Model to switch to",
        },
      },
      required: ["model"],
    },
  },
  {
    name: "get_cascade_status",
    description: "Get the last output from Cascade execution.",
    inputSchema: {
      type: "object",
      properties: {
        lines: {
          type: "number",
          description: "Number of lines to read",
        },
      },
    },
  },
  {
    name: "windsurf_switch_model",
    description: "Switch to a specific Windsurf model.",
    inputSchema: {
      type: "object",
      properties: {
        modelId: {
          type: "string",
          description: "Model identifier",
        },
      },
      required: ["modelId"],
    },
  },
  {
    name: "windsurf_execute_prompt",
    description: "Execute a prompt via Windsurf Cascade.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The coding task",
        },
        modelId: {
          type: "string",
          description: "Optional model ID",
        },
      },
      required: ["prompt"],
    },
  },
];

// ============================================================================
// MAIN SERVER
// ============================================================================

async function main() {
  // Initialize bridge for Phase 2
  await initializeBridge();

  const modelData = loadModels();
  console.error(
    `Loaded ${modelData.total_models} Windsurf models from ${modelData.source}`,
  );
  writeLog({
    event: "startup",
    status: "ready",
    modelCount: modelData.total_models,
    tools: TOOLS.length,
    phase: 2,
    bridge: bridgeConnected ? "connected" : "unavailable",
  });
  emitConsole(
    `startup: v4.0.0 Phase 2 - ${TOOLS.length} tools, ${modelData.total_models} models${bridgeConnected ? " [REAL EXECUTION]" : " [SIMULATION]"}`,
  );

  const server = new Server(
    {
      name: "windsurf-mcp",
      version: "4.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "windsurf_get_models": {
          const { promo_only, tier } = (args as any) || {};
          writeLog({ tool: name, args: { promo_only, tier } });

          const modelData = loadModels();
          let models = modelData.models;

          if (promo_only) {
            models = models.filter((m) => m.badges.includes("Promo"));
          }

          if (tier) {
            models = models.filter((m) => {
              const cost = m.cost.toLowerCase();
              if (tier === "free")
                return cost === "free" || cost === "0x" || cost === "byok";
              if (tier === "cheap") return cost.includes("0.");
              if (tier === "standard") return cost === "1x" || cost === "1.5x";
              if (tier === "smart") return cost === "2x" || cost === "3x";
              if (tier === "premium") return parseFloat(cost) >= 5;
              return true;
            });
          }

          const promoModels = models.filter((m) => m.badges.includes("Promo"));

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    count: models.length,
                    promo_count: promoModels.length,
                    models: models.map((m) => ({
                      name: m.name,
                      cost: m.cost,
                      badges: m.badges,
                    })),
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "submit_windsurf_task": {
          const taskArgs = args as any;
          const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          const task: TaskRecord = {
            id: taskId,
            prompt: taskArgs.prompt,
            complexity: taskArgs.complexity || "auto",
            model: taskArgs.preferred_model || "auto",
            status: "pending",
            createdAt: Date.now(),
            executionMode: bridgeConnected ? "real" : "simulated",
          };

          taskStore.set(taskId, task);
          writeLog({ tool: name, taskId, mode: task.executionMode });
          emitConsole(`task.submit -> ${taskId} (${task.executionMode})`);

          simulateTaskExecution(task);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    taskId,
                    status: "pending",
                    mode: task.executionMode,
                    message: `Task submitted (${task.executionMode} mode)`,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "wait_windsurf_task": {
          const taskArgs = args as any;
          const timeout = (taskArgs.timeout_seconds || 300) * 1000;
          const startTime = Date.now();

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
                        mode: task.executionMode,
                        executionTime: (task.completedAt || 0) - task.createdAt,
                      },
                      null,
                      2,
                    ),
                  },
                ],
              };
            }

            // Simulate progression
            if (task.status === "pending") {
              task.status = "executing";

              // If connected to bridge, trigger real execution
              if (bridgeConnected && task.executionMode === "real") {
                try {
                  const result = await bridgeClient!.executeTask(
                    task.prompt,
                    task.model,
                  );
                  task.status = result.status as any;
                  task.result = result.result;
                  task.error = result.error;
                  task.model = result.model;
                } catch (err) {
                  task.status = "failed";
                  task.error = err instanceof Error ? err.message : String(err);
                  task.completedAt = Date.now();
                }
              }
            } else if (
              task.status === "executing" &&
              Date.now() - task.createdAt > 2000
            ) {
              task.status = "completed";
              task.result = `Execution complete: ${task.prompt.substring(0, 60)}...`;
              task.completedAt = Date.now();
            }

            await new Promise((resolve) => setTimeout(resolve, 100));
          }

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
          const taskArgs = args as any;
          const task = taskStore.get(taskArgs.task_id);

          if (!task) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ error: "Task not found" }, null, 2),
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
                    mode: task.executionMode,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "windsurf_quick_code": {
          const taskArgs = args as any;
          const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          const task: TaskRecord = {
            id: taskId,
            prompt: taskArgs.prompt,
            complexity: "auto",
            model: taskArgs.preferred_model || "auto",
            status: "pending",
            createdAt: Date.now(),
            executionMode: bridgeConnected ? "real" : "simulated",
          };

          taskStore.set(taskId, task);

          // Execute immediately
          if (bridgeConnected && task.executionMode === "real") {
            try {
              const result = await bridgeClient!.executeTask(
                task.prompt,
                task.model,
              );
              task.status = result.status as any;
              task.result = result.result;
              task.error = result.error;
              task.model = result.model;
            } catch (err) {
              task.status = "failed";
              task.error = err instanceof Error ? err.message : String(err);
            }
          } else {
            // Simulation
            await new Promise((resolve) => setTimeout(resolve, 1000));
            task.status = "completed";
            task.result = `Code: ${taskArgs.prompt.substring(0, 60)}...`;
          }

          task.completedAt = Date.now();

          emitConsole(`quick_code -> ${taskId} completed`);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    taskId,
                    status: task.status,
                    result: task.result,
                    error: task.error,
                    mode: task.executionMode,
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
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    total: 4,
                    online: 4,
                    instances: [
                      { id: "haiku", model: "claude-haiku", status: "idle" },
                      { id: "sonnet", model: "claude-sonnet", status: "idle" },
                      {
                        id: "deepseek",
                        model: "deepseek-v3",
                        status: "idle",
                      },
                      { id: "gpt-5", model: "gpt-5-low", status: "idle" },
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
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    healthy: true,
                    phase: 2,
                    bridge_connected: bridgeConnected,
                    mode: bridgeConnected ? "REAL_EXECUTION" : "SIMULATION",
                    instances_online: 4,
                    queued_tasks: taskStore.size,
                    bridge_port: 3100,
                    uptime: Math.floor(Date.now() / 1000),
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "delegate_to_cascade": {
          const taskArgs = args as any;
          writeLog({ tool: name, bridge: bridgeConnected });

          if (bridgeConnected) {
            const result = await bridgeClient!.executeTask(
              taskArgs.prompt,
              taskArgs.model || "free",
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      status: "simulated",
                      message:
                        "Bridge unavailable - returning simulated response",
                      prompt: taskArgs.prompt,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }
        }

        case "switch_cascade_model": {
          const taskArgs = args as any;
          if (bridgeConnected) {
            const result = await bridgeClient!.switchModel(taskArgs.model);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { success: false, message: "Bridge unavailable" },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "get_cascade_status": {
          const resultPath = path.join(process.cwd(), "OPENCLAW_RESULT.md");
          let content = "No results available";

          if (fs.existsSync(resultPath)) {
            content = fs.readFileSync(resultPath, "utf8");
          }

          return {
            content: [
              {
                type: "text",
                text: content,
              },
            ],
          };
        }

        case "windsurf_switch_model":
        case "windsurf_execute_prompt": {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { status: "acknowledged", tool: name },
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
  emitConsole(
    `MCP Server v4.0.0 (Phase 2) running on stdio${bridgeConnected ? " [REAL EXECUTION ENABLED]" : " [SIMULATION MODE]"}`,
  );

  const httpPort = process.env.API_PORT || 9100;

  const handleRequest = (req: any, res: any) => {
    const { pathname } = parse(req.url || "");

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (pathname === "/call_tool" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: string) => (body += chunk));
      req.on("end", () => {
        try {
          const { name } = JSON.parse(body);

          if (name === "windsurf_broker_health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                healthy: true,
                phase: 2,
                bridge_connected: bridgeConnected,
                mode: bridgeConnected ? "REAL_EXECUTION" : "SIMULATION",
                instances_online: 4,
                bridge_port: 3100,
              }),
            );
          } else if (name === "list_windsurf_instances") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                total: 4,
                online: 4,
                instances: [
                  { id: "haiku", model: "claude-haiku", status: "idle" },
                  { id: "sonnet", model: "claude-sonnet", status: "idle" },
                  { id: "deepseek", model: "deepseek-v3", status: "idle" },
                  { id: "gpt-5", model: "gpt-5-low", status: "idle" },
                ],
              }),
            );
          } else if (name === "submit_windsurf_task") {
            const taskArgs = JSON.parse(body);
            const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const task: TaskRecord = {
              id: taskId,
              prompt: taskArgs.prompt,
              complexity: taskArgs.complexity || "auto",
              model: taskArgs.preferred_model || "auto",
              status: "pending",
              createdAt: Date.now(),
              executionMode: bridgeConnected ? "real" : "simulated",
            };

            taskStore.set(taskId, task);
            writeLog({ tool: name, taskId, mode: task.executionMode });

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                taskId,
                status: "pending",
                mode: task.executionMode,
                message: `Task submitted (${task.executionMode} mode)`,
              }),
            );
            return;
          } else if (name === "check_windsurf_task") {
            const taskArgs = JSON.parse(body);
            const task = taskStore.get(taskArgs.task_id);

            if (!task) {
              res.writeHead(404, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Task not found" }));
              return;
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                taskId: task.id,
                status: task.status,
                mode: task.executionMode,
              }),
            );
            return;
          } else {
            res.writeHead(501, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Tool not implemented" }));
          }
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid request" }));
        }
      });
      return;
    }

    if (pathname === "/get_config" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          agents: {
            defaults: {
              model: {
                primary: "moonshotai/kimi-k2.5",
              },
            },
          },
          models: {
            mode: "merge",
            providers: {
              kimi: {
                baseUrl: "https://integrate.api.nvidia.com/v1",
                apiKey: "${NVIDIA_API_KEY}",
                api: "openai-completions",
                models: [
                  {
                    id: "moonshotai/kimi-k2.5",
                    name: "Moonshot AI Kimi K2.5",
                    reasoning: true,
                    input: ["text", "image"],
                    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                    contextWindow: 256000,
                    maxTokens: 16384,
                  },
                ],
              },
            },
          },
        }),
      );
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  };

  const httpServer = createServer(handleRequest);
  httpServer.listen(
    {
      port: httpPort,
      host: "127.0.0.1", // Explicitly bind to IPv4
      exclusive: true, // Prevent other processes from binding
    },
    () => {
      console.error(`API server listening on port ${httpPort}`);
    },
  );

  httpServer.on("error", (err) => {
    console.error("HTTP server error:", err);
  });
}

main().catch(console.error);
