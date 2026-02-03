// Core types for OpenClaw Orchestrator

export interface Task {
  id: string;
  prompt: string;
  modelId?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'assigned' | 'executing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  progress?: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface WindsurfInstance {
  id: string;
  model: string;
  status: 'idle' | 'busy' | 'offline';
  lastHeartbeat: Date;
  currentTask?: string;
}

export interface BrokerMessage {
  type: 'submit_task' | 'task_update' | 'task_result' | 'auth' | 'heartbeat';
  data: any;
}

export interface TaskSubmission {
  prompt: string;
  modelId?: string;
  priority?: 'low' | 'medium' | 'high';
  timeout?: number; // in seconds
}

export interface TaskStatus {
  taskId: string;
  status: Task['status'];
  result?: any;
  error?: string;
  progress?: number;
  assignedInstance?: string;
}

export interface InstanceStatus {
  id: string;
  model: string;
  status: WindsurfInstance['status'];
  currentTask?: string;
  lastHeartbeat: Date;
}

export interface BrokerConfig {
  url: string;
  authToken?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}
