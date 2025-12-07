const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying WagerContract to BSC Testnet...\n");

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("📋 Deployment Info:");
  console.log(`   Network: BSC Testnet (Chain ID: 97)`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   RPC: ${hre.network.config.url}\n`);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceBNB = hre.ethers.formatEther(balance);
  console.log(`💰 Balance: ${balanceBNB} BNB`);

  if (parseFloat(balanceBNB) < 0.001) {
    console.error("\n❌ Error: Insufficient BNB for deployment");
    console.log("   You need at least 0.001 BNB for gas fees");
    process.exit(1);
  }

  try {
    console.log("\n📦 Deploying WagerContract...");
    
    // Get contract factory
    const WagerContract = await hre.ethers.getContractFactory("WagerContract");
    
    // Deploy contract
    console.log("⏳ Deploying (this may take a minute)...");
    const wagerContract = await WagerContract.deploy();
    
    console.log(`   Transaction Hash: ${wagerContract.deploymentTransaction().hash}`);
    console.log("   Waiting for confirmation...");
    
    // Wait for deployment
    await wagerContract.waitForDeployment();
    
    const contractAddress = await wagerContract.getAddress();
    
    console.log("\n✅ Contract deployed successfully!");
    console.log(`\n📝 Contract Address: ${contractAddress}`);
    console.log(`🔗 View on BSCScan: https://testnet.bscscan.com/address/${contractAddress}`);
    
    // Check remaining balance
    const newBalance = await hre.ethers.provider.getBalance(deployer.address);
    const newBalanceBNB = hre.ethers.formatEther(newBalance);
    const gasUsed = parseFloat(balanceBNB) - parseFloat(newBalanceBNB);
    
    console.log(`\n💰 Remaining Balance: ${newBalanceBNB} BNB`);
    console.log(`⛽ Gas Used: ~${gasUsed.toFixed(6)} BNB`);
    
    console.log("\n📋 Next Steps:");
    console.log("1. Update .env.local:");
    console.log(`   NEXT_PUBLIC_WAGER_CONTRACT_ADDRESS=${contractAddress}`);
    console.log("2. Restart your app");
    console.log("3. Test the contract!");
    
    // Save contract address to a file for easy reference
    const fs = require('fs');
    fs.writeFileSync(
      'deployed-contract.txt',
      `Contract Address: ${contractAddress}\nDeployed at: ${new Date().toISOString()}\nNetwork: BSC Testnet\n`
    );
    console.log("\n💾 Contract address saved to deployed-contract.txt");
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 You need more BNB for gas fees");
    } else if (error.message.includes("nonce")) {
      console.log("\n💡 Try again in a moment (nonce issue)");
    } else if (error.message.includes("PRIVATE_KEY")) {
      console.log("\n💡 Make sure PRIVATE_KEY is set in .env.local");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

