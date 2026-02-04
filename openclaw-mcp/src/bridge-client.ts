import axios from 'axios';
import { EventEmitter } from 'events';

export interface TaskResult {
  status: 'completed' | 'failed';
  result?: string;
  error?: string;
  model: string;
  executionTime: number;
}

export class WindsurfBridgeClient extends EventEmitter {
  private baseUrl: string;
  private port: number;
  private connected: boolean = false;

  constructor(port: number) {
    super();
    this.port = port;
    this.baseUrl = `http://localhost:${port}`;
  }

  async connect(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      this.connected = response.status === 200;
      if (this.connected) {
        this.emit('connected');
      }
      return this.connected;
    } catch (error) {
      this.connected = false;
      return false;
    }
  }

  async executeTask(prompt: string, model: string = 'auto'): Promise<TaskResult> {
    if (!this.connected) {
      throw new Error('Not connected to bridge');
    }

    try {
      const startTime = Date.now();
      const response = await axios.post(`${this.baseUrl}/execute`, {
        prompt,
        model
      });

      return {
        status: 'completed',
        result: response.data.result,
        model: response.data.model || model,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Execution failed',
        model,
        executionTime: 0
      };
    }
  }

  async switchModel(model: string): Promise<{ success: boolean }> {
    if (!this.connected) {
      throw new Error('Not connected to bridge');
    }

    try {
      await axios.post(`${this.baseUrl}/switch-model`, { model });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export default WindsurfBridgeClient;
