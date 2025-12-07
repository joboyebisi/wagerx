/**
 * Quick script to check BNB and token balances on BSC Testnet
 */

const { ethers } = require('ethers');

const WALLET_ADDRESS = '0x28bad4611e93ca5966ca94584b7287e61aee2d09';
const BSC_TESTNET_RPC = 'https://bsc-testnet-rpc.publicnode.com';
const LINK_TOKEN = '0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

async function main() {
  console.log('🔍 Checking balances for:', WALLET_ADDRESS);
  console.log('📊 Network: BSC Testnet (Chain ID: 97)\n');

  const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);

  try {
    // Check BNB balance
    const bnbBalanceWei = await provider.getBalance(WALLET_ADDRESS);
    const bnbBalance = ethers.formatEther(bnbBalanceWei);
    console.log(`💰 BNB Balance: ${bnbBalance} BNB`);

    // Check LINK balance
    const linkContract = new ethers.Contract(LINK_TOKEN, ERC20_ABI, provider);
    const linkBalanceWei = await linkContract.balanceOf(WALLET_ADDRESS);
    const linkDecimals = await linkContract.decimals();
    const linkBalance = ethers.formatUnits(linkBalanceWei, linkDecimals);
    console.log(`🔗 LINK Balance: ${linkBalance} LINK`);

    // Check for other common testnet tokens
    const commonTokens = [
      { name: 'USDT', address: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd' },
      { name: 'USDC', address: '0x64544969ed7EBf5f083679233325356EbE738930' },
      { name: 'BUSD', address: '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee' },
    ];

    console.log('\n📋 Checking other tokens...');
    const foundTokens = [];
    
    for (const token of commonTokens) {
      try {
        const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
        const balance = await contract.balanceOf(WALLET_ADDRESS);
        const decimals = await contract.decimals();
        const symbol = await contract.symbol();
        const formatted = ethers.formatUnits(balance, decimals);
        
        if (parseFloat(formatted) > 0) {
          foundTokens.push({ symbol, balance: formatted });
        }
      } catch (error) {
        // Token might not exist or contract might not be deployed
      }
    }

    if (foundTokens.length > 0) {
      console.log('\n📋 Other Token Balances:');
      foundTokens.forEach(token => {
        console.log(`  ${token.symbol}: ${token.balance}`);
      });
    } else {
      console.log('\n📋 No other tokens found');
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

  } catch (error) {
    console.error('❌ Error checking balances:', error.message);
  }
}

main().catch(console.error);

