import { OpenClawModel } from '@openclaw/core';
import Kimi25Model from './kimi-integration';

export class ModelSwitcher {
  private availableModels: Map<string, OpenClawModel> = new Map();
  private currentModel: OpenClawModel | null = null;

  constructor(private config: {
    nvidiaApiKey: string;
    defaultModel?: string;
  }) {
    this.initializeModels();
  }

  private initializeModels() {
    // Add Kimi 2.5 model
    const kimiModel = new Kimi25Model(this.config.nvidiaApiKey);
    this.availableModels.set('kimi-2.5', kimiModel);
    
    if (this.config.defaultModel === 'kimi-2.5') {
      this.currentModel = kimiModel;
    }
  }

  switchModel(modelId: string): boolean {
    const model = this.availableModels.get(modelId);
    if (model) {
      this.currentModel = model;
      return true;
    }
    return false;
  }

  getCurrentModel(): OpenClawModel | null {
    return this.currentModel;
  }

  listModels(): Array<{
    id: string;
    name: string;
    capabilities: string[];
  }> {
    return Array.from(this.availableModels.entries()).map(([id, model]) => {
      const info = model.getModelInfo();
      return {
        id,
        name: info.name,
        capabilities: info.capabilities
      };
    });
  }
}

export default ModelSwitcher;
