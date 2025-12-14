import { NextRequest, NextResponse } from 'next/server';
import { charityService } from '@/lib/services/charity';

export async function GET(request: NextRequest) {
  try {
    const charities = charityService.getPopularCharities();
    return NextResponse.json(charities);
  } catch (error: any) {
    console.error('Error fetching charities:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch charities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wager, totalWinnings } = body;

    if (!wager || !totalWinnings) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const donation = charityService.calculateDonation(wager, totalWinnings);

    if (!donation) {
      return NextResponse.json(
        { error: 'Charity not enabled for this wager' },
        { status: 400 }
      );
    }

    return NextResponse.json(donation);
  } catch (error: any) {
    console.error('Error calculating donation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate donation' },
      { status: 500 }
    );
  }
}

