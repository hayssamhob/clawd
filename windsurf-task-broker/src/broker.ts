import { InstanceRegistry, Task, TaskQueue, WindsurfInstance } from './types';
import { v4 as uuidv4 } from 'uuid';

class TaskBroker {
  private instances: InstanceRegistry = {};
  private queue: TaskQueue = {
    pending: [],
    active: [],
    completed: []
  };
  private completedTaskTTL = 3600 * 1000; // 1 hour

  // Instance Management
  registerInstance(instance: Omit<WindsurfInstance, 'id' | 'status' | 'lastHeartbeat'>): WindsurfInstance {
    const id = `windsurf-${uuidv4().slice(0, 8)}`;
    const newInstance: WindsurfInstance = {
      id,
      ...instance,
      status: 'idle',
      lastHeartbeat: new Date()
    };
    this.instances[id] = newInstance;
    return newInstance;
  }

  updateInstanceHeartbeat(id: string): boolean {
    if (!this.instances[id]) return false;
    this.instances[id].lastHeartbeat = new Date();
    return true;
  }

  setInstanceStatus(id: string, status: WindsurfInstance['status']): boolean {
    if (!this.instances[id]) return false;
    this.instances[id].status = status;
    return true;
  }

  getAvailableInstances(): WindsurfInstance[] {
    return Object.values(this.instances).filter(
      instance => instance.status === 'idle' && 
      (Date.now() - instance.lastHeartbeat.getTime()) < 30000 // 30s threshold
    );
  }

  // Task Management
  createTask(task: Omit<Task, 'id' | 'status' | 'createdAt'>): Task {
    const newTask: Task = {
      id: `task-${uuidv4().slice(0, 8)}`,
      ...task,
      status: 'pending',
      createdAt: new Date()
    };
    this.queue.pending.push(newTask);
    return newTask;
  }

  assignTask(taskId: string, instanceId: string): boolean {
    const task = this.queue.pending.find(t => t.id === taskId);
    if (!task || !this.instances[instanceId]) return false;
    
    task.status = 'assigned';
    task.assignedTo = instanceId;
    this.instances[instanceId].status = 'busy';
    this.instances[instanceId].currentTask = taskId;
    
    // Move from pending to active
    this.queue.pending = this.queue.pending.filter(t => t.id !== taskId);
    this.queue.active.push(task);
    
    return true;
  }

  completeTask(taskId: string, result: any, error?: string): boolean {
    const taskIndex = this.queue.active.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return false;
    
    const task = this.queue.active[taskIndex];
    task.status = error ? 'failed' : 'completed';
    task.completedAt = new Date();
    task.result = result;
    task.error = error;
    
    // Release instance
    if (task.assignedTo) {
      this.instances[task.assignedTo].status = 'idle';
      this.instances[task.assignedTo].currentTask = undefined;
    }
    
    // Move from active to completed
    this.queue.active.splice(taskIndex, 1);
    this.queue.completed.push(task);
    
    return true;
  }

  // Queue Management
  distributeTasks(): Task[] {
    const availableInstances = this.getAvailableInstances();
    const assignableTasks = this.queue.pending
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, availableInstances.length);
    
    const assigned: Task[] = [];
    assignableTasks.forEach((task, i) => {
      if (this.assignTask(task.id, availableInstances[i].id)) {
        assigned.push(task);
      }
    });
    
    return assigned;
  }

  cleanupCompletedTasks(): number {
    const threshold = Date.now() - this.completedTaskTTL;
    const expiredTasks = this.queue.completed.filter(
      task => task.completedAt && task.completedAt.getTime() < threshold
    );
    this.queue.completed = this.queue.completed.filter(
      task => !(task.completedAt && task.completedAt.getTime() < threshold)
    );
    return expiredTasks.length;
  }

  // Getters
  getQueue(): TaskQueue {
    return {
      pending: [...this.queue.pending],
      active: [...this.queue.active],
      completed: [...this.queue.completed]
    };
  }

  getTaskStatus(taskId: string): Task | undefined {
    const allTasks = [...this.queue.pending, ...this.queue.active, ...this.queue.completed];
    return allTasks.find(t => t.id === taskId);
  }

  listInstances(): WindsurfInstance[] {
    return Object.values(this.instances);
  }
}

export default TaskBroker;
