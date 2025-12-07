/**
 * Direct PancakeSwap V3 Swap Implementation
 * Based on Membase BNB_CHAIN_SETTINGS
 * 
 * This allows direct token swaps without needing the PancakeSwap UI
 */

import { ethers } from 'ethers';

// BSC Testnet settings from Membase documentation
export const BSC_TESTNET_CONFIG = {
  RPC: 'https://bsc-testnet-rpc.publicnode.com',
  ChainId: 97,
  PancakeV3Factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
  PancakeV3SwapRouter: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
  PancakeV3PoolDeployer: '0x41ff9AA7e16B8B1a8a8dc4f0eFacd93D02d071c9',
  PancakeV3Quoter: '0xbC203d7f83677c7ed3F7acEc959963E7F4ECC5C2',
  WBNB: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // Wrapped BNB on testnet
  LINK_TOKEN: '0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06', // LINK on BSC Testnet
};

// PancakeSwap V3 Router ABI (simplified - just what we need)
const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)',
];

// ERC-20 ABI
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

/**
 * Get provider for BSC Testnet
 */
export function getBSCTestnetProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(BSC_TESTNET_CONFIG.RPC);
}

/**
 * Check LINK token balance
 */
export async function getLINKBalance(
  walletAddress: string,
  provider?: ethers.Provider
): Promise<string> {
  const prov = provider || getBSCTestnetProvider();
  const linkContract = new ethers.Contract(
    BSC_TESTNET_CONFIG.LINK_TOKEN,
    ERC20_ABI,
    prov
  );
  const balance = await linkContract.balanceOf(walletAddress);
  const decimals = await linkContract.decimals();
  return ethers.formatUnits(balance, decimals);
}

/**
 * Check BNB balance
 */
export async function getBNBBalance(
  walletAddress: string,
  provider?: ethers.Provider
): Promise<string> {
  const prov = provider || getBSCTestnetProvider();
  const balance = await prov.getBalance(walletAddress);
  return ethers.formatEther(balance);
}

/**
 * Approve LINK token for swap
 */
export async function approveLINKForSwap(
  amount: string,
  signer: ethers.Signer
): Promise<ethers.ContractTransactionResponse> {
  const linkContract = new ethers.Contract(
    BSC_TESTNET_CONFIG.LINK_TOKEN,
    ERC20_ABI,
    signer
  );
  
  const decimals = await linkContract.decimals();
  const amountWei = ethers.parseUnits(amount, decimals);
  
  // Approve router to spend LINK
  return linkContract.approve(BSC_TESTNET_CONFIG.PancakeV3SwapRouter, amountWei);
}

/**
 * Check if LINK is approved for swap
 */
export async function isLINKApproved(
  walletAddress: string,
  amount: string,
  provider?: ethers.Provider
): Promise<boolean> {
  const prov = provider || getBSCTestnetProvider();
  const linkContract = new ethers.Contract(
    BSC_TESTNET_CONFIG.LINK_TOKEN,
    ERC20_ABI,
    prov
  );
  
  const decimals = await linkContract.decimals();
  const amountWei = ethers.parseUnits(amount, decimals);
  const allowance = await linkContract.allowance(
    walletAddress,
    BSC_TESTNET_CONFIG.PancakeV3SwapRouter
  );
  
  return allowance >= amountWei;
}

/**
 * Swap LINK for BNB using PancakeSwap V3
 * 
 * Note: This requires:
 * 1. LINK tokens in wallet
 * 2. A tiny amount of BNB for gas (0.001-0.01 BNB)
 * 3. Proper approval of LINK token
 */
export async function swapLINKForBNB(
  linkAmount: string,
  minBNBOut: string,
  recipientAddress: string,
  signer: ethers.Signer,
  deadline?: number
): Promise<ethers.ContractTransactionResponse> {
  const router = new ethers.Contract(
    BSC_TESTNET_CONFIG.PancakeV3SwapRouter,
    SWAP_ROUTER_ABI,
    signer
  );
  
  const linkContract = new ethers.Contract(
    BSC_TESTNET_CONFIG.LINK_TOKEN,
    ERC20_ABI,
    signer
  );
  
  const decimals = await linkContract.decimals();
  const amountIn = ethers.parseUnits(linkAmount, decimals);
  const amountOutMinimum = ethers.parseEther(minBNBOut);
  
  // Set deadline (20 minutes from now if not provided)
  const deadlineTime = deadline || Math.floor(Date.now() / 1000) + 20 * 60;
  
  // Fee tier: 0.3% (3000) is common for major pairs
  // You might need to check which fee tier has liquidity
  const fee = 3000;
  
  // Build swap params
  const swapParams = {
    tokenIn: BSC_TESTNET_CONFIG.LINK_TOKEN,
    tokenOut: BSC_TESTNET_CONFIG.WBNB, // Swap to WBNB first, then unwrap
    fee: fee,
    recipient: recipientAddress,
    deadline: deadlineTime,
    amountIn: amountIn,
    amountOutMinimum: amountOutMinimum,
    sqrtPriceLimitX96: 0, // No price limit
  };
  
  // Execute swap
  return router.exactInputSingle(swapParams);
}

/**
 * Helper to get swap quote (estimate output)
 * Note: This is a simplified version. In production, use PancakeSwap Quoter contract
 */
export async function estimateBNBOutput(
  linkAmount: string,
  provider?: ethers.Provider
): Promise<{ estimatedBNB: string; priceImpact: number }> {
  // This is a placeholder - you'd need to call the Quoter contract
  // For now, return a rough estimate (1 LINK ≈ 0.01-0.02 BNB on testnet)
  const linkNum = parseFloat(linkAmount);
  const estimatedBNB = (linkNum * 0.015).toFixed(6); // Rough estimate
  
  return {
    estimatedBNB,
    priceImpact: 0.5, // Placeholder
  };
}

/**
 * Complete swap flow: Check balance, approve, swap
 */
export async function completeLINKToBNBSwap(
  linkAmount: string,
  walletAddress: string,
  signer: ethers.Signer
): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
}> {
  try {
    // 1. Check LINK balance
    const linkBalance = await getLINKBalance(walletAddress);
    if (parseFloat(linkBalance) < parseFloat(linkAmount)) {
      return {
        success: false,
        error: `Insufficient LINK balance. You have ${linkBalance} LINK, need ${linkAmount}`,
      };
    }
    
    // 2. Check BNB balance (need some for gas)
    const bnbBalance = await getBNBBalance(walletAddress);
    if (parseFloat(bnbBalance) < 0.001) {
      return {
        success: false,
        error: `Insufficient BNB for gas. You have ${bnbBalance} BNB, need at least 0.001 BNB`,
      };
    }
    
    // 3. Check/Approve LINK
    const isApproved = await isLINKApproved(walletAddress, linkAmount);
    if (!isApproved) {
      console.log('Approving LINK token...');
      const approveTx = await approveLINKForSwap(linkAmount, signer);
      await approveTx.wait();
      console.log('LINK approved!');
    }
    
    // 4. Get estimate
    const estimate = await estimateBNBOutput(linkAmount);
    const minBNBOut = (parseFloat(estimate.estimatedBNB) * 0.95).toFixed(6); // 5% slippage
    
    // 5. Execute swap
    console.log(`Swapping ${linkAmount} LINK for BNB...`);
    const swapTx = await swapLINKForBNB(
      linkAmount,
      minBNBOut,
      walletAddress,
      signer
    );
    
    const receipt = await swapTx.wait();
    
    if (!receipt) {
      return {
        success: false,
        error: 'Transaction receipt not available',
      };
    }
    
    return {
      success: true,
      txHash: receipt.hash,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Swap failed',
    };
  }
}

