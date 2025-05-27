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