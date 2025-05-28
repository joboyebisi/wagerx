import { NextResponse } from 'next/server';
import { WagerBot } from '@/lib/telegram/wagerCommands';

const token = process.env.TELEGRAM_BOT_TOKEN;
const rpcUrl = process.env.SOLANA_RPC_URL;
const perplexityApiKey = process.env.PERPLEXITY_API_KEY;

// Debug logging
console.log('Environment variables:', {
  token: token ? 'Set' : 'Not set',
  rpcUrl: rpcUrl ? 'Set' : 'Not set',
  perplexityApiKey: perplexityApiKey ? 'Set' : 'Not set'
});

if (!token || !rpcUrl || !perplexityApiKey) {
  throw new Error('Required environment variables are not defined');
}

const wagerBot = new WagerBot(token, rpcUrl, perplexityApiKey);

export async function POST(req: Request) {
  try {
    const update = await req.json();
    console.log('Received Telegram update:', update); // Log incoming Telegram updates
    
    if (update.message) {
      const chatId = update.message.chat.id;
      const userId = update.message.from.id.toString();
      const text = update.message.text || '';
      const isGroup = update.message.chat.type === 'group' || update.message.chat.type === 'supergroup';
      
      // Handle commands
      if (text.startsWith('/start')) {
        await wagerBot.handleStart(chatId, userId);
      } else if (text.startsWith('/help')) {
        await wagerBot.handleHelp(chatId);
      } else if (text.startsWith('/create_wager')) {
        const args = text.split(' ').slice(1);
        await wagerBot.handleCreateWager(chatId, userId, args);
      } else if (text.startsWith('/join_wager')) {
        const args = text.split(' ').slice(1);
        await wagerBot.handleJoinWager(chatId, userId, args);
      } else if (text.startsWith('/check_escrow')) {
        const args = text.split(' ').slice(1);
        await wagerBot.handleCheckEscrow(chatId, userId, args);
      } else if (text.startsWith('/swap_to_usdc')) {
        const args = text.split(' ').slice(1);
        await wagerBot.handleSwapToUSDC(chatId, userId, args);
      } else {
        // Handle natural language messages
        await wagerBot.handleMessage(chatId, userId, text, isGroup);
      }
    }
    
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 