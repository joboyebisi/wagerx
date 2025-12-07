/**
 * Script to swap LINK tokens for BNB on BSC Testnet
 * 
 * Usage: node scripts/swap-link-to-bnb.js [amount]
 * Example: node scripts/swap-link-to-bnb.js 5
 * 
 * Requirements:
 * - LINK tokens in wallet
 * - At least 0.001 BNB for gas fees
 * - PRIVATE_KEY in .env.local
 */

require('dotenv').config({ path: '.env.local' });
const { ethers } = require('ethers');

const BSC_TESTNET_RPC = 'https://bsc-testnet-rpc.publicnode.com';
const PANCAKE_V3_ROUTER = '0x1b81D678ffb9C0263b24A97847620C99d213eB14';
const LINK_TOKEN = '0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06';
const WBNB = '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
];

async function main() {
  // Get private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ Error: PRIVATE_KEY not found in .env.local');
    console.log('\nPlease add your private key to .env.local:');
    console.log('PRIVATE_KEY=your_private_key_here');
    console.log('\n⚠️  NEVER commit this file to git!');
    process.exit(1);
  }

  // Get swap amount
  const swapAmount = process.argv[2] || '5';
  const linkAmount = parseFloat(swapAmount);
  
  if (isNaN(linkAmount) || linkAmount <= 0) {
    console.error('❌ Error: Invalid amount. Please provide a number > 0');
    process.exit(1);
  }

  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('🔗 Wallet Address:', wallet.address);
  console.log('📊 Network: BSC Testnet (Chain ID: 97)');
  console.log(`🔄 Swapping ${linkAmount} LINK for BNB...\n`);

  try {
    // Check balances
    const bnbBalanceWei = await provider.getBalance(wallet.address);
    const bnbBalance = parseFloat(ethers.formatEther(bnbBalanceWei));
    
    const linkContract = new ethers.Contract(LINK_TOKEN, ERC20_ABI, provider);
    const linkBalanceWei = await linkContract.balanceOf(wallet.address);
    const linkDecimals = await linkContract.decimals();
    const linkBalance = parseFloat(ethers.formatUnits(linkBalanceWei, linkDecimals));

    console.log(`💰 Current Balances:`);
    console.log(`   BNB: ${bnbBalance} BNB`);
    console.log(`   LINK: ${linkBalance} LINK\n`);

    // Check if we have enough LINK
    if (linkBalance < linkAmount) {
      console.error(`❌ Error: Insufficient LINK balance. You have ${linkBalance} LINK, need ${linkAmount}`);
      process.exit(1);
    }

    // Check if we have BNB for gas
    if (bnbBalance < 0.001) {
      console.error('❌ Error: Insufficient BNB for gas fees');
      console.log(`   You have: ${bnbBalance} BNB`);
      console.log(`   You need: At least 0.001 BNB for gas\n`);
      console.log('💡 Solutions:');
      console.log('   1. Get BNB from a faucet:');
      console.log('      - QuickNode: https://faucet.quicknode.com/binance/bnb-testnet');
      console.log('      - BNB Chain: https://testnet.bnbchain.org/faucet-smart');
      console.log('   2. Ask in BSC Discord: https://discord.gg/bnbchain');
      console.log(`   3. Share your address: ${wallet.address}`);
      process.exit(1);
    }

    // Check approval
    console.log('🔍 Checking token approval...');
    const routerContract = new ethers.Contract(PANCAKE_V3_ROUTER, SWAP_ROUTER_ABI, wallet);
    const linkContractWithSigner = new ethers.Contract(LINK_TOKEN, ERC20_ABI, wallet);
    
    const amountInWei = ethers.parseUnits(linkAmount.toString(), linkDecimals);
    const currentAllowance = await linkContractWithSigner.allowance(wallet.address, PANCAKE_V3_ROUTER);

    if (currentAllowance < amountInWei) {
      console.log('📝 Approving LINK token for swap...');
      const approveTx = await linkContractWithSigner.approve(PANCAKE_V3_ROUTER, amountInWei);
      console.log(`   Transaction: ${approveTx.hash}`);
      console.log('   Waiting for confirmation...');
      await approveTx.wait();
      console.log('   ✅ Approval confirmed!\n');
    } else {
      console.log('   ✅ Already approved\n');
    }

    // Estimate output (rough estimate - 1 LINK ≈ 0.015 BNB on testnet)
    const estimatedBNB = linkAmount * 0.015;
    const minBNBOut = estimatedBNB * 0.95; // 5% slippage tolerance
    const amountOutMinimum = ethers.parseEther(minBNBOut.toFixed(6));

    console.log('💱 Swap Details:');
    console.log(`   From: ${linkAmount} LINK`);
    console.log(`   Estimated To: ~${estimatedBNB.toFixed(6)} BNB`);
    console.log(`   Minimum To: ${minBNBOut.toFixed(6)} BNB (5% slippage)\n`);

    // Build swap parameters
    const deadline = Math.floor(Date.now() / 1000) + 20 * 60; // 20 minutes
    const fee = 3000; // 0.3% fee tier

    const swapParams = {
      tokenIn: LINK_TOKEN,
      tokenOut: WBNB,
      fee: fee,
      recipient: wallet.address,
      deadline: deadline,
      amountIn: amountInWei,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0,
    };

    // Execute swap
    console.log('🔄 Executing swap...');
    const swapTx = await routerContract.exactInputSingle(swapParams);
    console.log(`   Transaction Hash: ${swapTx.hash}`);
    console.log('   Waiting for confirmation...');
    
    const receipt = await swapTx.wait();
    console.log('   ✅ Swap confirmed!\n');

    // Check new balances
    const newBnbBalanceWei = await provider.getBalance(wallet.address);
    const newBnbBalance = parseFloat(ethers.formatEther(newBnbBalanceWei));
    const newLinkBalanceWei = await linkContract.balanceOf(wallet.address);
    const newLinkBalance = parseFloat(ethers.formatUnits(newLinkBalanceWei, linkDecimals));

    console.log('📊 Updated Balances:');
    console.log(`   BNB: ${newBnbBalance} BNB (was ${bnbBalance})`);
    console.log(`   LINK: ${newLinkBalance} LINK (was ${linkBalance})\n`);

    console.log('✅ Swap successful!');
    console.log(`🔗 View transaction: https://testnet.bscscan.com/tx/${receipt.hash}`);

  } catch (error) {
    console.error('\n❌ Swap failed:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.log('\n💡 You need more BNB for gas fees.');
    } else if (error.message.includes('insufficient liquidity')) {
      console.log('\n💡 There might not be enough liquidity in the pool.');
      console.log('   Try swapping a smaller amount.');
    } else if (error.message.includes('execution reverted')) {
      console.log('\n💡 The swap transaction was reverted.');
      console.log('   This could be due to:');
      console.log('   - Insufficient liquidity');
      console.log('   - Price impact too high');
      console.log('   - Invalid parameters');
    }
    
    process.exit(1);
  }
}

main().catch(console.error);

