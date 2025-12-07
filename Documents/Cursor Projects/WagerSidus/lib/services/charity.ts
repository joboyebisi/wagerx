import { ethers } from 'ethers';
import { WagerContract } from './sidusAI';

export interface CharityDonation {
  wagerId: string;
  charityAddress: string;
  amount: string;
  percentage: number;
  transactionHash?: string;
  donatedAt: string;
}

export class CharityService {
  /**
   * Calculate charity donation amount from wager winnings
   */
  calculateDonation(
    wager: WagerContract,
    totalWinnings: string
  ): { donationAmount: string; winnerAmount: string } | null {
    if (!wager.charityEnabled || !wager.charityPercentage || !wager.charityAddress) {
      return null;
    }

    const totalWinningsBN = ethers.parseEther(totalWinnings);
    const percentage = BigInt(Math.floor(wager.charityPercentage * 100)); // Convert to basis points
    const donationAmountBN = (totalWinningsBN * percentage) / BigInt(10000);
    const winnerAmountBN = totalWinningsBN - donationAmountBN;

    return {
      donationAmount: ethers.formatEther(donationAmountBN),
      winnerAmount: ethers.formatEther(winnerAmountBN),
    };
  }

  /**
   * Process charity donation (would send transaction on-chain)
   */
  async processDonation(
    wager: WagerContract,
    donationAmount: string,
    signer: ethers.Signer
  ): Promise<CharityDonation> {
    if (!wager.charityAddress) {
      throw new Error('Charity address not set');
    }

    try {
      // Send donation to charity address
      const tx = await signer.sendTransaction({
        to: wager.charityAddress,
        value: ethers.parseEther(donationAmount),
      });

      await tx.wait();

      return {
        wagerId: wager.id,
        charityAddress: wager.charityAddress,
        amount: donationAmount,
        percentage: wager.charityPercentage || 0,
        transactionHash: tx.hash,
        donatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Charity donation error:', error);
      throw new Error(`Failed to process donation: ${error.message}`);
    }
  }

  /**
   * Get popular charity addresses (pre-verified)
   */
  getPopularCharities(): Array<{ name: string; address: string; description: string }> {
    return [
      {
        name: 'GiveDirectly',
        address: '0x0000000000000000000000000000000000000000', // Placeholder
        description: 'Direct cash transfers to people in need',
      },
      {
        name: 'UNICEF',
        address: '0x0000000000000000000000000000000000000000', // Placeholder
        description: 'Children\'s emergency fund',
      },
      {
        name: 'Red Cross',
        address: '0x0000000000000000000000000000000000000000', // Placeholder
        description: 'Humanitarian aid organization',
      },
      {
        name: 'World Wildlife Fund',
        address: '0x0000000000000000000000000000000000000000', // Placeholder
        description: 'Wildlife conservation',
      },
    ];
  }

  /**
   * Validate charity address
   */
  isValidCharityAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }
}

export const charityService = new CharityService();

