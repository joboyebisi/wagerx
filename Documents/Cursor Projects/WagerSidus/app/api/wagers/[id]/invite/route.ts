import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

/**
 * Invite participants to an existing wager
 * Supports:
 * - Telegram usernames/IDs
 * - Wallet addresses
 * - Shareable invite links
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { participants, inviteType } = await request.json();
    const { id: wagerId } = await params;

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: 'Participants array is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get existing wager
    const { data: wager, error: wagerError } = await supabase
      .from('wagers')
      .select('*')
      .eq('id', wagerId)
      .single();

    if (wagerError || !wager) {
      return NextResponse.json(
        { error: 'Wager not found' },
        { status: 404 }
      );
    }

    // Check if wager is still pending (can add participants)
    if (wager.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot add participants to a wager that is not pending' },
        { status: 400 }
      );
    }

    // Process participants based on type
    const participantInserts = [];
    
    for (const participant of participants) {
      let telegramId: string | null = null;
      let walletAddress: string | null = null;

      // Check if it's a wallet address
      if (participant.startsWith('0x') && participant.length === 42) {
        walletAddress = participant;
        // Try to find Telegram ID from users table
        const { data: user } = await supabase
          .from('users')
          .select('telegram_id')
          .eq('wallet_address', participant)
          .single();
        telegramId = user?.telegram_id || null;
      } 
      // Check if it's a Telegram username (starts with @)
      else if (participant.startsWith('@')) {
        const username = participant.substring(1);
        const { data: user } = await supabase
          .from('users')
          .select('telegram_id, wallet_address')
          .eq('username', username)
          .single();
        telegramId = user?.telegram_id || null;
        walletAddress = user?.wallet_address || null;
      }
      // Check if it's a Telegram ID (numeric)
      else if (/^\d+$/.test(participant)) {
        telegramId = participant;
        const { data: user } = await supabase
          .from('users')
          .select('wallet_address')
          .eq('telegram_id', participant)
          .single();
        walletAddress = user?.wallet_address || null;
      } else {
        // Invalid format
        continue;
      }

      // Check if participant already exists
      const { data: existing } = await supabase
        .from('participants')
        .select('id')
        .eq('wager_id', wagerId)
        .or(`telegram_id.eq.${telegramId},wallet_address.eq.${walletAddress}`)
        .single();

      if (!existing) {
        participantInserts.push({
          wager_id: wagerId,
          telegram_id: telegramId || `pending_${Date.now()}`,
          wallet_address: walletAddress,
          funded: false,
        });
      }
    }

    if (participantInserts.length === 0) {
      return NextResponse.json(
        { error: 'No new participants to add', added: 0 },
        { status: 400 }
      );
    }

    // Insert new participants
    const { error: insertError } = await supabase
      .from('participants')
      .insert(participantInserts);

    if (insertError) {
      console.error('Error adding participants:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Failed to add participants' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      added: participantInserts.length,
      message: `Successfully added ${participantInserts.length} participant(s) to wager`,
    });
  } catch (error: any) {
    console.error('Error in invite route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to invite participants' },
      { status: 500 }
    );
  }
}

