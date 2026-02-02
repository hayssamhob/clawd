#!/usr/bin/env node
/**
 * Windsurf MCP Server
 * Bridges OpenClaw with Windsurf IDE for intelligent coding orchestration
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
import WebSocket from "ws";

// Windsurf Cascade WebSocket connection
class WindsurfClient {
  private ws: WebSocket | null = null;
  private messageId = 0;
  private pendingResolvers = new Map<string, (value: any) => void>();

  async connect() {
    // Windsurf's internal WebSocket port (typically 3000 or auto-assigned)
    // We'll try common ports or read from Windsurf's config
    const ports = [3000, 3001, 8080, 8081];

    for (const port of ports) {
      try {
        this.ws = new WebSocket(`ws://127.0.0.1:${port}/cascade`);

        await new Promise((resolve, reject) => {
          this.ws!.once("open", resolve);
          this.ws!.once("error", reject);
          setTimeout(() => reject(new Error("Timeout")), 2000);
        });

        console.error(`Connected to Windsurf on port ${port}`);
        this.setupMessageHandler();
        return true;
      } catch (e) {
        continue;
      }
    }

    throw new Error("Could not connect to Windsurf. Make sure it's running.");
  }

  private setupMessageHandler() {
    this.ws!.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.id && this.pendingResolvers.has(message.id)) {
          const resolver = this.pendingResolvers.get(message.id)!;
          resolver(message.result || message.error);
          this.pendingResolvers.delete(message.id);
        }
      } catch (e) {
        console.error("Failed to parse message:", e);
      }
    });
  }

  async sendCommand(method: string, params: any): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Not connected to Windsurf");
    }

    const id = `msg_${++this.messageId}`;
    const message = { id, method, params };

    return new Promise((resolve, reject) => {
      this.pendingResolvers.set(id, resolve);

      setTimeout(() => {
        if (this.pendingResolvers.has(id)) {
          this.pendingResolvers.delete(id);
          reject(new Error("Request timeout"));
        }
      }, 30000);

      this.ws!.send(JSON.stringify(message));
    });
  }

  async getAvailableModels(): Promise<string[]> {
    // Query Windsurf for available LLM models
    return this.sendCommand("models.list", {});
  }

  async switchModel(modelId: string): Promise<boolean> {
    return this.sendCommand("model.switch", { modelId });
  }

  async executePrompt(prompt: string, modelId?: string): Promise<string> {
    return this.sendCommand("prompt.execute", { prompt, modelId });
  }

  async readFile(filepath: string): Promise<string> {
    return this.sendCommand("file.read", { filepath });
  }

  async editFile(
    filepath: string,
    content: string,
    options?: any,
  ): Promise<boolean> {
    return this.sendCommand("file.edit", { filepath, content, options });
  }

  async searchFiles(query: string, path?: string): Promise<any[]> {
    return this.sendCommand("file.search", { query, path });
  }

  async executeTerminal(
    command: string,
    cwd?: string,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return this.sendCommand("terminal.execute", { command, cwd });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Simple JSONL logger to ~/clawd/mcp_logs/windsurf-mcp.log
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

// Emit short summaries to console (visible in Cascade terminal/output)
function emitConsole(summary: string) {
  console.error(`[windsurf-mcp] ${summary}`);
}

// MCP Tool Definitions
const TOOLS: Tool[] = [
  {
    name: "windsurf_get_models",
    description: "Get list of available LLM models in Windsurf",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "windsurf_switch_model",
    description: "Switch Windsurf to use a specific LLM model",
    inputSchema: {
      type: "object",
      properties: {
        modelId: {
          type: "string",
          description: "Model identifier (e.g., 'claude-sonnet-4-5', 'gpt-4o')",
        },
      },
      required: ["modelId"],
    },
  },
  {
    name: "windsurf_execute_prompt",
    description: "Execute a coding prompt through Windsurf's Cascade",
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
    name: "windsurf_read_file",
    description: "Read a file through Windsurf",
    inputSchema: {
      type: "object",
      properties: {
        filepath: {
          type: "string",
          description: "Absolute path to the file",
        },
      },
      required: ["filepath"],
    },
  },
  {
    name: "windsurf_edit_file",
    description: "Edit a file through Windsurf",
    inputSchema: {
      type: "object",
      properties: {
        filepath: {
          type: "string",
          description: "Absolute path to the file",
        },
        content: {
          type: "string",
          description: "New content for the file",
        },
      },
      required: ["filepath", "content"],
    },
  },
  {
    name: "windsurf_search_files",
    description: "Search for files or content in the workspace",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query or pattern",
        },
        path: {
          type: "string",
          description: "Optional: subdirectory to search in",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "windsurf_execute_terminal",
    description: "Execute a terminal command through Windsurf",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Shell command to execute",
        },
        cwd: {
          type: "string",
          description: "Optional: working directory",
        },
      },
      required: ["command"],
    },
  },
];

// Main server
async function main() {
  const windsurf = new WindsurfClient();

  try {
    await windsurf.connect();
    console.error("Windsurf MCP Server connected successfully");
    writeLog({ event: "startup", status: "connected" });
    emitConsole("startup: connected");
  } catch (e) {
    console.error("Warning: Could not connect to Windsurf:", e);
    console.error(
      "Server will start but tools may fail until Windsurf is available",
    );
    writeLog({
      event: "startup",
      status: "failed",
      error: (e as Error).message,
    });
    emitConsole(`startup: failed (${(e as Error).message})`);
  }

  const server = new Server(
    {
      name: "windsurf-mcp",
      version: "1.0.0",
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
          writeLog({ tool: name, args: {} });
          const models = await windsurf.getAvailableModels();
          writeLog({
            tool: name,
            resultCount: Array.isArray(models) ? models.length : undefined,
          });
          emitConsole(
            `models.list -> ${Array.isArray(models) ? models.length : "n/a"} models`,
          );
          return {
            content: [{ type: "text", text: JSON.stringify(models, null, 2) }],
          };
        }

        case "windsurf_switch_model": {
          const { modelId } = args as { modelId: string };
          writeLog({ tool: name, args: { modelId } });
          const success = await windsurf.switchModel(modelId);
          writeLog({ tool: name, result: success ? "ok" : "failed" });
          emitConsole(
            `model.switch ${modelId} -> ${success ? "ok" : "failed"}`,
          );
          return {
            content: [
              {
                type: "text",
                text: success
                  ? `Successfully switched to model: ${modelId}`
                  : `Failed to switch model`,
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
            args: { modelId, promptPreview: prompt.slice(0, 120) },
          });
          const result = await windsurf.executePrompt(prompt, modelId);
          writeLog({
            tool: name,
            resultPreview:
              typeof result === "string" ? result.slice(0, 200) : undefined,
          });
          emitConsole(
            `prompt.execute model=${modelId ?? "default"} prompt="${prompt.slice(0, 60)}..."`,
          );
          return {
            content: [{ type: "text", text: result }],
          };
        }

        case "windsurf_read_file": {
          const { filepath } = args as { filepath: string };
          writeLog({ tool: name, args: { filepath } });
          const content = await windsurf.readFile(filepath);
          writeLog({
            tool: name,
            resultPreview:
              typeof content === "string" ? content.slice(0, 200) : undefined,
          });
          emitConsole(`file.read ${filepath}`);
          return {
            content: [{ type: "text", text: content }],
          };
        }

        case "windsurf_edit_file": {
          const { filepath, content } = args as {
            filepath: string;
            content: string;
          };
          writeLog({
            tool: name,
            args: { filepath, contentPreview: content.slice(0, 200) },
          });
          const success = await windsurf.editFile(filepath, content);
          writeLog({ tool: name, result: success ? "ok" : "failed" });
          emitConsole(`file.edit ${filepath} -> ${success ? "ok" : "failed"}`);
          return {
            content: [
              {
                type: "text",
                text: success
                  ? `Successfully edited ${filepath}`
                  : `Failed to edit ${filepath}`,
              },
            ],
          };
        }

        case "windsurf_search_files": {
          const { query, path } = args as { query: string; path?: string };
          writeLog({ tool: name, args: { query, path } });
          const results = await windsurf.searchFiles(query, path);
          writeLog({
            tool: name,
            resultCount: Array.isArray(results) ? results.length : undefined,
          });
          emitConsole(
            `file.search "${query}" -> ${Array.isArray(results) ? results.length : "n/a"}`,
          );
          return {
            content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
          };
        }

        case "windsurf_execute_terminal": {
          const { command, cwd } = args as { command: string; cwd?: string };
          writeLog({ tool: name, args: { command, cwd } });
          const result = await windsurf.executeTerminal(command, cwd);
          writeLog({
            tool: name,
            result: {
              exitCode: result.exitCode,
              stdoutPreview: result.stdout?.slice(0, 200),
              stderrPreview: result.stderr?.slice(0, 200),
            },
          });
          emitConsole(
            `terminal.execute cmd="${command}" cwd=${cwd ?? "-"} -> exit ${result.exitCode}`,
          );
          return {
            content: [
              {
                type: "text",
                text: `Exit Code: ${result.exitCode}\n\nStdout:\n${result.stdout}\n\nStderr:\n${result.stderr}`,
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

  // Cleanup on exit
  process.on("exit", () => {
    windsurf.disconnect();
  });

  await server.connect(transport);
  console.error("Windsurf MCP Server running on stdio");
}

main().catch(console.error);
