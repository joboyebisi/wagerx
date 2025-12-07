import axios from 'axios';
import { WagerContract } from './sidusAI';
import { perplexityService } from './perplexity';

export type WagerCategory = 'sports' | 'crypto';

export interface SportsWager {
  sport: string;
  league?: string;
  teams: string[];
  eventDate: string;
  condition: string; // e.g., "Team A wins", "Total points > 50"
}

export interface CryptoWager {
  symbol: string; // e.g., "BTC", "ETH"
  condition: string; // e.g., "BTC > $50000", "ETH increases by 10%"
  targetPrice?: number;
  targetDate: string;
  comparisonType: 'price' | 'percentage' | 'market_cap';
}

export interface VerificationResult {
  verified: boolean;
  result: any;
  evidence: string;
  verifiedAt: string;
}

export class VerificationService {
  private coinmarketcapApiKey: string;

  constructor() {
    this.coinmarketcapApiKey = process.env.NEXT_PUBLIC_COINMARKETCAP_API_KEY || '';
  }

  async verifyCryptoWager(
    wager: CryptoWager,
    wagerDate: string
  ): Promise<VerificationResult> {
    try {
      // Get current price from CoinMarketCap
      const currentPrice = await this.getCryptoPrice(wager.symbol);
      
      if (!currentPrice) {
        return {
          verified: false,
          result: null,
          evidence: 'Unable to fetch current price from CoinMarketCap',
          verifiedAt: new Date().toISOString(),
        };
      }

      // Parse condition and verify
      const conditionResult = this.evaluateCryptoCondition(
        wager.condition,
        currentPrice,
        wager.targetPrice
      );

      return {
        verified: true,
        result: conditionResult,
        evidence: `CoinMarketCap: ${wager.symbol} current price is $${currentPrice.price.toFixed(2)} (${currentPrice.percentChange24h > 0 ? '+' : ''}${currentPrice.percentChange24h.toFixed(2)}% in 24h)`,
        verifiedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Crypto verification error:', error);
      return {
        verified: false,
        result: null,
        evidence: `Verification error: ${error.message}`,
        verifiedAt: new Date().toISOString(),
      };
    }
  }

  async verifySportsWager(
    wager: SportsWager,
    eventDate: string
  ): Promise<VerificationResult> {
    try {
      // Use Perplexity AI for sports verification (real-time search)
      const perplexityResult = await perplexityService.resolveSportsWager(
        wager.condition,
        wager.teams,
        wager.eventDate,
        wager.sport
      );

      if (!perplexityResult.resolved) {
        return {
          verified: false,
          result: null,
          evidence: perplexityResult.evidence || 'Unable to verify sports result',
          verifiedAt: new Date().toISOString(),
        };
      }

      return {
        verified: true,
        result: perplexityResult.result,
        evidence: perplexityResult.evidence,
        verifiedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Sports verification error:', error);
      return {
        verified: false,
        result: null,
        evidence: `Verification error: ${error.message}`,
        verifiedAt: new Date().toISOString(),
      };
    }
  }

  private async getCryptoPrice(symbol: string): Promise<{
    price: number;
    percentChange24h: number;
    marketCap: number;
  } | null> {
    try {
      const response = await axios.get(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
        {
          params: {
            symbol: symbol.toUpperCase(),
            convert: 'USD',
          },
          headers: {
            'X-CMC_PRO_API_KEY': this.coinmarketcapApiKey,
          },
        }
      );

      const data = response.data.data[symbol.toUpperCase()];
      if (!data) return null;

      return {
        price: data.quote.USD.price,
        percentChange24h: data.quote.USD.percent_change_24h,
        marketCap: data.quote.USD.market_cap,
      };
    } catch (error: any) {
      console.error('CoinMarketCap API error:', error);
      // Fallback: try alternative endpoint or return null
      return null;
    }
  }

  // Removed getSportsResult - now using Perplexity AI for sports verification

  private evaluateCryptoCondition(
    condition: string,
    currentPrice: { price: number; percentChange24h: number; marketCap: number },
    targetPrice?: number
  ): boolean {
    const lowerCondition = condition.toLowerCase();

    // Parse conditions like "BTC > $50000" or "ETH increases by 10%"
    if (lowerCondition.includes('>')) {
      const match = condition.match(/>\s*\$?(\d+(?:\.\d+)?)/);
      if (match) {
        const threshold = parseFloat(match[1]);
        return currentPrice.price > threshold;
      }
    }

    if (lowerCondition.includes('<')) {
      const match = condition.match(/<\s*\$?(\d+(?:\.\d+)?)/);
      if (match) {
        const threshold = parseFloat(match[1]);
        return currentPrice.price < threshold;
      }
    }

    if (lowerCondition.includes('increases') || lowerCondition.includes('rises')) {
      const match = condition.match(/(\d+(?:\.\d+)?)%/);
      if (match) {
        const percentThreshold = parseFloat(match[1]);
        return currentPrice.percentChange24h > percentThreshold;
      }
    }

    if (lowerCondition.includes('decreases') || lowerCondition.includes('drops')) {
      const match = condition.match(/(\d+(?:\.\d+)?)%/);
      if (match) {
        const percentThreshold = parseFloat(match[1]);
        return currentPrice.percentChange24h < -percentThreshold;
      }
    }

    // Default: use target price if provided
    if (targetPrice) {
      return currentPrice.price >= targetPrice;
    }

    return false;
  }

  private evaluateSportsCondition(condition: string, result: any): boolean {
    const lowerCondition = condition.toLowerCase();

    // Parse conditions like "Team A wins", "Total points > 50"
    if (lowerCondition.includes('wins') || lowerCondition.includes('win')) {
      // Extract team name and check if they won
      // This would need actual game result data
      return false; // Placeholder
    }

    if (lowerCondition.includes('total') && lowerCondition.includes('>')) {
      const match = condition.match(/>\s*(\d+)/);
      if (match && result.totalScore) {
        const threshold = parseInt(match[1]);
        return result.totalScore > threshold;
      }
    }

    return false;
  }
}

export const verificationService = new VerificationService();

