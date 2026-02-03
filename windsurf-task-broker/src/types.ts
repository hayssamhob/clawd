// Type definitions for Windsurf Task Broker

export interface WindsurfInstance {
  id: string;
  port: number;
  model: string;
  status: 'idle' | 'busy' | 'offline';
  lastHeartbeat: Date;
  currentTask?: string;
}

export interface Task {
  id: string;
  prompt: string;
  modelId: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'assigned' | 'executing' | 'completed' | 'failed';
  assignedTo?: string; // Windsurf instance ID
  createdAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

export interface WebSocketMessage {
  type: 'register' | 'heartbeat' | 'task_result' | 'task_update';
  data: any;
}

export interface MCPTaskSubmission {
  prompt: string;
  modelId: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface MCPTaskStatus {
  taskId: string;
  status: Task['status'];
  result?: any;
  error?: string;
}

export interface InstanceRegistry {
  [id: string]: WindsurfInstance;
}

export interface TaskQueue {
  pending: Task[];
  active: Task[];
  completed: Task[];
}
