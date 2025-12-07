import { NextRequest, NextResponse } from 'next/server';
import { memoryService } from '@/lib/services/memory';
import { contractService } from '@/lib/services/contract';
import { ethers } from 'ethers';

/**
 * Sync wager status from on-chain contract to database
 * This endpoint can be called periodically or after transactions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: wagerId } = await params;
    const wagerIdBigInt = BigInt(wagerId);

    // Get latest wager data from contract
    const wagerData = await contractService.getWager(wagerIdBigInt);

    // Map contract status to string status
    const statusMap: Record<number, string> = {
      0: 'pending',
      1: 'active',
      2: 'resolved',
      3: 'cancelled',
    };

    const status = statusMap[wagerData.status] || 'pending';

    // Create wager object
    const wager: any = {
      id: wagerId,
      address: process.env.NEXT_PUBLIC_WAGER_CONTRACT_ADDRESS || '',
      participants: wagerData.participants,
      amount: wagerData.amount.toString(),
      condition: wagerData.condition,
      status: status,
      createdAt: new Date(Number(wagerData.createdAt) * 1000).toISOString(),
      charityEnabled: wagerData.charityEnabled,
      charityPercentage: wagerData.charityPercentage,
      charityAddress: wagerData.charityAddress,
      charityDonated: wagerData.charityDonated?.toString() || '0',
    };

    if (wagerData.winner && wagerData.winner !== ethers.ZeroAddress) {
      wager.winner = wagerData.winner;
    }

    if (wagerData.resolvedAt > 0) {
      wager.resolvedAt = new Date(Number(wagerData.resolvedAt) * 1000).toISOString();
    }

    // Update for all participants
    const updatePromises = wagerData.participants.map((address: string) =>
      memoryService.storeWager(wager, address)
    );

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      wagerId: wagerId,
      status: status,
      syncedAt: new Date().toISOString(),
      message: 'Wager status synced successfully',
    });
  } catch (error: any) {
    console.error('Error syncing wager:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync wager' },
      { status: 500 }
    );
  }
}

