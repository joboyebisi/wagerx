/**
 * Circle Programmable Wallets Service
 * Handles escrow wallet creation and USDC transfers using Circle Wallets SDK
 * 
 * Features:
 * - Create escrow wallets for wagers
 * - Approve USDC spending
 * - Transfer funds to escrow
 * - Distribute winnings to winners
 * - Send charity donations
 */

import axios from 'axios';

export interface CircleWalletConfig {
  apiKey: string;
  entitySecret: string;
  entityId?: string; // Optional, some Circle SDK versions may need this
  environment?: 'sandbox' | 'production';
}

export interface CreateEscrowWalletParams {
  wagerId: string;
  participants: string[];
  amount: string; // USDC amount
  charityAddress?: string;
  charityPercentage?: number;
}

export interface EscrowWallet {
  walletId: string;
  walletSetId: string;
  address: string;
  blockchain: string;
}

export interface TransferResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export class CircleWalletsService {
  private apiKey: string;
  private entitySecret: string;
  private entityId?: string;
  private baseUrl: string;
  private walletSDK: any; // Will be initialized with Circle SDK

  constructor(config?: CircleWalletConfig) {
    // Circle credentials should be SERVER-SIDE ONLY (no NEXT_PUBLIC_ prefix)
    // These are sensitive API keys and should never be exposed to the client
    this.apiKey = config?.apiKey || process.env.CIRCLE_API_KEY || '';
    this.entitySecret = config?.entitySecret || process.env.CIRCLE_ENTITY_SECRET || '';
    this.entityId = config?.entityId || process.env.CIRCLE_ENTITY_ID;
    const environment = config?.environment || process.env.CIRCLE_ENVIRONMENT || 'sandbox';
    
    // Circle API base URL
    this.baseUrl = environment === 'production' 
      ? 'https://api.circle.com'
      : 'https://api-sandbox.circle.com';

    if (!this.apiKey || !this.entitySecret) {
      console.warn('⚠️  Circle API credentials not configured. Escrow functionality will be limited.');
    }
  }

  /**
   * Initialize Circle Wallets SDK
   * Note: This requires @circle-fin/developer-controlled-wallets package
   */
  private async initializeSDK() {
    if (this.walletSDK) return this.walletSDK;

    try {
      // Dynamic import to avoid SSR issues
      const { initiateDeveloperControlledWalletsClient } = await import('@circle-fin/developer-controlled-wallets');
      
      // Initialize Circle SDK with API key and entity secret
      // Entity ID is optional but may be needed for some operations
      const sdkConfig: any = {
        apiKey: this.apiKey,
        entitySecret: this.entitySecret,
      };
      
      if (this.entityId) {
        sdkConfig.entityId = this.entityId;
      }
      
      this.walletSDK = initiateDeveloperControlledWalletsClient(sdkConfig);

      return this.walletSDK;
    } catch (error) {
      console.error('Failed to initialize Circle SDK:', error);
      throw new Error('Circle SDK not available. Install @circle-fin/developer-controlled-wallets');
    }
  }

  /**
   * Create or get wallet set for wagers
   */
  async getOrCreateWalletSet(name: string = 'WagerX Escrow'): Promise<string> {
    try {
      const sdk = await this.initializeSDK();
      
      // Try to list existing wallet sets
      const response = await axios.get(`${this.baseUrl}/v1/w3s/walletSets`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const existingSet = response.data?.data?.walletSets?.find(
        (set: any) => set.name === name
      );

      if (existingSet) {
        return existingSet.id;
      }

      // Create new wallet set
      const createResponse = await axios.post(
        `${this.baseUrl}/v1/w3s/walletSets`,
        { name },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return createResponse.data?.data?.walletSet?.id;
    } catch (error: any) {
      console.error('Error creating wallet set:', error);
      throw new Error(`Failed to create wallet set: ${error.message}`);
    }
  }

  /**
   * Create a programmable wallet for a user
   * Circle will manage the wallet, user doesn't need private keys
   */
  async createUserWallet(userId: string, blockchain: string = 'ETH-SEPOLIA'): Promise<EscrowWallet> {
    try {
      const sdk = await this.initializeSDK();
      const walletSetId = await this.getOrCreateWalletSet();

      const walletData = await sdk.createWallets({
        idempotencyKey: `user-${userId}-${Date.now()}`,
        blockchains: [blockchain],
        accountType: 'SCA', // Smart Contract Account
        walletSetId: walletSetId,
      });

      const wallet = walletData.data?.wallets?.[0];
      if (!wallet) {
        throw new Error('Failed to create user wallet');
      }

      return {
        walletId: wallet.id,
        walletSetId: walletSetId,
        address: wallet.address,
        blockchain: blockchain,
      };
    } catch (error: any) {
      console.error('Error creating user wallet:', error);
      throw new Error(`Failed to create user wallet: ${error.message}`);
    }
  }

  /**
   * Create escrow wallet for a wager
   */
  async createEscrowWallet(params: CreateEscrowWalletParams): Promise<EscrowWallet> {
    try {
      const sdk = await this.initializeSDK();
      const walletSetId = await this.getOrCreateWalletSet();

      // Create wallet on BNB Chain (or Ethereum for USDC)
      const blockchain = 'ETH-SEPOLIA'; // Use Ethereum Sepolia for USDC, or BSC if supported
      
      const walletData = await sdk.createWallets({
        idempotencyKey: `wager-${params.wagerId}-${Date.now()}`,
        blockchains: [blockchain],
        accountType: 'SCA', // Smart Contract Account
        walletSetId: walletSetId,
      });

      const wallet = walletData.data?.wallets?.[0];
      if (!wallet) {
        throw new Error('Failed to create escrow wallet');
      }

      return {
        walletId: wallet.id,
        walletSetId: walletSetId,
        address: wallet.address,
        blockchain: blockchain,
      };
    } catch (error: any) {
      console.error('Error creating escrow wallet:', error);
      throw new Error(`Failed to create escrow wallet: ${error.message}`);
    }
  }

  /**
   * Approve USDC spending for escrow
   */
  async approveUSDCSpending(
    walletId: string,
    amount: string,
    spenderAddress: string
  ): Promise<TransferResult> {
    try {
      const sdk = await this.initializeSDK();
      const entitySecretCiphertext = await sdk.generateEntitySecretCiphertext();

      // USDC contract address (Sepolia testnet)
      const usdcAddress = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Sepolia USDC
      
      // Token Messenger contract (for CCTP)
      const tokenMessenger = '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'; // Sepolia

      const approveTx = await sdk.createContractExecutionTransaction({
        walletId: walletId,
        entitySecretCiphertext: entitySecretCiphertext,
        contractAddress: usdcAddress,
        abiFunctionSignature: 'approve(address,uint256)',
        abiParameters: [spenderAddress, amount],
        fee: {
          type: 'level',
          config: {
            feeLevel: 'LOW',
          },
        },
      });

      return {
        success: true,
        transactionHash: approveTx.data?.transaction?.hash,
      };
    } catch (error: any) {
      console.error('Error approving USDC:', error);
      return {
        success: false,
        error: error.message || 'Failed to approve USDC spending',
      };
    }
  }

  /**
   * Transfer USDC to escrow wallet
   */
  async transferToEscrow(
    fromWalletId: string,
    toEscrowAddress: string,
    amount: string
  ): Promise<TransferResult> {
    try {
      const sdk = await this.initializeSDK();
      const entitySecretCiphertext = await sdk.generateEntitySecretCiphertext();

      // USDC contract address
      const usdcAddress = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

      const transferTx = await sdk.createContractExecutionTransaction({
        walletId: fromWalletId,
        entitySecretCiphertext: entitySecretCiphertext,
        contractAddress: usdcAddress,
        abiFunctionSignature: 'transfer(address,uint256)',
        abiParameters: [toEscrowAddress, amount],
        fee: {
          type: 'level',
          config: {
            feeLevel: 'MEDIUM',
          },
        },
      });

      return {
        success: true,
        transactionHash: transferTx.data?.transaction?.hash,
      };
    } catch (error: any) {
      console.error('Error transferring to escrow:', error);
      return {
        success: false,
        error: error.message || 'Failed to transfer to escrow',
      };
    }
  }

  /**
   * Distribute winnings after wager resolution
   */
  async distributeWinnings(
    escrowWalletId: string,
    winnerAddress: string,
    totalAmount: string,
    charityAddress?: string,
    charityPercentage?: number
  ): Promise<TransferResult[]> {
    const results: TransferResult[] = [];

    try {
      const sdk = await this.initializeSDK();
      const usdcAddress = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

      // Calculate amounts
      const charityAmount = charityAddress && charityPercentage
        ? (BigInt(totalAmount) * BigInt(charityPercentage)) / BigInt(100)
        : BigInt(0);
      
      const winnerAmount = BigInt(totalAmount) - charityAmount;

      // Transfer to winner
      if (winnerAmount > 0) {
        const winnerResult = await this.transferToEscrow(
          escrowWalletId,
          winnerAddress,
          winnerAmount.toString()
        );
        results.push(winnerResult);
      }

      // Transfer to charity
      if (charityAmount > 0 && charityAddress) {
        const charityResult = await this.transferToEscrow(
          escrowWalletId,
          charityAddress,
          charityAmount.toString()
        );
        results.push(charityResult);
      }

      return results;
    } catch (error: any) {
      console.error('Error distributing winnings:', error);
      return [{
        success: false,
        error: error.message || 'Failed to distribute winnings',
      }];
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(walletAddress: string, tokenAddress?: string): Promise<string> {
    try {
      // Use Circle API or direct blockchain query
      // For now, return placeholder
      // TODO: Implement actual balance query
      return '0';
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return '0';
    }
  }
}

export const circleWalletsService = new CircleWalletsService();

