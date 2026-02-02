import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
} from "@modelcontextprotocol/sdk/types.js";
import * as net from "net";
import * as vscode from "vscode";
import { CascadeController } from "./cascadeController";

export class McpServer {
  private server: Server;
  private cascadeController: CascadeController;
  private tcpServer?: net.Server;
  private port: number;

  constructor(
    private context: vscode.ExtensionContext,
    port: number,
  ) {
    this.port = port;
    this.server = new Server(
      {
        name: "windsurf-bridge",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.cascadeController = new CascadeController(context);
    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: "delegate_to_cascade",
          description:
            "Delegate a task to Windsurf Cascade with automatic model selection and prompt injection. OpenClaw can specify any model ID, tier shortcut (free/cheap/smart/fast), or partial model name.",
          inputSchema: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "The task prompt to send to Cascade",
              },
              model: {
                type: "string",
                description:
                  "Model to use: tier shortcut (free/cheap/smart/fast) OR exact model ID (e.g., 'swe-1.5-free', 'deepseek-v3', 'claude-3.5-haiku') OR partial name. Use 'list_models' to see all options.",
                default: "free",
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
                description: "Number of lines to read from the end of the file",
                default: 10,
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
                description:
                  "Model to switch to: tier shortcut (free/cheap/smart/fast) OR exact model ID OR partial name",
              },
            },
            required: ["model"],
          },
        },
        {
          name: "list_models",
          description:
            "Get a list of all available Windsurf models with their details (credits, strengths, descriptions)",
          inputSchema: {
            type: "object",
            properties: {
              tier: {
                type: "string",
                description:
                  "Filter by tier: free, cheap, smart, fast, experimental (optional - leave empty for all models)",
              },
            },
          },
        },
        {
          name: "focus_cascade",
          description: "Focus the Cascade chat panel",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ];

      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "delegate_to_cascade": {
            if (!args) {
              throw new Error("Missing arguments for delegate_to_cascade");
            }
            const prompt = args.prompt as string;
            const model = (args.model as string) || "free";
            const result = await this.cascadeController.delegateTask(
              prompt,
              model,
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "get_cascade_status": {
            const lines = args ? (args.lines as number) || 10 : 10;
            const result = await this.cascadeController.getCascadeStatus(lines);
            return {
              content: [
                {
                  type: "text",
                  text: result,
                },
              ],
            };
          }

          case "switch_cascade_model": {
            if (!args) {
              throw new Error("Missing arguments for switch_cascade_model");
            }
            const model = args.model as string;
            const result = await this.cascadeController.switchModel(model);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "list_models": {
            const tier = args?.tier as string | undefined;
            let models;
            if (tier) {
              models = this.cascadeController.getModelsByTier(tier);
            } else {
              models = Object.values(this.cascadeController.getAllModels());
            }

            // Format the response
            const formatted = models.map(
              (m: {
                id: string;
                name: string;
                tier: string;
                credits: number | string;
                description: string;
                strengths: string[];
              }) => ({
                id: m.id,
                name: m.name,
                tier: m.tier,
                credits: m.credits,
                description: m.description,
                strengths: m.strengths,
              }),
            );

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      count: formatted.length,
                      tier: tier || "all",
                      models: formatted,
                      usage:
                        "Use 'id' or 'tier' field with delegate_to_cascade or switch_cascade_model",
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          case "focus_cascade": {
            const result = await this.cascadeController.focusCascade();
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: errorMessage }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start() {
    this.tcpServer = net.createServer((socket) => {
      console.log("MCP client connected");

      const transport = new StdioServerTransport();

      socket.pipe(process.stdin);
      process.stdout.pipe(socket);

      this.server.connect(transport);

      socket.on("close", () => {
        console.log("MCP client disconnected");
      });
    });

    return new Promise<void>((resolve, reject) => {
      this.tcpServer!.listen(this.port, () => {
        console.log(`MCP Server listening on port ${this.port}`);
        resolve();
      });

      this.tcpServer!.on("error", (error) => {
        console.error("MCP Server error:", error);
        reject(error);
      });
    });
  }

  async stop() {
    if (this.tcpServer) {
      return new Promise<void>((resolve) => {
        this.tcpServer!.close(() => {
          console.log("MCP Server stopped");
          resolve();
        });
      });
    }
  }
}
