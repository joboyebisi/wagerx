/**
 * Script to set up Telegram Bot
 * 
 * Usage:
 * 1. Get bot token from @BotFather
 * 2. Set TELEGRAM_BOT_TOKEN in .env.local
 * 3. Run: npx ts-node scripts/setup-telegram-bot.ts
 * 
 * This will:
 * - Set bot commands
 * - Set webhook (if WEBHOOK_URL is provided)
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in .env.local');
  console.log('\n📝 To get a bot token:');
  console.log('1. Open Telegram and search for @BotFather');
  console.log('2. Send /newbot and follow instructions');
  console.log('3. Copy the token and add to .env.local:');
  console.log('   TELEGRAM_BOT_TOKEN=your_token_here\n');
  process.exit(1);
}

async function setCommands() {
  console.log('📋 Setting bot commands...');

  const commands = [
    { command: 'start', description: 'Start using WagerSidus' },
    { command: 'create', description: 'Create a new wager' },
    { command: 'accept', description: 'Accept a wager' },
    { command: 'resolve', description: 'Resolve a wager' },
    { command: 'cancel', description: 'Cancel a wager' },
    { command: 'list', description: 'List your wagers' },
    { command: 'wager', description: 'View wager details' },
    { command: 'help', description: 'Show help message' },
  ];

  try {
    const response = await axios.post(`${BASE_URL}/setMyCommands`, {
      commands,
    });

    if (response.data.ok) {
      console.log('✅ Bot commands set successfully!');
      console.log('\nCommands:');
      commands.forEach((cmd) => {
        console.log(`  /${cmd.command} - ${cmd.description}`);
      });
    } else {
      throw new Error('Failed to set commands');
    }
  } catch (error: any) {
    console.error('❌ Error setting commands:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function setWebhook() {
  if (!WEBHOOK_URL) {
    console.log('\n⚠️  WEBHOOK_URL not set. Skipping webhook setup.');
    console.log('💡 To set webhook later, use:');
    console.log(`   curl -X POST "${BASE_URL}/setWebhook?url=${encodeURIComponent('YOUR_WEBHOOK_URL')}"`);
    return;
  }

  console.log(`\n🔗 Setting webhook to: ${WEBHOOK_URL}...`);

  try {
    const response = await axios.post(`${BASE_URL}/setWebhook`, {
      url: WEBHOOK_URL,
    });

    if (response.data.ok) {
      console.log('✅ Webhook set successfully!');
      
      // Get webhook info
      const infoResponse = await axios.get(`${BASE_URL}/getWebhookInfo`);
      if (infoResponse.data.ok) {
        const info = infoResponse.data.result;
        console.log('\nWebhook Info:');
        console.log(`  URL: ${info.url}`);
        console.log(`  Pending updates: ${info.pending_update_count}`);
        if (info.last_error_date) {
          console.log(`  ⚠️  Last error: ${info.last_error_message}`);
        }
      }
    } else {
      throw new Error('Failed to set webhook');
    }
  } catch (error: any) {
    console.error('❌ Error setting webhook:', error.response?.data || error.message);
    console.log('\n💡 You can set the webhook manually:');
    console.log(`   curl -X POST "${BASE_URL}/setWebhook?url=${encodeURIComponent(WEBHOOK_URL)}"`);
  }
}

async function getBotInfo() {
  try {
    const response = await axios.get(`${BASE_URL}/getMe`);
    if (response.data.ok) {
      const bot = response.data.result;
      console.log('\n🤖 Bot Info:');
      console.log(`  Username: @${bot.username}`);
      console.log(`  Name: ${bot.first_name}`);
      if (bot.can_join_groups) {
        console.log('  ✅ Can join groups');
      }
      if (bot.can_read_all_group_messages) {
        console.log('  ✅ Can read all group messages');
      }
    }
  } catch (error: any) {
    console.error('❌ Error getting bot info:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('🚀 Setting up Telegram Bot...\n');

  await getBotInfo();
  await setCommands();
  await setWebhook();

  console.log('\n✅ Setup complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Test your bot by sending /start');
  console.log('2. Make sure your webhook URL is accessible');
  console.log('3. Test commands: /help, /create, /list');
}

main().catch(console.error);

