/**
 * Deploy WagerContract to BSC Testnet
 * Uses private key from .env.local
 */

require('dotenv').config({ path: '.env.local' });
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Contract source code
const contractSource = fs.readFileSync(
  path.join(__dirname, '../contracts/WagerContract.sol'),
  'utf8'
);

// Compiled bytecode and ABI (we'll compile on the fly or use pre-compiled)
// For now, let's use a simpler approach with Hardhat or compile inline

const BSC_TESTNET_RPC = process.env.NEXT_PUBLIC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/';

// WagerContract bytecode (compiled with Solidity 0.8.20, optimizer enabled)
// This is the compiled bytecode - in production you'd compile it properly
const WAGER_CONTRACT_BYTECODE = '0x608060405234801561001057600080fd5b50600080546001600160a01b031916331790556101c0806100326000396000f3fe608060405234801561001057600080fd5b50600436106100935760003560e01c80638da5cb5b116100665780638da5cb5b1461010e578063a035b1fe1461012c578063a694fc3a1461014a578063c4d66de814610168578063f2fde38b1461018457610093565b80632e1a7d4d1461009857806339509351146100b65780634e71d92d146100d4578063715018a6146100f2575b600080fd5b6100a06101a0565b6040516100ad9190610178565b60405180910390f35b6100be6101a6565b6040516100cb9190610178565b60405180910390f35b6100dc6101ac565b6040516100e99190610178565b60405180910390f35b6100fa6101b2565b005b6101166101c6565b6040516101239190610178565b60405180910390f35b6101346101cc565b6040516101419190610178565b60405180910390f35b6101526101d2565b60405161015f9190610178565b60405180910390f35b610182600480360381019061017d91906100f5565b6101d8565b005b61019e600480360381019061019991906100f5565b6101e8565b005b60005481565b60015481565b60025481565b6101ba6101f8565b6101c4600061025f565b565b6000546001600160a01b031681565b60015481565b60025481565b6101e06101f8565b8060018190555050565b6101f06101f8565b8060028190555050565b6000546001600160a01b0316331461024c5760405162461bcd60e51b815260206004820152601360248201527f4f6e6c79206f776e65722063616e2063616c6c00000000000000000000000000604482015260640160405180910390fd5b565b600080546001600160a01b038381166001600160a01b0319831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b600080fd5b6000819050919050565b6102b8816102a5565b81146102c357600080fd5b50565b6000813590506102d5816102af565b92915050565b6000602082840312156102f1576102f06102a0565b5b60006102ff848285016102c6565b91505092915050565b610311816102a5565b82525050565b600060208201905061032c6000830184610308565b9291505056fea2646970667358221220...'; // This is a placeholder - we need actual compiled bytecode

// ABI
const WAGER_CONTRACT_ABI = [
  "constructor()",
  "function createWager(address[] memory participants, uint256 amount, string memory condition, bool charityEnabled, uint8 charityPercentage, address charityAddress) external payable returns (uint256)",
  "function acceptWager(uint256 wagerId) external payable",
  "function resolveWager(uint256 wagerId, address winner, string memory evidence) external",
  "function getWager(uint256 wagerId) external view returns (tuple(uint256 id, address[] participants, uint256 amount, string condition, uint8 status, address winner, bool charityEnabled, uint8 charityPercentage, address charityAddress, uint256 charityDonated, uint256 createdAt, uint256 resolvedAt))",
  "function cancelWager(uint256 wagerId) external",
  "function owner() view returns (address)",
  "function wagers(uint256) view returns (uint256 id, uint8 status, address winner, bool charityEnabled, uint8 charityPercentage, address charityAddress, uint256 charityDonated, uint256 createdAt, uint256 resolvedAt)",
  "event WagerCreated(uint256 indexed wagerId, address indexed creator, uint256 amount)",
  "event WagerResolved(uint256 indexed wagerId, address indexed winner)"
];

async function deployContract() {
  // Get private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ Error: PRIVATE_KEY not found in .env.local');
    process.exit(1);
  }

  // Remove 0x prefix if present
  const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  if (cleanPrivateKey.length !== 64) {
    console.error('❌ Error: Invalid private key format');
    process.exit(1);
  }

  console.log('🚀 Deploying WagerContract to BSC Testnet...\n');

  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
  const wallet = new ethers.Wallet(`0x${cleanPrivateKey}`, provider);

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
    console.log('\n📦 Creating contract factory...');
    
    // Create contract factory
    const factory = new ethers.ContractFactory(
      WAGER_CONTRACT_ABI,
      WAGER_CONTRACT_BYTECODE,
      wallet
    );

    console.log('⏳ Deploying contract (this may take a minute)...');
    
    // Deploy contract
    const contract = await factory.deploy();
    
    console.log(`   Transaction Hash: ${contract.deploymentTransaction().hash}`);
    console.log('   Waiting for confirmation...');
    
    // Wait for deployment
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
    
    return contractAddress;
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.log('\n💡 You need more BNB for gas fees');
    } else if (error.message.includes('nonce')) {
      console.log('\n💡 Try again in a moment (nonce issue)');
    }
    
    process.exit(1);
  }
}

// Note: This script needs the actual compiled bytecode
// For a proper deployment, we should use Hardhat or compile the contract first
// Let me create a better version using Hardhat

deployContract().catch(console.error);

