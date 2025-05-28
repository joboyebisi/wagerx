import axios from 'axios';

export class PerplexityClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.perplexity.ai';
  }

  async detectWager(text: string): Promise<{
    isWager: boolean;
    description?: string;
    amount?: number;
    asset?: string;
    participants?: string[];
    botMentioned?: boolean;
  }> {
    // Fallback regex-based detection for common patterns
    const regex = /@([\w_]+)[,\s]*Can you create a wager between (.+) for (\d+)\s*(USDC|SOL|[A-Z]+) on (.+)\?/i;
    const match = text.match(regex);
    if (match) {
      // Extract participants (split by comma, and extract usernames and teams)
      const participantsRaw = match[2];
      const participants = participantsRaw.split(/,|and/).map(s => s.trim()).filter(Boolean);
      return {
        isWager: true,
        description: match[5].trim(),
        amount: parseFloat(match[3]),
        asset: match[4],
        participants,
        botMentioned: true
      };
    }

    // If not matched, fallback to Perplexity
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content:
                'You are a wager detection system. Analyze the text and determine if it contains a wager. If it does, extract the wager description, amount, asset (e.g. USDC, SOL), and participants (usernames or names). Return a JSON object with the following structure: {"isWager": boolean, "description": string, "amount": number, "asset": string, "participants": string[]}. If no wager is detected, return {"isWager": false}.\n\nExamples of good wagers:\n1. "Will it rain in New York City in the next hour?"\n2. "Will the temperature in London exceed 20°C in the next 30 minutes?"\n3. "Will the S&P 500 index be higher than 5000 at market close today?"\n4. "Will Bitcoin price be above $65,000 at 3 PM UTC today?"\n5. "Will the EUR/USD exchange rate be above 1.08 at 2 PM UTC?"\n\nThese wagers are good because they have:\n- Clear, measurable outcomes\n- Short timeframes (minutes to hours)\n- Verifiable data sources\n- Specific conditions'
            },
            {
              role: 'user',
              content: text
            }
          ],
          max_tokens: 1024,
          temperature: 0.7,
          top_p: 0.9,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data.choices[0].message.content;
      return this.parseWagerDetection(result);
    } catch (error: any) {
      if (error.response) {
        console.error('Perplexity API error:', error.response.data);
      } else {
        console.error('Error detecting wager:', error);
      }
      return { isWager: false };
    }
  }

  async verifyOutcome(description: string, outcome: string): Promise<{
    verified: boolean;
    confidence: number;
    explanation: string;
  }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'You are a wager outcome verification system. Verify if the outcome matches the wager conditions and provide a confidence score.'
            },
            {
              role: 'user',
              content: `Wager: ${description}\nOutcome: ${outcome}`
            }
          ],
          max_tokens: 1024,
          temperature: 0.7,
          top_p: 0.9,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data.choices[0].message.content;
      return this.parseVerificationResult(result);
    } catch (error: any) {
      if (error.response) {
        console.error('Perplexity API error:', error.response.data);
      } else {
        console.error('Error verifying outcome:', error);
      }
      return {
        verified: false,
        confidence: 0,
        explanation: 'Error during verification'
      };
    }
  }

  private parseWagerDetection(result: string): {
    isWager: boolean;
    description?: string;
    amount?: number;
    asset?: string;
    participants?: string[];
    botMentioned?: boolean;
  } {
    try {
      console.log('Perplexity API raw result:', result);
      const parsed = JSON.parse(result);
      return {
        isWager: parsed.isWager || false,
        description: parsed.description,
        amount: parsed.amount,
        asset: parsed.asset,
        participants: parsed.participants,
        botMentioned: parsed.botMentioned
      };
    } catch (error) {
      console.error('Error parsing wager detection result. Raw result was:', result);
      console.error('Parsing error:', error);
      return { isWager: false };
    }
  }

  private parseVerificationResult(result: string): {
    verified: boolean;
    confidence: number;
    explanation: string;
  } {
    try {
      const parsed = JSON.parse(result);
      return {
        verified: parsed.verified || false,
        confidence: parsed.confidence || 0,
        explanation: parsed.explanation || 'No explanation provided'
      };
    } catch (error) {
      console.error('Error parsing verification result:', error);
      return {
        verified: false,
        confidence: 0,
        explanation: 'Error parsing verification result'
      };
    }
  }

  /**
   * Determines if a wager is time-bound and returns the check time if possible.
   * Returns { isTimeBound, checkTime, manual, explanation }
   */
  async getWagerCheckTime(description: string): Promise<{ isTimeBound: boolean, checkTime?: string, manual: boolean, explanation: string }> {
    const systemPrompt = `You are a wager time extraction system. Given a wager description, determine if the event is time-bound and can be independently verified (e.g., weather, sports, public events). If so, return the UTC time when the outcome should be checked. If not, set \"manual\" to true.\n\nRespond as JSON:\n{\n  \"isTimeBound\": true/false,\n  \"checkTime\": \"<ISO8601_UTC_time or null>\",\n  \"manual\": true/false,\n  \"explanation\": \"<reasoning>\"\n}`;
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'sonar-pro',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: description }
          ],
          max_tokens: 512,
          temperature: 0.2,
          top_p: 0.9,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const result = response.data.choices[0].message.content;
      console.log('Perplexity getWagerCheckTime raw result:', result);
      return JSON.parse(result);
    } catch (error) {
      console.error('Error getting wager check time from Perplexity:', error);
      return { isTimeBound: false, checkTime: undefined, manual: true, explanation: 'Error or not time-bound.' };
    }
  }
} 