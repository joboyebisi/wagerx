import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

export class WalletManager {
  private connection: Connection;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async createWallet(): Promise<{ publicKey: string; privateKey: string }> {
    const keypair = Keypair.generate();
    
    // Request airdrop for devnet
    if (this.connection.rpcEndpoint.includes('devnet')) {
      const airdropSignature = await this.connection.requestAirdrop(
        keypair.publicKey,
        LAMPORTS_PER_SOL
      );
      await this.connection.confirmTransaction(airdropSignature);
    }

    return {
      publicKey: keypair.publicKey.toString(),
      privateKey: Buffer.from(keypair.secretKey).toString('hex'),
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