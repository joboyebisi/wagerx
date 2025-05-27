import TelegramBot from 'node-telegram-bot-api';
import { createWager, getWager, updateWagerStatus } from '../firebase/wagers';
import { getUser, createUser, updateUserWallet } from '../firebase/users';
import { WalletManager } from '../solana/wallet';
import { PerplexityClient } from '../perplexity/client';

export class WagerBot {
  private bot: TelegramBot;
  private walletManager: WalletManager;
  private perplexityClient: PerplexityClient;

  constructor(token: string, rpcUrl: string, perplexityApiKey: string) {
    this.bot = new TelegramBot(token, { polling: false });
    this.walletManager = new WalletManager(rpcUrl);
    this.perplexityClient = new PerplexityClient(perplexityApiKey);
  }

  async handleMessage(chatId: number, userId: string, text: string, isGroup = false): Promise<void> {
    // Check if message contains a potential wager
    const wagerDetection = await this.perplexityClient.detectWager(text);
    
    // Only create wager if bot is mentioned in group chat, or always in private chat
    if (wagerDetection.isWager && (!isGroup || wagerDetection.botMentioned)) {
      await this.handlePotentialWager(chatId, userId, wagerDetection);
    }
  }

  private async handlePotentialWager(
    chatId: number,
    userId: string,
    detection: {
      isWager: boolean;
      description?: string;
      amount?: number;
      asset?: string;
      participants?: string[];
      botMentioned?: boolean;
    }
  ): Promise<void> {
    if (!detection.description || !detection.amount || !detection.asset) {
      await this.bot.sendMessage(
        chatId,
        'I detected a potential wager, but couldn\'t understand all the details. Please use /create_wager command to create a wager.'
      );
      return;
    }

    // Use detected participants or fallback to the user
    const participants = detection.participants && detection.participants.length > 0
      ? detection.participants
      : [userId];

    // Generate escrow wallet for this wager
    const escrowWallet = await this.walletManager.createWallet();

    // Set deadline to 5 minutes from now for demo purposes
    const deadline = Date.now() + 5 * 60 * 1000;

    // Store escrow wallet in wager record
    const wagerId = await createWager({
      description: detection.description,
      participants,
      amounts: Object.fromEntries(participants.map(p => [p, detection.amount])),
      status: 'pending',
      verificationMethod: 'perplexity',
      asset: detection.asset,
      escrowPublicKey: escrowWallet.publicKey,
      escrowPrivateKey: escrowWallet.privateKey,
      deadline,
    } as any);

    await this.bot.sendMessage(
      chatId,
      `I detected a potential wager!\n\nDescription: ${detection.description}\nAmount: ${detection.amount} ${detection.asset}\nParticipants: ${participants.join(', ')}\n\nSend your funds to the escrow address below to join:\n${escrowWallet.publicKey}\n\nUse /join_wager ${wagerId} after sending your funds.\n\nUse /check_escrow ${wagerId} to check the status of funds in the escrow wallet.`
    );
  }

  async handleStart(chatId: number, userId: string): Promise<void> {
    let user = await getUser(userId);
    
    if (!user) {
      await createUser(userId);
      user = await getUser(userId);
    }

    // Always send a greeting and tip
    const greeting = `👋 Hi! I'm X_WagerBot.\nI help you create and manage friendly wagers in this chat.\n\nType a message like:\n@X_WagerBot create a wager between me and @friend for 10 USDC on who will win the match!\nOr use /help for more commands.`;
    await this.bot.sendMessage(chatId, greeting);

    if (!user?.wallet) {
      const wallet = await this.walletManager.createWallet();
      await updateUserWallet(userId, wallet);
      await this.bot.sendMessage(
        chatId,
        `Your Solana wallet has been created!\nPublic Key: ${wallet.publicKey}\n\nPlease save your private key securely:\n${wallet.privateKey}`
      );
    }
  }

  async handleCreateWager(chatId: number, userId: string, args: string[]): Promise<void> {
    if (args.length < 2) {
      await this.bot.sendMessage(
        chatId,
        'Please provide a description and amount for the wager.\nExample: /create_wager "Will it rain tomorrow?" 1'
      );
      return;
    }

    const description = args[0];
    const amount = parseFloat(args[1]);

    if (isNaN(amount) || amount <= 0) {
      await this.bot.sendMessage(chatId, 'Please provide a valid amount greater than 0.');
      return;
    }

    const wagerId = await createWager({
      description,
      participants: [userId],
      amounts: { [userId]: amount },
      status: 'pending',
      verificationMethod: 'perplexity',
    });

    await this.bot.sendMessage(
      chatId,
      `Wager created! ID: ${wagerId}\nDescription: ${description}\nAmount: ${amount} SOL\n\nUse /join_wager ${wagerId} to join this wager.`
    );
  }

  async handleJoinWager(chatId: number, userId: string, args: string[]): Promise<void> {
    if (args.length < 1) {
      await this.bot.sendMessage(chatId, 'Please provide a wager ID to join.');
      return;
    }

    const wagerId = args[0];
    const wager = await getWager(wagerId);

    if (!wager) {
      await this.bot.sendMessage(chatId, 'Wager not found.');
      return;
    }

    if (wager.status !== 'pending') {
      await this.bot.sendMessage(chatId, 'This wager is no longer accepting participants.');
      return;
    }

    if (wager.participants.includes(userId)) {
      await this.bot.sendMessage(chatId, 'You are already a participant in this wager.');
      return;
    }

    // Add participant to wager
    wager.participants.push(userId);
    wager.amounts[userId] = wager.amounts[wager.participants[0]]; // Match the first participant's amount

    await updateWagerStatus(wagerId, 'active');
    await this.bot.sendMessage(
      chatId,
      `You have joined the wager!\nDescription: ${wager.description}\nAmount: ${wager.amounts[userId]} SOL`
    );
  }

  async handleHelp(chatId: number): Promise<void> {
    const helpMessage = `
Available commands:
/start - Start the bot and create a wallet
/help - Show this help message
/create_wager <description> <amount> - Create a new wager
/join_wager <wager_id> - Join an existing wager
/check_escrow <wager_id> - Check escrow wallet status and balances
/my_wagers - View your active wagers
/balance - Check your wallet balance

You can also just type your wager in natural language, and I'll help you create it!
    `;

    await this.bot.sendMessage(chatId, helpMessage);
  }

  async handleCheckEscrow(chatId: number, userId: string, args: string[]): Promise<void> {
    if (args.length < 1) {
      await this.bot.sendMessage(chatId, 'Please provide a wager ID to check.');
      return;
    }

    const wagerId = args[0];
    const wager = await getWager(wagerId);

    if (!wager) {
      await this.bot.sendMessage(chatId, 'Wager not found.');
      return;
    }

    if (!wager.escrowPublicKey) {
      await this.bot.sendMessage(chatId, 'No escrow wallet found for this wager.');
      return;
    }

    // Get SOL balance
    const solBalance = await this.walletManager.getBalance(wager.escrowPublicKey);
    
    // Get USDC balance (using devnet USDC mint)
    const usdcMint = 'Es9vMFrzaCERa8uQFQwZExk1tZb1rB6Qp8r9n3yq5F5k'; // Devnet USDC
    const usdcBalance = await this.walletManager.getTokenBalance(wager.escrowPublicKey, usdcMint);

    const statusMessage = `
Escrow Wallet Status for Wager: ${wagerId}
Address: ${wager.escrowPublicKey}

Balances:
- SOL: ${solBalance.toFixed(4)} SOL
- USDC: ${(usdcBalance / 1e6).toFixed(2)} USDC

Required Amount: ${wager.amounts[wager.participants[0]]} ${wager.asset}

Status: ${wager.status}
${wager.deadline ? `\nDeadline: ${new Date(wager.deadline).toLocaleString()}` : ''}
`;

    await this.bot.sendMessage(chatId, statusMessage);
  }
} 