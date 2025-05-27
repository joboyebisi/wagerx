import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

export class EscrowMonitor {
  private connection: Connection;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async getSolBalance(address: string): Promise<number> {
    const balance = await this.connection.getBalance(new PublicKey(address));
    return balance / 1e9; // Convert lamports to SOL
  }

  async getTokenBalance(address: string, mint: string): Promise<number> {
    try {
      const ata = await getAssociatedTokenAddress(new PublicKey(mint), new PublicKey(address));
      const account = await getAccount(this.connection, ata);
      return Number(account.amount);
    } catch {
      return 0;
    }
  }

  async getAllBalances(address: string, tokenMints: string[]): Promise<{ [mint: string]: number }> {
    const balances: { [mint: string]: number } = {};
    for (const mint of tokenMints) {
      balances[mint] = await this.getTokenBalance(address, mint);
    }
    balances['SOL'] = await this.getSolBalance(address);
    return balances;
  }

  // Check if all required funds are received in USDC
  async isFullyFunded(
    escrowAddress: string,
    requiredAmount: number,
    usdcMint: string
  ): Promise<boolean> {
    const usdcBalance = await this.getTokenBalance(escrowAddress, usdcMint);
    return usdcBalance >= requiredAmount;
  }
} 