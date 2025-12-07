import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import {
  completeLINKToBNBSwap,
  getLINKBalance,
  getBNBBalance,
  BSC_TESTNET_CONFIG,
} from '@/lib/utils/directSwap';

/**
 * API route to swap LINK tokens for BNB
 * 
 * This requires:
 * 1. User's wallet to be connected (via Privy)
 * 2. User to have LINK tokens
 * 3. User to have at least 0.001 BNB for gas
 * 
 * Note: In production, you'd want to use Privy's sendTransaction
 * to have the user sign the transaction in their wallet.
 */
export async function POST(request: NextRequest) {
  try {
    const { amount, walletAddress } = await request.json();

    if (!amount || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing amount or walletAddress' },
        { status: 400 }
      );
    }

    // Validate amount
    const linkAmount = parseFloat(amount);
    if (isNaN(linkAmount) || linkAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Check if user has private key (for server-side signing)
    // In production, you'd use Privy's sendTransaction instead
    const privateKey = process.env.PRIVATE_KEY;
    
    if (!privateKey) {
      return NextResponse.json(
        {
          error: 'Server configuration error. This swap requires client-side signing.',
          suggestion: 'Use the swap script instead: npx ts-node scripts/swap-link-to-bnb.ts',
        },
        { status: 500 }
      );
    }

    // Create provider and signer
    const provider = new ethers.JsonRpcProvider(BSC_TESTNET_CONFIG.RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    // Verify the wallet address matches (security check)
    if (signer.address.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Wallet address mismatch. Use the swap script with your own private key.' },
        { status: 403 }
      );
    }

    // Check balances
    const linkBalance = await getLINKBalance(walletAddress, provider);
    const bnbBalance = await getBNBBalance(walletAddress, provider);

    if (parseFloat(linkBalance) < linkAmount) {
      return NextResponse.json(
        {
          error: `Insufficient LINK balance. You have ${linkBalance} LINK, need ${amount}`,
        },
        { status: 400 }
      );
    }

    if (parseFloat(bnbBalance) < 0.001) {
      return NextResponse.json(
        {
          error: `Insufficient BNB for gas. You have ${bnbBalance} BNB, need at least 0.001 BNB`,
          suggestion: 'Get a tiny amount from a faucet first',
        },
        { status: 400 }
      );
    }

    // Execute swap
    const result = await completeLINKToBNBSwap(amount, walletAddress, signer);

    if (result.success) {
      return NextResponse.json({
        success: true,
        txHash: result.txHash,
        message: `Successfully swapped ${amount} LINK for BNB`,
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Swap failed' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Swap API error:', error);
    return NextResponse.json(
      { error: error.message || 'Swap failed' },
      { status: 500 }
    );
  }
}

/**
 * Get current balances
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Missing wallet address' },
        { status: 400 }
      );
    }

    const provider = new ethers.JsonRpcProvider(BSC_TESTNET_CONFIG.RPC);
    const linkBalance = await getLINKBalance(walletAddress, provider);
    const bnbBalance = await getBNBBalance(walletAddress, provider);

    return NextResponse.json({
      linkBalance,
      bnbBalance,
    });
  } catch (error: any) {
    console.error('Balance check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check balances' },
      { status: 500 }
    );
  }
}

