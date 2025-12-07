/**
 * Sidus AI Core Plugin Manager
 * 
 * Manages plugin registration, initialization, and execution for Sidus AI agents.
 * This allows Sidus AI agents to use various plugins (like Perplexity) to
 * extend their capabilities.
 */

import { SidusPlugin, SidusPluginConfig, SidusPluginResult } from './plugin.interface';
import { PerplexitySidusPlugin, createPerplexityPlugin } from './perplexity.plugin';

export class SidusPluginManager {
  private plugins: Map<string, SidusPlugin> = new Map();
  private initialized: Set<string> = new Set();

  /**
   * Register a plugin
   */
  registerPlugin(plugin: SidusPlugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} is already registered. Overwriting...`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  /**
   * Initialize a plugin
   */
  async initializePlugin(pluginId: string, config?: SidusPluginConfig): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    await plugin.initialize(config);
    this.initialized.add(pluginId);
  }

  /**
   * Execute an action on a plugin
   */
  async executePlugin(
    pluginId: string,
    action: string,
    params: Record<string, any>
  ): Promise<SidusPluginResult> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return {
        success: false,
        error: `Plugin ${pluginId} not found`,
      };
    }

    if (!this.initialized.has(pluginId)) {
      await this.initializePlugin(pluginId);
    }

    return await plugin.execute(action, params);
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): SidusPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific plugin
   */
  getPlugin(pluginId: string): SidusPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Check if a plugin is registered
   */
  hasPlugin(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Check if a plugin is initialized
   */
  isInitialized(pluginId: string): boolean {
    return this.initialized.has(pluginId);
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (plugin && plugin.cleanup) {
      await plugin.cleanup();
    }
    this.plugins.delete(pluginId);
    this.initialized.delete(pluginId);
  }

  /**
   * Initialize all registered plugins
   */
  async initializeAll(configs?: Record<string, SidusPluginConfig>): Promise<void> {
    const promises = Array.from(this.plugins.keys()).map(async (pluginId) => {
      if (!this.initialized.has(pluginId)) {
        const config = configs?.[pluginId];
        await this.initializePlugin(pluginId, config);
      }
    });
    await Promise.all(promises);
  }
}

/**
 * Default plugin manager instance
 */
export const sidusPluginManager = new SidusPluginManager();

/**
 * Initialize default plugins
 */
export async function initializeDefaultPlugins(config?: {
  perplexity?: SidusPluginConfig;
}): Promise<void> {
  // Register Perplexity plugin
  const perplexityPlugin = createPerplexityPlugin(config?.perplexity);
  sidusPluginManager.registerPlugin(perplexityPlugin);

  // Initialize all plugins
  await sidusPluginManager.initializeAll({
    perplexity: config?.perplexity || {},
  });
}

