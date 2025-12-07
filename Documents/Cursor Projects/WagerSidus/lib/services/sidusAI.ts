import { sidusAICoreService, type WagerContract, type SidusAgent } from './sidusAICore';

// Re-export types for backward compatibility
export type { WagerContract, SidusAgent };

// Legacy service - now uses SidusAICoreService internally
export class SidusAIService {
  private coreService = sidusAICoreService;

  async createWagerContract(
    participants: string[],
    amount: string,
    condition: string,
    chainId: number = 56, // BNB Chain
    charityOptions?: {
      enabled: boolean;
      percentage?: number;
      address?: string;
    }
  ): Promise<WagerContract> {
    return this.coreService.createWagerContract(
      participants,
      amount,
      condition,
      chainId,
      charityOptions
    );
  }

  async resolveWager(
    wagerId: string,
    winner: string,
    evidence?: string
  ): Promise<WagerContract> {
    return this.coreService.resolveWager(wagerId, winner, evidence);
  }

  async getWagerContract(wagerId: string): Promise<WagerContract> {
    return this.coreService.getWagerContract(wagerId);
  }

  async getConnectedAgents(userAddress: string): Promise<SidusAgent[]> {
    return this.coreService.getConnectedAgents(userAddress);
  }
}

export const sidusAIService = new SidusAIService();
