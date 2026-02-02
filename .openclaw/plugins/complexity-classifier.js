/**
 * OpenClaw Gateway Pre-Flight Complexity Classifier Plugin
 * 
 * Intercepts incoming messages and classifies task complexity BEFORE
 * routing to expensive models, saving Claude Sonnet 4.5 tokens for
 * truly complex tasks.
 * 
 * Classification Tiers:
 * - TRIVIAL: Simple lookups, status checks, greetings
 * - LOW: Data validation, simple logic, routine monitoring
 * - MEDIUM: Multi-step reasoning, configuration review, analysis
 * - HIGH: Novel problems, debugging, strategy design, complex reasoning
 * - CRITICAL: Emergency situations requiring immediate expert attention
 */

const COMPLEXITY_PATTERNS = {
  TRIVIAL: {
    patterns: [
      /^(hi|hello|hey|status|ping|test)\b/i,
      /^what('s| is) (the )?(time|date|weather)/i,
      /^(check|show|list|get) (status|version|info)/i,
      /^is .+ (running|online|working|up)/i,
    ],
    keywords: ['hello', 'hi', 'status', 'ping', 'version', 'uptime'],
    maxTokens: 50,
    model: 'anthropic/claude-3-5-haiku-20241022',
    thinking: 'off'
  },
  
  LOW: {
    patterns: [
      /^(validate|verify|confirm|check if)/i,
      /^(read|show|display|print) (file|log|config)/i,
      /^(start|stop|restart) (bot|service|process)/i,
      /^(update|set|change) (config|setting|parameter)/i,
      /^(calculate|compute) \w+ (from|using|with)/i,
    ],
    keywords: ['validate', 'check', 'verify', 'show', 'list', 'read', 'simple'],
    maxTokens: 150,
    model: 'anthropic/claude-3-5-haiku-20241022',
    thinking: 'minimal'
  },
  
  MEDIUM: {
    patterns: [
      /^(analyze|review|compare|evaluate)/i,
      /^(explain|describe|summarize) (how|why|what)/i,
      /^(find|identify|detect) (issue|problem|error)/i,
      /^(optimize|improve|enhance|refactor)/i,
      /^(design|plan|strategy|approach) for/i,
    ],
    keywords: ['analyze', 'review', 'compare', 'explain', 'optimize', 'multiple', 'several'],
    maxTokens: 500,
    model: 'anthropic/claude-3-5-sonnet-20241022',
    thinking: 'low'
  },
  
  HIGH: {
    patterns: [
      /^(debug|troubleshoot|diagnose|investigate)/i,
      /^(why (is|does|did)|what('s| is) causing)/i,
      /^(design|architect|build) (new|novel|complex)/i,
      /^(solve|fix|resolve) (complex|difficult|tricky)/i,
      /^(research|explore|discover|figure out)/i,
    ],
    keywords: ['debug', 'complex', 'novel', 'difficult', 'why', 'investigate', 'research'],
    maxTokens: 2000,
    model: 'anthropic/claude-sonnet-4-5-20250929',
    thinking: 'medium'
  },
  
  CRITICAL: {
    patterns: [
      /^(urgent|emergency|critical|immediate)/i,
      /^(system|bot|service) (down|crashed|failing|broken)/i,
      /^(losing|lost) (money|funds|position)/i,
      /^(security|breach|hack|attack)/i,
    ],
    keywords: ['urgent', 'emergency', 'critical', 'down', 'crashed', 'security', 'breach'],
    maxTokens: 4000,
    model: 'anthropic/claude-sonnet-4-5-20250929',
    thinking: 'high'
  }
};

const CONTEXT_SIGNALS = {
  // Signals that increase complexity
  COMPLEXITY_BOOSTERS: [
    { pattern: /\b(multiple|several|many|various)\b/i, boost: 1 },
    { pattern: /\b(complex|complicated|difficult|tricky)\b/i, boost: 2 },
    { pattern: /\b(novel|new|unprecedented|unique)\b/i, boost: 2 },
    { pattern: /\b(why|how come|what's causing)\b/i, boost: 1 },
    { pattern: /\b(debug|troubleshoot|investigate)\b/i, boost: 2 },
    { pattern: /\b(design|architect|strategy)\b/i, boost: 1 },
  ],
  
  // Signals that decrease complexity
  COMPLEXITY_REDUCERS: [
    { pattern: /\b(simple|basic|straightforward|easy)\b/i, reduce: 1 },
    { pattern: /\b(just|only|merely)\b/i, reduce: 1 },
    { pattern: /\b(quick|fast|brief)\b/i, reduce: 1 },
  ]
};

/**
 * Classify message complexity
 */
function classifyComplexity(message, context = {}) {
  const text = message.toLowerCase().trim();
  const wordCount = text.split(/\s+/).length;
  
  // Start with base classification
  let complexity = 'MEDIUM'; // Default
  let score = 0;
  
  // Check each tier's patterns
  for (const [tier, config] of Object.entries(COMPLEXITY_PATTERNS)) {
    const patternMatch = config.patterns.some(p => p.test(message));
    const keywordMatch = config.keywords.some(k => text.includes(k));
    
    if (patternMatch || keywordMatch) {
      complexity = tier;
      break;
    }
  }
  
  // Apply context signals
  for (const booster of CONTEXT_SIGNALS.COMPLEXITY_BOOSTERS) {
    if (booster.pattern.test(message)) {
      score += booster.boost;
    }
  }
  
  for (const reducer of CONTEXT_SIGNALS.COMPLEXITY_REDUCERS) {
    if (reducer.pattern.test(message)) {
      score -= reducer.reduce;
    }
  }
  
  // Adjust based on message length
  if (wordCount > 100) score += 1;
  if (wordCount > 200) score += 1;
  
  // Adjust based on context
  if (context.hasCodeBlock) score += 1;
  if (context.hasError) score += 2;
  if (context.isFollowUp && context.previousFailed) score += 2;
  if (context.mentionsMultipleFiles) score += 1;
  
  // Apply score adjustments
  const tiers = ['TRIVIAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  let currentIndex = tiers.indexOf(complexity);
  currentIndex = Math.max(0, Math.min(tiers.length - 1, currentIndex + score));
  complexity = tiers[currentIndex];
  
  return {
    complexity,
    config: COMPLEXITY_PATTERNS[complexity],
    score,
    reasoning: generateReasoning(message, complexity, score, context)
  };
}

/**
 * Generate reasoning for classification
 */
function generateReasoning(message, complexity, score, context) {
  const reasons = [];
  
  // Pattern matches
  const config = COMPLEXITY_PATTERNS[complexity];
  const matchedPattern = config.patterns.find(p => p.test(message));
  if (matchedPattern) {
    reasons.push(`Pattern match: ${matchedPattern.source}`);
  }
  
  // Context signals
  if (score > 0) reasons.push(`Complexity boosted by ${score}`);
  if (score < 0) reasons.push(`Complexity reduced by ${Math.abs(score)}`);
  
  // Context factors
  if (context.hasCodeBlock) reasons.push('Contains code block');
  if (context.hasError) reasons.push('Contains error message');
  if (context.isFollowUp) reasons.push('Follow-up question');
  
  return reasons.join('; ');
}

/**
 * Extract context from message
 */
function extractContext(message, metadata = {}) {
  return {
    hasCodeBlock: /```/.test(message),
    hasError: /error|exception|failed|crash/i.test(message),
    isFollowUp: metadata.isFollowUp || false,
    previousFailed: metadata.previousFailed || false,
    mentionsMultipleFiles: (message.match(/\.(js|py|json|md|txt|ts|jsx)/g) || []).length > 2,
    hasStackTrace: /at \w+\.\w+/.test(message) || /File ".*", line \d+/.test(message),
    hasURL: /https?:\/\//.test(message),
  };
}

/**
 * Compress context before routing
 */
function compressContext(message, classification) {
  const { complexity, config } = classification;
  
  // For trivial/low complexity, strip unnecessary context
  if (complexity === 'TRIVIAL' || complexity === 'LOW') {
    // Remove verbose logs, keep only essential info
    let compressed = message;
    
    // Strip long code blocks for simple queries
    if (!/```/.test(message)) {
      compressed = message.substring(0, config.maxTokens * 4); // ~4 chars per token
    }
    
    return compressed;
  }
  
  // For higher complexity, preserve full context
  return message;
}

/**
 * Gateway hook: intercept and classify before routing
 */
async function onMessageReceived(event, context) {
  const { message, metadata, session } = event;
  
  // Extract context
  const msgContext = extractContext(message, metadata);
  
  // Classify complexity
  const classification = classifyComplexity(message, msgContext);
  
  // Log classification
  console.log(`[Complexity Classifier] ${classification.complexity} | ${classification.reasoning}`);
  
  // Compress context if needed
  const compressedMessage = compressContext(message, classification);
  
  // Override model and thinking level
  const override = {
    model: classification.config.model,
    thinkLevel: classification.config.thinking,
    message: compressedMessage,
    metadata: {
      ...metadata,
      complexity: classification.complexity,
      originalLength: message.length,
      compressedLength: compressedMessage.length,
      classificationReasoning: classification.reasoning
    }
  };
  
  // Return override to gateway
  return override;
}

/**
 * Cache common queries to avoid repeated expensive calls
 */
const queryCache = new Map();
const CACHE_TTL = 3600000; // 1 hour

function getCachedResponse(message) {
  const normalized = message.toLowerCase().trim();
  const cached = queryCache.get(normalized);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response;
  }
  
  return null;
}

function cacheResponse(message, response) {
  const normalized = message.toLowerCase().trim();
  queryCache.set(normalized, {
    response,
    timestamp: Date.now()
  });
  
  // Limit cache size
  if (queryCache.size > 1000) {
    const oldest = Array.from(queryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    queryCache.delete(oldest[0]);
  }
}

/**
 * Plugin exports
 */
module.exports = {
  name: 'complexity-classifier',
  version: '1.0.0',
  hooks: {
    'message:received': onMessageReceived,
  },
  classifyComplexity,
  extractContext,
  compressContext,
  getCachedResponse,
  cacheResponse,
  COMPLEXITY_PATTERNS
};
