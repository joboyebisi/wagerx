/**
 * Sidus AI Core Plugins - Export Package
 * 
 * This package exports all Sidus AI Core plugins for use in other projects.
 * 
 * Usage:
 * ```typescript
 * import { PerplexitySidusPlugin, createPerplexityPlugin } from '@wagersidus/sidus-plugins';
 * 
 * const plugin = createPerplexityPlugin({
 *   apiKey: 'your-perplexity-key'
 * });
 * ```
 */

export type { SidusPlugin, SidusPluginConfig, SidusPluginResult } from './plugin.interface';
export { PerplexitySidusPlugin, createPerplexityPlugin } from './perplexity.plugin';
export { SidusPluginManager, sidusPluginManager, initializeDefaultPlugins } from './plugin.manager';

// Default export for convenience
export { PerplexitySidusPlugin as default } from './perplexity.plugin';

