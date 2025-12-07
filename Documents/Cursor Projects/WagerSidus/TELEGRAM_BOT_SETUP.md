# Telegram Bot Setup Guide

This guide will help you set up the Telegram bot commands as a fallback for natural language processing.

## Prerequisites

1. A Telegram account
2. Bot token from @BotFather
3. Deployed application URL (for webhook)

## Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` command
3. Follow the instructions:
   - Choose a name for your bot (e.g., "WagerSidus Bot")
   - Choose a username (e.g., "wagersidus_bot")
4. Copy the bot token you receive

## Step 2: Configure Environment Variables

Add to your `.env.local`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
```

## Step 3: Set Up Bot Commands

Run the setup script:

```bash
npx ts-node scripts/setup-telegram-bot.ts
```

Or manually set commands:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{
    "commands": [
      {"command": "start", "description": "Start using WagerSidus"},
      {"command": "create", "description": "Create a new wager"},
      {"command": "accept", "description": "Accept a wager"},
      {"command": "resolve", "description": "Resolve a wager"},
      {"command": "cancel", "description": "Cancel a wager"},
      {"command": "list", "description": "List your wagers"},
      {"command": "wager", "description": "View wager details"},
      {"command": "help", "description": "Show help message"}
    ]
  }'
```

## Step 4: Set Webhook (Production)

For production, set the webhook URL:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://your-domain.com/api/telegram/webhook"
```

Verify webhook:

```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo"
```

## Step 5: Development (Polling)

For local development, you can use polling instead of webhook:

1. Install `node-telegram-bot-api`:
```bash
npm install node-telegram-bot-api
```

2. Create a polling script (optional):
```typescript
// scripts/poll-telegram.ts
import TelegramBot from 'node-telegram-bot-api';
import { telegramBotService } from '@/lib/services/telegramBot';

const token = process.env.TELEGRAM_BOT_TOKEN!;
const bot = new TelegramBot(token, { polling: true });

bot.on('message', async (msg) => {
  const response = await telegramBotService.processMessage(msg);
  bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });
});
```

## Available Commands

### `/start`
Welcome message and quick start guide.

### `/create <amount> <condition> <participant>`
Create a new wager.

**Examples:**
```
/create 10 BNB "Lakers win on Dec 15th" @username
/create 0.01 BNB "BTC > $50k by Dec 10th" 0x1234...
/create 10 BNB "Team wins" @user --charity 5%
```

### `/accept <wagerId>`
Accept a pending wager.

**Example:**
```
/accept 123
```

### `/resolve <wagerId>`
Resolve a wager (AI will automatically verify).

**Example:**
```
/resolve 123
```

### `/cancel <wagerId>`
Cancel a wager.

**Example:**
```
/cancel 123
```

### `/list`
List all your wagers.

### `/wager <wagerId>`
View detailed wager information.

**Example:**
```
/wager 123
```

### `/help`
Show comprehensive help message with examples.

## Natural Language Fallback

If a message is not a command, the bot will try to process it as natural language:

**Examples:**
- "I bet 10 BNB that Lakers win on Dec 15th"
- "Accept wager #123"
- "Resolve wager 456"
- "Show my wagers"

## Testing

1. Find your bot on Telegram (search for `@your_bot_username`)
2. Send `/start` to begin
3. Try creating a wager: `/create 10 BNB "Test wager" @yourself`
4. Test other commands

## Troubleshooting

### Bot not responding
- Check if webhook is set correctly
- Verify bot token is correct
- Check application logs for errors

### Commands not showing in menu
- Run the setup script again
- Manually set commands via API

### Webhook not working
- Ensure your server is accessible from the internet
- Check HTTPS is enabled (required for webhooks)
- Verify webhook URL is correct

## Security Notes

1. **Never commit bot token** to version control
2. **Use environment variables** for all sensitive data
3. **Validate webhook requests** (optional, but recommended)
4. **Rate limit** bot endpoints to prevent abuse

## Next Steps

After setting up the bot:
1. Test all commands
2. Integrate with your wager API endpoints
3. Add inline keyboards for better UX
4. Set up notifications for wager events

