import { WebSocketServer } from 'ws';
import { WebSocketMessage } from './types';
import TaskBroker from './broker';

export class WebSocketManager {
  private wss: WebSocketServer;
  private broker: TaskBroker;

  constructor(port: number, broker: TaskBroker) {
    this.broker = broker;
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws) => {
      console.log('New Windsurf connection');
      
      ws.on('message', (data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      });

      ws.on('close', () => {
        console.log('Windsurf connection closed');
      });
    });
  }

  private handleMessage(ws: any, message: WebSocketMessage) {
    switch (message.type) {
      case 'register':
        this.handleRegister(ws, message.data);
        break;
      case 'heartbeat':
        this.handleHeartbeat(message.data);
        break;
      case 'task_result':
        this.handleTaskResult(message.data);
        break;
      case 'task_update':
        this.handleTaskUpdate(message.data);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private handleRegister(ws: any, data: any) {
    const instance = this.broker.registerInstance({
      port: data.port,
      model: data.model
    });
    
    ws.send(JSON.stringify({
      type: 'register_ack',
      data: { instanceId: instance.id }
    }));
  }

  private handleHeartbeat(data: { instanceId: string }) {
    this.broker.updateInstanceHeartbeat(data.instanceId);
  }

  private handleTaskResult(data: { 
    taskId: string;
    result?: any;
    error?: string;
  }) {
    this.broker.completeTask(data.taskId, data.result, data.error);
  }

  private handleTaskUpdate(data: { 
    taskId: string;
    status: 'executing';
  }) {
    const task = this.broker.getTaskStatus(data.taskId);
    if (task && task.assignedTo) {
      this.broker.setInstanceStatus(task.assignedTo, 'busy');
    }
  }

  assignTask(instanceId: string, task: any) {
    const client = [...this.wss.clients].find(
      (c: any) => c.instanceId === instanceId
    );
    
    if (client) {
      client.send(JSON.stringify({
        type: 'task_assignment',
        data: task
      }));
      return true;
    }
    return false;
  }

  close() {
    this.wss.close();
  }
}

export default WebSocketManager;
