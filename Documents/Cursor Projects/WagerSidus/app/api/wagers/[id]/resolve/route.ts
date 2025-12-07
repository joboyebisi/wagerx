import { NextRequest, NextResponse } from 'next/server';
import { memoryService } from '@/lib/services/memory';
import { contractService } from '@/lib/services/contract';
import { ethers } from 'ethers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: wagerId } = await params;
    const body = await request.json();
    const { winnerAddress, txHash, evidence, charityDonation } = body;

    if (!winnerAddress || !txHash) {
      return NextResponse.json(
        { error: 'Winner address and transaction hash are required' },
        { status: 400 }
      );
    }

    // Get wager from contract to verify status
    const wagerIdBigInt = BigInt(wagerId);
    const wagerData = await contractService.getWager(wagerIdBigInt);

    // Verify winner is a participant
    const isParticipant = wagerData.participants.some(
      (addr) => addr.toLowerCase() === winnerAddress.toLowerCase()
    );

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Winner must be a participant' },
        { status: 400 }
      );
    }

    // Update wager status in memory for all participants
    const wager: any = {
      id: wagerId,
      address: process.env.NEXT_PUBLIC_WAGER_CONTRACT_ADDRESS || '',
      participants: wagerData.participants,
      amount: wagerData.amount.toString(),
      condition: wagerData.condition,
      status: 'resolved',
      winner: winnerAddress,
      createdAt: new Date(Number(wagerData.createdAt) * 1000).toISOString(),
      resolvedAt: new Date(Number(wagerData.resolvedAt) * 1000).toISOString(),
      charityEnabled: wagerData.charityEnabled,
      charityPercentage: wagerData.charityPercentage,
      charityAddress: wagerData.charityAddress,
      charityDonated: wagerData.charityDonated?.toString() || '0',
    };

    // Update for all participants
    const updatePromises = wagerData.participants.map((address: string) =>
      memoryService.storeWager(wager, address)
    );

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      wagerId: wagerId,
      txHash: txHash,
      winner: winnerAddress,
      charityDonation: charityDonation || null,
      message: 'Wager resolved successfully',
    });
  } catch (error: any) {
    console.error('Error resolving wager:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resolve wager' },
      { status: 500 }
    );
  }
}

