/**
 * Transaction Status Tracking Utilities
 * Provides comprehensive transaction monitoring and status updates
 */

import { ethers } from 'ethers';
import { contractService } from '@/lib/services/contract';

export interface TransactionStatus {
  status: 'idle' | 'pending' | 'confirming' | 'confirmed' | 'failed';
  txHash?: string;
  blockNumber?: number;
  confirmations?: number;
  error?: string;
  receipt?: ethers.TransactionReceipt;
}

export class TransactionTracker {
  private provider: ethers.Provider;
  private rpcUrl: string;

  constructor() {
    this.rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com';
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
  }

  /**
   * Helper to get confirmations count from receipt
   * In ethers v6, confirmations can be a number or a function
   */
  private async getConfirmations(receipt: ethers.TransactionReceipt): Promise<number> {
    const confirmations = receipt.confirmations;
    if (typeof confirmations === 'function') {
      return await confirmations();
    }
    if (typeof confirmations === 'number') {
      return confirmations;
    }
    return 0;
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForConfirmation(
    txHash: string,
    requiredConfirmations: number = 1,
    onUpdate?: (status: TransactionStatus) => void
  ): Promise<TransactionStatus> {
    let status: TransactionStatus = {
      status: 'pending',
      txHash,
      confirmations: 0,
    };

    try {
      // Notify initial pending state
      onUpdate?.(status);

      // Wait for transaction to be mined
      const receipt = await this.provider.waitForTransaction(txHash, requiredConfirmations);

      if (receipt === null) {
        status = {
          status: 'failed',
          txHash,
          error: 'Transaction not found',
        };
        onUpdate?.(status);
        return status;
      }

      // Check if transaction failed
      if (receipt.status === 0) {
        status = {
          status: 'failed',
          txHash,
          blockNumber: receipt.blockNumber,
          confirmations: await this.getConfirmations(receipt),
          receipt,
          error: 'Transaction reverted',
        };
        onUpdate?.(status);
        return status;
      }

      // Transaction succeeded
      status = {
        status: 'confirmed',
        txHash,
        blockNumber: receipt.blockNumber,
        confirmations: await this.getConfirmations(receipt),
        receipt,
      };

      onUpdate?.(status);
      return status;
    } catch (error: any) {
      status = {
        status: 'failed',
        txHash,
        error: error.message || 'Transaction failed',
      };
      onUpdate?.(status);
      return status;
    }
  }

  /**
   * Poll for transaction status
   */
  async pollTransaction(
    txHash: string,
    interval: number = 2000,
    maxAttempts: number = 30,
    onUpdate?: (status: TransactionStatus) => void
  ): Promise<TransactionStatus> {
    let attempts = 0;
    let status: TransactionStatus = {
      status: 'pending',
      txHash,
      confirmations: 0,
    };

    const poll = async (): Promise<TransactionStatus> => {
      attempts++;

      try {
        const receipt = await this.provider.getTransactionReceipt(txHash);

        if (receipt) {
          if (receipt.status === 0) {
            status = {
              status: 'failed',
              txHash,
              blockNumber: receipt.blockNumber,
              confirmations: await this.getConfirmations(receipt),
              receipt,
              error: 'Transaction reverted',
            };
            onUpdate?.(status);
            return status;
          }

          status = {
            status: (await this.getConfirmations(receipt)) >= 1 ? 'confirmed' : 'confirming',
            txHash,
            blockNumber: receipt.blockNumber,
            confirmations: await this.getConfirmations(receipt),
            receipt,
          };
          onUpdate?.(status);

          const confirmations = await this.getConfirmations(receipt);
          if (confirmations >= 1) {
            return status;
          }
        }

        if (attempts >= maxAttempts) {
          status = {
            status: 'failed',
            txHash,
            error: 'Transaction timeout - please check manually',
          };
          onUpdate?.(status);
          return status;
        }

        // Continue polling
        await new Promise((resolve) => setTimeout(resolve, interval));
        return poll();
      } catch (error: any) {
        if (attempts >= maxAttempts) {
          status = {
            status: 'failed',
            txHash,
            error: error.message || 'Transaction polling failed',
          };
          onUpdate?.(status);
          return status;
        }

        await new Promise((resolve) => setTimeout(resolve, interval));
        return poll();
      }
    };

    return poll();
  }

  /**
   * Get BSCScan URL for transaction
   */
  getBSCScanUrl(txHash: string): string {
    const chainId = process.env.NEXT_PUBLIC_BNB_CHAIN_ID || '97';
    const network = chainId === '97' ? 'testnet' : '';
    return `https://${network ? network + '.' : ''}bscscan.com/tx/${txHash}`;
  }

  /**
   * Get transaction receipt
   */
  async getReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    return await this.provider.getTransactionReceipt(txHash);
  }
}

export const transactionTracker = new TransactionTracker();

