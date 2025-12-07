/**
 * Simple deployment script using ethers directly
 * Compiles contract and deploys to BSC Testnet
 */

require('dotenv').config({ path: '.env.local' });
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BSC_TESTNET_RPC = process.env.NEXT_PUBLIC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/';

async function deploy() {
  console.log('🚀 Deploying WagerContract to BSC Testnet...\n');

  // Get private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ Error: PRIVATE_KEY not found in .env.local');
    process.exit(1);
  }

  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
  const wallet = new ethers.Wallet(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`, provider);

  console.log('📋 Deployment Info:');
  console.log(`   Network: BSC Testnet (Chain ID: 97)`);
  console.log(`   Deployer: ${wallet.address}`);
  console.log(`   RPC: ${BSC_TESTNET_RPC}\n`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceBNB = ethers.formatEther(balance);
  console.log(`💰 Balance: ${balanceBNB} BNB`);

  if (parseFloat(balanceBNB) < 0.001) {
    console.error('\n❌ Error: Insufficient BNB for deployment');
    console.log('   You need at least 0.001 BNB for gas fees');
    process.exit(1);
  }

  try {
    console.log('\n📦 Compiling contract...');
    
    // Try to compile using Hardhat if available
    try {
      execSync('npx hardhat compile', { stdio: 'inherit', cwd: __dirname + '/..' });
      console.log('✅ Contract compiled successfully\n');
    } catch (error) {
      console.log('⚠️  Could not compile with Hardhat, using Remix compilation...');
      console.log('💡 Please compile the contract in Remix IDE and use the bytecode, or');
      console.log('   deploy directly from Remix: https://remix.ethereum.org');
      process.exit(1);
    }

    // Load compiled contract
    const artifactPath = path.join(__dirname, '../artifacts/contracts/WagerContract.sol/WagerContract.json');
    if (!fs.existsSync(artifactPath)) {
      console.error('❌ Compiled contract not found. Please compile first.');
      process.exit(1);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const { abi, bytecode } = artifact;

    console.log('⏳ Deploying contract (this may take a minute)...');
    
    // Create contract factory
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    
    // Deploy
    const contract = await factory.deploy();
    console.log(`   Transaction Hash: ${contract.deploymentTransaction().hash}`);
    console.log('   Waiting for confirmation...');
    
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    
    console.log('\n✅ Contract deployed successfully!');
    console.log(`\n📝 Contract Address: ${contractAddress}`);
    console.log(`🔗 View on BSCScan: https://testnet.bscscan.com/address/${contractAddress}`);
    
    // Check remaining balance
    const newBalance = await provider.getBalance(wallet.address);
    const newBalanceBNB = ethers.formatEther(newBalance);
    const gasUsed = parseFloat(balanceBNB) - parseFloat(newBalanceBNB);
    
    console.log(`\n💰 Remaining Balance: ${newBalanceBNB} BNB`);
    console.log(`⛽ Gas Used: ~${gasUsed.toFixed(6)} BNB`);
    
    console.log('\n📋 Next Steps:');
    console.log('1. Update .env.local:');
    console.log(`   NEXT_PUBLIC_WAGER_CONTRACT_ADDRESS=${contractAddress}`);
    console.log('2. Restart your app');
    console.log('3. Test the contract!');
    
    // Save to file
    fs.writeFileSync(
      'deployed-contract.txt',
      `Contract Address: ${contractAddress}\nDeployed at: ${new Date().toISOString()}\nNetwork: BSC Testnet\nDeployer: ${wallet.address}\n`
    );
    console.log('\n💾 Contract address saved to deployed-contract.txt');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.log('\n💡 You need more BNB for gas fees');
    } else if (error.message.includes('nonce')) {
      console.log('\n💡 Try again in a moment (nonce issue)');
    } else {
      console.log('\n💡 Alternative: Deploy using Remix IDE');
      console.log('   https://remix.ethereum.org');
      console.log('   Copy contract from: contracts/WagerContract.sol');
    }
    
    process.exit(1);
  }
}

deploy().catch(console.error);

