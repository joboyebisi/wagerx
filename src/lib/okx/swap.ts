import { client } from './DexClient';
import { KeypairWallet } from './KeypairWallet';

// Solana token addresses (devnet)
const SOL_ADDRESS = 'So11111111111111111111111111111111111111112'; // wrapped SOL
const USDC_DEVNET_ADDRESS = 'BXXkv6zrcK6rP6JrWcGLA7eGBhD5m6BzZr8b8PZQbWvb'; // devnet USDC mint

// Import the wallet instance from DexClient
import { wallet } from './DexClient';

/**
 * Execute a swap from SOL to USDC (devnet) using OKX DEX SDK
 * @param amountLamports Amount of SOL to swap, in lamports (1 SOL = 1_000_000_000 lamports)
 * @param slippage Slippage tolerance as a percentage string (e.g., '0.5' for 0.5%)
 * @returns The swap result from the OKX DEX SDK
 */
export async function executeSwapSOLtoUSDC(amountLamports: string, slippage = '0.5') {
  try {
    const response = await client.dex.executeSwap({
      chainId: '66', // Solana devnet
      fromTokenAddress: SOL_ADDRESS,
      toTokenAddress: USDC_DEVNET_ADDRESS,
      amount: amountLamports,
      slippage,
      userWalletAddress: wallet.publicKey.toBase58()
    });
    console.log('OKX DEX swap response:', response);
    return response;
  } catch (error: any) {
    // Mock swap if region restriction error
    if (error.status === 401 && error.responseBody && error.responseBody.code === '53015') {
      console.warn('OKX DEX region restriction detected. Mocking swap for demo purposes.');
      return {
        mock: true,
        status: 'success',
        message: 'Swap simulated due to region restriction.',
        swappedLamports: amountLamports,
        toToken: USDC_DEVNET_ADDRESS
      };
    }
    console.error('OKX DEX swap error:', error);
    throw error;
  }
} 