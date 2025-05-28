import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import bs58 from 'bs58';

export class WalletManager {
  private connection: Connection;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async createWallet(): Promise<{ publicKey: string; privateKey: string; airdropSuccess: boolean }> {
    const keypair = Keypair.generate();
    let airdropSuccess = false;
    // Request airdrop for devnet
    if (this.connection.rpcEndpoint.includes('devnet')) {
      try {
        const airdropSignature = await this.connection.requestAirdrop(
          keypair.publicKey,
          LAMPORTS_PER_SOL
        );
        await this.connection.confirmTransaction(airdropSignature);
        airdropSuccess = true;
      } catch (e) {
        console.warn('Airdrop failed:', e);
      }
    }
    return {
      publicKey: keypair.publicKey.toBase58(),
      privateKey: bs58.encode(keypair.secretKey),
      airdropSuccess,
    };
  }

  async getBalance(publicKey: string): Promise<number> {
    const balance = await this.connection.getBalance(new PublicKey(publicKey));
    return balance / LAMPORTS_PER_SOL;
  }

  async getTokenBalance(
    walletAddress: string,
    tokenMint: string
  ): Promise<number> {
    try {
      const associatedTokenAddress = await getAssociatedTokenAddress(
        new PublicKey(tokenMint),
        new PublicKey(walletAddress)
      );

      const tokenAccount = await getAccount(this.connection, associatedTokenAddress);
      return Number(tokenAccount.amount);
    } catch (error) {
      // If the token account doesn't exist, return 0
      return 0;
    }
  }
}

/**
 * Generate a new Solana wallet and print the public and private key (base58)
 */
export function generateNewWallet() {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  const privateKey = bs58.encode(keypair.secretKey);
  console.log('New Solana Wallet Generated:');
  console.log('Public Key:', publicKey);
  console.log('Private Key:', privateKey);
  return { publicKey, privateKey };
} 