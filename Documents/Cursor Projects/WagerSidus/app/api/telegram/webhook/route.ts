import { NextRequest, NextResponse } from 'next/server';
import { telegramBotService, TelegramUpdate } from '@/lib/services/telegramBot';

/**
 * Telegram Bot Webhook Handler
 * 
 * This endpoint receives updates from Telegram Bot API
 * and processes commands/messages
 * 
 * To set up:
 * 1. Deploy this app
 * 2. Set webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_URL>/api/telegram/webhook
 * 3. Or use polling in development
 */

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();

    // Handle message
    if (update.message) {
      const message = update.message;
      
      // Process the message
      const response = await telegramBotService.processMessage(message);
      
      // Send response
      await telegramBotService.sendMessage(message.chat.id, response);

      return NextResponse.json({ ok: true });
    }

    // Handle callback query (for inline keyboards)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const data = callbackQuery.data;
      const message = callbackQuery.message;

      if (message) {
        // Process callback data
        // You can implement inline keyboard handlers here
        await telegramBotService.sendMessage(
          message.chat.id,
          `Processing: ${data}`
        );
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for webhook verification
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Telegram webhook is active',
    timestamp: new Date().toISOString(),
  });
}

