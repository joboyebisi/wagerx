# Sidus AI Core Plugins

This directory contains plugins for the Sidus AI Core framework. Plugins extend the capabilities of Sidus AI agents by providing additional services and tools.

## 📦 Available Plugins

### Perplexity AI Plugin

The Perplexity plugin provides real-time web search, intent detection, and wager resolution capabilities.

**Features:**
- Intent detection from natural language
- Real-time web search
- Sports wager verification
- Crypto wager verification
- Content generation

**Installation:**
```typescript
import { createPerplexityPlugin } from './perplexity.plugin';

const plugin = createPerplexityPlugin({
  apiKey: process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY
});
```

**Usage:**
```typescript
// Detect intent
const result = await plugin.execute('detect_intent', {
  message: 'I want to bet 0.1 BNB that BTC will be above $50000 by next week',
  context: {}
});

// Resolve sports wager
const sportsResult = await plugin.execute('resolve_sports_wager', {
  condition: 'Lakers win',
  teams: ['Lakers', 'Warriors'],
  eventDate: '2024-01-15',
  sport: 'basketball'
});

// Resolve crypto wager
const cryptoResult = await plugin.execute('resolve_crypto_wager', {
  symbol: 'BTC',
  condition: 'BTC > $50000',
  targetDate: '2024-01-15'
});
```

## 🔌 Creating Custom Plugins

To create a custom plugin, implement the `SidusPlugin` interface:

```typescript
import { SidusPlugin, SidusPluginConfig, SidusPluginResult } from './plugin.interface';

export class MyCustomPlugin implements SidusPlugin {
  id = 'my-plugin';
  name = 'My Custom Plugin';
  version = '1.0.0';
  description = 'Description of what this plugin does';
  capabilities = ['capability1', 'capability2'];

  async initialize(config?: SidusPluginConfig): Promise<void> {
    // Initialize your plugin
  }

  async execute(action: string, params: Record<string, any>): Promise<SidusPluginResult> {
    // Handle actions
    switch (action) {
      case 'my_action':
        return { success: true, data: {} };
      default:
        return { success: false, error: 'Unknown action' };
    }
  }

  getActions(): string[] {
    return ['my_action'];
  }
}
```

## 📤 Exporting Plugins

Plugins in this directory can be exported and used in other Sidus AI projects:

```typescript
// Export your plugin
export { MyCustomPlugin, createMyPlugin } from './my-plugin';

// Use in another project
import { MyCustomPlugin } from '@wagersidus/sidus-plugins';
```

## 🔧 Plugin Manager

The plugin manager handles registration, initialization, and execution of plugins:

```typescript
import { sidusPluginManager, initializeDefaultPlugins } from './plugin.manager';

// Initialize default plugins (includes Perplexity)
await initializeDefaultPlugins({
  perplexity: {
    apiKey: process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY
  }
});

// Execute plugin action
const result = await sidusPluginManager.executePlugin(
  'perplexity-ai',
  'detect_intent',
  { message: 'Create a wager' }
);
```

## 📚 Documentation

- [Plugin Interface](./plugin.interface.ts) - Base interface for all plugins
- [Perplexity Plugin](./perplexity.plugin.ts) - Perplexity AI integration
- [Plugin Manager](./plugin.manager.ts) - Plugin management system

## 🚀 Contributing

To add a new plugin:

1. Create a new file: `your-plugin.plugin.ts`
2. Implement the `SidusPlugin` interface
3. Export factory function: `createYourPlugin()`
4. Add to `index.ts` exports
5. Update this README

