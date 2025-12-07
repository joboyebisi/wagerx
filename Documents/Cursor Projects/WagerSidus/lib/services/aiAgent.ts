import axios from 'axios';
import { verificationService, WagerCategory, SportsWager, CryptoWager } from './verification';
import { WagerContract } from './sidusAI';
import { perplexityService } from './perplexity';
import { charityService } from './charity';

export interface AgentVerificationRequest {
  wagerId: string;
  wager: WagerContract;
  category: WagerCategory;
  sportsData?: SportsWager;
  cryptoData?: CryptoWager;
}

export interface AgentVerificationResponse {
  verified: boolean;
  winner?: string;
  result: any;
  evidence: string;
  confidence: number;
  verifiedAt: string;
  charityDonation?: {
    donationAmount: string;
    winnerAmount: string;
  } | null;
}

export class AIAgentService {
  private perplexityApiKey: string;

  constructor() {
    this.perplexityApiKey = process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY || '';
  }

  async verifyWager(request: AgentVerificationRequest): Promise<AgentVerificationResponse> {
    try {
      let verificationResult;

      // Use Perplexity for verification (real-time search capabilities)
      if (request.category === 'crypto' && request.cryptoData) {
        // Use Perplexity to resolve crypto wager
        const perplexityResult = await perplexityService.resolveCryptoWager(
          request.cryptoData.symbol,
          request.cryptoData.condition,
          request.cryptoData.targetDate
        );

        verificationResult = {
          verified: perplexityResult.resolved,
          result: perplexityResult.result,
          evidence: perplexityResult.evidence,
          verifiedAt: new Date().toISOString(),
        };
      } else if (request.category === 'sports' && request.sportsData) {
        // Use Perplexity to resolve sports wager
        const perplexityResult = await perplexityService.resolveSportsWager(
          request.sportsData.condition,
          request.sportsData.teams,
          request.sportsData.eventDate,
          request.sportsData.sport
        );

        verificationResult = {
          verified: perplexityResult.resolved,
          result: perplexityResult.result,
          evidence: perplexityResult.evidence,
          verifiedAt: new Date().toISOString(),
        };
      } else {
        return {
          verified: false,
          result: null,
          evidence: 'Invalid wager category or missing data',
          confidence: 0,
          verifiedAt: new Date().toISOString(),
        };
      }

      if (!verificationResult.verified) {
        return {
          verified: false,
          result: verificationResult.result,
          evidence: verificationResult.evidence,
          confidence: 0.3,
          verifiedAt: verificationResult.verifiedAt,
        };
      }

      // Use AI to determine winner based on verification result and wager condition
      const winner = await this.determineWinner(
        request.wager,
        verificationResult,
        request.category
      );

      // Calculate charity donation if enabled
      let charityDonation = null;
      if (request.wager.charityEnabled && winner) {
        const totalWinnings = (
          parseFloat(request.wager.amount) * request.wager.participants.length
        ).toString();
        charityDonation = charityService.calculateDonation(request.wager, totalWinnings);
      }

      return {
        verified: true,
        winner,
        result: verificationResult.result,
        evidence: verificationResult.evidence,
        confidence: 0.9,
        verifiedAt: verificationResult.verifiedAt,
        charityDonation,
      };
    } catch (error: any) {
      console.error('AI Agent verification error:', error);
      return {
        verified: false,
        result: null,
        evidence: `Agent error: ${error.message}`,
        confidence: 0,
        verifiedAt: new Date().toISOString(),
      };
    }
  }

  private async determineWinner(
    wager: WagerContract,
    verificationResult: any,
    category: WagerCategory
  ): Promise<string | undefined> {
    try {
      // Use Perplexity to analyze the verification result and determine winner
      const prompt = `Analyze this wager and verification result to determine the winner:

Wager Condition: ${wager.condition}
Participants: ${wager.participants.join(', ')}
Verification Result: ${JSON.stringify(verificationResult)}
Category: ${category}

Based on the verification result, determine which participant won the wager. Return only the wallet address of the winner, or "none" if no clear winner.`;

      // Use Perplexity for winner determination
      const response = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'system',
              content:
                'You are an AI agent that determines wager winners based on verification results. Return only the winner address or "none".',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 200,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY || ''}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const winner = response.data.choices[0]?.message?.content?.trim();
      
      // Validate winner is one of the participants
      if (winner && winner !== 'none' && wager.participants.includes(winner)) {
        return winner;
      }

      // Fallback: determine based on verification result
      if (verificationResult.result === true) {
        return wager.participants[0]; // First participant wins if condition met
      }

      return undefined;
    } catch (error) {
      console.error('Error determining winner:', error);
      return undefined;
    }
  }

  async autoResolveWager(wagerId: string, wager: WagerContract): Promise<AgentVerificationResponse> {
    // Extract category and data from wager condition
    const category = this.extractCategory(wager.condition);
    const sportsData = category === 'sports' ? this.extractSportsData(wager.condition) : undefined;
    const cryptoData = category === 'crypto' ? this.extractCryptoData(wager.condition) : undefined;

    return this.verifyWager({
      wagerId,
      wager,
      category,
      sportsData,
      cryptoData,
    });
  }

  private extractCategory(condition: string): WagerCategory {
    const lower = condition.toLowerCase();
    
    // Check for crypto indicators
    const cryptoKeywords = ['btc', 'eth', 'bitcoin', 'ethereum', 'crypto', 'coin', 'price', 'market cap'];
    if (cryptoKeywords.some(keyword => lower.includes(keyword))) {
      return 'crypto';
    }

    // Check for sports indicators
    const sportsKeywords = ['team', 'game', 'match', 'score', 'wins', 'league', 'nfl', 'nba', 'mlb', 'soccer', 'football'];
    if (sportsKeywords.some(keyword => lower.includes(keyword))) {
      return 'sports';
    }

    // Default to crypto if unclear
    return 'crypto';
  }

  private extractSportsData(condition: string): SportsWager | undefined {
    // Use AI or regex to extract sports data
    // This is a simplified version - could be enhanced with DeepSeek
    return {
      sport: 'unknown',
      teams: [],
      eventDate: new Date().toISOString(),
      condition,
    };
  }

  private extractCryptoData(condition: string): CryptoWager | undefined {
    // Extract crypto symbol and condition
    const symbolMatch = condition.match(/\b(BTC|ETH|BNB|SOL|ADA|DOT|MATIC|AVAX|LINK|UNI)\b/i);
    const symbol = symbolMatch ? symbolMatch[1].toUpperCase() : 'BTC';

    return {
      symbol,
      condition,
      targetDate: new Date().toISOString(),
      comparisonType: 'price',
    };
  }
}

export const aiAgentService = new AIAgentService();

