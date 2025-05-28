import { OKXDexClient } from '@okx-dex/okx-dex-sdk';
import { Keypair, Connection } from '@solana/web3.js';
import bs58 from 'bs58';
import { KeypairWallet } from './KeypairWallet';
import 'dotenv/config';

// Validate environment variables
const requiredEnvVars = [
    'OKX_API_KEY',
    'OKX_SECRET_KEY',
    'OKX_API_PASSPHRASE',
    'OKX_PROJECT_ID',
    'SOLANA_PRIVATE_KEY',
    'SOLANA_RPC_URL'
];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}

// Create a Solana Keypair from the base58-encoded private key
const keypair = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_PRIVATE_KEY!));
const connection = new Connection(process.env.SOLANA_RPC_URL!);
const wallet = new KeypairWallet(keypair, connection);
export { wallet };

export const client = new OKXDexClient({
    apiKey: process.env.OKX_API_KEY!,
    secretKey: process.env.OKX_SECRET_KEY!,
    apiPassphrase: process.env.OKX_API_PASSPHRASE!,
    projectId: process.env.OKX_PROJECT_ID!,
    solana: {
        wallet,
        computeUnits: 300000,
        maxRetries: 3
    }
});

// Devnet addresses
const SOL_DEVNET_ADDRESS = 'So11111111111111111111111111111111111111112';
const USDC_DEVNET_ADDRESS = 'BXXkv6zrcK6rP6JrWcGLA7eGBhD5m6BzZr8b8PZQbWvb';

/**
 * Fetch the latest SOL/USDC price from OKX DEX API (devnet)
 * Returns the price of 1 SOL in USDC
 */
export async function fetchSolToUsdcPriceOKX() {
  const url = 'https://web3.okx.com/api/v5/dex/market/price';
  const body = [
    {
      chainIndex: '66', // Solana
      tokenContractAddress: SOL_DEVNET_ADDRESS
    }
  ];
  const headers = {
    'Content-Type': 'application/json',
    'OK-ACCESS-KEY': process.env.OKX_API_KEY!,
    'OK-ACCESS-SIGN': '', // If required, add signature logic
    'OK-ACCESS-PASSPHRASE': process.env.OKX_API_PASSPHRASE!,
    'OK-ACCESS-TIMESTAMP': new Date().toISOString()
  };
  // For MVP, skip signature if not required by endpoint
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data && data.data && data.data[0] && data.data[0].price) {
    return parseFloat(data.data[0].price);
  }
  throw new Error('Failed to fetch SOL/USDC price from OKX');
}