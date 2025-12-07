import { NextRequest, NextResponse } from 'next/server';
import { memoryService } from '@/lib/services/memory';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    const wagers = await memoryService.getWagerHistory(address);
    return NextResponse.json(wagers);
  } catch (error: any) {
    console.error('Error fetching wagers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wagers' },
      { status: 500 }
    );
  }
}

