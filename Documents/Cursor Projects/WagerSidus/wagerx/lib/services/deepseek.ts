import axios from 'axios';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

export interface WagerIntent {
  type: 'create' | 'accept' | 'resolve' | 'cancel' | 'query';
  category?: 'sports' | 'crypto'; // REQUIRED for create intent
  participants?: string[];
  amount?: string;
  currency?: string;
  condition?: string;
  wagerId?: string;
  winner?: string;
  confidence: number;
  // Sports-specific
  sport?: string;
  teams?: string[];
  eventDate?: string;
  // Crypto-specific
  symbol?: string; // BTC, ETH, etc.
  targetPrice?: number;
  targetDate?: string;
  // Charity (optional)
  charityEnabled?: boolean;
  charityPercentage?: number;
  charityAddress?: string;
}

export class DeepSeekService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || '';
  }

  async detectIntent(userMessage: string, context?: any): Promise<WagerIntent> {
    try {
      const systemPrompt = `You are an AI assistant that helps detect wager intents from natural language. 
This platform ONLY supports SPORTS and CRYPTO predictions that can be verified via APIs.

Analyze the user's message and extract:
1. Intent type: create, accept, resolve, cancel, or query
2. Category: "sports" or "crypto" (REQUIRED for create intent)
3. Participants (if mentioned)
4. Amount and currency
5. Condition/description (must be verifiable via APIs)
6. Wager ID (if referencing existing wager)
7. Winner (if resolving)
8. Confidence score (0-1)

For SPORTS wagers: Extract teams, sport type, event date, and condition (e.g., "Team A wins", "Total points > 50")
For CRYPTO wagers: Extract symbol (BTC, ETH, etc.), condition (e.g., "BTC > $50000", "ETH increases by 10%"), and target date

Return a JSON object with this structure. Be precise and extract all relevant information.`;

      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Context: ${JSON.stringify(context || {})}\n\nUser message: ${userMessage}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from DeepSeek');
      }

      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as WagerIntent;
      }

      // Fallback parsing
      return this.parseIntentFallback(userMessage, content);
    } catch (error) {
      console.error('DeepSeek intent detection error:', error);
      return this.parseIntentFallback(userMessage);
    }
  }

  private parseIntentFallback(
    userMessage: string,
    aiResponse?: string
  ): WagerIntent {
    const lowerMessage = userMessage.toLowerCase();

    // Simple keyword-based fallback
    if (lowerMessage.includes('bet') || lowerMessage.includes('wager')) {
      if (lowerMessage.includes('accept') || lowerMessage.includes('yes')) {
        return {
          type: 'accept',
          confidence: 0.7,
        };
      }
      if (lowerMessage.includes('resolve') || lowerMessage.includes('result')) {
        return {
          type: 'resolve',
          confidence: 0.7,
        };
      }
      return {
        type: 'create',
        confidence: 0.6,
      };
    }

    return {
      type: 'query',
      confidence: 0.5,
    };
  }

  async generateWagerDescription(
    intent: WagerIntent,
    userMessage: string
  ): Promise<string> {
    try {
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that creates clear, concise wager descriptions from user input.',
            },
            {
              role: 'user',
              content: `Create a clear wager description from: ${userMessage}\n\nExtracted intent: ${JSON.stringify(intent)}`,
            },
          ],
          temperature: 0.5,
          max_tokens: 200,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.choices[0]?.message?.content || userMessage;
    } catch (error) {
      console.error('DeepSeek description generation error:', error);
      return userMessage;
    }
  }
}

export const deepSeekService = new DeepSeekService();

