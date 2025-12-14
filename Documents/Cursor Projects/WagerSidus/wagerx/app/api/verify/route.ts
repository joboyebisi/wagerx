import { NextRequest, NextResponse } from 'next/server';
import { aiAgentService } from '@/lib/services/aiAgent';
import { memoryService } from '@/lib/services/memory';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wagerId, category, sportsData, cryptoData } = body;

    if (!wagerId) {
      return NextResponse.json(
        { error: 'Wager ID is required' },
        { status: 400 }
      );
    }

    // Get wager from memory
    const wagers = await memoryService.getWagerHistory(body.address || '', category);
    const wager = wagers.find((w) => w.id === wagerId);

    if (!wager) {
      return NextResponse.json(
        { error: 'Wager not found' },
        { status: 404 }
      );
    }

    // Verify using AI agent
    const verification = await aiAgentService.verifyWager({
      wagerId,
      wager,
      category,
      sportsData,
      cryptoData,
    });

    return NextResponse.json(verification);
  } catch (error: any) {
    console.error('Error verifying wager:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify wager' },
      { status: 500 }
    );
  }
}

