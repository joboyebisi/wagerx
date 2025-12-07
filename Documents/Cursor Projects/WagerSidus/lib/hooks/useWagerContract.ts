'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useCallback, useState } from 'react';
import { contractService, CreateWagerParams } from '@/lib/services/contract';
import { ethers } from 'ethers';

export interface TransactionStatus {
  status: 'idle' | 'pending' | 'success' | 'error';
  txHash?: string;
  error?: string;
}

export interface UseWagerContractReturn {
  createWager: (params: CreateWagerParams) => Promise<{ txHash: string; wagerId: bigint }>;
  acceptWager: (wagerId: bigint) => Promise<{ txHash: string }>;
  resolveWager: (wagerId: bigint, winner: string, evidence: string) => Promise<{ txHash: string }>;
  cancelWager: (wagerId: bigint) => Promise<{ txHash: string }>;
  getWager: (wagerId: bigint) => Promise<any>;
  getBalance: (address: string) => Promise<string>;
  transactionStatus: TransactionStatus;
  isLoading: boolean;
}

/**
 * Hook to interact with WagerContract using Privy wallet
 */
export function useWagerContract(): UseWagerContractReturn {
  const { user, sendTransaction } = usePrivy();
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>({
    status: 'idle',
  });
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Get signer from Privy wallet
   */
  const getSigner = useCallback(async (): Promise<ethers.Signer> => {
    if (!user?.wallet) {
      throw new Error('Wallet not connected');
    }

    // Get provider from Privy
    // Privy v2+ uses a different API - try to get provider from window.ethereum or use Privy's provider
    let provider: any;
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      provider = (window as any).ethereum;
    } else {
      // Fallback: Privy may expose provider differently
      // For now, create a provider from RPC URL
      const { ethers } = await import('ethers');
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com';
      provider = new ethers.JsonRpcProvider(rpcUrl);
    }

    // Create ethers provider and signer
    const ethersProvider = new ethers.BrowserProvider(provider);
    const signer = await ethersProvider.getSigner();
    return signer;
  }, [user]);

  /**
   * Create a new wager
   */
  const createWager = useCallback(
    async (params: CreateWagerParams) => {
      setIsLoading(true);
      setTransactionStatus({ status: 'pending' });

      try {
        const signer = await getSigner();
        const result = await contractService.createWager(params, signer);

        setTransactionStatus({
          status: 'success',
          txHash: result.txHash,
        });

        return result;
      } catch (error: any) {
        setTransactionStatus({
          status: 'error',
          error: error.message || 'Failed to create wager',
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [getSigner]
  );

  /**
   * Accept a wager
   */
  const acceptWager = useCallback(
    async (wagerId: bigint) => {
      setIsLoading(true);
      setTransactionStatus({ status: 'pending' });

      try {
        const signer = await getSigner();
        const result = await contractService.acceptWager(wagerId, signer);

        setTransactionStatus({
          status: 'success',
          txHash: result.txHash,
        });

        return result;
      } catch (error: any) {
        setTransactionStatus({
          status: 'error',
          error: error.message || 'Failed to accept wager',
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [getSigner]
  );

  /**
   * Resolve a wager
   */
  const resolveWager = useCallback(
    async (wagerId: bigint, winner: string, evidence: string) => {
      setIsLoading(true);
      setTransactionStatus({ status: 'pending' });

      try {
        const signer = await getSigner();
        const result = await contractService.resolveWager(wagerId, winner, evidence, signer);

        setTransactionStatus({
          status: 'success',
          txHash: result.txHash,
        });

        return result;
      } catch (error: any) {
        setTransactionStatus({
          status: 'error',
          error: error.message || 'Failed to resolve wager',
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [getSigner]
  );

  /**
   * Cancel a wager
   */
  const cancelWager = useCallback(
    async (wagerId: bigint) => {
      setIsLoading(true);
      setTransactionStatus({ status: 'pending' });

      try {
        const signer = await getSigner();
        const result = await contractService.cancelWager(wagerId, signer);

        setTransactionStatus({
          status: 'success',
          txHash: result.txHash,
        });

        return result;
      } catch (error: any) {
        setTransactionStatus({
          status: 'error',
          error: error.message || 'Failed to cancel wager',
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [getSigner]
  );

  /**
   * Get wager details
   */
  const getWager = useCallback(async (wagerId: bigint) => {
    try {
      return await contractService.getWager(wagerId);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get wager');
    }
  }, []);

  /**
   * Get balance
   */
  const getBalance = useCallback(async (address: string) => {
    try {
      return await contractService.getBalance(address);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get balance');
    }
  }, []);

  return {
    createWager,
    acceptWager,
    resolveWager,
    cancelWager,
    getWager,
    getBalance,
    transactionStatus,
    isLoading,
  };
}

