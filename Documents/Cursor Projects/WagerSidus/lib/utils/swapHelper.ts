/**
 * Helper utilities for swapping tokens on BSC Testnet
 * Uses PancakeSwap V3 for token swaps
 */

import { ethers } from 'ethers';

// BSC Testnet addresses
export const BSC_TESTNET = {
  chainId: 97,
  rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  // PancakeSwap V3 Router (testnet)
  pancakeSwapRouter: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
  // LINK token on BSC Testnet
  LINK_TOKEN: '0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06',
  // WBNB (Wrapped BNB) on BSC Testnet
  WBNB: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
};

/**
 * Get token balance
 */
export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  provider: ethers.Provider
): Promise<string> {
  // ERC-20 balanceOf function
  const abi = ['function balanceOf(address) view returns (uint256)'];
  const tokenContract = new ethers.Contract(tokenAddress, abi, provider);
  const balance = await tokenContract.balanceOf(walletAddress);
  return ethers.formatEther(balance);
}

/**
 * Check if token is approved for spending
 */
export async function checkTokenApproval(
  tokenAddress: string,
  walletAddress: string,
  spenderAddress: string,
  provider: ethers.Provider
): Promise<boolean> {
  const abi = [
    'function allowance(address owner, address spender) view returns (uint256)',
  ];
  const tokenContract = new ethers.Contract(tokenAddress, abi, provider);
  const allowance = await tokenContract.allowance(walletAddress, spenderAddress);
  return allowance > 0n;
}

/**
 * Approve token for spending (needed before swap)
 */
export async function approveToken(
  tokenAddress: string,
  spenderAddress: string,
  amount: string,
  signer: ethers.Signer
): Promise<ethers.ContractTransactionResponse> {
  const abi = [
    'function approve(address spender, uint256 amount) returns (bool)',
  ];
  const tokenContract = new ethers.Contract(tokenAddress, abi, signer);
  const amountWei = ethers.parseEther(amount);
  return tokenContract.approve(spenderAddress, amountWei);
}

/**
 * Get swap quote from PancakeSwap (estimate)
 * Note: This is a simplified version. In production, you'd use PancakeSwap's SDK
 */
export async function getSwapQuote(
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  provider: ethers.Provider
): Promise<{ amountOut: string; priceImpact: number }> {
  // This is a placeholder. In production, you'd:
  // 1. Use PancakeSwap SDK to get quotes
  // 2. Or call PancakeSwap router contract directly
  // 3. Or use their API if available
  
  console.warn('getSwapQuote is a placeholder. Use PancakeSwap UI or SDK for actual quotes.');
  
  return {
    amountOut: '0', // Would be calculated from PancakeSwap
    priceImpact: 0, // Would be calculated from PancakeSwap
  };
}

/**
 * Helper to format token amounts for display
 */
export function formatTokenAmount(amount: string, decimals: number = 18): string {
  try {
    const formatted = ethers.formatUnits(amount, decimals);
    return parseFloat(formatted).toFixed(6);
  } catch {
    return '0';
  }
}

/**
 * Helper to parse token amounts for transactions
 */
export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  return ethers.parseUnits(amount, decimals);
}

