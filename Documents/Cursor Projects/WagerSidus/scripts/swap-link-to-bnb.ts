/**
 * Script to swap LINK tokens for BNB on BSC Testnet
 * 
 * Usage:
 * 1. Make sure you have LINK tokens in your wallet
 * 2. Make sure you have at least 0.001 BNB for gas
 * 3. Set your private key in .env.local (NEVER commit this!)
 * 4. Run: npx ts-node scripts/swap-link-to-bnb.ts
 */

import { ethers } from 'ethers';
import { completeLINKToBNBSwap, getLINKBalance, getBNBBalance } from '../lib/utils/directSwap';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
  // Get private key from environment
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ Error: PRIVATE_KEY not found in .env.local');
    console.log('Please add your private key to .env.local:');
    console.log('PRIVATE_KEY=your_private_key_here');
    process.exit(1);
  }
  
  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider('https://bsc-testnet-rpc.publicnode.com');
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log('🔗 Wallet Address:', wallet.address);
  console.log('📊 Checking balances...\n');
  
  // Check balances
  const linkBalance = await getLINKBalance(wallet.address, provider);
  const bnbBalance = await getBNBBalance(wallet.address, provider);
  
  console.log(`💰 LINK Balance: ${linkBalance} LINK`);
  console.log(`💰 BNB Balance: ${bnbBalance} BNB\n`);
  
  // Check if we have enough
  if (parseFloat(linkBalance) < 1) {
    console.error('❌ Error: You need at least 1 LINK to swap');
    process.exit(1);
  }
  
  if (parseFloat(bnbBalance) < 0.001) {
    console.error('❌ Error: You need at least 0.001 BNB for gas fees');
    console.log('💡 Try getting a tiny amount from a faucet first');
    process.exit(1);
  }
  
  // Ask how much to swap (or use 5 LINK as default)
  const swapAmount = process.argv[2] || '5';
  console.log(`🔄 Swapping ${swapAmount} LINK for BNB...\n`);
  
  // Execute swap
  const result = await completeLINKToBNBSwap(swapAmount, wallet.address, wallet);
  
  if (result.success) {
    console.log('✅ Swap successful!');
    console.log('📝 Transaction Hash:', result.txHash);
    console.log('🔗 View on BSCScan:', `https://testnet.bscscan.com/tx/${result.txHash}`);
    
    // Check new balances
    console.log('\n📊 Updated balances:');
    const newLinkBalance = await getLINKBalance(wallet.address, provider);
    const newBnbBalance = await getBNBBalance(wallet.address, provider);
    console.log(`💰 LINK Balance: ${newLinkBalance} LINK`);
    console.log(`💰 BNB Balance: ${newBnbBalance} BNB`);
  } else {
    console.error('❌ Swap failed:', result.error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

