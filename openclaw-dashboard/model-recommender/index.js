/**
 * OpenClaw Model Recommendation System
 * 
 * Entry point for the intelligent model recommendation system.
 * Exports all components for easy integration.
 */

import TaskComplexityClassifier, { 
  COMPLEXITY_LEVELS, 
  MODEL_RECOMMENDATIONS, 
  FEATURE_PATTERNS 
} from './TaskComplexityClassifier.js';

import ModelRecommendationEngine, { 
  MODEL_PROFILES 
} from './ModelRecommendationEngine.js';

// Create default instances
const defaultClassifier = new TaskComplexityClassifier();
const defaultEngine = new ModelRecommendationEngine();

/**
 * Quick classification function
 * @param {string} message - Message to classify
 * @returns {Object} Classification result
 */
export function classifyTask(message) {
  return defaultClassifier.classify(message);
}

/**
 * Quick recommendation function
 * @param {string} message - Message to get recommendation for
 * @param {Object} context - Optional context
 * @returns {Object} Recommendation result
 */
export function recommendModel(message, context = {}) {
  return defaultEngine.recommend(message, context);
}

/**
 * Get complexity level info
 * @param {string} level - Level name (TRIVIAL, LOW, MEDIUM, HIGH, CRITICAL)
 * @returns {Object} Level information
 */
export function getLevelInfo(level) {
  return COMPLEXITY_LEVELS[level];
}

/**
 * Get model profile
 * @param {string} modelId - Model identifier
 * @returns {Object} Model profile
 */
export function getModelProfile(modelId) {
  return MODEL_PROFILES[modelId];
}

/**
 * Get all available models
 * @returns {Array} Array of model IDs
 */
export function getAvailableModels() {
  return Object.keys(MODEL_PROFILES);
}

/**
 * Create a custom classifier with options
 * @param {Object} options - Classifier options
 * @returns {TaskComplexityClassifier} Classifier instance
 */
export function createClassifier(options = {}) {
  return new TaskComplexityClassifier(options);
}

/**
 * Create a custom recommendation engine with options
 * @param {Object} options - Engine options
 * @returns {ModelRecommendationEngine} Engine instance
 */
export function createEngine(options = {}) {
  return new ModelRecommendationEngine(options);
}

// Export classes and constants
export {
  TaskComplexityClassifier,
  ModelRecommendationEngine,
  COMPLEXITY_LEVELS,
  MODEL_RECOMMENDATIONS,
  MODEL_PROFILES,
  FEATURE_PATTERNS
};

// Default export
export default {
  classifyTask,
  recommendModel,
  getLevelInfo,
  getModelProfile,
  getAvailableModels,
  createClassifier,
  createEngine,
  TaskComplexityClassifier,
  ModelRecommendationEngine,
  COMPLEXITY_LEVELS,
  MODEL_RECOMMENDATIONS,
  MODEL_PROFILES
};
