/**
 * Sidus AI Core Plugin Interface
 * 
 * This interface defines the contract for plugins that can be integrated
 * into the Sidus AI Core framework. Plugins extend the capabilities of
 * Sidus AI agents by providing additional services and tools.
 */

export interface SidusPlugin {
  /**
   * Unique identifier for the plugin
   */
  id: string;

  /**
   * Human-readable name of the plugin
   */
  name: string;

  /**
   * Version of the plugin
   */
  version: string;

  /**
   * Description of what the plugin does
   */
  description: string;

  /**
   * Capabilities provided by this plugin
   */
  capabilities: string[];

  /**
   * Initialize the plugin with configuration
   */
  initialize(config?: Record<string, any>): Promise<void>;

  /**
   * Execute a plugin action
   */
  execute(action: string, params: Record<string, any>): Promise<any>;

  /**
   * Get available actions for this plugin
   */
  getActions(): string[];

  /**
   * Cleanup resources when plugin is unloaded
   */
  cleanup?(): Promise<void>;
}

export interface SidusPluginConfig {
  apiKey?: string;
  baseUrl?: string;
  [key: string]: any;
}

export interface SidusPluginResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

