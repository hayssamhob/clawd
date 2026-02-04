/**
 * Phase 2: Real Execution Bridge
 * Connects to windsurf-bridge MCP server (running inside Windsurf extension)
 * Routes broker tasks to actual Cascade execution
 */

import * as net from "net";

export interface TaskResult {
  taskId: string;
  status: "completed" | "failed" | "executing";
  result?: string;
  error?: string;
  model: string;
  executionTime: number;
}

export interface ExecutionTask {
  taskId: string;
  prompt: string;
  model: string;
  status: "pending" | "executing" | "completed" | "failed";
  startTime: number;
  endTime?: number;
  result?: string;
  error?: string;
}

export class WindsurfBridgeClient {
  private socket?: net.Socket;
  private brokerPort: number = 3100; // windsurf-bridge port
  private requestCallbacks: Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (err: Error) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();
  private requestId: number = 1;
  private buffer: string = "";

  constructor(port: number = 3100) {
    this.brokerPort = port;
  }

  /**
   * Connect to windsurf-bridge MCP server
   */
  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.socket = net.createConnection(
          this.brokerPort,
          "localhost",
          () => {
            console.log(
              `[BRIDGE] Connected to windsurf-bridge on port ${this.brokerPort}`
            );

            // Setup data listener
            this.socket!.on("data", (data) => {
              this.buffer += data.toString();
              const lines = this.buffer.split("\n");
              this.buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.trim()) {
                  try {
                    const message = JSON.parse(line);
                    this.handleResponse(message);
                  } catch (err) {
                    console.error("[BRIDGE] JSON parse error:", err);
                  }
                }
              }
            });

            this.socket!.on("error", (err) => {
              console.error("[BRIDGE] Connection error:", err);
              this.cleanupCallbacks();
            });

            this.socket!.on("close", () => {
              console.log("[BRIDGE] Connection closed");
              this.socket = undefined;
            });

            resolve(true);
          }
        );

        this.socket!.on("error", () => {
          resolve(false);
        });

        // Timeout after 2 seconds
        setTimeout(() => {
          if (!this.socket) resolve(false);
        }, 2000);
      } catch (err) {
        console.error("[BRIDGE] Connection failed:", err);
        resolve(false);
      }
    });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return !!this.socket && !this.socket.destroyed;
  }

  /**
   * Send MCP tool call to windsurf-bridge
   */
  private async sendRequest(toolName: string, args: any): Promise<any> {
    if (!this.isConnected()) {
      throw new Error(
        "Not connected to windsurf-bridge. Make sure Windsurf is running and windsurf-bridge extension is active."
      );
    }

    const id = this.requestId++;
    const request = {
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args,
      },
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.requestCallbacks.delete(id);
        reject(new Error(`Request timeout for ${toolName}`));
      }, 30000);

      this.requestCallbacks.set(id, { resolve, reject, timeout });

      try {
        this.socket!.write(JSON.stringify(request) + "\n");
      } catch (err) {
        this.requestCallbacks.delete(id);
        clearTimeout(timeout);
        reject(err);
      }
    });
  }

  /**
   * Handle response from windsurf-bridge
   */
  private handleResponse(message: any) {
    if (!message.id) return;

    const callback = this.requestCallbacks.get(message.id);
    if (!callback) return;

    this.requestCallbacks.delete(message.id);
    clearTimeout(callback.timeout);

    if (message.error) {
      callback.reject(new Error(message.error.message || "Unknown error"));
    } else {
      callback.resolve(message.result);
    }
  }

  /**
   * Delegate task to Cascade for real execution
   */
  async executeTask(
    prompt: string,
    model: string
  ): Promise<TaskResult> {
    try {
      const response = await this.sendRequest("delegate_to_cascade", {
        prompt,
        model,
      });

      // Parse the response (it comes as nested JSON)
      let result;
      if (response?.content?.[0]?.text) {
        result = JSON.parse(response.content[0].text);
      } else {
        result = response;
      }

      if (!result.success) {
        return {
          taskId: `exec_${Date.now()}`,
          status: "failed",
          error: result.message || "Task execution failed",
          model,
          executionTime: 0,
        };
      }

      // Task was sent to Cascade, wait for results
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Retrieve results
      const statusResponse = await this.sendRequest("get_cascade_status", {
        lines: 50,
      });

      const statusText =
        statusResponse?.content?.[0]?.text || statusResponse || "";

      return {
        taskId: `exec_${Date.now()}`,
        status: "completed",
        result: statusText,
        model: result.model || model,
        executionTime: Date.now(),
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        taskId: `exec_${Date.now()}`,
        status: "failed",
        error: errorMsg,
        model,
        executionTime: 0,
      };
    }
  }

  /**
   * Switch model in Cascade
   */
  async switchModel(model: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.sendRequest("switch_cascade_model", { model });

      let result;
      if (response?.content?.[0]?.text) {
        result = JSON.parse(response.content[0].text);
      } else {
        result = response;
      }

      return {
        success: result.success !== false,
        message: result.message || "Model switched",
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: errorMsg,
      };
    }
  }

  /**
   * List available models
   */
  async listModels(tier?: string): Promise<any[]> {
    try {
      const response = await this.sendRequest("list_models", { tier });

      let result;
      if (response?.content?.[0]?.text) {
        result = JSON.parse(response.content[0].text);
      } else {
        result = response;
      }

      if (result.regularModels) {
        return result.regularModels;
      }
      if (Array.isArray(result)) {
        return result;
      }

      return [];
    } catch (err) {
      console.error("[BRIDGE] Error listing models:", err);
      return [];
    }
  }

  /**
   * Cleanup on disconnect
   */
  private cleanupCallbacks() {
    for (const [, callback] of this.requestCallbacks) {
      clearTimeout(callback.timeout);
      callback.reject(new Error("Connection lost"));
    }
    this.requestCallbacks.clear();
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    this.cleanupCallbacks();
    if (this.socket) {
      this.socket.destroy();
      this.socket = undefined;
    }
  }
}

export default WindsurfBridgeClient;
