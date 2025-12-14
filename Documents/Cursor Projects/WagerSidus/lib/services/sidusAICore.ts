/**
 * Sidus AI Core Integration
 * 
 * Sidus AI Core is a Python framework for building AI agents.
 * This TypeScript service provides integration with the framework.
 * 
 * Framework: https://github.com/sidus-ai/sidus-ai-core
 * Installation: pip install git+https://github.com/sidus-ai/sidus-ai-core.git
 * 
 * NOTE: This is a LOCAL framework, not a cloud API service.
 * No API keys are required - you install and use it directly.
 * 
 * For Next.js/TypeScript integration, you can:
 * 1. Use the Python SDK via a backend API route
 * 2. Use this service as a TypeScript wrapper
 * 3. Call Python scripts from Node.js
 */

import { sidusPluginManager } from '../plugins/sidus/plugin.manager';

export interface SidusAgent {
  id: string;
  name: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'pending';
}

export interface SidusTask {
  id: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  participants?: string[];
  reward?: string;
  createdAt: string;
  completedAt?: string;
}

export interface SidusSkill {
  id: string;
  name: string;
  description: string;
  weight: number;
  dependencies?: string[];
}

/**
 * Sidus AI Core Service
 * 
 * This service provides a TypeScript interface to the Sidus AI Core framework.
 * Since Sidus AI Core is a Python framework, this service can:
 * - Work with a Python backend API
 * - Provide TypeScript wrappers for framework concepts
 * - Integrate with plugins
 */
export class SidusAICoreService {
  private agentId: string;
  private pluginsInitialized: boolean = false;

  constructor(agentId?: string) {
    // No API key needed - this is a local framework
    this.agentId = agentId || process.env.NEXT_PUBLIC_SIDUS_AGENT_ID || 'wager-agent';
  }

  /**
   * Initialize plugins for this agent
   */
  private async initializePlugins(): Promise<void> {
    if (this.pluginsInitialized) return;
    
    try {
      // Initialize plugins (like Perplexity)
      const { initializeDefaultPlugins } = await import('../plugins/sidus/plugin.manager');
      await initializeDefaultPlugins({
        perplexity: {
          apiKey: process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY,
        },
      });
      this.pluginsInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize plugins:', error);
    }
  }

  /**
   * Use a plugin to execute an action
   * This integrates with the Sidus AI Core plugin system
   */
  async usePlugin(pluginId: string, action: string, params: Record<string, any>): Promise<any> {
    await this.initializePlugins();
    return await sidusPluginManager.executePlugin(pluginId, action, params);
  }

  /**
   * Create an agent instance
   * In Python: agent = ds.DeepSeekSingleChatAgent(...)
   */
  async createAgent(config: {
    type: 'deepseek' | 'openai' | 'custom';
    apiKey?: string;
    systemPrompt?: string;
    capabilities?: string[];
  }): Promise<SidusAgent> {
    await this.initializePlugins();

    return {
      id: this.agentId,
      name: `wager-agent-${this.agentId}`,
      capabilities: config.capabilities || ['wager_management', 'intent_detection'],
      status: 'active',
    };
  }

  /**
   * Send a message to the agent
   * In Python: agent.send_to_chat(message='...', handler=...)
   */
  async sendToAgent(
    message: string,
    handler?: (response: any) => void
  ): Promise<string | null> {
    await this.initializePlugins();

    // Use Perplexity plugin for intent detection
    const result = await this.usePlugin('perplexity-ai', 'detect_intent', {
      message,
      context: {},
    });

    if (handler && result.success) {
      handler(result.data);
    }

    return result.success ? JSON.stringify(result.data) : null;
  }

  /**
   * Build the agent application
   * In Python: agent.application_build()
   */
  async buildApplication(): Promise<void> {
    await this.initializePlugins();
    // Initialize all plugins and prepare the agent
  }

  /**
   * Get agent skills (weighted graph)
   * Sidus AI Core uses a weighted skill graph for task solving
   */
  async getAgentSkills(): Promise<SidusSkill[]> {
    await this.initializePlugins();

    // Return available skills from plugins
    const plugins = sidusPluginManager.getPlugins();
    return plugins.map((plugin) => ({
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      weight: 1.0,
      dependencies: [],
    }));
  }

  /**
   * Create a task
   * In Python: You can create custom tasks for the agent
   */
  async createTask(
    taskId: string,
    description: string,
    reward?: string
  ): Promise<SidusTask> {
    return {
      id: taskId,
      description,
      status: 'pending',
      reward,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Get connected agents (for multi-agent scenarios)
   */
  async getConnectedAgents(userAddress: string): Promise<SidusAgent[]> {
    // In a real implementation, this would query the agent network
    return [];
  }
}

export const sidusAICoreService = new SidusAICoreService();
