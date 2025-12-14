/**
 * Meta-Transaction API Route
 * 
 * Receives signed messages from users and submits transactions as relayer
 * Relayer pays gas, users pay $0!
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { contractService } from '@/lib/services/contract';
import { MetaTransactionService, MetaWagerParams } from '@/lib/services/metaTransaction';

// In-memory nonce store (use Redis/database in production)
const nonceStore = new Map<string, number>();

function getNextNonce(userAddress: string): number {
  const current = nonceStore.get(userAddress) || 0;
  const next = current + 1;
  nonceStore.set(userAddress, next);
  return next;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      signature,
      userAddress,
      participants,
      amount,
      condition,
      charityEnabled,
      charityPercentage,
      charityAddress,
      nonce,
    } = body;

    // Validate required fields
    if (!signature || !userAddress || !participants || !amount || !condition) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if relayer private key is configured
    const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerPrivateKey) {
      return NextResponse.json(
        { error: 'Relayer not configured. Please set RELAYER_PRIVATE_KEY in environment variables.' },
        { status: 500 }
      );
    }

    // Verify signature
    const metaService = new MetaTransactionService(
      process.env.NEXT_PUBLIC_WAGER_CONTRACT_ADDRESS || '',
      parseInt(process.env.NEXT_PUBLIC_BNB_CHAIN_ID || '97')
    );

    const params: MetaWagerParams = {
      userAddress,
      participants,
      amount,
      condition,
      charityEnabled,
      charityPercentage,
      charityAddress,
      nonce: nonce || getNextNonce(userAddress),
    };

    const isValid = await metaService.verify(signature, params);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Create relayer signer (relayer pays gas)
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const relayerSigner = new ethers.Wallet(relayerPrivateKey, provider);

    // Check relayer has enough balance for gas
    const relayerBalance = await provider.getBalance(relayerSigner.address);
    const minBalance = ethers.parseEther('0.001'); // Minimum for gas
    if (relayerBalance < minBalance) {
      return NextResponse.json(
        { error: 'Relayer has insufficient funds for gas. Please fund the relayer wallet.' },
        { status: 503 }
      );
    }

    // Submit transaction as relayer (relayer pays gas!)
    try {
      const result = await contractService.createWager(
        {
          participants,
          amount,
          condition,
          charityEnabled,
          charityPercentage,
          charityAddress,
        },
        relayerSigner // Relayer signer pays gas
      );

      return NextResponse.json({
        success: true,
        txHash: result.txHash,
        wagerId: result.wagerId.toString(),
        message: 'Wager created! Relayer paid gas fees.',
      });
    } catch (error: any) {
      console.error('Relayer transaction failed:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to submit transaction' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Meta-transaction error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

