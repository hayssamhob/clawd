import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

type TaskStatus = 'pending' | 'assigned' | 'executing' | 'completed' | 'failed';

interface Task {
  id: string;
  prompt: string;
  modelId?: string;
  priority?: 'low' | 'medium' | 'high';
  status: TaskStatus;
  result?: any;
  error?: string;
  progress?: number;
}

interface BrokerClientOptions {
  url?: string;
  authToken?: string;
  reconnectInterval?: number;
}

export class BrokerClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private authToken?: string;
  private reconnectInterval: number;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private pendingTasks = new Map<string, Task>();
  private messageQueue: string[] = [];

  constructor(options: BrokerClientOptions = {}) {
    super();
    this.url = options.url || 'ws://localhost:9000';
    this.authToken = options.authToken;
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(this.url);

    this.ws.on('open', () => {
      this.reconnectAttempts = 0;
      this.emit('connected');
      
      // Authenticate if token provided
      if (this.authToken) {
        this.send({ type: 'auth', token: this.authToken });
      }
      
      // Process any queued messages
      this.flushMessageQueue();
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (err) {
        this.emit('error', `Failed to parse message: ${err}`);
      }
    });

    this.ws.on('close', () => {
      this.emit('disconnected');
      this.attemptReconnect();
    });

    this.ws.on('error', (err) => {
      this.emit('error', err);
    });
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case 'task_assignment':
        this.emit('task_assigned', message.data);
        break;
      case 'task_update':
        this.updateTaskStatus(message.data);
        break;
      case 'task_result':
        this.completeTask(message.data);
        break;
      case 'error':
        this.emit('error', message.data);
        break;
      default:
        this.emit('message', message);
    }
  }

  private updateTaskStatus(data: { taskId: string; status: TaskStatus; progress?: number }) {
    const task = this.pendingTasks.get(data.taskId);
    if (task) {
      task.status = data.status;
      if (data.progress !== undefined) {
        task.progress = data.progress;
      }
      this.emit('task_update', task);
    }
  }

  private completeTask(data: { taskId: string; result?: any; error?: string }) {
    const task = this.pendingTasks.get(data.taskId);
    if (task) {
      task.status = data.error ? 'failed' : 'completed';
      task.result = data.result;
      task.error = data.error;
      this.pendingTasks.delete(data.taskId);
      this.emit('task_completed', task);
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), this.reconnectInterval);
    } else {
      this.emit('error', 'Max reconnect attempts reached');
    }
  }

  private send(message: any) {
    const msgString = JSON.stringify(message);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(msgString);
    } else {
      this.messageQueue.push(msgString);
    }
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(this.messageQueue.shift()!);
    }
  }

  submitTask(prompt: string, modelId?: string, priority: 'low' | 'medium' | 'high' = 'medium'): string {
    const taskId = `task-${uuidv4()}`;
    const task: Task = {
      id: taskId,
      prompt,
      modelId,
      priority,
      status: 'pending'
    };
    
    this.pendingTasks.set(taskId, task);
    this.send({
      type: 'submit_task',
      data: {
        taskId,
        prompt,
        modelId,
        priority
      }
    });
    
    return taskId;
  }

  getTaskStatus(taskId: string): Task | undefined {
    return this.pendingTasks.get(taskId);
  }

  close() {
    this.ws?.close();
  }
}

export default BrokerClient;
