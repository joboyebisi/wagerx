/**
 * Quick script to check BNB and token balances on BSC Testnet
 */

import { ethers } from 'ethers';
import { getLINKBalance, getBNBBalance, BSC_TESTNET_CONFIG } from '../lib/utils/directSwap';

const WALLET_ADDRESS = '0x28bad4611e93ca5966ca94584b7287e61aee2d09';

async function main() {
  console.log('🔍 Checking balances for:', WALLET_ADDRESS);
  console.log('📊 Network: BSC Testnet (Chain ID: 97)\n');

  const provider = new ethers.JsonRpcProvider(BSC_TESTNET_CONFIG.RPC);

  try {
    // Check BNB balance
    const bnbBalance = await getBNBBalance(WALLET_ADDRESS, provider);
    console.log(`💰 BNB Balance: ${bnbBalance} BNB`);

    // Check LINK balance
    const linkBalance = await getLINKBalance(WALLET_ADDRESS, provider);
    console.log(`🔗 LINK Balance: ${linkBalance} LINK`);

    // Check for other common testnet tokens
    const commonTokens = [
      { name: 'USDT', address: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd' },
      { name: 'USDC', address: '0x64544969ed7EBf5f083679233325356EbE738930' },
      { name: 'BUSD', address: '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee' },
    ];

    console.log('\n📋 Other Token Balances:');
    const erc20Abi = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)', 'function symbol() view returns (string)'];
    
    for (const token of commonTokens) {
      try {
        const contract = new ethers.Contract(token.address, erc20Abi, provider);
        const balance = await contract.balanceOf(WALLET_ADDRESS);
        const decimals = await contract.decimals();
        const symbol = await contract.symbol();
        const formatted = ethers.formatUnits(balance, decimals);
        
        if (parseFloat(formatted) > 0) {
          console.log(`  ${symbol}: ${formatted}`);
        }
      } catch (error) {
        // Token might not exist or contract might not be deployed
      }
    }

    console.log('\n🔗 View on BSCScan:');
    console.log(`https://testnet.bscscan.com/address/${WALLET_ADDRESS}`);

    // Summary
    console.log('\n📊 Summary:');
    if (parseFloat(bnbBalance) > 0) {
      console.log(`✅ You have ${bnbBalance} BNB - enough for transactions!`);
    } else {
      console.log('⚠️  No BNB found - you need BNB for gas fees');
    }
    
    if (parseFloat(linkBalance) > 0) {
      console.log(`✅ You have ${linkBalance} LINK tokens`);
    }

  } catch (error: any) {
    console.error('❌ Error checking balances:', error.message);
  }
}

main();

