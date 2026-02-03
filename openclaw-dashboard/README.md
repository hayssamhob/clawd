# OpenClaw Model Switcher Component

A clean, modular dropdown component for selecting and switching AI models in the OpenClaw dashboard.

## Features

- 🎯 **Smart Positioning** - Top-right corner placement with responsive mobile support
- 🎨 **Visual Feedback** - Loading states, success/error toasts, smooth animations
- ⚡ **Fast Switching** - Async model switching with error handling
- 🌙 **Dark Mode** - Automatic dark mode support
- 🔌 **Modular Design** - Easy integration into any OpenClaw dashboard
- 📱 **Responsive** - Works seamlessly on mobile and desktop

## Installation

1. Copy the component files to your OpenClaw dashboard directory:
   - `ModelSwitcher.jsx` - Main React component
   - `ModelSwitcher.css` - Component styles
   - `api-integration.js` - OpenClaw API integration

2. Install dependencies (if not already installed):
```bash
npm install react react-dom
```

## Usage

### Basic Integration

```jsx
import React, { useState, useEffect } from 'react';
import ModelSwitcher from './ModelSwitcher';
import { fetchAvailableModels, getCurrentModel, updateCurrentModel } from './api-integration';

function Dashboard() {
  const [currentModel, setCurrentModel] = useState('');
  const [models, setModels] = useState([]);

  useEffect(() => {
    // Load models and current selection
    async function loadModels() {
      const availableModels = await fetchAvailableModels();
      const current = await getCurrentModel();
      
      setModels(availableModels);
      setCurrentModel(current);
    }
    
    loadModels();
  }, []);

  const handleModelChange = async (modelId) => {
    const result = await updateCurrentModel(modelId);
    
    if (result.success) {
      setCurrentModel(modelId);
    } else {
      throw new Error(result.error);
    }
  };

  return (
    <div>
      <ModelSwitcher
        currentModel={currentModel}
        models={models}
        onModelChange={handleModelChange}
        position="top-right"
      />
      
      {/* Your dashboard content */}
    </div>
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `currentModel` | string | required | Currently active model ID |
| `models` | array | `[]` | Array of available model objects |
| `onModelChange` | function | required | Callback when model is changed |
| `position` | string | `'top-right'` | Position: `'top-right'` or `'top-left'` |

### Model Object Structure

```javascript
{
  id: 'anthropic/claude-sonnet-4-5-20250929',
  name: 'Claude Sonnet 4.5',
  provider: 'anthropic',
  tier: 'premium' // 'free', 'standard', 'premium', 'enterprise'
}
```

## API Integration

The component integrates with OpenClaw's configuration API:

### Fetch Available Models

```javascript
import { fetchAvailableModels } from './api-integration';

const models = await fetchAvailableModels();
// Returns array of model objects from OpenClaw config
```

### Get Current Model

```javascript
import { getCurrentModel } from './api-integration';

const currentModel = await getCurrentModel();
// Returns current model ID
```

### Update Model

```javascript
import { updateCurrentModel } from './api-integration';

const result = await updateCurrentModel('anthropic/claude-3-5-haiku-20241022');
// Updates OpenClaw config and optionally restarts gateway
```

### Subscribe to Changes

```javascript
import { subscribeToModelChanges } from './api-integration';

const unsubscribe = subscribeToModelChanges((newModel) => {
  console.log('Model changed to:', newModel);
  setCurrentModel(newModel);
});

// Later: unsubscribe()
```

## Customization

### Custom Styling

Override CSS variables in your stylesheet:

```css
.model-switcher-button {
  --button-bg: rgba(255, 255, 255, 0.95);
  --button-border: rgba(0, 0, 0, 0.1);
  --button-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

### Custom Provider Icons

Modify the `getProviderIcon` function in `ModelSwitcher.jsx`:

```javascript
const getProviderIcon = (provider) => {
  const icons = {
    anthropic: '🤖',
    openai: '🔮',
    custom: '⭐', // Add your custom provider
    // ...
  };
  return icons[provider] || '🔧';
};
```

### Custom Tier Colors

Modify the `getTierColor` function:

```javascript
const getTierColor = (tier) => {
  const colors = {
    free: '#10b981',
    standard: '#3b82f6',
    premium: '#f59e0b',
    enterprise: '#8b5cf6',
    custom: '#ff6b6b' // Add custom tier
  };
  return colors[tier] || colors.standard;
};
```

## Demo

Open `demo.html` in your browser to see the component in action with mock data.

## Architecture

```
openclaw-dashboard/
├── ModelSwitcher.jsx       # Main React component
├── ModelSwitcher.css       # Component styles
├── api-integration.js      # OpenClaw API integration
├── demo.html              # Interactive demo
└── README.md              # This file
```

### Component Flow

1. **Initialization**: Component loads with current model and available models
2. **User Interaction**: User clicks dropdown to see available models
3. **Model Selection**: User selects a new model
4. **API Call**: Component calls `onModelChange` callback
5. **Update Config**: API integration updates OpenClaw configuration
6. **Feedback**: Success/error toast displayed to user
7. **State Update**: Component updates to show new current model

## Integration with OpenClaw Config

The component reads from and writes to `~/.openclaw/openclaw.json`:

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-5-20250929",
        "fallbacks": [...]
      },
      "models": {
        "anthropic/claude-sonnet-4-5-20250929": {},
        "anthropic/claude-3-5-haiku-20241022": {},
        ...
      }
    }
  }
}
```

## Error Handling

The component includes comprehensive error handling:

- **Network Errors**: Fallback to cached models
- **API Errors**: Display error toast with message
- **Invalid Models**: Validation before switching
- **Gateway Restart**: Automatic restart if required

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

To extend the component:

1. Add new features to `ModelSwitcher.jsx`
2. Update styles in `ModelSwitcher.css`
3. Add API methods to `api-integration.js`
4. Update this README with new features

## License

Part of the OpenClaw project.

## Support

For issues or questions:
- Check OpenClaw documentation
- Review the demo.html for examples
- Check browser console for errors
