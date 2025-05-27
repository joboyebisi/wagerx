import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import bs58 from 'bs58';
import { wallet } from './DexClient';

// USDC devnet mint address
const USDC_DEVNET_MINT = new PublicKey('Es9vMFrzaCERa8uQFQwZExk1tZb1rB6Qp8r9n3yq5F5k');
const connection = wallet.connection;
const escrowKeypair = wallet['keypair'] as Keypair; // Access the keypair for signing

/**
 * Send USDC (devnet) from escrow wallet to winner
 * @param toWallet Winner's public key (base58 string)
 * @param amount Amount in smallest units (e.g., 1 USDC = 1,000,000)
 * @returns Transaction signature
 */
export async function payoutUSDC(toWallet: string, amount: number) {
  const fromTokenAccount = await getAssociatedTokenAddress(USDC_DEVNET_MINT, escrowKeypair.publicKey);
  const toTokenAccount = await getAssociatedTokenAddress(USDC_DEVNET_MINT, new PublicKey(toWallet));

  const tx = new Transaction().add(
    createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      escrowKeypair.publicKey,
      amount
    )
  );

  tx.feePayer = escrowKeypair.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(escrowKeypair);

  const signature = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(signature);

  return signature;
} 