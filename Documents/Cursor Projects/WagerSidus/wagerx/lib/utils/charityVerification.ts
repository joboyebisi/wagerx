/**
 * Charity Donation Flow Verification
 * Ensures charity calculations are correct and verifies donations
 */

import { ethers } from 'ethers';
import { contractService, WagerData } from '@/lib/services/contract';

export interface CharityVerification {
  isValid: boolean;
  expectedDonation: string; // in BNB
  actualDonation: string; // in BNB
  percentage: number;
  charityAddress: string;
  totalWinnings: string; // in BNB
  winnerAmount: string; // in BNB
  errors?: string[];
}

export class CharityVerificationService {
  /**
   * Verify charity donation calculation
   */
  static verifyCharityDonation(
    wager: WagerData,
    totalWinnings: bigint
  ): CharityVerification {
    const errors: string[] = [];
    let isValid = true;

    // Check if charity is enabled
    if (!wager.charityEnabled) {
      return {
        isValid: true,
        expectedDonation: '0',
        actualDonation: '0',
        percentage: 0,
        charityAddress: ethers.ZeroAddress,
        totalWinnings: (Number(totalWinnings) / 1e18).toFixed(4),
        winnerAmount: (Number(totalWinnings) / 1e18).toFixed(4),
      };
    }

    // Validate charity percentage
    if (wager.charityPercentage < 0 || wager.charityPercentage > 50) {
      isValid = false;
      errors.push(`Invalid charity percentage: ${wager.charityPercentage}% (must be 0-50%)`);
    }

    // Validate charity address
    if (!wager.charityAddress || wager.charityAddress === ethers.ZeroAddress) {
      isValid = false;
      errors.push('Charity address is not set or is zero address');
    }

    // Calculate expected donation
    const expectedDonationWei = (totalWinnings * BigInt(wager.charityPercentage)) / BigInt(100);
    const expectedDonation = (Number(expectedDonationWei) / 1e18).toFixed(4);

    // Get actual donation from contract
    const actualDonationWei = wager.charityDonated || BigInt(0);
    const actualDonation = (Number(actualDonationWei) / 1e18).toFixed(4);

    // Verify donation amount matches
    const tolerance = BigInt(1e15); // 0.001 BNB tolerance
    const donationDiff = expectedDonationWei > actualDonationWei
      ? expectedDonationWei - actualDonationWei
      : actualDonationWei - expectedDonationWei;

    if (donationDiff > tolerance) {
      isValid = false;
      errors.push(
        `Donation amount mismatch: expected ${expectedDonation} BNB, got ${actualDonation} BNB`
      );
    }

    // Calculate winner amount
    const winnerAmountWei = totalWinnings - actualDonationWei;
    const winnerAmount = (Number(winnerAmountWei) / 1e18).toFixed(4);
    const totalWinningsFormatted = (Number(totalWinnings) / 1e18).toFixed(4);

    return {
      isValid,
      expectedDonation,
      actualDonation,
      percentage: wager.charityPercentage,
      charityAddress: wager.charityAddress,
      totalWinnings: totalWinningsFormatted,
      winnerAmount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Verify charity donation from contract
   */
  static async verifyFromContract(wagerId: bigint): Promise<CharityVerification> {
    try {
      const wager = await contractService.getWager(wagerId);

      // Calculate total winnings (amount * number of participants)
      const totalWinnings = wager.amount * BigInt(wager.participants.length);

      return this.verifyCharityDonation(wager, totalWinnings);
    } catch (error: any) {
      return {
        isValid: false,
        expectedDonation: '0',
        actualDonation: '0',
        percentage: 0,
        charityAddress: ethers.ZeroAddress,
        totalWinnings: '0',
        winnerAmount: '0',
        errors: [error.message || 'Failed to verify charity donation'],
      };
    }
  }

  /**
   * Format charity verification for display
   */
  static formatVerification(verification: CharityVerification): string {
    if (!verification.isValid) {
      return `❌ Charity verification failed:\n${verification.errors?.join('\n') || 'Unknown error'}`;
    }

    if (verification.percentage === 0) {
      return '✅ No charity donation (disabled)';
    }

    return `✅ Charity verification passed:
- Percentage: ${verification.percentage}%
- Donation: ${verification.actualDonation} BNB
- Winner receives: ${verification.winnerAmount} BNB
- Charity address: ${verification.charityAddress.slice(0, 6)}...${verification.charityAddress.slice(-4)}`;
  }
}

