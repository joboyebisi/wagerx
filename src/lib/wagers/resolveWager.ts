import { executeSwapSOLtoUSDC } from '../okx/swap';
import { payoutUSDC } from '../okx/payout';
import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

/**
 * Resolve a wager: swap SOL to USDC and pay out the winner
 * @param wagerId Firestore wager document ID
 * @param winnerWalletAddress Winner's public key (base58 string)
 * @param solAmount Amount of SOL to swap (in SOL, not lamports)
 */
export async function resolveWager(wagerId: string, winnerWalletAddress: string, solAmount: number) {
  // 1. Convert SOL to lamports
  const lamports = (solAmount * 1_000_000_000).toString();

  // 2. Swap SOL to USDC
  const swapResult = await executeSwapSOLtoUSDC(lamports);

  // 3. Log swap result to Firestore
  await updateDoc(doc(db, 'wagers', wagerId), {
    swapResult,
    swapTimestamp: new Date().toISOString()
  });

  // 4. Determine USDC amount to pay out (example: use swapResult.details.toToken.amount)
  // For devnet, assume 6 decimals for USDC
  let usdcAmount = 0;
  if ('details' in swapResult && swapResult.details?.toToken?.amount) {
    usdcAmount = Number(swapResult.details.toToken.amount);
  } else if ('mock' in swapResult && swapResult.swappedLamports) {
    // For mock, just convert lamports to USDC 1:1 for demo (or set a fixed value)
    usdcAmount = Number(swapResult.swappedLamports) / 1_000_000; // 1 USDC = 1,000,000 (for demo)
  }

  // 5. Pay out USDC to winner
  const payoutSignature = await payoutUSDC(winnerWalletAddress, usdcAmount);

  // 6. Log payout to Firestore
  await updateDoc(doc(db, 'wagers', wagerId), {
    payoutSignature,
    payoutTimestamp: new Date().toISOString()
  });

  return { swapResult, payoutSignature };
} 