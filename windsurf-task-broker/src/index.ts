import { MCPServer } from '@modelcontextprotocol/sdk';
import TaskBroker from './broker';
import WebSocketManager from './websocket';
import { MCPTaskSubmission, MCPTaskStatus } from './types';

// Configuration
const WS_PORT = 9000;
const MCP_PORT = 9100;

// Initialize components
const broker = new TaskBroker();
const wsManager = new WebSocketManager(WS_PORT, broker);

// Create MCP Server
const mcpServer = new MCPServer({
  port: MCP_PORT,
  name: 'Windsurf Task Broker'
});

// MCP Tool Definitions
mcpServer.tool('submit_task', {
  description: 'Submit a task to the Windsurf queue',
  parameters: {
    prompt: { type: 'string', description: 'Task prompt' },
    modelId: { type: 'string', description: 'Model ID to use' },
    priority: { 
      type: 'string', 
      enum: ['low', 'medium', 'high'], 
      default: 'medium'
    }
  },
  handler: async (params: MCPTaskSubmission) => {
    const task = broker.createTask({
      prompt: params.prompt,
      modelId: params.modelId,
      priority: params.priority || 'medium'
    });
    
    // Auto-distribute if instances available
    broker.distributeTasks();
    
    return { taskId: task.id, status: task.status };
  }
});

mcpServer.tool('get_task_status', {
  description: 'Check status of a task',
  parameters: {
    taskId: { type: 'string', description: 'Task ID to check' }
  },
  handler: async (params: { taskId: string }): Promise<MCPTaskStatus> => {
    const task = broker.getTaskStatus(params.taskId);
    if (!task) throw new Error('Task not found');
    
    return {
      taskId: task.id,
      status: task.status,
      result: task.result,
      error: task.error
    };
  }
});

mcpServer.tool('list_instances', {
  description: 'List available Windsurf instances',
  handler: async () => {
    return broker.listInstances();
  }
});

mcpServer.tool('get_queue', {
  description: 'Get current task queue state',
  handler: async () => {
    return broker.getQueue();
  }
});

mcpServer.tool('distribute_tasks', {
  description: 'Manually trigger task distribution',
  handler: async () => {
    const assigned = broker.distributeTasks();
    return { assigned: assigned.map(t => t.id) };
  }
});

// Start servers
mcpServer.start();
console.log(`MCP Server running on port ${MCP_PORT}`);
console.log(`WebSocket server running on port ${WS_PORT}`);

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('Shutting down...');
  wsManager.close();
  mcpServer.stop();
  process.exit();
});

// Periodic cleanup
setInterval(() => {
  const removed = broker.cleanupCompletedTasks();
  if (removed > 0) {
    console.log(`Cleaned up ${removed} completed tasks`);
  }
}, 3600 * 1000); // Hourly
