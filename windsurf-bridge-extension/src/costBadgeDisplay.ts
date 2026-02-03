/**
 * Cost Badge Display for Windsurf
 * Shows cost-efficient model information via status bar and commands
 * Safe implementation that doesn't interfere with WebSocket connections
 */

import * as vscode from 'vscode';
import { ALL_WINDSURF_MODELS } from './cascadeController';

interface ModelCostInfo {
  id: string;
  name: string;
  cost: string | number;
  isPromo: boolean;
  tier: string;
  description: string;
}

export class CostBadgeDisplay {
  private statusBarItem: vscode.StatusBarItem;
  private currentModel: string = '';
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(private context: vscode.ExtensionContext) {
    // Create status bar item for cost display
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'windsurf-bridge.showCostEfficientModels';
    context.subscriptions.push(this.statusBarItem);
  }

  /**
   * Activate cost display
   */
  activate() {
    this.updateDisplay();
    this.statusBarItem.show();
    
    // Update every 5 seconds to track current model
    this.updateInterval = setInterval(() => {
      this.updateDisplay();
    }, 5000);
    
    console.log('[CostBadge] Activated - status bar showing cost info');
  }

  /**
   * Deactivate cost display
   */
  deactivate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.statusBarItem.hide();
    console.log('[CostBadge] Deactivated');
  }

  /**
   * Update status bar display
   */
  private updateDisplay() {
    try {
      // Try to get current model from extension storage
      const savedModel = this.context.globalState.get<string>('currentModel');
      
      if (savedModel && savedModel !== this.currentModel) {
        this.currentModel = savedModel;
      }

      const modelInfo = this.getModelInfo(this.currentModel);
      
      if (modelInfo) {
        const costText = typeof modelInfo.cost === 'number' 
          ? `${modelInfo.cost}x` 
          : modelInfo.cost;
        
        const icon = modelInfo.isPromo ? '🎁' : this.getTierIcon(modelInfo.tier);
        
        this.statusBarItem.text = `${icon} ${costText}`;
        this.statusBarItem.tooltip = `${modelInfo.name}\nCost: ${costText}\nTier: ${modelInfo.tier}${modelInfo.isPromo ? '\n🎁 Promotional pricing!' : ''}`;
        this.statusBarItem.backgroundColor = modelInfo.isPromo 
          ? new vscode.ThemeColor('statusBarItem.warningBackground')
          : undefined;
      } else {
        this.statusBarItem.text = '💰 Model Cost';
        this.statusBarItem.tooltip = 'Click to see cost-efficient models';
      }
    } catch (error) {
      console.error('[CostBadge] Error updating display:', error);
    }
  }

  /**
   * Get tier icon
   */
  private getTierIcon(tier: string): string {
    switch (tier) {
      case 'free': return '🆓';
      case 'cheap': return '💵';
      case 'standard': return '💰';
      case 'smart': return '🧠';
      case 'premium': return '💎';
      default: return '💰';
    }
  }

  /**
   * Get model information
   */
  private getModelInfo(modelId: string): ModelCostInfo | null {
    const model = ALL_WINDSURF_MODELS[modelId];
    if (!model) return null;

    return {
      id: model.id,
      name: model.name,
      cost: model.credits,
      isPromo: model.isPromo || false,
      tier: model.tier,
      description: model.description
    };
  }

  /**
   * Get all models sorted by cost efficiency
   */
  getCostEfficientModels(): ModelCostInfo[] {
    const models = Object.values(ALL_WINDSURF_MODELS).map(m => ({
      id: m.id,
      name: m.name,
      cost: m.credits,
      isPromo: m.isPromo || false,
      tier: m.tier,
      description: m.description
    }));

    return models.sort((a, b) => {
      // Promo models first
      if (a.isPromo && !b.isPromo) return -1;
      if (!a.isPromo && b.isPromo) return 1;

      // Then by cost
      const aCost = this.parseCost(a.cost);
      const bCost = this.parseCost(b.cost);
      return aCost - bCost;
    });
  }

  /**
   * Parse cost for sorting
   */
  private parseCost(cost: string | number): number {
    if (typeof cost === 'number') return cost;
    if (cost === 'Free' || cost === 'BYOK') return 0;
    const match = String(cost).match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 999;
  }

  /**
   * Update current model
   */
  updateCurrentModel(modelId: string) {
    this.currentModel = modelId;
    this.context.globalState.update('currentModel', modelId);
    this.updateDisplay();
  }
}

/**
 * Register commands for cost badge display
 */
export function registerCostBadgeCommands(
  context: vscode.ExtensionContext,
  display: CostBadgeDisplay
) {
  // Command: Show cost-efficient models
  const showCostEfficientCommand = vscode.commands.registerCommand(
    'windsurf-bridge.showCostEfficientModels',
    async () => {
      const models = display.getCostEfficientModels();
      
      const items = models.map(m => {
        const costText = typeof m.cost === 'number' ? `${m.cost}x` : m.cost;
        const icon = m.isPromo ? '🎁' : display['getTierIcon'](m.tier);
        
        return {
          label: `${icon} ${m.name}`,
          description: costText,
          detail: m.isPromo 
            ? '🎁 Promotional pricing - Limited time!' 
            : `Tier: ${m.tier} | ${m.description}`,
          modelId: m.id
        };
      });

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a cost-efficient model (sorted by cost)',
        matchOnDescription: true,
        matchOnDetail: true
      });

      if (selected) {
        vscode.window.showInformationMessage(
          `Selected: ${selected.label} (${selected.description})`
        );
      }
    }
  );

  // Command: Show promotional models only
  const showPromoModelsCommand = vscode.commands.registerCommand(
    'windsurf-bridge.showPromoModels',
    async () => {
      const allModels = display.getCostEfficientModels();
      const promoModels = allModels.filter(m => m.isPromo);

      if (promoModels.length === 0) {
        vscode.window.showInformationMessage('No promotional models available at this time.');
        return;
      }

      const items = promoModels.map(m => {
        const costText = typeof m.cost === 'number' ? `${m.cost}x` : m.cost;
        const originalCost = ALL_WINDSURF_MODELS[m.id].originalCost || 'Standard';
        
        return {
          label: `🎁 ${m.name}`,
          description: `${costText} (was ${originalCost})`,
          detail: `${m.description} | Tier: ${m.tier}`,
          modelId: m.id
        };
      });

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `${promoModels.length} promotional models available - Limited time offers!`,
        matchOnDescription: true,
        matchOnDetail: true
      });

      if (selected) {
        vscode.window.showInformationMessage(
          `🎁 Promo: ${selected.label} - ${selected.description}`
        );
      }
    }
  );

  // Command: Toggle cost display
  const toggleDisplayCommand = vscode.commands.registerCommand(
    'windsurf-bridge.toggleCostDisplay',
    () => {
      const isActive = display['updateInterval'] !== null;
      
      if (isActive) {
        display.deactivate();
        vscode.window.showInformationMessage('Cost display disabled');
      } else {
        display.activate();
        vscode.window.showInformationMessage('Cost display enabled');
      }
    }
  );

  // Command: Show cost breakdown
  const showCostBreakdownCommand = vscode.commands.registerCommand(
    'windsurf-bridge.showCostBreakdown',
    () => {
      const models = display.getCostEfficientModels();
      
      // Group by tier
      const byTier: Record<string, ModelCostInfo[]> = {};
      models.forEach(m => {
        if (!byTier[m.tier]) byTier[m.tier] = [];
        byTier[m.tier].push(m);
      });

      // Create breakdown message
      let message = '💰 Windsurf Model Cost Breakdown\n\n';
      
      const tierOrder = ['free', 'cheap', 'standard', 'smart', 'premium'];
      tierOrder.forEach(tier => {
        if (byTier[tier]) {
          const icon = display['getTierIcon'](tier);
          message += `${icon} ${tier.toUpperCase()}: ${byTier[tier].length} models\n`;
        }
      });

      const promoCount = models.filter(m => m.isPromo).length;
      message += `\n🎁 PROMOTIONAL: ${promoCount} models\n`;
      message += `\n📊 Total: ${models.length} models`;

      vscode.window.showInformationMessage(message, { modal: false });
    }
  );

  context.subscriptions.push(
    showCostEfficientCommand,
    showPromoModelsCommand,
    toggleDisplayCommand,
    showCostBreakdownCommand
  );
}
