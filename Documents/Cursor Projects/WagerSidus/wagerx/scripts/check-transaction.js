/**
 * Check transaction details on BSC Testnet
 */

const { ethers } = require('ethers');

const TX_HASH = '0xa2e03a501a41a90963f47e69354d054e541d4b01fe8d8e9bcbf68f970c0dad37';
const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545/';

async function main() {
  console.log('🔍 Checking transaction:', TX_HASH);
  console.log('📊 Network: BSC Testnet\n');

  const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);

  try {
    const receipt = await provider.getTransactionReceipt(TX_HASH);
    
    if (!receipt) {
      console.log('⏳ Transaction not found or still pending...');
      console.log('   It might still be processing. Wait a moment and try again.');
      return;
    }

    console.log('✅ Transaction Found!\n');
    console.log('📋 Transaction Details:');
    console.log(`   Status: ${receipt.status === 1 ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Block Number: ${receipt.blockNumber}`);
    console.log(`   From: ${receipt.from}`);
    console.log(`   To: ${receipt.to || 'Contract Creation'}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`   Gas Price: ${ethers.formatUnits(receipt.gasPrice, 'gwei')} Gwei`);
    
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    console.log(`   Total Cost: ${ethers.formatEther(gasCost)} BNB`);

    // Get transaction details
    const tx = await provider.getTransaction(TX_HASH);
    if (tx) {
      console.log(`\n💰 Value: ${ethers.formatEther(tx.value)} BNB`);
    }

    // Check logs for token transfers
    if (receipt.logs && receipt.logs.length > 0) {
      console.log(`\n📊 Logs: ${receipt.logs.length} event(s) emitted`);
      
      // Try to decode token transfer events
      const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      receipt.logs.forEach((log, index) => {
        if (log.topics[0] === transferEventSignature) {
          console.log(`\n   Log ${index + 1}: Token Transfer Event`);
          console.log(`   Contract: ${log.address}`);
        }
      });
    }

    console.log('\n🔗 View on BSCScan:');
    console.log(`https://testnet.bscscan.com/tx/${TX_HASH}`);

    // Summary
    console.log('\n📊 Summary:');
    if (receipt.status === 1) {
      console.log('✅ Transaction was successful!');
    } else {
      console.log('❌ Transaction failed or was reverted');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('not found')) {
      console.log('\n💡 The transaction might:');
      console.log('   - Still be pending (wait a few moments)');
      console.log('   - Not exist on this network');
      console.log('   - Be on a different network');
    }
  }
}

main().catch(console.error);

