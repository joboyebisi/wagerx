/**
 * Perplexity Plugin for Sidus AI Core
 * 
 * This plugin integrates Perplexity AI capabilities into Sidus AI Core agents.
 * It provides real-time web search, intent detection, and wager resolution
 * capabilities that can be used by Sidus AI agents.
 * 
 * This follows the Sidus AI Core plugin pattern:
 * - Install: pip install git+https://github.com/sidus-ai/sidus-ai-core.git
 * - Use: import sidusai.plugins.perplexity as pp
 * 
 * Exportable plugin that can be shared and used in other Sidus AI projects.
 * 
 * Framework: https://github.com/sidus-ai/sidus-ai-core
 */

import { SidusPlugin, SidusPluginConfig, SidusPluginResult } from './plugin.interface';
import { PerplexityService, WagerIntent } from '../../services/perplexity';

export class PerplexitySidusPlugin implements SidusPlugin {
  id = 'perplexity-ai';
  name = 'Perplexity AI Integration';
  version = '1.0.0';
  description = 'Provides Perplexity AI capabilities including real-time web search, intent detection, and wager resolution for Sidus AI agents';
  capabilities = [
    'intent_detection',
    'real_time_search',
    'sports_verification',
    'crypto_verification',
    'wager_resolution',
    'content_generation',
  ];

  private perplexityService: PerplexityService;
  private config: SidusPluginConfig;

  constructor(config?: SidusPluginConfig) {
    this.config = config || {};
    const apiKey = config?.apiKey || process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY || '';
    this.perplexityService = new PerplexityService(apiKey);
  }

  async initialize(config?: Record<string, any>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
      const apiKey = config.apiKey || this.config.apiKey || process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY || '';
      this.perplexityService = new PerplexityService(apiKey);
    }

    if (!this.config.apiKey && !process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY) {
      throw new Error('Perplexity API key is required. Set NEXT_PUBLIC_PERPLEXITY_API_KEY or provide in config.');
    }
  }

  async execute(action: string, params: Record<string, any>): Promise<SidusPluginResult> {
    try {
      switch (action) {
        case 'detect_intent':
          return await this.handleDetectIntent(params);
        
        case 'resolve_sports_wager':
          return await this.handleResolveSportsWager(params);
        
        case 'resolve_crypto_wager':
          return await this.handleResolveCryptoWager(params);
        
        case 'generate_description':
          return await this.handleGenerateDescription(params);
        
        case 'real_time_search':
          return await this.handleRealTimeSearch(params);
        
        default:
          return {
            success: false,
            error: `Unknown action: ${action}. Available actions: ${this.getActions().join(', ')}`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        metadata: { action, params },
      };
    }
  }

  getActions(): string[] {
    return [
      'detect_intent',
      'resolve_sports_wager',
      'resolve_crypto_wager',
      'generate_description',
      'real_time_search',
    ];
  }

  async cleanup?(): Promise<void> {
    // Cleanup resources if needed
  }

  /**
   * Handle intent detection action
   */
  private async handleDetectIntent(params: Record<string, any>): Promise<SidusPluginResult> {
    const { message, context } = params;
    
    if (!message || typeof message !== 'string') {
      return {
        success: false,
        error: 'Message parameter is required and must be a string',
      };
    }

    const intent = await this.perplexityService.detectIntent(message, context);
    
    return {
      success: true,
      data: intent,
      metadata: {
        action: 'detect_intent',
        confidence: intent.confidence,
      },
    };
  }

  /**
   * Handle sports wager resolution
   */
  private async handleResolveSportsWager(params: Record<string, any>): Promise<SidusPluginResult> {
    const { condition, teams, eventDate, sport } = params;
    
    if (!condition || !teams || !eventDate) {
      return {
        success: false,
        error: 'Missing required parameters: condition, teams, eventDate',
      };
    }

    const result = await this.perplexityService.resolveSportsWager(
      condition,
      Array.isArray(teams) ? teams : [teams],
      eventDate,
      sport
    );

    return {
      success: result.resolved,
      data: result,
      metadata: {
        action: 'resolve_sports_wager',
        citations: result.citations,
      },
    };
  }

  /**
   * Handle crypto wager resolution
   */
  private async handleResolveCryptoWager(params: Record<string, any>): Promise<SidusPluginResult> {
    const { symbol, condition, targetDate } = params;
    
    if (!symbol || !condition || !targetDate) {
      return {
        success: false,
        error: 'Missing required parameters: symbol, condition, targetDate',
      };
    }

    const result = await this.perplexityService.resolveCryptoWager(
      symbol,
      condition,
      targetDate
    );

    return {
      success: result.resolved,
      data: result,
      metadata: {
        action: 'resolve_crypto_wager',
        citations: result.citations,
      },
    };
  }

  /**
   * Handle description generation
   */
  private async handleGenerateDescription(params: Record<string, any>): Promise<SidusPluginResult> {
    const { intent, userMessage } = params;
    
    if (!intent || !userMessage) {
      return {
        success: false,
        error: 'Missing required parameters: intent, userMessage',
      };
    }

    const description = await this.perplexityService.generateWagerDescription(
      intent as WagerIntent,
      userMessage
    );

    return {
      success: true,
      data: { description },
      metadata: {
        action: 'generate_description',
      },
    };
  }

  /**
   * Handle real-time search
   */
  private async handleRealTimeSearch(params: Record<string, any>): Promise<SidusPluginResult> {
    const { query, model } = params;
    
    if (!query || typeof query !== 'string') {
      return {
        success: false,
        error: 'Query parameter is required and must be a string',
      };
    }

    // Use Perplexity's chat completions for real-time search
    const response = await this.perplexityService.detectIntent(query);
    
    return {
      success: true,
      data: response,
      metadata: {
        action: 'real_time_search',
        model: model || 'llama-3.1-sonar-small-128k-online',
      },
    };
  }
}

/**
 * Export the plugin factory function for easy integration
 */
export function createPerplexityPlugin(config?: SidusPluginConfig): PerplexitySidusPlugin {
  return new PerplexitySidusPlugin(config);
}

/**
 * Export the plugin class for direct instantiation
 */
export default PerplexitySidusPlugin;

