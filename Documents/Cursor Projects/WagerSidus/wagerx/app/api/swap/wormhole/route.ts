import { NextRequest, NextResponse } from 'next/server';
import { wormholeService } from '@/lib/services/wormhole';

/**
 * Wormhole Cross-Chain Transfer API Route
 * 
 * Creates transfer transaction data using Wormhole SDK
 * User signs with their wallet (Privy handles this)
 */
export async function POST(request: NextRequest) {
  try {
    const { token, amount, sourceChain, destinationChain, recipient, route } = await request.json();

    if (!token || !amount || !sourceChain || !destinationChain) {
      return NextResponse.json(
        { error: 'Missing required fields: token, amount, sourceChain, destinationChain' },
        { status: 400 }
      );
    }

    // Get quote
    const quote = await wormholeService.getQuote({
      token,
      amount,
      sourceChain,
      destinationChain,
      recipient,
      route: route || 'TokenBridge',
    });

    return NextResponse.json({
      success: true,
      quote,
      message: 'Quote generated. Use initiateTransfer to start the transfer.',
    });
  } catch (error: any) {
    console.error('Wormhole transfer error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get transfer quote' },
      { status: 500 }
    );
  }
}
