import { TaskSubmission, TaskStatus } from './types';
import { BrokerClient } from './broker-client';

interface ModelProfile {
  id: string;
  costPerToken: number;
  capabilities: {
    reasoning: number; // 0-1 scale
    speed: number; // 0-1 scale
    context: number; // token count
  };
}

export class TaskRouter {
  private models: ModelProfile[] = [
    {
      id: 'anthropic/claude-sonnet-4-5-20250929',
      costPerToken: 0.015,
      capabilities: { reasoning: 0.95, speed: 0.7, context: 200000 }
    },
    {
      id: 'anthropic/claude-3-5-haiku-20241022',
      costPerToken: 0.0025,
      capabilities: { reasoning: 0.75, speed: 0.95, context: 200000 }
    },
    {
      id: 'deepseek/deepseek-v3',
      costPerToken: 0.001,
      capabilities: { reasoning: 0.65, speed: 0.85, context: 128000 }
    }
  ];

  private budgetThresholds = {
    critical: 0.2, // 20% budget remaining
    warning: 0.5  // 50% budget remaining
  };

  constructor(
    private broker: BrokerClient,
    private options: {
      currentBudget?: number;
      totalBudget?: number;
    } = {}
  ) {}

  routeTask(submission: TaskSubmission): string {
    // If model is explicitly specified, use it
    if (submission.modelId) {
      return this.broker.submitTask(
        submission.prompt,
        submission.modelId,
        submission.priority
      );
    }

    // Determine optimal model based on complexity and budget
    const complexity = this.analyzeComplexity(submission.prompt);
    const modelId = this.selectModel(complexity);
    
    return this.broker.submitTask(
      submission.prompt,
      modelId,
      submission.priority
    );
  }

  private analyzeComplexity(prompt: string): number {
    // Simple complexity scoring (0-1)
    const wordCount = prompt.split(/\s+/).length;
    const hasComplexKeywords = /(refactor|optimize|debug|rewrite)/i.test(prompt);
    const hasCodeBlocks = /```[\s\S]*```/.test(prompt);
    
    let score = 0;
    
    // Base score on length
    if (wordCount < 50) score = 0.2;
    else if (wordCount < 200) score = 0.4;
    else if (wordCount < 500) score = 0.6;
    else score = 0.8;
    
    // Adjust for complexity indicators
    if (hasComplexKeywords) score = Math.min(score + 0.3, 1);
    if (hasCodeBlocks) score = Math.min(score + 0.2, 1);
    
    return score;
  }

  private selectModel(complexity: number): string {
    // Check budget constraints first
    const budgetRatio = this.options.totalBudget && this.options.currentBudget
      ? this.options.currentBudget / this.options.totalBudget
      : 1; // Assume full budget if not specified
    
    // Budget emergency - use cheapest model
    if (budgetRatio < this.budgetThresholds.critical) {
      return this.models.reduce((prev, curr) => 
        curr.costPerToken < prev.costPerToken ? curr : prev
      ).id;
    }
    
    // Budget warning - avoid most expensive models
    if (budgetRatio < this.budgetThresholds.warning) {
      return this.models
        .filter(m => m.costPerToken < 0.01) // Filter out expensive models
        .sort((a, b) => b.capabilities.reasoning - a.capabilities.reasoning)[0].id;
    }
    
    // Normal routing based on complexity
    if (complexity < 0.4) {
      // Simple tasks - fastest/cheapest
      return this.models.sort(
        (a, b) => b.capabilities.speed - a.capabilities.speed
      )[0].id;
    } else if (complexity < 0.7) {
      // Medium tasks - balance cost and capability
      return this.models.sort(
        (a, b) => (b.capabilities.reasoning * 0.7 + b.capabilities.speed * 0.3) - 
                  (a.capabilities.reasoning * 0.7 + a.capabilities.speed * 0.3)
      )[0].id;
    } else {
      // Complex tasks - highest reasoning
      return this.models.sort(
        (a, b) => b.capabilities.reasoning - a.capabilities.reasoning
      )[0].id;
    }
  }
}

export default TaskRouter;
