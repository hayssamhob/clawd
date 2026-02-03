import { MCPServer } from '@modelcontextprotocol/sdk';
import { WindsurfIntegration } from './windsurf-integration';
import { WindsurfConfig } from '../args/windsurf.yaml';

export function registerWindsurfTools(
  mcp: MCPServer, 
  config: WindsurfConfig,
  integration: WindsurfIntegration
) {
  // Submit task to Windsurf broker
  mcp.tool('submit_windsurf_task', {
    description: 'Submit a coding task to the Windsurf broker',
    parameters: {
      prompt: { type: 'string', description: 'Task prompt' },
      model_id: { 
        type: 'string', 
        description: 'Optional model ID',
        enum: ['haiku', 'sonnet', 'opus', 'deepseek'] 
      },
      priority: { 
        type: 'string', 
        enum: ['low', 'medium', 'high'], 
        default: 'medium'
      },
      timeout: { 
        type: 'number', 
        description: 'Timeout in seconds',
        default: 1800
      }
    },
    handler: async (params) => {
      return integration.submitTask(
        params.prompt,
        {
          modelId: params.model_id,
          priority: params.priority,
          timeout: params.timeout
        }
      );
    }
  });

  // Check task status
  mcp.tool('check_windsurf_task', {
    description: 'Check status of a Windsurf task',
    parameters: {
      task_id: { type: 'string', description: 'Task ID' }
    },
    handler: async (params) => {
      return integration.getTaskStatus(params.task_id);
    }
  });

  // Quick execute (submit + wait)
  mcp.tool('windsurf_quick_code', {
    description: 'Submit task and wait for completion',
    parameters: {
      prompt: { type: 'string', description: 'Task prompt' },
      timeout: { 
        type: 'number', 
        description: 'Timeout in seconds',
        default: 1800
      }
    },
    handler: async (params) => {
      return integration.quickExecute(params.prompt, params.timeout);
    }
  });

  // List available instances
  mcp.tool('list_windsurf_instances', {
    description: 'List available Windsurf instances',
    handler: async () => {
      return integration.getBrokerStatus();
    }
  });

  // Broker health check
  mcp.tool('windsurf_broker_health', {
    description: 'Check health of Windsurf broker connection',
    handler: async () => {
      const status = integration.getBrokerStatus();
      return {
        healthy: status.connected,
        details: status
      };
    }
  });
}

export default registerWindsurfTools;
