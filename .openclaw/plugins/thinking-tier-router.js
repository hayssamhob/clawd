/**
 * OpenClaw Thinking Tier Router Plugin
 * 
 * Maps thinking levels to appropriate models for cost optimization.
 * Integrates with complexity classifier for intelligent routing.
 */

const THINKING_TIER_CONFIG = {
  off: {
    model: 'anthropic/claude-3-5-haiku-20241022',
    maxTokens: 1000,
    description: 'No reasoning needed - simple responses',
    costPerMToken: 0.25 // Input cost
  },
  
  minimal: {
    model: 'anthropic/claude-3-5-haiku-20241022',
    maxTokens: 2000,
    description: 'Minimal reasoning - quick tasks',
    costPerMToken: 0.25
  },
  
  low: {
    model: 'anthropic/claude-3-5-haiku-20241022',
    maxTokens: 4000,
    description: 'Low complexity reasoning',
    costPerMToken: 0.25
  },
  
  medium: {
    model: 'anthropic/claude-3-5-sonnet-20241022',
    maxTokens: 8000,
    description: 'Medium complexity - multi-step reasoning',
    costPerMToken: 3.0
  },
  
  high: {
    model: 'anthropic/claude-sonnet-4-5-20250929',
    maxTokens: 16000,
    description: 'High complexity - deep reasoning',
    costPerMToken: 3.0
  },
  
  xhigh: {
    model: 'anthropic/claude-sonnet-4-5-20250929',
    maxTokens: 32000,
    description: 'Maximum reasoning - novel problems',
    costPerMToken: 3.0
  }
};

/**
 * Fallback chain per tier
 */
const TIER_FALLBACKS = {
  off: ['openrouter/stepfun/step-3.5-flash:free', 'ollama/llama3.2:latest'],
  minimal: ['openrouter/stepfun/step-3.5-flash:free', 'ollama/llama3.2:latest'],
  low: ['openrouter/stepfun/step-3.5-flash:free', 'ollama/llama3.2:latest'],
  medium: ['anthropic/claude-3-5-haiku-20241022', 'openrouter/stepfun/step-3.5-flash:free', 'ollama/llama3.2:latest'],
  high: ['anthropic/claude-3-5-sonnet-20241022', 'openrouter/stepfun/step-3.5-flash:free', 'ollama/llama3.2:latest'],
  xhigh: ['anthropic/claude-3-5-sonnet-20241022', 'openrouter/stepfun/step-3.5-flash:free', 'ollama/llama3.2:latest']
};

/**
 * Token budget tracking
 */
class TokenBudget {
  constructor() {
    this.dailyLimit = 100000; // 100k tokens per day
    this.usage = new Map(); // Date -> usage
    this.currentDate = this.getDateKey();
  }
  
  getDateKey() {
    return new Date().toISOString().split('T')[0];
  }
  
  getTodayUsage() {
    const today = this.getDateKey();
    if (today !== this.currentDate) {
      // New day, reset
      this.currentDate = today;
      this.usage.clear();
    }
    return this.usage.get(today) || 0;
  }
  
  recordUsage(tokens, model) {
    const today = this.getDateKey();
    const current = this.usage.get(today) || 0;
    this.usage.set(today, current + tokens);
    
    console.log(`[Token Budget] Used ${tokens} tokens on ${model}. Today: ${current + tokens}/${this.dailyLimit}`);
  }
  
  getRemainingBudget() {
    return this.dailyLimit - this.getTodayUsage();
  }
  
  shouldDowngrade() {
    const remaining = this.getRemainingBudget();
    const percentUsed = ((this.dailyLimit - remaining) / this.dailyLimit) * 100;
    
    // Start downgrading at 70% usage
    return percentUsed > 70;
  }
  
  getRecommendedTier(requestedTier) {
    if (!this.shouldDowngrade()) {
      return requestedTier;
    }
    
    // Downgrade logic
    const tierOrder = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
    const currentIndex = tierOrder.indexOf(requestedTier);
    
    const remaining = this.getRemainingBudget();
    const percentRemaining = (remaining / this.dailyLimit) * 100;
    
    if (percentRemaining < 10) {
      // Critical: only use free models
      return 'minimal';
    } else if (percentRemaining < 30) {
      // Low budget: downgrade by 2 tiers
      return tierOrder[Math.max(0, currentIndex - 2)];
    } else {
      // Moderate budget: downgrade by 1 tier
      return tierOrder[Math.max(0, currentIndex - 1)];
    }
  }
}

const tokenBudget = new TokenBudget();

/**
 * Route request to appropriate model based on thinking tier
 */
function routeByThinkingTier(thinkingLevel, complexity, budgetOverride = false) {
  // Get base config
  const tierConfig = THINKING_TIER_CONFIG[thinkingLevel] || THINKING_TIER_CONFIG.medium;
  
  // Check budget and potentially downgrade
  let effectiveTier = thinkingLevel;
  if (!budgetOverride) {
    effectiveTier = tokenBudget.getRecommendedTier(thinkingLevel);
    if (effectiveTier !== thinkingLevel) {
      console.log(`[Tier Router] Budget constraint: ${thinkingLevel} -> ${effectiveTier}`);
    }
  }
  
  const config = THINKING_TIER_CONFIG[effectiveTier];
  
  return {
    model: config.model,
    fallbacks: TIER_FALLBACKS[effectiveTier],
    maxTokens: config.maxTokens,
    thinking: effectiveTier,
    budgetDowngraded: effectiveTier !== thinkingLevel,
    estimatedCost: estimateCost(config, complexity)
  };
}

/**
 * Estimate cost for request
 */
function estimateCost(config, complexity) {
  // Rough token estimates based on complexity
  const tokenEstimates = {
    TRIVIAL: 100,
    LOW: 500,
    MEDIUM: 2000,
    HIGH: 5000,
    CRITICAL: 10000
  };
  
  const estimatedTokens = tokenEstimates[complexity] || 2000;
  const costPerToken = config.costPerMToken / 1000000;
  
  return {
    estimatedTokens,
    estimatedCostUSD: estimatedTokens * costPerToken,
    model: config.model
  };
}

/**
 * Sub-agent spawning helper
 */
function shouldUseSubAgent(complexity, thinkingLevel) {
  // Use sub-agents for:
  // 1. Low/Medium complexity tasks that don't need main agent
  // 2. Parallel batch processing
  // 3. Long-running tasks
  
  const useSubAgent = 
    (complexity === 'LOW' || complexity === 'TRIVIAL') ||
    (complexity === 'MEDIUM' && thinkingLevel !== 'high' && thinkingLevel !== 'xhigh');
  
  return useSubAgent;
}

/**
 * Generate sub-agent spawn config
 */
function getSubAgentConfig(task, complexity, thinkingLevel) {
  const routing = routeByThinkingTier(thinkingLevel, complexity);
  
  return {
    agentId: 'worker',
    model: routing.model,
    thinking: routing.thinking,
    task: task,
    promptMode: 'minimal', // Reduce token overhead
    metadata: {
      complexity,
      estimatedCost: routing.estimatedCost
    }
  };
}

/**
 * Batch request optimizer
 */
class BatchOptimizer {
  constructor() {
    this.pendingRequests = [];
    this.batchWindow = 2000; // 2 second window
    this.maxBatchSize = 10;
    this.timer = null;
  }
  
  addRequest(request) {
    this.pendingRequests.push(request);
    
    if (this.pendingRequests.length >= this.maxBatchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.batchWindow);
    }
  }
  
  flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    if (this.pendingRequests.length === 0) return;
    
    const batch = this.pendingRequests.splice(0);
    console.log(`[Batch Optimizer] Processing ${batch.length} requests in batch`);
    
    return this.processBatch(batch);
  }
  
  processBatch(requests) {
    // Combine requests into single prompt
    const combined = requests.map((r, i) => 
      `${i + 1}. ${r.message}`
    ).join('\n\n');
    
    return {
      message: `Process these ${requests.length} requests efficiently:\n\n${combined}\n\nProvide brief, structured responses for each.`,
      metadata: {
        isBatch: true,
        batchSize: requests.length,
        originalRequests: requests
      }
    };
  }
}

const batchOptimizer = new BatchOptimizer();

/**
 * Context compression strategies
 */
function compressForModel(context, model) {
  // More aggressive compression for cheaper models
  const isHaiku = model.includes('haiku');
  const isFree = model.includes(':free');
  
  if (isHaiku || isFree) {
    // Strip verbose logs, keep only essentials
    let compressed = context;
    
    // Remove duplicate whitespace
    compressed = compressed.replace(/\s+/g, ' ');
    
    // Truncate long code blocks
    compressed = compressed.replace(/```[\s\S]{500,}?```/g, (match) => {
      return match.substring(0, 500) + '\n... (truncated)\n```';
    });
    
    // Limit total length
    if (compressed.length > 2000) {
      compressed = compressed.substring(0, 2000) + '\n... (context truncated for efficiency)';
    }
    
    return compressed;
  }
  
  return context;
}

/**
 * Plugin exports
 */
module.exports = {
  name: 'thinking-tier-router',
  version: '1.0.0',
  
  // Core routing
  routeByThinkingTier,
  shouldUseSubAgent,
  getSubAgentConfig,
  
  // Budget management
  tokenBudget,
  
  // Optimization
  batchOptimizer,
  compressForModel,
  
  // Config
  THINKING_TIER_CONFIG,
  TIER_FALLBACKS,
  
  // Hooks
  hooks: {
    'agent:before-inference': async (event) => {
      const { thinkingLevel, complexity, context } = event;
      
      // Route to appropriate model
      const routing = routeByThinkingTier(thinkingLevel, complexity);
      
      // Compress context if needed
      const compressedContext = compressForModel(context, routing.model);
      
      return {
        model: routing.model,
        fallbacks: routing.fallbacks,
        maxTokens: routing.maxTokens,
        context: compressedContext,
        metadata: {
          originalThinking: thinkingLevel,
          effectiveThinking: routing.thinking,
          budgetDowngraded: routing.budgetDowngraded,
          estimatedCost: routing.estimatedCost
        }
      };
    },
    
    'agent:after-inference': async (event) => {
      const { tokensUsed, model } = event;
      
      // Record usage
      tokenBudget.recordUsage(tokensUsed, model);
    }
  }
};
