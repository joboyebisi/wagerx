import { NextRequest, NextResponse } from 'next/server';
import { memoryService } from '@/lib/services/memory';
import { WagerContract } from '@/lib/services/sidusAI';
import { WagerCategory } from '@/lib/services/verification';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const category = searchParams.get('category') as WagerCategory | null;

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Try Supabase first (primary storage)
    try {
      const supabaseResponse = await fetch(`${request.nextUrl.origin}/api/wagers/supabase?address=${encodeURIComponent(address)}`);
      if (supabaseResponse.ok) {
        const supabaseWagers = await supabaseResponse.json();
        if (Array.isArray(supabaseWagers) && supabaseWagers.length > 0) {
          // Transform Supabase format to expected format
          const transformedWagers = supabaseWagers.map((w: any) => ({
            id: w.id || w.wager_id_onchain || '0',
            condition: w.description || w.condition,
            amount: w.amount?.toString() || '0',
            status: w.status || 'pending',
            category: w.wager_type || category || 'sports',
            participants: w.participants?.map((p: any) => p.wallet_address || p) || [],
            createdAt: w.created_at || new Date().toISOString(),
            charityEnabled: w.charity_enabled || false,
            charityPercentage: w.charity_percentage || 0,
            charityAddress: w.charity_wallet,
            txHash: w.tx_hash,
            contractAddress: w.contract_address,
          }));
          return NextResponse.json(transformedWagers);
        }
        // If no wagers found in Supabase, return empty array
        return NextResponse.json([]);
      }
    } catch (supabaseError) {
      console.warn('Failed to fetch from Supabase, falling back to memory service:', supabaseError);
    }

    // Fallback to memory service
    const wagers = await memoryService.getWagerHistory(address, category || undefined);
    return NextResponse.json(wagers);
  } catch (error: any) {
    console.error('Error fetching wagers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wagers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      wagerId,
      txHash,
      creatorAddress,
      participants,
      amount,
      condition,
      category,
      charityEnabled,
      charityPercentage,
      charityAddress,
      contractAddress,
    } = body;

    // Validate required fields
    if (!wagerId || !creatorAddress || !participants || !amount || !condition) {
      return NextResponse.json(
        { error: 'Missing required fields: wagerId, creatorAddress, participants, amount, condition' },
        { status: 400 }
      );
    }

    // Validate participants array
    if (!Array.isArray(participants) || participants.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 participants are required' },
        { status: 400 }
      );
    }

    // Validate charity percentage if enabled
    if (charityEnabled && (charityPercentage < 0 || charityPercentage > 50)) {
      return NextResponse.json(
        { error: 'Charity percentage must be between 0 and 50' },
        { status: 400 }
      );
    }

    // Create wager object
    const wager: WagerContract = {
      id: wagerId.toString(),
      address: contractAddress || process.env.NEXT_PUBLIC_WAGER_CONTRACT_ADDRESS || '',
      participants: participants,
      amount: amount.toString(),
      condition: condition,
      status: 'pending',
      createdAt: new Date().toISOString(),
      charityEnabled: charityEnabled || false,
      charityPercentage: charityPercentage || 0,
      charityAddress: charityAddress || undefined,
    };

    // Store wager in Supabase (primary storage)
    try {
      const supabaseResponse = await fetch(`${request.nextUrl.origin}/api/wagers/supabase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wagerId,
          txHash,
          creatorAddress,
          participants,
          amount,
          condition,
          category,
          charityEnabled,
          charityPercentage,
          charityAddress,
          contractAddress,
        }),
      });

      if (supabaseResponse.ok) {
        const supabaseData = await supabaseResponse.json();
        console.log('Wager stored in Supabase:', supabaseData);
      }
    } catch (supabaseError) {
      console.warn('Failed to store in Supabase, using fallback:', supabaseError);
    }

    // Also store in memory service (fallback)
    try {
      const storePromises = participants.map((address: string) =>
        memoryService.storeWager(wager, address, category as WagerCategory | undefined)
      );
      await Promise.all(storePromises);
    } catch (memoryError) {
      console.warn('Failed to store in memory service:', memoryError);
    }

    return NextResponse.json({
      success: true,
      wagerId: wagerId.toString(),
      txHash: txHash || null,
      message: 'Wager stored successfully',
    });
  } catch (error: any) {
    console.error('Error storing wager:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to store wager' },
      { status: 500 }
    );
  }
}
