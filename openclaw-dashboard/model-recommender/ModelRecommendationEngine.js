/**
 * Model Recommendation Engine
 * 
 * Intelligent engine that combines task complexity classification
 * with model capabilities, cost optimization, and user preferences
 * to recommend the optimal AI model for each task.
 */

import TaskComplexityClassifier, { COMPLEXITY_LEVELS, MODEL_RECOMMENDATIONS } from './TaskComplexityClassifier.js';

// Model capability profiles
const MODEL_PROFILES = {
  'anthropic/claude-sonnet-4-5-20250929': {
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    tier: 'premium',
    capabilities: {
      reasoning: 0.95,
      coding: 0.95,
      creativity: 0.90,
      speed: 0.70,
      context: 200000
    },
    cost: { input: 3.0, output: 15.0 },
    strengths: ['complex reasoning', 'debugging', 'architecture'],
    bestFor: ['HIGH', 'CRITICAL']
  },
  'anthropic/claude-3-5-sonnet-20241022': {
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    tier: 'premium',
    capabilities: {
      reasoning: 0.90,
      coding: 0.92,
      creativity: 0.88,
      speed: 0.75,
      context: 200000
    },
    cost: { input: 3.0, output: 15.0 },
    strengths: ['coding', 'analysis', 'explanation'],
    bestFor: ['MEDIUM', 'HIGH']
  },
  'anthropic/claude-3-5-haiku-20241022': {
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    tier: 'standard',
    capabilities: {
      reasoning: 0.75,
      coding: 0.80,
      creativity: 0.70,
      speed: 0.95,
      context: 200000
    },
    cost: { input: 0.25, output: 1.25 },
    strengths: ['speed', 'simple tasks', 'cost-effective'],
    bestFor: ['TRIVIAL', 'LOW']
  },
  'openai/gpt-4o': {
    name: 'GPT-4o',
    provider: 'openai',
    tier: 'premium',
    capabilities: {
      reasoning: 0.88,
      coding: 0.88,
      creativity: 0.85,
      speed: 0.80,
      context: 128000
    },
    cost: { input: 2.5, output: 10.0 },
    strengths: ['versatility', 'multimodal', 'general tasks'],
    bestFor: ['MEDIUM', 'HIGH']
  },
  'openai/gpt-4o-mini': {
    name: 'GPT-4o Mini',
    provider: 'openai',
    tier: 'standard',
    capabilities: {
      reasoning: 0.70,
      coding: 0.75,
      creativity: 0.70,
      speed: 0.90,
      context: 128000
    },
    cost: { input: 0.15, output: 0.60 },
    strengths: ['speed', 'cost-effective', 'basic tasks'],
    bestFor: ['TRIVIAL', 'LOW']
  },
  'google/gemini-2.0-flash': {
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    tier: 'free',
    capabilities: {
      reasoning: 0.72,
      coding: 0.70,
      creativity: 0.68,
      speed: 0.95,
      context: 1000000
    },
    cost: { input: 0, output: 0 },
    strengths: ['free', 'fast', 'large context'],
    bestFor: ['TRIVIAL', 'LOW']
  },
  'groq/llama-3.3-70b-versatile': {
    name: 'Llama 3.3 70B',
    provider: 'groq',
    tier: 'free',
    capabilities: {
      reasoning: 0.75,
      coding: 0.72,
      creativity: 0.70,
      speed: 0.98,
      context: 128000
    },
    cost: { input: 0, output: 0 },
    strengths: ['free', 'extremely fast', 'open source'],
    bestFor: ['TRIVIAL', 'LOW', 'MEDIUM']
  },
  'ollama/llama3.2:latest': {
    name: 'Llama 3.2 (Local)',
    provider: 'ollama',
    tier: 'free',
    capabilities: {
      reasoning: 0.65,
      coding: 0.60,
      creativity: 0.60,
      speed: 0.85,
      context: 131072
    },
    cost: { input: 0, output: 0 },
    strengths: ['local', 'private', 'no API calls'],
    bestFor: ['TRIVIAL', 'LOW']
  },
  'xai/grok-beta': {
    name: 'Grok Beta',
    provider: 'xai',
    tier: 'premium',
    capabilities: {
      reasoning: 0.85,
      coding: 0.82,
      creativity: 0.88,
      speed: 0.75,
      context: 131072
    },
    cost: { input: 5.0, output: 15.0 },
    strengths: ['creativity', 'real-time knowledge', 'humor'],
    bestFor: ['MEDIUM', 'HIGH']
  }
};

/**
 * Model Recommendation Engine
 */
class ModelRecommendationEngine {
  constructor(options = {}) {
    this.classifier = new TaskComplexityClassifier(options);
    this.options = {
      dailyBudget: options.dailyBudget || 100000, // tokens
      preferLocal: options.preferLocal || false,
      preferFast: options.preferFast || false,
      preferCheap: options.preferCheap || false,
      availableModels: options.availableModels || Object.keys(MODEL_PROFILES),
      ...options
    };

    // Token usage tracking
    this.usage = {
      today: 0,
      history: []
    };

    // Recommendation history for learning
    this.recommendationHistory = [];
  }

  /**
   * Get recommendation for a task
   * @param {string} message - The task/message to analyze
   * @param {Object} context - Additional context
   * @returns {Object} Recommendation result
   */
  recommend(message, context = {}) {
    const startTime = Date.now();

    // Classify the task
    const classification = this.classifier.classify(message);

    // Get base recommendations for this complexity level
    const baseRecs = MODEL_RECOMMENDATIONS[classification.level] || [];

    // Filter to available models
    const availableRecs = baseRecs.filter(rec => 
      this.options.availableModels.includes(rec.id)
    );

    // Score each model based on multiple factors
    const scoredModels = this._scoreModels(availableRecs, classification, context);

    // Sort by score
    scoredModels.sort((a, b) => b.totalScore - a.totalScore);

    // Build recommendation
    const recommendation = {
      primary: scoredModels[0] || null,
      alternatives: scoredModels.slice(1, 4),
      classification: classification,
      reasoning: this._buildReasoning(scoredModels[0], classification),
      budgetImpact: this._calculateBudgetImpact(scoredModels[0]),
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    // Store in history
    this.recommendationHistory.push({
      message: message.substring(0, 100),
      recommendation: recommendation.primary?.id,
      classification: classification.level,
      timestamp: recommendation.timestamp
    });

    return recommendation;
  }

  /**
   * Score models based on multiple factors
   */
  _scoreModels(recommendations, classification, context) {
    return recommendations.map(rec => {
      const profile = MODEL_PROFILES[rec.id];
      if (!profile) {
        return { ...rec, totalScore: 0 };
      }

      let scores = {
        capability: this._scoreCapability(profile, classification),
        cost: this._scoreCost(profile),
        speed: this._scoreSpeed(profile),
        preference: this._scorePreferences(profile),
        budget: this._scoreBudget(profile)
      };

      // Weight the scores
      const weights = {
        capability: 0.35,
        cost: this.options.preferCheap ? 0.30 : 0.15,
        speed: this.options.preferFast ? 0.25 : 0.15,
        preference: 0.15,
        budget: 0.20
      };

      const totalScore = Object.entries(scores).reduce((sum, [key, score]) => {
        return sum + (score * weights[key]);
      }, 0);

      return {
        ...rec,
        profile: profile,
        scores: scores,
        totalScore: totalScore
      };
    });
  }

  /**
   * Score model capability for the task
   */
  _scoreCapability(profile, classification) {
    const level = classification.level;
    const taskType = classification.features?.taskType?.type || 'unknown';

    // Base score from whether this model is recommended for this level
    let score = profile.bestFor.includes(level) ? 0.8 : 0.5;

    // Adjust based on task type
    if (taskType === 'debugging' || taskType === 'analysis') {
      score += profile.capabilities.reasoning * 0.2;
    } else if (taskType === 'creation' || taskType === 'optimization') {
      score += profile.capabilities.coding * 0.2;
    } else if (taskType === 'greeting' || taskType === 'status') {
      score += profile.capabilities.speed * 0.2;
    }

    return Math.min(score, 1);
  }

  /**
   * Score model cost (higher score = cheaper)
   */
  _scoreCost(profile) {
    const totalCost = profile.cost.input + profile.cost.output;
    if (totalCost === 0) return 1.0;
    if (totalCost < 2) return 0.9;
    if (totalCost < 5) return 0.7;
    if (totalCost < 10) return 0.5;
    return 0.3;
  }

  /**
   * Score model speed
   */
  _scoreSpeed(profile) {
    return profile.capabilities.speed;
  }

  /**
   * Score based on user preferences
   */
  _scorePreferences(profile) {
    let score = 0.5;

    if (this.options.preferLocal && profile.provider === 'ollama') {
      score += 0.4;
    }

    if (this.options.preferFast && profile.capabilities.speed > 0.9) {
      score += 0.3;
    }

    if (this.options.preferCheap && profile.tier === 'free') {
      score += 0.4;
    }

    return Math.min(score, 1);
  }

  /**
   * Score based on remaining budget
   */
  _scoreBudget(profile) {
    const remaining = this.getRemainingBudget();
    const percentRemaining = remaining / this.options.dailyBudget;

    if (percentRemaining > 0.7) {
      // Plenty of budget - all models ok
      return 0.8;
    } else if (percentRemaining > 0.3) {
      // Medium budget - prefer cheaper
      return profile.tier === 'free' ? 0.9 : (profile.tier === 'standard' ? 0.7 : 0.5);
    } else {
      // Low budget - strongly prefer free/cheap
      return profile.tier === 'free' ? 1.0 : (profile.tier === 'standard' ? 0.5 : 0.2);
    }
  }

  /**
   * Build human-readable reasoning
   */
  _buildReasoning(model, classification) {
    if (!model) return 'No suitable model found';

    const reasons = [];
    const profile = model.profile;

    reasons.push(`Task classified as ${classification.level} complexity`);
    
    if (profile) {
      reasons.push(`${profile.name} is optimized for ${profile.bestFor.join(', ')} tasks`);
      
      if (profile.strengths.length > 0) {
        reasons.push(`Strengths: ${profile.strengths.slice(0, 3).join(', ')}`);
      }

      if (profile.tier === 'free') {
        reasons.push('Zero cost option');
      } else if (profile.tier === 'standard') {
        reasons.push('Cost-effective choice');
      }
    }

    return reasons.join('. ') + '.';
  }

  /**
   * Calculate budget impact of using a model
   */
  _calculateBudgetImpact(model) {
    if (!model || !model.profile) return { tokens: 0, cost: 0 };

    const levelInfo = COMPLEXITY_LEVELS[model.classification?.level || 'MEDIUM'];
    const estimatedTokens = levelInfo?.maxTokens || 500;
    const profile = model.profile;

    return {
      estimatedTokens: estimatedTokens,
      estimatedCost: (estimatedTokens / 1000) * (profile.cost.input + profile.cost.output),
      remainingBudget: this.getRemainingBudget() - estimatedTokens
    };
  }

  /**
   * Track token usage
   */
  trackUsage(tokens) {
    this.usage.today += tokens;
    this.usage.history.push({
      tokens: tokens,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget() {
    return Math.max(0, this.options.dailyBudget - this.usage.today);
  }

  /**
   * Reset daily usage
   */
  resetDailyUsage() {
    this.usage.today = 0;
    this.usage.history = [];
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    return {
      today: this.usage.today,
      remaining: this.getRemainingBudget(),
      percentUsed: (this.usage.today / this.options.dailyBudget) * 100,
      recommendationCount: this.recommendationHistory.length,
      topModels: this._getTopRecommendedModels()
    };
  }

  /**
   * Get most frequently recommended models
   */
  _getTopRecommendedModels() {
    const counts = {};
    this.recommendationHistory.forEach(rec => {
      if (rec.recommendation) {
        counts[rec.recommendation] = (counts[rec.recommendation] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([model, count]) => ({ model, count }));
  }

  /**
   * Get model profile
   */
  static getModelProfile(modelId) {
    return MODEL_PROFILES[modelId];
  }

  /**
   * Get all model profiles
   */
  static getAllProfiles() {
    return MODEL_PROFILES;
  }
}

export default ModelRecommendationEngine;
export { MODEL_PROFILES };
