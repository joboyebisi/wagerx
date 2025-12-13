/**
 * Smart Contract Interaction Service
 * 
 * Handles all interactions with the deployed WagerContract on BNB Chain
 * Uses ethers.js v6 for contract interactions
 */

import { ethers } from 'ethers';
import WagerContractABI from './WagerContractABI.json';

export interface WagerData {
  id: bigint;
  participants: string[];
  amount: bigint;
  condition: string;
  status: number; // 0=pending, 1=active, 2=resolved, 3=cancelled
  winner: string;
  charityEnabled: boolean;
  charityPercentage: number;
  charityAddress: string;
  charityDonated: bigint;
  createdAt: bigint;
  resolvedAt: bigint;
}

export interface CreateWagerParams {
  participants: string[];
  amount: string; // in BNB (will be converted to wei)
  condition: string;
  charityEnabled?: boolean;
  charityPercentage?: number;
  charityAddress?: string;
}

export interface ContractServiceConfig {
  contractAddress: string;
  rpcUrl: string;
  chainId: number;
}

export class ContractService {
  private contractAddress: string;
  private rpcUrl: string;
  private chainId: number;
  private provider: ethers.Provider | null = null;
  private contract: ethers.Contract | null = null;

  constructor(config?: ContractServiceConfig) {
    this.contractAddress =
      config?.contractAddress ||
      process.env.NEXT_PUBLIC_WAGER_CONTRACT_ADDRESS ||
      '';
    this.rpcUrl =
      config?.rpcUrl ||
      process.env.NEXT_PUBLIC_RPC_URL ||
      'https://bsc-testnet-rpc.publicnode.com';
    this.chainId =
      config?.chainId ||
      parseInt(process.env.NEXT_PUBLIC_BNB_CHAIN_ID || '97');

    if (!this.contractAddress) {
      console.warn('WagerContract address not configured');
    }
  }

  /**
   * Initialize provider and contract instance
   */
  private getProvider(): ethers.Provider {
    if (!this.provider) {
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    }
    return this.provider;
  }

  /**
   * Get contract instance (read-only)
   */
  private getContract(): ethers.Contract {
    if (!this.contract) {
      const provider = this.getProvider();
      this.contract = new ethers.Contract(
        this.contractAddress,
        WagerContractABI,
        provider
      );
    }
    return this.contract;
  }

  /**
   * Get contract instance with signer (for transactions)
   */
  private getContractWithSigner(signer: ethers.Signer): ethers.Contract {
    return new ethers.Contract(
      this.contractAddress,
      WagerContractABI,
      signer
    );
  }

  /**
   * Convert BNB amount to wei
   */
  private parseBNB(amount: string): bigint {
    return ethers.parseEther(amount);
  }

  /**
   * Convert wei to BNB amount
   */
  private formatBNB(amount: bigint): string {
    return ethers.formatEther(amount);
  }

  /**
   * Create a new wager
   * @param params Wager creation parameters
   * @param signer Ethers signer (from Privy wallet)
   * @returns Transaction hash and wager ID
   */
  async createWager(
    params: CreateWagerParams,
    signer: ethers.Signer
  ): Promise<{ txHash: string; wagerId: bigint }> {
    if (!this.contractAddress) {
      throw new Error('WagerContract address not configured');
    }

    const contract = this.getContractWithSigner(signer);
    const amountWei = this.parseBNB(params.amount);

    // Validate inputs
    if (params.participants.length < 2) {
      throw new Error('Need at least 2 participants');
    }
    if (params.charityPercentage && params.charityPercentage > 100) {
      throw new Error('Charity percentage cannot exceed 100%');
    }

    try {
      // Check balance before attempting transaction
      if (!signer.provider) {
        throw new Error('Provider not available. Please ensure your wallet is connected.');
      }

      // Store provider in a variable so TypeScript knows it's not null
      const provider = signer.provider;
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);
      
      // Estimate gas for the transaction
      let estimatedGas: bigint;
      try {
        estimatedGas = await contract.createWager.estimateGas(
          params.participants,
          amountWei,
          params.condition,
          params.charityEnabled || false,
          params.charityPercentage || 0,
          params.charityAddress || ethers.ZeroAddress,
          {
            value: amountWei,
          }
        );
      } catch (estimateError: any) {
        // If estimation fails, use a conservative default
        // For BSC: ~100k-150k gas for simple transactions
        // Using 150k as safe default
        estimatedGas = BigInt(150000);
        console.warn('Gas estimation failed, using default:', estimateError.message);
      }

      // Get current gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(0);
      
      // Calculate total required: wager amount + gas fees
      const gasCost = estimatedGas * gasPrice;
      const totalRequired = amountWei + gasCost;

      // Check if balance is sufficient
      if (balance < totalRequired) {
        const balanceBNB = ethers.formatEther(balance);
        const requiredBNB = ethers.formatEther(totalRequired);
        const wagerBNB = ethers.formatEther(amountWei);
        const gasBNB = ethers.formatEther(gasCost);
        const shortfallBNB = ethers.formatEther(totalRequired - balance);
        
        throw new Error(
          `Insufficient funds!\n\n` +
          `💰 Your balance: ${parseFloat(balanceBNB).toFixed(6)} BNB\n` +
          `💸 Required: ${parseFloat(requiredBNB).toFixed(6)} BNB\n` +
          `   - Wager amount: ${parseFloat(wagerBNB).toFixed(6)} BNB\n` +
          `   - Gas fees: ~${parseFloat(gasBNB).toFixed(6)} BNB\n` +
          `❌ Shortfall: ${parseFloat(shortfallBNB).toFixed(6)} BNB\n\n` +
          `Please add more BNB to your wallet to create this wager.`
        );
      }

      // Call createWager function
      const tx = await contract.createWager(
        params.participants,
        amountWei,
        params.condition,
        params.charityEnabled || false,
        params.charityPercentage || 0,
        params.charityAddress || ethers.ZeroAddress,
        {
          value: amountWei, // Send BNB with transaction
        }
      );

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      // Get wager ID from event
      let wagerId: bigint = BigInt(0);
      
      try {
        // Try to parse WagerCreated event
        const wagerCreatedEvent = receipt.logs.find((log: any) => {
          try {
            const parsed = contract.interface.parseLog(log);
            return parsed?.name === 'WagerCreated';
          } catch {
            return false;
          }
        });

        if (wagerCreatedEvent) {
          const parsed = contract.interface.parseLog(wagerCreatedEvent);
          wagerId = parsed?.args[0] || BigInt(0);
        }
        
        // If event parsing failed or wagerId is 0, try fallback
        if (wagerId === BigInt(0)) {
          // Fallback: get the latest wager ID
          const totalWagers = await this.getTotalWagers();
          wagerId = totalWagers;
        }
      } catch (eventError) {
        console.warn('Failed to parse WagerCreated event, using fallback:', eventError);
        // Fallback: get the latest wager ID
        try {
          const totalWagers = await this.getTotalWagers();
          wagerId = totalWagers;
        } catch (fallbackError) {
          console.error('Failed to get total wagers:', fallbackError);
          // Last resort: use transaction hash as identifier
          throw new Error('Failed to extract wager ID from transaction. Please check the transaction manually.');
        }
      }

      return {
        txHash: receipt.hash,
        wagerId,
      };
    } catch (error: any) {
      console.error('Error creating wager:', error);
      throw new Error(
        error.reason || error.message || 'Failed to create wager'
      );
    }
  }

  /**
   * Accept a pending wager
   * @param wagerId Wager ID to accept
   * @param signer Ethers signer (from Privy wallet)
   * @returns Transaction hash
   */
  async acceptWager(
    wagerId: bigint,
    signer: ethers.Signer
  ): Promise<{ txHash: string }> {
    if (!this.contractAddress) {
      throw new Error('WagerContract address not configured');
    }

    const contract = this.getContractWithSigner(signer);

    try {
      // Get wager details to know the amount
      const wager = await this.getWager(wagerId);
      const amountWei = wager.amount;

      // Call acceptWager function
      const tx = await contract.acceptWager(wagerId, {
        value: amountWei, // Send BNB with transaction
      });

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
      };
    } catch (error: any) {
      console.error('Error accepting wager:', error);
      throw new Error(
        error.reason || error.message || 'Failed to accept wager'
      );
    }
  }

  /**
   * Resolve a wager and distribute winnings
   * @param wagerId Wager ID to resolve
   * @param winner Winner address
   * @param evidence Evidence string (optional)
   * @param signer Ethers signer (from Privy wallet)
   * @returns Transaction hash
   */
  async resolveWager(
    wagerId: bigint,
    winner: string,
    evidence: string,
    signer: ethers.Signer
  ): Promise<{ txHash: string }> {
    if (!this.contractAddress) {
      throw new Error('WagerContract address not configured');
    }

    const contract = this.getContractWithSigner(signer);

    try {
      // Call resolveWager function
      const tx = await contract.resolveWager(wagerId, winner, evidence);

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
      };
    } catch (error: any) {
      console.error('Error resolving wager:', error);
      throw new Error(
        error.reason || error.message || 'Failed to resolve wager'
      );
    }
  }

  /**
   * Get wager details from contract
   * @param wagerId Wager ID
   * @returns Wager data
   */
  async getWager(wagerId: bigint): Promise<WagerData> {
    if (!this.contractAddress) {
      throw new Error('WagerContract address not configured');
    }

    const contract = this.getContract();

    try {
      const wager = await contract.getWager(wagerId);

      return {
        id: wager.id,
        participants: wager.participants,
        amount: wager.amount,
        condition: wager.condition,
        status: Number(wager.status),
        winner: wager.winner,
        charityEnabled: wager.charityEnabled,
        charityPercentage: Number(wager.charityPercentage),
        charityAddress: wager.charityAddress,
        charityDonated: wager.charityDonated,
        createdAt: wager.createdAt,
        resolvedAt: wager.resolvedAt,
      };
    } catch (error: any) {
      console.error('Error getting wager:', error);
      throw new Error(
        error.reason || error.message || 'Failed to get wager'
      );
    }
  }

  /**
   * Cancel a wager (only creator or owner)
   * @param wagerId Wager ID to cancel
   * @param signer Ethers signer (from Privy wallet)
   * @returns Transaction hash
   */
  async cancelWager(
    wagerId: bigint,
    signer: ethers.Signer
  ): Promise<{ txHash: string }> {
    if (!this.contractAddress) {
      throw new Error('WagerContract address not configured');
    }

    const contract = this.getContractWithSigner(signer);

    try {
      // Call cancelWager function
      const tx = await contract.cancelWager(wagerId);

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
      };
    } catch (error: any) {
      console.error('Error cancelling wager:', error);
      throw new Error(
        error.reason || error.message || 'Failed to cancel wager'
      );
    }
  }

  /**
   * Get total number of wagers (helper to get latest wager ID)
   * Note: This is a workaround since the contract doesn't expose nextWagerId
   */
  private async getTotalWagers(): Promise<bigint> {
    // This would require a contract modification to expose nextWagerId
    // For now, we'll rely on events or return 0
    // In production, you might want to track this in your database
    return BigInt(0);
  }

  /**
   * Get BNB balance of an address
   */
  async getBalance(address: string): Promise<string> {
    const provider = this.getProvider();
    const balance = await provider.getBalance(address);
    return this.formatBNB(balance);
  }

  /**
   * Check if address has sufficient balance for a wager
   */
  async hasSufficientBalance(
    address: string,
    requiredAmount: string
  ): Promise<boolean> {
    const balance = await this.getBalance(address);
    return parseFloat(balance) >= parseFloat(requiredAmount);
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    const provider = this.getProvider();
    return await provider.getTransactionReceipt(txHash);
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = 1
  ): Promise<ethers.TransactionReceipt | null> {
    const provider = this.getProvider();
    return await provider.waitForTransaction(txHash, confirmations);
  }
}

// Export singleton instance
export const contractService = new ContractService();

