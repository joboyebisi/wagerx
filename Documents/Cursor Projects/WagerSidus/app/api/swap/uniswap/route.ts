import { NextRequest, NextResponse } from 'next/server';
// Dynamic import to avoid build-time errors with Uniswap V4 SDK
// import { uniswapV4Service } from '@/lib/services/uniswapV4';
import { ethers } from 'ethers';

/**
 * Uniswap V4 Swap API Route
 * 
 * Creates swap transaction data using Uniswap V4 SDK
 * User signs with their wallet (Privy handles this)
 */
export async function POST(request: NextRequest) {
  try {
    const { tokenIn, tokenOut, amount, chainId, slippageTolerance, recipient } = await request.json();

    if (!tokenIn || !tokenOut || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenIn, tokenOut, amount' },
        { status: 400 }
      );
    }

    // Uniswap V4 SDK has compatibility issues with ethers v6
    // Temporarily disabled - use alternative swap providers
    return NextResponse.json(
      { 
        success: false,
        error: 'Uniswap V4 integration temporarily unavailable due to SDK compatibility issues. Please use Wormhole or Circle CCTP for swaps.',
        alternatives: ['wormhole', 'circle-cctp', 'link-to-bnb']
      },
      { status: 503 }
    );

  } catch (error: any) {
    console.error('Uniswap V4 swap error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get swap quote' },
      { status: 500 }
    );
  }
}
