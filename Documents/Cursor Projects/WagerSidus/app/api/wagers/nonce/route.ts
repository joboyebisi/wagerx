/**
 * Nonce API - Simple nonce management for meta-transactions
 * In production, use a database or Redis
 */

import { NextRequest, NextResponse } from 'next/server';

// In-memory store (use database in production)
const nonceStore = new Map<string, number>();

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  
  if (!address) {
    return NextResponse.json(
      { error: 'Address required' },
      { status: 400 }
    );
  }

  const nonce = nonceStore.get(address.toLowerCase()) || 0;
  
  return NextResponse.json({ nonce });
}

export async function POST(request: NextRequest) {
  const { address, nonce } = await request.json();
  
  if (!address || typeof nonce !== 'number') {
    return NextResponse.json(
      { error: 'Address and nonce required' },
      { status: 400 }
    );
  }

  nonceStore.set(address.toLowerCase(), nonce);
  
  return NextResponse.json({ success: true });
}

