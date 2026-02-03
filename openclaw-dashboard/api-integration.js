/**
 * OpenClaw API Integration for Model Switcher
 * 
 * This module provides functions to interact with the OpenClaw configuration
 * for fetching available models and updating the current model selection.
 */

/**
 * Fetch available models from OpenClaw configuration
 * @returns {Promise<Array>} Array of model objects
 */
export async function fetchAvailableModels() {
  try {
    // Read from OpenClaw config file
    const response = await fetch('http://127.0.0.1:18789/api/config/models');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform OpenClaw config format to ModelSwitcher format
    return transformModelsFromConfig(data);
  } catch (error) {
    console.error('Error fetching models:', error);
    
    // Fallback to reading from local config if API fails
    return fetchModelsFromLocalConfig();
  }
}

/**
 * Transform OpenClaw config models to component format
 * @param {Object} configData - Raw config data from OpenClaw
 * @returns {Array} Transformed model array
 */
function transformModelsFromConfig(configData) {
  const models = [];
  
  // Extract models from agents.defaults.models
  if (configData.agents?.defaults?.models) {
    const modelIds = Object.keys(configData.agents.defaults.models);
    
    modelIds.forEach(modelId => {
      const [provider, ...modelParts] = modelId.split('/');
      const modelName = modelParts.join('/');
      
      models.push({
        id: modelId,
        name: formatModelName(modelName),
        provider: provider,
        tier: inferModelTier(modelId)
      });
    });
  }
  
  return models;
}

/**
 * Format model name for display
 * @param {string} modelName - Raw model name
 * @returns {string} Formatted name
 */
function formatModelName(modelName) {
  // Remove version suffixes and format nicely
  return modelName
    .replace(/-\d{8}$/, '') // Remove date suffix
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Infer model tier based on model ID
 * @param {string} modelId - Model identifier
 * @returns {string} Tier (free, standard, premium, enterprise)
 */
function inferModelTier(modelId) {
  const lowerModelId = modelId.toLowerCase();
  
  // Free tier indicators
  if (lowerModelId.includes(':free') || 
      lowerModelId.includes('ollama/') ||
      lowerModelId.includes('llama') ||
      lowerModelId.includes('gemini-2.0-flash')) {
    return 'free';
  }
  
  // Premium tier indicators
  if (lowerModelId.includes('sonnet-4') ||
      lowerModelId.includes('gpt-4') ||
      lowerModelId.includes('grok') ||
      lowerModelId.includes('claude-3-opus')) {
    return 'premium';
  }
  
  // Enterprise tier indicators
  if (lowerModelId.includes('enterprise') ||
      lowerModelId.includes('bedrock/')) {
    return 'enterprise';
  }
  
  // Default to standard
  return 'standard';
}

/**
 * Fallback: Read models from local OpenClaw config file
 * @returns {Promise<Array>} Array of model objects
 */
async function fetchModelsFromLocalConfig() {
  try {
    // In a real implementation, this would read from ~/.openclaw/openclaw.json
    // For now, return a default set
    const defaultModels = [
      { 
        id: 'anthropic/claude-sonnet-4-5-20250929', 
        name: 'Claude Sonnet 4.5', 
        provider: 'anthropic',
        tier: 'premium'
      },
      { 
        id: 'anthropic/claude-3-5-haiku-20241022', 
        name: 'Claude 3.5 Haiku', 
        provider: 'anthropic',
        tier: 'standard'
      },
      { 
        id: 'anthropic/claude-3-5-sonnet-20241022', 
        name: 'Claude 3.5 Sonnet', 
        provider: 'anthropic',
        tier: 'premium'
      }
    ];
    
    return defaultModels;
  } catch (error) {
    console.error('Error reading local config:', error);
    return [];
  }
}

/**
 * Get current active model from OpenClaw
 * @returns {Promise<string>} Current model ID
 */
export async function getCurrentModel() {
  try {
    const response = await fetch('http://127.0.0.1:18789/api/config/current-model');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch current model: ${response.status}`);
    }
    
    const data = await response.json();
    return data.model || data.agents?.defaults?.model?.primary;
  } catch (error) {
    console.error('Error fetching current model:', error);
    // Return default
    return 'anthropic/claude-sonnet-4-5-20250929';
  }
}

/**
 * Update the current model in OpenClaw configuration
 * @param {string} modelId - New model ID to set
 * @returns {Promise<Object>} Response object with success status
 */
export async function updateCurrentModel(modelId) {
  try {
    const response = await fetch('http://127.0.0.1:18789/api/config/model', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        updatePrimary: true
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to update model: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Optionally restart the gateway to apply changes
    if (result.requiresRestart) {
      await restartGateway();
    }
    
    return {
      success: true,
      model: modelId,
      message: 'Model updated successfully'
    };
  } catch (error) {
    console.error('Error updating model:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Restart OpenClaw gateway to apply configuration changes
 * @returns {Promise<void>}
 */
async function restartGateway() {
  try {
    await fetch('http://127.0.0.1:18789/api/gateway/restart', {
      method: 'POST'
    });
    
    // Wait for gateway to restart
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (error) {
    console.warn('Gateway restart may be required manually:', error);
  }
}

/**
 * Subscribe to model change events
 * @param {Function} callback - Callback function to call when model changes
 * @returns {Function} Unsubscribe function
 */
export function subscribeToModelChanges(callback) {
  // Create WebSocket connection to OpenClaw gateway
  const ws = new WebSocket('ws://127.0.0.1:18789');
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // Check if this is a model change event
      if (data.type === 'config.model.changed') {
        callback(data.model);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  // Return unsubscribe function
  return () => {
    ws.close();
  };
}

/**
 * Validate if a model is available and properly configured
 * @param {string} modelId - Model ID to validate
 * @returns {Promise<Object>} Validation result
 */
export async function validateModel(modelId) {
  try {
    const response = await fetch(`http://127.0.0.1:18789/api/config/models/${encodeURIComponent(modelId)}/validate`);
    
    if (!response.ok) {
      throw new Error(`Validation failed: ${response.status}`);
    }
    
    const result = await response.json();
    return {
      valid: result.valid,
      issues: result.issues || [],
      warnings: result.warnings || []
    };
  } catch (error) {
    console.error('Error validating model:', error);
    return {
      valid: false,
      issues: [error.message]
    };
  }
}
