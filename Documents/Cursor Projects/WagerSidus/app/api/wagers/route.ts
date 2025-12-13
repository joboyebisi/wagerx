import { NextRequest, NextResponse } from 'next/server';
import { memoryService } from '@/lib/services/memory';
import { WagerContract } from '@/lib/services/sidusAI';
import { WagerCategory } from '@/lib/services/verification';
import { createServerClient } from '@/lib/supabase';

/**
 * Helper function to fetch wagers from Supabase directly
 * (Avoids internal HTTP calls which cause 404 errors)
 */
async function getWagersFromSupabase(address: string, category: string | null) {
  const supabase = createServerClient();
  let wagers: any[] = [];
  
  // Get user's telegram_id from wallet address
  const { data: user } = await supabase
    .from('users')
    .select('telegram_id')
    .eq('wallet_address', address)
    .single();

  // Get wagers where user is creator
  if (user?.telegram_id) {
    const { data: creatorWagers, error: creatorError } = await supabase
      .from('wagers')
      .select(`
        *,
        participants (*)
      `)
      .eq('creator_telegram_id', user.telegram_id);

    if (!creatorError && creatorWagers) {
      wagers = creatorWagers;
    }
  }

  // Also get wagers where user is a participant
  const { data: participantWagers, error: participantError } = await supabase
    .from('participants')
    .select(`
      wager_id,
      wagers (*)
    `)
    .eq('wallet_address', address);

  if (!participantError && participantWagers) {
    const additionalWagers = participantWagers
      .map((p: any) => p.wagers)
      .filter((w: any) => w && !wagers.some((existing: any) => existing.id === w.id));

    wagers.push(...additionalWagers);
  }

  // Transform Supabase format to expected format
  return wagers.map((w: any) => ({
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
}

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

    // Try Supabase first (primary storage) - direct function call, not HTTP
    try {
      const supabaseWagers = await getWagersFromSupabase(address, category);
      if (supabaseWagers.length > 0) {
        return NextResponse.json(supabaseWagers);
      }
      // If no wagers found in Supabase, return empty array
      return NextResponse.json([]);
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

    // Store wager in Supabase (primary storage) - direct function call, not HTTP
    try {
      const supabase = createServerClient();

      // Create or update user
      const { data: user } = await supabase
        .from('users')
        .upsert({
          wallet_address: creatorAddress,
          telegram_id: `user_${creatorAddress.slice(0, 8)}`,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'wallet_address',
        })
        .select()
        .single();

      // Create wager in Supabase
      const { data: wager, error: wagerError } = await supabase
        .from('wagers')
        .insert({
          creator_telegram_id: user?.telegram_id || `user_${creatorAddress.slice(0, 8)}`,
          description: condition,
          amount: parseFloat(amount),
          wager_type: category || 'sports',
          status: 'pending',
          charity_enabled: charityEnabled || false,
          charity_percentage: charityEnabled ? charityPercentage : null,
          charity_wallet: charityEnabled ? charityAddress : null,
          contract_address: contractAddress || process.env.NEXT_PUBLIC_WAGER_CONTRACT_ADDRESS,
          wager_id_onchain: wagerId.toString(),
          tx_hash: txHash,
        })
        .select()
        .single();

      if (wagerError) {
        throw wagerError;
      }

      // Create participants
      if (wager && participants.length > 0) {
        const participantInserts = participants.map((address: string, index: number) => ({
          wager_id: wager.id,
          telegram_id: `participant_${address.slice(0, 8)}`,
          wallet_address: address,
          funded: index === 0, // Creator is funded
        }));

        const { error: participantsError } = await supabase
          .from('participants')
          .insert(participantInserts);

        if (participantsError) {
          console.error('Error creating participants:', participantsError);
        }
      }

      console.log('Wager stored in Supabase:', { wagerId: wager.id, onChainWagerId: wagerId.toString() });
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
