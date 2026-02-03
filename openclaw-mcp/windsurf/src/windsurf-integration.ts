import { OpenClawPlugin } from '@openclaw/core';
import { BrokerClient, TaskOrchestrator } from 'openclaw-orchestrator';
import { WindsurfConfig } from '../args/windsurf.yaml';

export class WindsurfIntegration implements OpenClawPlugin {
  private broker: BrokerClient;
  private orchestrator: TaskOrchestrator;
  private config: WindsurfConfig;

  constructor(config: WindsurfConfig) {
    this.config = config;
    this.broker = new BrokerClient({
      url: config.broker.url,
      authToken: config.broker.auth_token
    });
    
    this.orchestrator = new TaskOrchestrator(config.broker.url, {
      authToken: config.broker.auth_token,
      cacheTtl: config.cache.ttl_seconds * 1000,
      defaultTimeout: config.task_execution.default_timeout_seconds
    });
  }

  async submitTask(prompt: string, options?: {
    modelId?: string;
    priority?: 'low' | 'medium' | 'high';
    timeout?: number;
  }): Promise<string> {
    return this.orchestrator.submitTask({
      prompt,
      modelId: options?.modelId,
      priority: options?.priority || 'medium',
      timeout: options?.timeout
    }).then(res => res.taskId);
  }

  async waitForTask(taskId: string, timeout?: number): Promise<any> {
    return this.orchestrator.waitForTaskCompletion(
      taskId, 
      timeout || this.config.task_execution.default_timeout_seconds
    );
  }

  async quickExecute(prompt: string, timeout?: number): Promise<any> {
    const { taskId } = await this.submitTask(prompt);
    return this.waitForTask(taskId, timeout);
  }

  getBrokerStatus() {
    return {
      connected: this.broker.isConnected(),
      queueSize: this.orchestrator.getQueueSize(),
      activeTasks: this.orchestrator.getActiveTaskCount()
    };
  }

  // Plugin lifecycle methods
  async onLoad() {
    await this.broker.connect();
  }

  async onUnload() {
    this.broker.close();
  }
}

export default WindsurfIntegration;
