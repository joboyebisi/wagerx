import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

/**
 * Supabase-based wager storage using the new schema
 * This integrates with the production schema provided by the user
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      wagerId, // On-chain wager ID (BigInt as string)
      txHash,
      creatorAddress,
      creatorTelegramId, // Optional, can be derived
      participants,
      amount,
      condition,
      category,
      charityEnabled,
      charityPercentage,
      charityAddress,
      charityName,
      contractAddress,
    } = body;

    // Validate required fields
    if (!wagerId || !creatorAddress || !participants || !amount || !condition) {
      return NextResponse.json(
        { error: 'Missing required fields: wagerId, creatorAddress, participants, amount, condition' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Create or update user
    const { data: user } = await supabase
      .from('users')
      .upsert({
        wallet_address: creatorAddress,
        telegram_id: creatorTelegramId || `user_${creatorAddress.slice(0, 8)}`,
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
        charity_name: charityEnabled ? charityName : null,
        charity_wallet: charityEnabled ? charityAddress : null,
        contract_address: contractAddress || process.env.NEXT_PUBLIC_WAGER_CONTRACT_ADDRESS,
        wager_id_onchain: wagerId.toString(),
        tx_hash: txHash,
      })
      .select()
      .single();

    if (wagerError) {
      console.error('Error creating wager:', wagerError);
      return NextResponse.json(
        { error: wagerError.message || 'Failed to create wager' },
        { status: 500 }
      );
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
        // Don't fail the whole operation
      }
    }

    return NextResponse.json({
      success: true,
      wagerId: wager.id,
      onChainWagerId: wagerId.toString(),
      txHash: txHash || null,
      message: 'Wager stored successfully in Supabase',
    });
  } catch (error: any) {
    console.error('Error storing wager in Supabase:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to store wager' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const telegramId = searchParams.get('telegram_id');

    if (!address && !telegramId) {
      return NextResponse.json(
        { error: 'Address or telegram_id is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get wagers where user is creator (by wallet address)
    let wagers: any[] = [];
    
    if (address) {
      // First, get user's telegram_id from wallet address
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
    }

    if (telegramId) {
      const { data: telegramWagers, error: telegramError } = await supabase
        .from('wagers')
        .select(`
          *,
          participants (*)
        `)
        .eq('creator_telegram_id', telegramId);

      if (!telegramError && telegramWagers) {
        // Merge with existing wagers, avoiding duplicates
        telegramWagers.forEach((w: any) => {
          if (!wagers.some((existing: any) => existing.id === w.id)) {
            wagers.push(w);
          }
        });
      }
    }

    // Also get wagers where user is a participant (by wallet address)
    if (address) {
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
    }

    return NextResponse.json(wagers || []);
  } catch (error: any) {
    console.error('Error fetching wagers from Supabase:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wagers' },
      { status: 500 }
    );
  }
}

