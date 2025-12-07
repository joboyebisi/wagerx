import axios from 'axios';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

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
  // Validation
  missingFields?: string[]; // Fields missing for create intent
  isValid?: boolean; // Whether all required fields are present
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

export interface PerplexityResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  citations?: string[];
}

export class PerplexityService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY || '';
    
    // Warn if API key is missing or invalid format
    if (!this.apiKey || this.apiKey.trim() === '') {
      console.warn('⚠️  Perplexity API key is not set. Set NEXT_PUBLIC_PERPLEXITY_API_KEY in your .env.local file.');
    } else if (!this.apiKey.startsWith('pplx-')) {
      console.warn('⚠️  Perplexity API key format may be incorrect. Expected format: pplx-...');
    }
  }

  /**
   * Detect wager intent from natural language using Perplexity
   */
  async detectIntent(userMessage: string, context?: any): Promise<WagerIntent> {
    try {
      const systemPrompt = `You are an AI assistant that helps detect wager intents from natural language. 
This platform ONLY supports SPORTS and CRYPTO predictions that can be verified via APIs.

CRITICAL: For CREATE intent, you MUST extract ALL required fields before confirming:
- category: "sports" OR "crypto" (REQUIRED)
- amount: numeric value (REQUIRED)
- currency: "BNB" or token symbol (REQUIRED)
- condition: verifiable prediction description (REQUIRED)
- participants: at least 2 wallet addresses or Telegram usernames (REQUIRED)

Analyze the user's message and extract:
1. Intent type: create, accept, resolve, cancel, or query
2. Category: "sports" or "crypto" (REQUIRED for create intent - MUST be one of these)
3. Participants: array of wallet addresses or Telegram usernames (REQUIRED for create - minimum 2)
4. Amount: numeric value (REQUIRED for create)
5. Currency: "BNB" or token symbol (REQUIRED for create)
6. Condition: detailed, verifiable description (REQUIRED for create - must be API-verifiable)
7. Wager ID (if referencing existing wager)
8. Winner (if resolving)
9. Confidence score (0-1)
10. Charity (optional): If user mentions donating a percentage to charity, extract:
   - charityEnabled: true/false
   - charityPercentage: 0-100 (if mentioned)
   - charityAddress: wallet address (if specified)

For SPORTS wagers: Extract teams, sport type, event date, and condition (e.g., "Team A wins", "Total points > 50")
For CRYPTO wagers: Extract symbol (BTC, ETH, etc.), condition (e.g., "BTC > $50000", "ETH increases by 10%"), and target date

VALIDATION RULES:
- If intent is "create" but ANY required field is missing, set confidence to 0 and include a "missingFields" array
- Return missingFields: ["category"] if category not found
- Return missingFields: ["amount"] if amount not found
- Return missingFields: ["condition"] if condition not found or too vague
- Return missingFields: ["participants"] if less than 2 participants found

Return ONLY a valid JSON object with this structure. Be precise and extract all relevant information.`;

      // Validate API key
      if (!this.apiKey || this.apiKey.trim() === '') {
        throw new Error('Perplexity API key is not configured. Please set NEXT_PUBLIC_PERPLEXITY_API_KEY in your environment variables.');
      }

      const response = await axios.post<PerplexityResponse>(
        PERPLEXITY_API_URL,
        {
          model: 'sonar', // Valid Perplexity model
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Context: ${JSON.stringify(context || {})}\n\nUser message: ${userMessage}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 1000,
          return_citations: true,
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
        throw new Error('No response from Perplexity');
      }

      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      let intent: WagerIntent;
      
      if (jsonMatch) {
        try {
          intent = JSON.parse(jsonMatch[0]) as WagerIntent;
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          intent = this.parseIntentFallback(userMessage, content);
        }
      } else {
        // Fallback parsing
        intent = this.parseIntentFallback(userMessage, content);
      }

      // Validate intent if it's a create request
      if (intent.type === 'create') {
        const missingFields: string[] = [];
        
        if (!intent.category || (intent.category !== 'sports' && intent.category !== 'crypto')) {
          missingFields.push('category');
        }
        if (!intent.amount || parseFloat(intent.amount) <= 0) {
          missingFields.push('amount');
        }
        if (!intent.condition || intent.condition.trim().length < 10) {
          missingFields.push('condition');
        }
        if (!intent.participants || intent.participants.length < 2) {
          missingFields.push('participants');
        }
        
        intent.missingFields = missingFields;
        intent.isValid = missingFields.length === 0;
        
        if (missingFields.length > 0) {
          intent.confidence = 0; // Low confidence if fields missing
        }
      }

      return intent;
    } catch (error: any) {
      console.error('Perplexity intent detection error:', error);
      return this.parseIntentFallback(userMessage);
    }
  }

  /**
   * Resolve sports wager using Perplexity's real-time search
   */
  async resolveSportsWager(
    condition: string,
    teams: string[],
    eventDate: string,
    sport?: string
  ): Promise<{
    resolved: boolean;
    winner?: string;
    result?: any;
    evidence: string;
    citations?: string[];
  }> {
    try {
      const query = `What was the result of the ${sport || 'game'} between ${teams.join(' and ')} on ${eventDate}? ${condition}`;

      const response = await axios.post<PerplexityResponse>(
        PERPLEXITY_API_URL,
        {
          model: 'sonar', // Valid Perplexity model
          messages: [
            {
              role: 'system',
              content: 'You are a sports result verifier. Analyze the game result and determine if the wager condition was met. Return JSON with: resolved (boolean), winner (team name or address), result (game details), evidence (explanation).',
            },
            {
              role: 'user',
              content: query,
            },
          ],
          temperature: 0.1,
          max_tokens: 1000,
          return_citations: true,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0]?.message?.content;
      const citations = response.data.citations || [];

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          return {
            resolved: result.resolved || false,
            winner: result.winner,
            result: result.result,
            evidence: result.evidence || content,
            citations,
          };
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
        }
      }

      return {
        resolved: false,
        evidence: content,
        citations,
      };
    } catch (error: any) {
      console.error('Perplexity sports resolution error:', error);
      return {
        resolved: false,
        evidence: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Resolve crypto wager using Perplexity's real-time search
   */
  async resolveCryptoWager(
    symbol: string,
    condition: string,
    targetDate: string
  ): Promise<{
    resolved: boolean;
    winner?: string;
    result?: any;
    evidence: string;
    citations?: string[];
  }> {
    try {
      const query = `What was the price of ${symbol} on ${targetDate}? Check if ${condition} was true.`;

      const response = await axios.post<PerplexityResponse>(
        PERPLEXITY_API_URL,
        {
          model: 'sonar', // Valid Perplexity model
          messages: [
            {
              role: 'system',
              content: 'You are a cryptocurrency price verifier. Analyze the price data and determine if the wager condition was met. Return JSON with: resolved (boolean), winner (address if condition met), result (price details), evidence (explanation).',
            },
            {
              role: 'user',
              content: query,
            },
          ],
          temperature: 0.1,
          max_tokens: 1000,
          return_citations: true,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0]?.message?.content;
      const citations = response.data.citations || [];

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          return {
            resolved: result.resolved || false,
            winner: result.winner,
            result: result.result,
            evidence: result.evidence || content,
            citations,
          };
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
        }
      }

      return {
        resolved: false,
        evidence: content,
        citations,
      };
    } catch (error: any) {
      console.error('Perplexity crypto resolution error:', error);
      return {
        resolved: false,
        evidence: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Generate wager description using Perplexity
   */
  async generateWagerDescription(
    intent: WagerIntent,
    userMessage: string
  ): Promise<string> {
    try {
      const response = await axios.post<PerplexityResponse>(
        PERPLEXITY_API_URL,
        {
          model: 'sonar', // Valid Perplexity model
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
          max_tokens: 300,
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
      console.error('Perplexity description generation error:', error);
      return userMessage;
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
}

export const perplexityService = new PerplexityService();

