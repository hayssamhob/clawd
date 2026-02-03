import React, { useState, useEffect, useRef } from 'react';
import './ModelSwitcher.css';

/**
 * ModelSwitcher Component
 * 
 * A dropdown component for selecting and switching AI models in OpenClaw.
 * Displays current model and allows switching between available models.
 * 
 * Props:
 * - currentModel: string - The currently active model ID
 * - models: array - List of available models with { id, name, provider, tier }
 * - onModelChange: function - Callback when model is changed (modelId) => {}
 * - position: string - 'top-right' | 'top-left' (default: 'top-right')
 */
const ModelSwitcher = ({ 
  currentModel, 
  models = [], 
  onModelChange,
  position = 'top-right' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(currentModel);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const dropdownRef = useRef(null);

  // Get current model details
  const getCurrentModelInfo = () => {
    return models.find(m => m.id === selectedModel) || {
      id: selectedModel,
      name: 'Unknown Model',
      provider: 'unknown',
      tier: 'standard'
    };
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update selected model when prop changes
  useEffect(() => {
    setSelectedModel(currentModel);
  }, [currentModel]);

  // Handle model selection
  const handleModelSelect = async (modelId) => {
    if (modelId === selectedModel) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      // Call the parent's change handler
      if (onModelChange) {
        await onModelChange(modelId);
      }

      setSelectedModel(modelId);
      setFeedback({ type: 'success', message: 'Model switched successfully' });
      
      // Close dropdown after successful switch
      setTimeout(() => {
        setIsOpen(false);
        setFeedback(null);
      }, 1500);
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Failed to switch model' });
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Get tier color
  const getTierColor = (tier) => {
    const colors = {
      free: '#10b981',
      standard: '#3b82f6',
      premium: '#f59e0b',
      enterprise: '#8b5cf6'
    };
    return colors[tier] || colors.standard;
  };

  // Get provider icon
  const getProviderIcon = (provider) => {
    const icons = {
      anthropic: '🤖',
      openai: '🔮',
      google: '🌟',
      groq: '⚡',
      ollama: '🦙',
      openrouter: '🔀',
      xai: '✨',
      kimi: '🌙'
    };
    return icons[provider] || '🔧';
  };

  const currentModelInfo = getCurrentModelInfo();

  return (
    <div 
      className={`model-switcher ${position}`} 
      ref={dropdownRef}
    >
      {/* Current Model Display Button */}
      <button
        className="model-switcher-button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
      >
        <span className="model-icon">
          {getProviderIcon(currentModelInfo.provider)}
        </span>
        <span className="model-info">
          <span className="model-name">{currentModelInfo.name}</span>
          <span className="model-provider">{currentModelInfo.provider}</span>
        </span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>
          ▼
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="model-dropdown">
          <div className="dropdown-header">
            <span>Select Model</span>
            <span className="model-count">{models.length} available</span>
          </div>

          <div className="model-list">
            {models.map((model) => (
              <button
                key={model.id}
                className={`model-item ${model.id === selectedModel ? 'active' : ''}`}
                onClick={() => handleModelSelect(model.id)}
                disabled={isLoading}
              >
                <span className="model-item-icon">
                  {getProviderIcon(model.provider)}
                </span>
                <div className="model-item-info">
                  <div className="model-item-name">{model.name}</div>
                  <div className="model-item-meta">
                    <span className="model-item-provider">{model.provider}</span>
                    <span 
                      className="model-item-tier"
                      style={{ color: getTierColor(model.tier) }}
                    >
                      {model.tier}
                    </span>
                  </div>
                </div>
                {model.id === selectedModel && (
                  <span className="check-icon">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}

      {/* Feedback Toast */}
      {feedback && (
        <div className={`feedback-toast ${feedback.type}`}>
          {feedback.type === 'success' ? '✓' : '✗'} {feedback.message}
        </div>
      )}
    </div>
  );
};

export default ModelSwitcher;
