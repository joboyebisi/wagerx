import { NextRequest, NextResponse } from 'next/server';
import { perplexityService } from '@/lib/services/perplexity';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const intent = await perplexityService.detectIntent(message, context);
    return NextResponse.json(intent);
  } catch (error: any) {
    console.error('Error detecting intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to detect intent' },
      { status: 500 }
    );
  }
}

