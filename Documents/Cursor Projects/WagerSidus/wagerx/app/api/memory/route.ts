import { NextRequest, NextResponse } from 'next/server';
import { memoryService } from '@/lib/services/memory';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, entry } = body;

    if (!address || !entry) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const memory = await memoryService.storeMemory(address, entry);
    return NextResponse.json(memory);
  } catch (error: any) {
    console.error('Error storing memory:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to store memory' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const type = searchParams.get('type');
    const participant = searchParams.get('participant');
    const chainId = searchParams.get('chainId');

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    const memories = await memoryService.getMemories(address, {
      type: type as any,
      participant: participant || undefined,
      chainId: chainId ? parseInt(chainId) : undefined,
    });

    return NextResponse.json(memories);
  } catch (error: any) {
    console.error('Error fetching memories:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch memories' },
      { status: 500 }
    );
  }
}

