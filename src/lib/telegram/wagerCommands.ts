import TelegramBot from 'node-telegram-bot-api';
import { createWager, getWager, updateWagerStatus } from '../firebase/wagers';
import { getUser, createUser, updateUserWallet } from '../firebase/users';
import { WalletManager } from '../solana/wallet';
import { PerplexityClient } from '../perplexity/client';
import { fetchSolToUsdcPriceOKX } from '../okx/DexClient';
import { executeSwapSOLtoUSDC } from '../okx/swap';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

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

    // Use Perplexity to determine deadline
    const timeInfo = await this.perplexityClient.getWagerCheckTime(detection.description);
    let deadline: number | undefined = undefined;
    let deadlineMsg = '';
    if (timeInfo.isTimeBound && timeInfo.checkTime) {
      deadline = new Date(timeInfo.checkTime).getTime();
      deadlineMsg = `\nOutcome will be checked at: ${new Date(deadline).toLocaleString()} (auto-detected)`;
    } else {
      deadline = Date.now() + 5 * 60 * 1000; // fallback: 5 min for demo
      deadlineMsg = '\nThis wager is not time-bound or independently verifiable. Please use /set_outcome_time <wager_id> <minutes_from_now> to set the deadline.';
    }

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
      `I detected a potential wager!\n\nDescription: ${detection.description}\nAmount: ${detection.amount} ${detection.asset}\nParticipants: ${participants.join(', ')}\n\nSend your funds to the escrow address below to join:\n${escrowWallet.publicKey}\n\nUse /join_wager ${wagerId} after sending your funds.\n\nUse /check_escrow ${wagerId} to check the status of funds in the escrow wallet.${deadlineMsg}`
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
      if (!wallet.airdropSuccess) {
        await this.bot.sendMessage(
          chatId,
          `⚠️ Airdrop failed (faucet limit reached or network issue). Please fund your wallet manually at https://faucet.solana.com using your public key above.`
        );
      }
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

  async handleSwapToUSDC(chatId: number, userId: string, args: string[]): Promise<void> {
    // Get user's wallet
    const user = await getUser(userId);
    if (!user || !user.wallet || !user.wallet.publicKey) {
      await this.bot.sendMessage(chatId, 'No wallet found for your account. Please use /start first.');
      return;
    }
    const publicKey = user.wallet.publicKey;
    // Get SOL balance
    const solBalance = await this.walletManager.getBalance(publicKey);
    // Leave 0.001 SOL for fees
    const swapableSol = solBalance - 0.001;
    if (swapableSol <= 0) {
      await this.bot.sendMessage(chatId, 'Not enough SOL to swap.');
      return;
    }
    const lamports = Math.floor(swapableSol * LAMPORTS_PER_SOL).toString();
    try {
      await this.bot.sendMessage(chatId, `Swapping ${swapableSol.toFixed(4)} SOL to USDC (leaving 0.001 SOL for fees)...`);
      const swapResult = await executeSwapSOLtoUSDC(lamports);
      // Get new USDC balance
      const usdcMint = 'Es9vMFrzaCERa8uQFQwZExk1tZb1rB6Qp8r9n3yq5F5k';
      const usdcBalance = await this.walletManager.getTokenBalance(publicKey, usdcMint);
      await this.bot.sendMessage(chatId, `Swap complete! Your new USDC balance: ${(usdcBalance / 1e6).toFixed(2)} USDC.`);
    } catch (e) {
      await this.bot.sendMessage(chatId, 'Swap failed. Please try again later.');
    }
  }

  async handleSetOutcomeTime(chatId: number, userId: string, args: string[]): Promise<void> {
    if (args.length < 2) {
      await this.bot.sendMessage(chatId, 'Usage: /set_outcome_time <wager_id> <minutes_from_now>');
      return;
    }
    const wagerId = args[0];
    const minutes = parseInt(args[1], 10);
    if (isNaN(minutes) || minutes <= 0) {
      await this.bot.sendMessage(chatId, 'Please provide a valid number of minutes.');
      return;
    }
    const wager = await getWager(wagerId);
    if (!wager) {
      await this.bot.sendMessage(chatId, 'Wager not found.');
      return;
    }
    const newDeadline = Date.now() + minutes * 60 * 1000;
    await updateDoc(doc(db, 'wagers', wagerId), { deadline: newDeadline });
    await this.bot.sendMessage(chatId, `Outcome time set! New deadline: ${new Date(newDeadline).toLocaleString()}`);
  }

  async handleCheckOutcome(chatId: number, userId: string, args: string[]): Promise<void> {
    if (args.length < 2) {
      await this.bot.sendMessage(chatId, 'Usage: /check_outcome <wager_id> <outcome_text>');
      return;
    }
    const wagerId = args[0];
    const outcomeText = args.slice(1).join(' ');
    const wager = await getWager(wagerId);
    if (!wager) {
      await this.bot.sendMessage(chatId, 'Wager not found.');
      return;
    }
    const result = await this.perplexityClient.verifyOutcome(wager.description, outcomeText);
    await this.bot.sendMessage(chatId, `Outcome verification:\nVerified: ${result.verified}\nConfidence: ${result.confidence}\nExplanation: ${result.explanation}`);
    if (result.verified) {
      // Use only valid status values
      await updateWagerStatus(wagerId, 'completed');
      // Update winner field directly
      await updateDoc(doc(db, 'wagers', wagerId), { outcome: outcomeText, winner: userId });
      await this.bot.sendMessage(chatId, `Winner declared: ${userId}`);
    }
  }

  async handlePayoutWinner(chatId: number, userId: string, args: string[]): Promise<void> {
    if (args.length < 2) {
      await this.bot.sendMessage(chatId, 'Usage: /payout <wager_id> <winner_wallet_address>');
      return;
    }
    const wagerId = args[0];
    const winnerWallet = args[1];
    // For demo, assume 1 USDC payout
    // In production, calculate based on wager record
    await this.bot.sendMessage(chatId, `Payout to ${winnerWallet} for wager ${wagerId} initiated (demo mode).`);
    // TODO: Integrate with resolveWager and payoutUSDC for real payout
  }

  async handleHelp(chatId: number): Promise<void> {
    const helpMessage = `
Available commands:
/start - Start the bot and create a wallet
/help - Show this help message
/create_wager <description> <amount> - Create a new wager
/join_wager <wager_id> - Join an existing wager
/check_escrow <wager_id> - Check escrow wallet status and balances
/swap_to_usdc - Swap all SOL in your wallet to USDC
/set_outcome_time <wager_id> <minutes_from_now> - Set the outcome time for a wager
/check_outcome <wager_id> <outcome_text> - Check and verify the outcome using Perplexity
/payout <wager_id> <winner_wallet_address> - Payout to the winner's wallet
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
