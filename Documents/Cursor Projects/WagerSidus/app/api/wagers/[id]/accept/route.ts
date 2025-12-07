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
    const { participantAddress, txHash } = body;

    if (!participantAddress) {
      return NextResponse.json(
        { error: 'Participant address is required' },
        { status: 400 }
      );
    }

    if (!txHash) {
      return NextResponse.json(
        { error: 'Transaction hash is required' },
        { status: 400 }
      );
    }

    // Get wager from contract to verify status
    const wagerIdBigInt = BigInt(wagerId);
    const wagerData = await contractService.getWager(wagerIdBigInt);

    // Update wager status in memory for all participants
    const wager: any = {
      id: wagerId,
      address: process.env.NEXT_PUBLIC_WAGER_CONTRACT_ADDRESS || '',
      participants: wagerData.participants,
      amount: wagerData.amount.toString(),
      condition: wagerData.condition,
      status: wagerData.status === 1 ? 'active' : 'pending',
      createdAt: new Date(Number(wagerData.createdAt) * 1000).toISOString(),
      charityEnabled: wagerData.charityEnabled,
      charityPercentage: wagerData.charityPercentage,
      charityAddress: wagerData.charityAddress,
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
      status: wager.status,
      message: 'Wager accepted successfully',
    });
  } catch (error: any) {
    console.error('Error accepting wager:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to accept wager' },
      { status: 500 }
    );
  }
}

