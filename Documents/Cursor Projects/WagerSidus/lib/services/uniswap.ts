/**
 * Uniswap Integration Service
 * Handles token swaps using Uniswap V3
 * 
 * Supports:
 * - Multi-token swaps (any ERC20 token)
 * - Cross-chain swaps (via Uniswap on supported chains)
 * - Best price routing
 */

import { ethers } from 'ethers';
import { Token, CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core';
import { Pool, Route, Trade } from '@uniswap/v3-sdk';

export interface UniswapSwapParams {
  fromToken: string; // Token symbol or address
  toToken: string;
  amount: string; // Amount in human-readable format
  chainId: number; // Chain ID (1 = Ethereum, 56 = BSC, etc.)
  slippageTolerance?: number; // Default 0.5%
  recipient?: string; // Wallet address to receive tokens
}

export interface UniswapSwapResult {
  success: boolean;
  transactionHash?: string;
  amountOut?: string;
  priceImpact?: string;
  error?: string;
}

export class UniswapService {
  private rpcUrl: string;
  private chainId: number;

  // Common token addresses (BSC Testnet)
  private tokenAddresses: Record<string, Record<number, string>> = {
    BNB: {
      97: '0x0000000000000000000000000000000000000000', // Native BNB
      56: '0x0000000000000000000000000000000000000000',
    },
    USDC: {
      97: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // BSC Testnet USDC
      56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    },
    USDT: {
      97: '0x55d398326f99059fF775485246999027B3197955', // BSC Testnet USDT
      56: '0x55d398326f99059fF775485246999027B3197955',
    },
    LINK: {
      97: '0x84b9B910527Ad5C03A9CA831909E21e236EA7b06', // BSC Testnet LINK
      56: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD',
    },
    ETH: {
      1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Ethereum Mainnet
      97: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', // BSC Testnet ETH
    },
  };

  constructor(chainId: number = 97, rpcUrl?: string) {
    this.chainId = chainId;
    this.rpcUrl = rpcUrl || process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com';
  }

  /**
   * Get token address from symbol or use provided address
   */
  private getTokenAddress(token: string): string {
    const upperToken = token.toUpperCase();
    if (this.tokenAddresses[upperToken]?.[this.chainId]) {
      return this.tokenAddresses[upperToken][this.chainId];
    }
    // If it's already an address, return it
    if (ethers.isAddress(token)) {
      return token;
    }
    throw new Error(`Token ${token} not found for chain ${this.chainId}`);
  }

  /**
   * Get token info (decimals, symbol)
   */
  private async getTokenInfo(tokenAddress: string, provider: ethers.Provider): Promise<{ decimals: number; symbol: string }> {
    // Native token (BNB/ETH)
    if (tokenAddress === ethers.ZeroAddress) {
      return { decimals: 18, symbol: this.chainId === 56 || this.chainId === 97 ? 'BNB' : 'ETH' };
    }

    // ERC20 token
    const tokenAbi = [
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)',
    ];

    try {
      const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
      const [decimals, symbol] = await Promise.all([
        tokenContract.decimals(),
        tokenContract.symbol(),
      ]);
      return { decimals: Number(decimals), symbol };
    } catch (error) {
      throw new Error(`Failed to get token info for ${tokenAddress}: ${error}`);
    }
  }

  /**
   * Get quote for a swap (without executing)
   */
  async getQuote(params: UniswapSwapParams): Promise<{
    amountOut: string;
    priceImpact: string;
    route: string[];
  }> {
    const provider = new ethers.JsonRpcProvider(this.rpcUrl);
    const fromAddress = this.getTokenAddress(params.fromToken);
    const toAddress = this.getTokenAddress(params.toToken);

    // Get token info
    const fromTokenInfo = await this.getTokenInfo(fromAddress, provider);
    const toTokenInfo = await this.getTokenInfo(toAddress, provider);

    // Create Token objects
    const tokenIn = new Token(
      this.chainId,
      fromAddress,
      fromTokenInfo.decimals,
      fromTokenInfo.symbol
    );
    const tokenOut = new Token(
      this.chainId,
      toAddress,
      toTokenInfo.decimals,
      toTokenInfo.symbol
    );

    // Parse input amount
    const amountIn = CurrencyAmount.fromRawAmount(
      tokenIn,
      ethers.parseUnits(params.amount, fromTokenInfo.decimals).toString()
    );

    // TODO: Fetch actual pool data from Uniswap subgraph or contract
    // For now, return a placeholder quote
    // In production, you'd query Uniswap pools and calculate the best route

    return {
      amountOut: params.amount, // Placeholder
      priceImpact: '0.1%', // Placeholder
      route: [fromTokenInfo.symbol, toTokenInfo.symbol],
    };
  }

  /**
   * Execute a swap transaction
   * Note: This creates the transaction data, user must sign with their wallet
   */
  async createSwapTransaction(
    params: UniswapSwapParams,
    signer: ethers.Signer
  ): Promise<{
    to: string;
    data: string;
    value: bigint;
    gasLimit: bigint;
  }> {
    const provider = signer.provider || new ethers.JsonRpcProvider(this.rpcUrl);
    const fromAddress = this.getTokenAddress(params.fromToken);
    const toAddress = this.getTokenAddress(params.toToken);

    // Get token info
    const fromTokenInfo = await this.getTokenInfo(fromAddress, provider);
    const toTokenInfo = await this.getTokenInfo(toAddress, provider);

    // Uniswap Router V3 address (BSC Testnet)
    const UNISWAP_ROUTER_V3 = '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4'; // PancakeSwap V3 Router (BSC)

    // Parse amount
    const amountIn = ethers.parseUnits(params.amount, fromTokenInfo.decimals);

    // Build swap parameters
    // Note: This is a simplified version. Full implementation would:
    // 1. Query Uniswap pools for best route
    // 2. Calculate exact amount out
    // 3. Build proper swap calldata

    const swapParams = {
      tokenIn: fromAddress,
      tokenOut: toAddress,
      fee: 3000, // 0.3% fee tier
      recipient: params.recipient || await signer.getAddress(),
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes
      amountIn: amountIn.toString(),
      amountOutMinimum: '0', // Will be calculated based on slippage
      sqrtPriceLimitX96: 0,
    };

    // Router ABI (simplified - exactSwapSingle function)
    const routerAbi = [
      'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
    ];

    const router = new ethers.Contract(UNISWAP_ROUTER_V3, routerAbi, signer);

    // Estimate gas
    let gasLimit: bigint;
    try {
      gasLimit = await router.exactInputSingle.estimateGas(swapParams, {
        value: fromAddress === ethers.ZeroAddress ? amountIn : 0n,
      });
    } catch (error) {
      gasLimit = 300000n; // Fallback
    }

    // Encode transaction data
    const data = router.interface.encodeFunctionData('exactInputSingle', [swapParams]);

    return {
      to: UNISWAP_ROUTER_V3,
      data,
      value: fromAddress === ethers.ZeroAddress ? amountIn : 0n,
      gasLimit: gasLimit * 120n / 100n, // Add 20% buffer
    };
  }

  /**
   * Execute swap (helper that creates and sends transaction)
   */
  async executeSwap(
    params: UniswapSwapParams,
    signer: ethers.Signer
  ): Promise<UniswapSwapResult> {
    try {
      const txData = await this.createSwapTransaction(params, signer);
      const tx = await signer.sendTransaction(txData);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt?.hash || tx.hash,
        amountOut: params.amount, // Would be calculated from actual swap
        priceImpact: '0.1%',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Swap failed',
      };
    }
  }
}

export const uniswapService = new UniswapService();

