import { sidusAICoreService } from './sidusAICore';

// Re-export types for backward compatibility (if they exist)
// Note: These types may not be exported from sidusAICore if it's a local framework
export type SidusAgent = any; // Placeholder - adjust based on actual Sidus AI Core types
export type WagerContract = any; // Placeholder - adjust based on actual Sidus AI Core types

// Legacy service - now uses SidusAICoreService internally
// Note: Wager contract operations are handled by contractService, not Sidus AI
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
    // Wager contracts are created via contractService, not Sidus AI
    // This method is kept for backward compatibility but should use contractService
    throw new Error('Use contractService.createWager() instead of SidusAIService.createWagerContract()');
  }

  async resolveWager(
    wagerId: string,
    winner: string,
    evidence?: string
  ): Promise<WagerContract> {
    // Wager resolution is handled by contractService
    throw new Error('Use contractService.resolveWager() instead of SidusAIService.resolveWager()');
  }

  async getWagerContract(wagerId: string): Promise<WagerContract> {
    // Wager retrieval is handled by contractService
    throw new Error('Use contractService.getWager() instead of SidusAIService.getWagerContract()');
  }

  async getConnectedAgents(userAddress: string): Promise<SidusAgent[]> {
    return this.coreService.getConnectedAgents(userAddress);
  }
}

export const sidusAIService = new SidusAIService();
