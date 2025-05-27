import { client } from './DexClient';
import { KeypairWallet } from './KeypairWallet';

// Solana token addresses (devnet)
const SOL_ADDRESS = '11111111111111111111111111111111';
const USDC_DEVNET_ADDRESS = 'Es9vMFrzaCERa8uQFQwZExk1tZb1rB6Qp8r9n3yq5F5k'; // Example devnet USDC mint

// Import the wallet instance from DexClient
import { wallet } from './DexClient';

/**
 * Execute a swap from SOL to USDC (devnet) using OKX DEX SDK
 * @param amountLamports Amount of SOL to swap, in lamports (1 SOL = 1_000_000_000 lamports)
 * @param slippage Slippage tolerance as a percentage string (e.g., '0.5' for 0.5%)
 * @returns The swap result from the OKX DEX SDK
 */
export async function executeSwapSOLtoUSDC(amountLamports: string, slippage = '0.5') {
  return client.dex.executeSwap({
    chainId: '501', // Solana chain ID
    fromTokenAddress: SOL_ADDRESS,
    toTokenAddress: USDC_DEVNET_ADDRESS,
    amount: amountLamports,
    slippage,
    userWalletAddress: wallet.publicKey.toBase58()
  });
} 