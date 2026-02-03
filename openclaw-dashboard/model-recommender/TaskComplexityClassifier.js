/**
 * Task Complexity Classifier
 * 
 * An intelligent ML-based system for classifying task complexity
 * and recommending appropriate AI models for OpenClaw.
 * 
 * Complexity Levels:
 * - TRIVIAL: Simple greetings, status checks, basic queries
 * - LOW: Validation, simple lookups, basic operations
 * - MEDIUM: Analysis, explanations, multi-step tasks
 * - HIGH: Debugging, complex reasoning, novel problems
 * - CRITICAL: Emergencies, security issues, high-stakes decisions
 */

// Complexity level definitions
const COMPLEXITY_LEVELS = {
  TRIVIAL: {
    level: 0,
    name: 'TRIVIAL',
    color: '#10b981',
    description: 'Simple tasks requiring minimal processing',
    maxTokens: 50,
    thinkingMode: 'off',
    costMultiplier: 0.1
  },
  LOW: {
    level: 1,
    name: 'LOW',
    color: '#3b82f6',
    description: 'Basic operations with straightforward logic',
    maxTokens: 150,
    thinkingMode: 'minimal',
    costMultiplier: 0.3
  },
  MEDIUM: {
    level: 2,
    name: 'MEDIUM',
    color: '#f59e0b',
    description: 'Multi-step analysis requiring moderate reasoning',
    maxTokens: 500,
    thinkingMode: 'low',
    costMultiplier: 0.6
  },
  HIGH: {
    level: 3,
    name: 'HIGH',
    color: '#ef4444',
    description: 'Complex problems requiring deep reasoning',
    maxTokens: 2000,
    thinkingMode: 'medium',
    costMultiplier: 1.0
  },
  CRITICAL: {
    level: 4,
    name: 'CRITICAL',
    color: '#dc2626',
    description: 'Urgent/high-stakes tasks requiring full capability',
    maxTokens: 4000,
    thinkingMode: 'high',
    costMultiplier: 1.5
  }
};

// Feature extraction patterns
const FEATURE_PATTERNS = {
  // Urgency indicators
  urgency: {
    high: [
      /\b(urgent|emergency|critical|immediate|asap|now|quickly)\b/i,
      /\b(down|crashed|failing|broken|error|bug)\b/i,
      /\b(losing|lost|security|breach|hack|attack)\b/i
    ],
    medium: [
      /\b(soon|today|important|priority)\b/i,
      /\b(issue|problem|fix|resolve)\b/i
    ],
    low: [
      /\b(when you can|no rush|eventually|later)\b/i
    ]
  },

  // Task type indicators
  taskType: {
    greeting: [
      /^(hi|hello|hey|yo|sup|greetings)\b/i,
      /^(good\s+(morning|afternoon|evening))/i
    ],
    status: [
      /\b(status|check|ping|test|version|uptime)\b/i,
      /\b(is\s+.+\s+(running|online|working|up))\b/i
    ],
    query: [
      /^(what|when|where|who|how\s+many)\b/i,
      /\b(tell me|show me|list|get)\b/i
    ],
    validation: [
      /\b(validate|verify|confirm|check if)\b/i,
      /\b(is\s+.+\s+(valid|correct|right))\b/i
    ],
    analysis: [
      /\b(analyze|review|compare|evaluate|assess)\b/i,
      /\b(explain|describe|summarize)\b/i
    ],
    debugging: [
      /\b(debug|troubleshoot|diagnose|investigate)\b/i,
      /\b(why\s+(is|does|did|isn't|doesn't))\b/i,
      /\b(what('s| is)\s+causing)\b/i
    ],
    creation: [
      /\b(create|build|make|design|develop|implement)\b/i,
      /\b(write|generate|produce)\b/i
    ],
    optimization: [
      /\b(optimize|improve|enhance|refactor|speed up)\b/i,
      /\b(better|faster|more efficient)\b/i
    ],
    research: [
      /\b(research|explore|discover|figure out|find out)\b/i,
      /\b(learn|understand|study)\b/i
    ]
  },

  // Complexity indicators
  complexity: {
    simple: [
      /^.{0,20}$/,  // Very short messages
      /^(yes|no|ok|sure|thanks|thank you)$/i
    ],
    compound: [
      /\b(and|also|additionally|furthermore|moreover)\b/i,
      /\b(then|after that|next|finally)\b/i
    ],
    conditional: [
      /\b(if|when|unless|otherwise|depending)\b/i,
      /\b(might|could|would|should)\b/i
    ],
    technical: [
      /\b(api|database|server|function|class|module)\b/i,
      /\b(algorithm|architecture|infrastructure)\b/i,
      /\b(async|await|promise|callback|event)\b/i
    ],
    abstract: [
      /\b(concept|theory|principle|philosophy)\b/i,
      /\b(strategy|approach|methodology)\b/i
    ]
  },

  // Domain indicators
  domain: {
    code: [
      /```[\s\S]*```/,
      /\b(code|script|program|function|variable)\b/i,
      /\b(python|javascript|typescript|java|c\+\+|rust)\b/i
    ],
    data: [
      /\b(data|dataset|csv|json|xml|database)\b/i,
      /\b(query|sql|mongodb|postgres)\b/i
    ],
    infrastructure: [
      /\b(deploy|server|cloud|aws|docker|kubernetes)\b/i,
      /\b(ci\/cd|pipeline|devops)\b/i
    ],
    security: [
      /\b(security|auth|password|token|encrypt)\b/i,
      /\b(vulnerability|exploit|attack|breach)\b/i
    ]
  }
};

// Model recommendations by complexity
const MODEL_RECOMMENDATIONS = {
  TRIVIAL: [
    { id: 'anthropic/claude-3-5-haiku-20241022', priority: 1, reason: 'Fast and cost-effective for simple tasks' },
    { id: 'groq/llama-3.3-70b-versatile', priority: 2, reason: 'Free tier, good for basic queries' },
    { id: 'ollama/llama3.2:latest', priority: 3, reason: 'Local, zero cost' }
  ],
  LOW: [
    { id: 'anthropic/claude-3-5-haiku-20241022', priority: 1, reason: 'Efficient for straightforward operations' },
    { id: 'openai/gpt-4o-mini', priority: 2, reason: 'Good balance of speed and capability' },
    { id: 'google/gemini-2.0-flash', priority: 3, reason: 'Fast processing' }
  ],
  MEDIUM: [
    { id: 'anthropic/claude-3-5-sonnet-20241022', priority: 1, reason: 'Strong reasoning for analysis tasks' },
    { id: 'openai/gpt-4o', priority: 2, reason: 'Versatile for multi-step tasks' },
    { id: 'anthropic/claude-3-5-haiku-20241022', priority: 3, reason: 'Cost-effective alternative' }
  ],
  HIGH: [
    { id: 'anthropic/claude-sonnet-4-5-20250929', priority: 1, reason: 'Advanced reasoning capabilities' },
    { id: 'anthropic/claude-3-5-sonnet-20241022', priority: 2, reason: 'Strong debugging and analysis' },
    { id: 'openai/gpt-4o', priority: 3, reason: 'Complex problem solving' }
  ],
  CRITICAL: [
    { id: 'anthropic/claude-sonnet-4-5-20250929', priority: 1, reason: 'Maximum capability for critical tasks' },
    { id: 'anthropic/claude-3-opus-20240229', priority: 2, reason: 'Highest reasoning for emergencies' },
    { id: 'openai/gpt-4-turbo', priority: 3, reason: 'Reliable for high-stakes decisions' }
  ]
};

/**
 * Task Complexity Classifier
 */
class TaskComplexityClassifier {
  constructor(options = {}) {
    this.options = {
      enableLearning: options.enableLearning || false,
      confidenceThreshold: options.confidenceThreshold || 0.7,
      budgetAware: options.budgetAware || true,
      ...options
    };

    // Feature weights (can be learned/adjusted)
    this.weights = {
      urgency: 0.25,
      taskType: 0.30,
      complexity: 0.25,
      domain: 0.10,
      length: 0.10
    };

    // Classification history for learning
    this.history = [];
  }

  /**
   * Extract features from a message
   * @param {string} message - The input message to analyze
   * @returns {Object} Extracted features
   */
  extractFeatures(message) {
    const features = {
      urgency: this._scorePatterns(message, FEATURE_PATTERNS.urgency),
      taskType: this._identifyTaskType(message),
      complexity: this._scorePatterns(message, FEATURE_PATTERNS.complexity),
      domain: this._identifyDomain(message),
      length: this._scoreLengthComplexity(message),
      hasCode: /```[\s\S]*```/.test(message),
      questionCount: (message.match(/\?/g) || []).length,
      sentenceCount: (message.match(/[.!?]+/g) || []).length || 1,
      wordCount: message.split(/\s+/).length
    };

    return features;
  }

  /**
   * Score patterns against message
   */
  _scorePatterns(message, patternGroups) {
    const scores = {};
    
    for (const [level, patterns] of Object.entries(patternGroups)) {
      scores[level] = patterns.reduce((score, pattern) => {
        return score + (pattern.test(message) ? 1 : 0);
      }, 0) / patterns.length;
    }

    return scores;
  }

  /**
   * Identify the primary task type
   */
  _identifyTaskType(message) {
    const taskTypes = FEATURE_PATTERNS.taskType;
    let bestMatch = { type: 'unknown', score: 0 };

    for (const [type, patterns] of Object.entries(taskTypes)) {
      const score = patterns.reduce((s, p) => s + (p.test(message) ? 1 : 0), 0) / patterns.length;
      if (score > bestMatch.score) {
        bestMatch = { type, score };
      }
    }

    return bestMatch;
  }

  /**
   * Identify the domain of the task
   */
  _identifyDomain(message) {
    const domains = FEATURE_PATTERNS.domain;
    const matches = [];

    for (const [domain, patterns] of Object.entries(domains)) {
      const score = patterns.reduce((s, p) => s + (p.test(message) ? 1 : 0), 0) / patterns.length;
      if (score > 0) {
        matches.push({ domain, score });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Score complexity based on message length and structure
   */
  _scoreLengthComplexity(message) {
    const wordCount = message.split(/\s+/).length;
    const sentenceCount = (message.match(/[.!?]+/g) || []).length || 1;
    const avgWordsPerSentence = wordCount / sentenceCount;

    // Normalize to 0-1 scale
    const lengthScore = Math.min(wordCount / 200, 1);
    const structureScore = Math.min(avgWordsPerSentence / 30, 1);

    return (lengthScore + structureScore) / 2;
  }

  /**
   * Classify the complexity of a task
   * @param {string} message - The input message
   * @returns {Object} Classification result
   */
  classify(message) {
    const startTime = Date.now();
    const features = this.extractFeatures(message);

    // Calculate complexity score
    let score = 0;
    let reasoning = [];

    // Urgency contribution
    if (features.urgency.high > 0.3) {
      score += 0.4 * this.weights.urgency;
      reasoning.push('High urgency detected');
    } else if (features.urgency.medium > 0.3) {
      score += 0.2 * this.weights.urgency;
      reasoning.push('Medium urgency');
    }

    // Task type contribution
    const taskTypeScores = {
      greeting: 0,
      status: 0.1,
      query: 0.2,
      validation: 0.3,
      analysis: 0.5,
      creation: 0.6,
      optimization: 0.7,
      debugging: 0.8,
      research: 0.7
    };
    const taskScore = taskTypeScores[features.taskType.type] || 0.3;
    score += taskScore * this.weights.taskType;
    reasoning.push(`Task type: ${features.taskType.type}`);

    // Complexity indicators contribution
    if (features.complexity.technical > 0.3) {
      score += 0.3 * this.weights.complexity;
      reasoning.push('Technical complexity');
    }
    if (features.complexity.compound > 0.3) {
      score += 0.2 * this.weights.complexity;
      reasoning.push('Compound task');
    }
    if (features.complexity.conditional > 0.3) {
      score += 0.2 * this.weights.complexity;
      reasoning.push('Conditional logic');
    }
    if (features.complexity.abstract > 0.3) {
      score += 0.3 * this.weights.complexity;
      reasoning.push('Abstract concepts');
    }

    // Domain contribution
    if (features.domain.length > 0) {
      const domainComplexity = {
        security: 0.4,
        infrastructure: 0.3,
        code: 0.2,
        data: 0.2
      };
      const topDomain = features.domain[0];
      score += (domainComplexity[topDomain.domain] || 0.1) * this.weights.domain;
      reasoning.push(`Domain: ${topDomain.domain}`);
    }

    // Length contribution
    score += features.length * this.weights.length;
    if (features.wordCount > 100) {
      reasoning.push('Long message');
    }

    // Code presence boost
    if (features.hasCode) {
      score += 0.15;
      reasoning.push('Contains code');
    }

    // Normalize score to 0-1
    score = Math.min(Math.max(score, 0), 1);

    // Map score to complexity level
    const level = this._scoreToLevel(score);
    const levelInfo = COMPLEXITY_LEVELS[level];

    // Calculate confidence
    const confidence = this._calculateConfidence(features, score);

    const result = {
      level: level,
      levelInfo: levelInfo,
      score: score,
      confidence: confidence,
      features: features,
      reasoning: reasoning,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    // Store in history for learning
    if (this.options.enableLearning) {
      this.history.push(result);
    }

    return result;
  }

  /**
   * Map numeric score to complexity level
   */
  _scoreToLevel(score) {
    if (score < 0.15) return 'TRIVIAL';
    if (score < 0.35) return 'LOW';
    if (score < 0.55) return 'MEDIUM';
    if (score < 0.75) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Calculate classification confidence
   */
  _calculateConfidence(features, score) {
    // Higher confidence when features clearly point to a level
    const levelBoundaries = [0.15, 0.35, 0.55, 0.75];
    const distanceToNearest = Math.min(...levelBoundaries.map(b => Math.abs(score - b)));
    
    // Base confidence from distance to boundaries
    let confidence = 0.5 + (distanceToNearest * 2);

    // Boost confidence if task type is clearly identified
    if (features.taskType.score > 0.5) {
      confidence += 0.1;
    }

    // Boost confidence if urgency is clear
    if (features.urgency.high > 0.5 || features.urgency.low > 0.5) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1);
  }

  /**
   * Get model recommendation based on classification
   * @param {Object} classification - Classification result
   * @param {Object} options - Recommendation options
   * @returns {Object} Model recommendation
   */
  recommend(classification, options = {}) {
    const { budgetRemaining, preferLocal, preferFast } = options;
    const level = classification.level;
    const recommendations = [...MODEL_RECOMMENDATIONS[level]];

    // Adjust recommendations based on options
    if (preferLocal) {
      const localModels = recommendations.filter(r => r.id.startsWith('ollama/'));
      if (localModels.length > 0) {
        return {
          primary: localModels[0],
          alternatives: recommendations.filter(r => r !== localModels[0]),
          reason: 'Local model preferred',
          classification: classification
        };
      }
    }

    if (preferFast) {
      const fastModels = recommendations.filter(r => 
        r.id.includes('haiku') || r.id.includes('flash') || r.id.includes('mini')
      );
      if (fastModels.length > 0) {
        return {
          primary: fastModels[0],
          alternatives: recommendations.filter(r => r !== fastModels[0]),
          reason: 'Fast model preferred',
          classification: classification
        };
      }
    }

    // Budget-aware recommendation
    if (budgetRemaining !== undefined && budgetRemaining < 0.3) {
      // Low budget - downgrade recommendation
      const downgradedLevel = this._downgradeLevel(level);
      const downgradedRecs = MODEL_RECOMMENDATIONS[downgradedLevel];
      return {
        primary: downgradedRecs[0],
        alternatives: downgradedRecs.slice(1),
        reason: `Budget-aware downgrade from ${level} to ${downgradedLevel}`,
        classification: classification,
        downgraded: true
      };
    }

    return {
      primary: recommendations[0],
      alternatives: recommendations.slice(1),
      reason: `Optimal model for ${level} complexity`,
      classification: classification
    };
  }

  /**
   * Downgrade complexity level for budget savings
   */
  _downgradeLevel(level) {
    const levels = ['TRIVIAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const currentIndex = levels.indexOf(level);
    return levels[Math.max(0, currentIndex - 1)];
  }

  /**
   * Get all complexity levels
   */
  static getLevels() {
    return COMPLEXITY_LEVELS;
  }

  /**
   * Get model recommendations for a level
   */
  static getRecommendations(level) {
    return MODEL_RECOMMENDATIONS[level] || [];
  }
}

// Export for use in OpenClaw
export default TaskComplexityClassifier;
export { COMPLEXITY_LEVELS, MODEL_RECOMMENDATIONS, FEATURE_PATTERNS };
