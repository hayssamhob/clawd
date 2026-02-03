import BrokerClient from './broker-client';
import { Task, TaskStatus, WindsurfInstance, TaskSubmission } from './types';
import { v4 as uuidv4 } from 'uuid';
import LRUCache from 'lru-cache';

const DEFAULT_TIMEOUT = 1800; // 30 minutes
const DEFAULT_CACHE_TTL = 3600 * 1000; // 1 hour

export class TaskOrchestrator {
  private broker: BrokerClient;
  private cache: LRUCache<string, TaskStatus>;
  private pendingTasks = new Map<string, Task>();
  private instanceStatus = new Map<string, WindsurfInstance>();
  
  constructor(
    brokerUrl: string,
    private options: {
      cacheTtl?: number;
      defaultTimeout?: number;
      authToken?: string;
    } = {}
  ) {
    this.broker = new BrokerClient({
      url: brokerUrl,
      authToken: options.authToken
    });
    
    this.cache = new LRUCache({
      max: 1000,
      ttl: options.cacheTtl || DEFAULT_CACHE_TTL
    });
    
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.broker.on('task_assigned', (data: { taskId: string, instanceId: string }) => {
      const task = this.pendingTasks.get(data.taskId);
      if (task) {
        task.status = 'assigned';
      }
    });

    this.broker.on('task_update', (task: Task) => {
      this.pendingTasks.set(task.id, task);
    });

    this.broker.on('task_completed', (task: Task) => {
      this.pendingTasks.delete(task.id);
      this.cache.set(task.id, {
        taskId: task.id,
        status: task.status,
        result: task.result,
        error: task.error
      });
    });
  }

  async submitTask(submission: TaskSubmission): Promise<{ taskId: string }> {
    // Check cache first
    const cacheKey = this.getCacheKey(submission);
    const cached = this.cache.get(cacheKey);
    if (cached?.status === 'completed') {
      return { taskId: cacheKey };
    }

    // Create new task
    const taskId = uuidv4();
    const task: Task = {
      id: taskId,
      prompt: submission.prompt,
      modelId: submission.modelId,
      priority: submission.priority || 'medium',
      status: 'pending',
      createdAt: new Date()
    };

    this.pendingTasks.set(taskId, task);
    this.broker.submitTask(
      submission.prompt,
      submission.modelId,
      submission.priority
    );

    return { taskId };
  }

  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    // Check cache
    const cached = this.cache.get(taskId);
    if (cached) return cached;

    // Check pending tasks
    const task = this.pendingTasks.get(taskId);
    if (task) {
      return {
        taskId: task.id,
        status: task.status,
        progress: task.progress,
        error: task.error
      };
    }

    return { taskId, status: 'unknown' };
  }

  async waitForTaskCompletion(
    taskId: string,
    timeout = this.options.defaultTimeout || DEFAULT_TIMEOUT
  ): Promise<TaskStatus> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        const status = await this.getTaskStatus(taskId);
        
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          resolve(status);
        }
      }, 2000);

      const timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error(`Task ${taskId} timed out after ${timeout} seconds`));
      }, timeout * 1000);
    });
  }

  private getCacheKey(submission: TaskSubmission): string {
    // Create consistent cache key based on prompt and model
    return `${submission.modelId || 'default'}:${submission.prompt}`;
  }

  close() {
    this.broker.close();
  }
}

export default TaskOrchestrator;
