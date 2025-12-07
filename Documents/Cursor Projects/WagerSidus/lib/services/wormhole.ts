/**
 * Wormhole TypeScript SDK Integration Service
 * Uses @wormhole-foundation/sdk for cross-chain transfers
 * 
 * Supports:
 * - Wrapped Token Transfers (WTT)
 * - Cross-chain bridging
 * - Multiple chain support (EVM, Solana, Sui, etc.)
 */

import { Wormhole, TokenId, TokenTransfer, amount, wormhole } from '@wormhole-foundation/sdk';
import evm from '@wormhole-foundation/sdk/evm';
import solana from '@wormhole-foundation/sdk/solana';
import sui from '@wormhole-foundation/sdk/sui';

export interface WormholeTransferParams {
  token: string; // Token address or 'native'
  amount: string; // Human-readable amount
  sourceChain: string; // Chain name (e.g., 'Bsc', 'Ethereum', 'Solana')
  destinationChain: string;
  recipient?: string; // Destination address
  route?: 'TokenBridge' | 'AutomaticTokenBridge'; // Manual or automatic
}

export interface WormholeTransferResult {
  success: boolean;
  sourceTxHash?: string;
  destinationTxHash?: string;
  vaa?: string; // Verifiable Action Approval
  error?: string;
}

export class WormholeService {
  private network: 'Mainnet' | 'Testnet' | 'Devnet';
  private wh: Wormhole<'Testnet' | 'Mainnet' | 'Devnet'> | null = null;

  constructor(network: 'Mainnet' | 'Testnet' | 'Devnet' = 'Testnet') {
    this.network = network;
  }

  /**
   * Initialize Wormhole SDK
   */
  private async initialize(): Promise<Wormhole<'Testnet' | 'Mainnet' | 'Devnet'>> {
    if (this.wh) return this.wh;
    
    this.wh = await wormhole(this.network, [evm, solana, sui]);
    return this.wh;
  }

  /**
   * Get chain context
   */
  async getChain(chainName: string): Promise<any> {
    const wh = await this.initialize();
    return wh.getChain(chainName as any);
  }

  /**
   * Create a token transfer
   */
  async createTransfer(params: WormholeTransferParams): Promise<TokenTransfer> {
    const wh = await this.initialize();
    const sourceChain = wh.getChain(params.sourceChain as any);
    const destinationChain = wh.getChain(params.destinationChain as any);
    
    // Get token ID
    let tokenId: TokenId;
    if (params.token === 'native') {
      tokenId = await sourceChain.getNativeWrappedTokenId();
    } else {
      tokenId = Wormhole.tokenId(sourceChain.chain, params.token);
    }
    
    // Parse amount
    const decimals = await wh.getDecimals(tokenId.chain, tokenId.address);
    const amountIn = amount.units(amount.parse(params.amount, Number(decimals)));
    
    // Get addresses
    const sourceAddress = Wormhole.chainAddress(sourceChain.chain, params.recipient || '');
    const destAddress = Wormhole.chainAddress(destinationChain.chain, params.recipient || '');
    
    // Create transfer
    const route = params.route || 'TokenBridge';
    const transfer = await wh.tokenTransfer(
      tokenId,
      amountIn,
      sourceAddress,
      destAddress,
      (route || 'TokenBridge') as 'TokenBridge'
    );
    
    return transfer;
  }

  /**
   * Get transfer quote
   */
  async getQuote(params: WormholeTransferParams): Promise<{
    sourceToken: { amount: string; symbol: string };
    destinationToken: { amount: string; symbol: string };
    fees: { relayFee?: string; gasFee?: string };
  }> {
    const transfer = await this.createTransfer(params);
    const wh = await this.initialize();
    const sourceChain = wh.getChain(params.sourceChain as any);
    const destinationChain = wh.getChain(params.destinationChain as any);
    
    const quote = await TokenTransfer.quoteTransfer(
      wh,
      sourceChain.chain,
      destinationChain.chain,
      transfer.transfer as any
    );
    
    return {
      sourceToken: {
        amount: quote.sourceToken.amount.toString(),
        symbol: (quote.sourceToken.token as any).symbol || 'TOKEN',
      },
      destinationToken: {
        amount: quote.destinationToken.amount.toString(),
        symbol: (quote.destinationToken.token as any).symbol || 'TOKEN',
      },
      fees: {
        relayFee: (quote as any).relayFee?.amount?.toString(),
        gasFee: (quote as any).gasFee?.amount?.toString(),
      },
    };
  }

  /**
   * Initiate transfer (returns transaction data for client-side signing)
   */
  async initiateTransfer(
    params: WormholeTransferParams,
    signer: any // Platform-specific signer
  ): Promise<{
    txHash: string;
    vaa?: string;
  }> {
    const transfer = await this.createTransfer(params);
    const txids = await transfer.initiateTransfer(signer);
    
    // txids can be an array of strings or objects with txid property
    const firstTx = txids[0];
    const secondTx = txids[1];
    
    return {
      txHash: typeof firstTx === 'string' ? firstTx : (firstTx as any)?.txid || '',
      vaa: typeof secondTx === 'string' ? secondTx : (secondTx as any)?.txid, // VAA transaction ID
    };
  }

  /**
   * Complete transfer on destination chain
   */
  async completeTransfer(
    params: WormholeTransferParams,
    signer: any,
    vaa?: string
  ): Promise<{
    txHash: string;
  }> {
    const transfer = await this.createTransfer(params);
    
    // If VAA provided, fetch it; otherwise wait for it
    if (vaa) {
      // Use provided VAA
    } else {
      await transfer.fetchAttestation(60000); // Wait up to 60 seconds
    }
    
    const txids = await transfer.completeTransfer(signer);
    
    // txids can be an array of strings or objects with txid property
    const firstTx = txids[0];
    
    return {
      txHash: typeof firstTx === 'string' ? firstTx : (firstTx as any)?.txid || '',
    };
  }
}

export const wormholeService = new WormholeService('Testnet');

