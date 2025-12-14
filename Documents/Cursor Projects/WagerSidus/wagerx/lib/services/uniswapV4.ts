/**
 * Uniswap V4 SDK Integration Service
 * Uses @uniswap/v4-sdk, @uniswap/sdk-core, and @uniswap/universal-router-sdk
 * 
 * Supports:
 * - Single-hop swaps
 * - Multi-hop swaps
 * - Exact input/output swaps
 * - Slippage protection
 */

import { ethers } from 'ethers';
// Note: Uniswap V4 SDK has compatibility issues with ethers v6
// All Uniswap V4 SDK imports are done dynamically at runtime to avoid build errors

export interface UniswapV4SwapParams {
  tokenIn: string; // Token address or symbol
  tokenOut: string;
  amount: string; // Human-readable amount
  chainId: number; // Chain ID (1 = Ethereum, 56 = BSC, etc.)
  slippageTolerance?: number; // Percentage (default 0.5%)
  recipient?: string;
  deadline?: number; // Unix timestamp (default: 1 hour from now)
}

export interface UniswapV4SwapResult {
  success: boolean;
  transactionHash?: string;
  amountOut?: string;
  priceImpact?: string;
  error?: string;
}

export interface PoolConfig {
  currency0: string;
  currency1: string;
  fee: number; // Fee tier in basis points (e.g., 500 = 0.05%)
  tickSpacing: number;
  hooks?: string; // Hook contract address (default: zero address)
}

// Common token addresses (BSC Testnet)
const TOKEN_ADDRESSES: Record<string, Record<number, { address: string; decimals: number; symbol: string }>> = {
  BNB: {
    97: { address: '0x0000000000000000000000000000000000000000', decimals: 18, symbol: 'BNB' },
    56: { address: '0x0000000000000000000000000000000000000000', decimals: 18, symbol: 'BNB' },
  },
  USDC: {
    97: { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, symbol: 'USDC' },
    56: { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, symbol: 'USDC' },
  },
  USDT: {
    97: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, symbol: 'USDT' },
    56: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, symbol: 'USDT' },
  },
  LINK: {
    97: { address: '0x84b9B910527Ad5C03A9CA831909E21e236EA7b06', decimals: 18, symbol: 'LINK' },
    56: { address: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD', decimals: 18, symbol: 'LINK' },
  },
};

// Universal Router addresses by chain
const UNIVERSAL_ROUTER_ADDRESSES: Record<number, string> = {
  1: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', // Ethereum Mainnet
  56: '0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af', // BSC Mainnet
  97: '0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af', // BSC Testnet (placeholder)
};

// Permit2 address (same across chains)
const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

export class UniswapV4Service {
  private chainId: number;
  private rpcUrl: string;
  private provider: ethers.Provider;

  constructor(chainId: number = 97, rpcUrl?: string) {
    this.chainId = chainId;
    this.rpcUrl = rpcUrl || process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com';
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
  }

  /**
   * Get token info from address or symbol
   */
  private getTokenInfo(token: string): { address: string; decimals: number; symbol: string } {
    const upperToken = token.toUpperCase();
    
    // Check if it's a known token
    if (TOKEN_ADDRESSES[upperToken]?.[this.chainId]) {
      return TOKEN_ADDRESSES[upperToken][this.chainId];
    }
    
    // If it's already an address, we need to fetch decimals
    if (ethers.isAddress(token)) {
      // For now, assume 18 decimals (you'd fetch this from chain)
      return { address: token, decimals: 18, symbol: 'UNKNOWN' };
    }
    
    throw new Error(`Token ${token} not found for chain ${this.chainId}`);
  }

  /**
   * Find pool configuration for token pair
   * In production, you'd query Uniswap subgraph or use a pool finder service
   */
  private async findPool(tokenIn: string, tokenOut: string): Promise<PoolConfig> {
    // For now, return a default pool config
    // In production, you'd query available pools and select the best one
    const tokenInInfo = this.getTokenInfo(tokenIn);
    const tokenOutInfo = this.getTokenInfo(tokenOut);
    
    // Default to 0.05% fee tier (500 basis points)
    return {
      currency0: tokenInInfo.address.toLowerCase() < tokenOutInfo.address.toLowerCase() 
        ? tokenInInfo.address 
        : tokenOutInfo.address,
      currency1: tokenInInfo.address.toLowerCase() < tokenOutInfo.address.toLowerCase()
        ? tokenOutInfo.address
        : tokenInInfo.address,
      fee: 500, // 0.05%
      tickSpacing: 10,
      hooks: ethers.ZeroAddress,
    };
  }

  /**
   * Get quote for a swap (using Quoter contract)
   */
  async getQuote(params: UniswapV4SwapParams): Promise<{
    amountOut: string;
    priceImpact: string;
    poolKey: any; // Changed from PoolKey to any to avoid type issues
  }> {
    const tokenInInfo = this.getTokenInfo(params.tokenIn);
    const tokenOutInfo = this.getTokenInfo(params.tokenOut);
    const amountIn = ethers.parseUnits(params.amount, tokenInInfo.decimals);
    
    // Find pool
    const poolConfig = await this.findPool(params.tokenIn, params.tokenOut);
    const poolKey: any = { // Using any to avoid Uniswap V4 SDK type issues
      currency0: poolConfig.currency0,
      currency1: poolConfig.currency1,
      fee: poolConfig.fee,
      tickSpacing: poolConfig.tickSpacing,
      hooks: poolConfig.hooks || ethers.ZeroAddress,
    };

    // Determine swap direction
    const zeroForOne = poolConfig.currency0.toLowerCase() === tokenInInfo.address.toLowerCase();

    // In production, you'd call the Quoter contract here
    // For now, return a placeholder quote
    // TODO: Implement actual Quoter contract call
    
    return {
      amountOut: params.amount, // Placeholder
      priceImpact: '0.1%', // Placeholder
      poolKey,
    };
  }

  /**
   * Create swap transaction data for client-side signing
   * NOTE: Uniswap V4 SDK has compatibility issues with ethers v6
   * This method is temporarily disabled - use alternative swap providers
   */
  async createSwapTransaction(
    params: UniswapV4SwapParams,
    signer: ethers.Signer
  ): Promise<{
    to: string;
    data: string;
    value: bigint;
    gasLimit: bigint;
  }> {
    // Uniswap V4 SDK has compatibility issues with ethers v6
    // Temporarily disabled until SDK is updated
    throw new Error(
      'Uniswap V4 integration temporarily unavailable due to SDK compatibility issues with ethers v6. ' +
      'Please use Wormhole or Circle CCTP for token swaps.'
    );
  }

  /**
   * Check and handle token approvals (Permit2)
   */
  async ensureApprovals(
    tokenAddress: string,
    amount: bigint,
    signer: ethers.Signer
  ): Promise<{ needsERC20Approval: boolean; needsPermit2Approval: boolean }> {
    if (tokenAddress === ethers.ZeroAddress) {
      // Native token, no approval needed
      return { needsERC20Approval: false, needsPermit2Approval: false };
    }

    const userAddress = await signer.getAddress();
    const universalRouterAddress = UNIVERSAL_ROUTER_ADDRESSES[this.chainId];
    
    // Check ERC20 allowance
    const erc20ABI = ['function allowance(address owner, address spender) view returns (uint256)'];
    const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, this.provider);
    const erc20Allowance = await tokenContract.allowance(userAddress, PERMIT2_ADDRESS);
    
    // Check Permit2 allowance
    const permit2ABI = [
      'function allowance(address owner, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)',
    ];
    const permit2Contract = new ethers.Contract(PERMIT2_ADDRESS, permit2ABI, this.provider);
    const permit2Allowance = await permit2Contract.allowance(userAddress, tokenAddress, universalRouterAddress);
    
    return {
      needsERC20Approval: erc20Allowance < amount,
      needsPermit2Approval: permit2Allowance.amount === 0n || permit2Allowance.expiration < Math.floor(Date.now() / 1000),
    };
  }
}

export const uniswapV4Service = new UniswapV4Service();

