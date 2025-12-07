/**
 * Telegram Bot Service
 * Handles Telegram bot commands as fallback for natural language
 * 
 * Commands:
 * /start - Welcome message and instructions
 * /create - Create a new wager
 * /accept <wagerId> - Accept a wager
 * /resolve <wagerId> - Resolve a wager
 * /cancel <wagerId> - Cancel a wager
 * /list - List all wagers
 * /wager <wagerId> - View wager details
 * /help - Show help message
 */

import axios from 'axios';

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: {
    id: number;
    type: string;
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  date: number;
  text?: string;
  entities?: Array<{
    offset: number;
    length: number;
    type: string;
  }>;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: TelegramUser;
    message?: TelegramMessage;
    data: string;
  };
}

export interface CommandHandler {
  command: string;
  description: string;
  handler: (message: TelegramMessage, args: string[]) => Promise<string>;
}

export class TelegramBotService {
  private botToken: string;
  private apiUrl: string;
  private baseUrl: string;

  constructor(botToken?: string) {
    this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN || '';
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    // Use relative URL for API calls (works in both client and server)
    this.apiUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';
  }

  /**
   * Parse command from message
   */
  parseCommand(message: TelegramMessage): { command: string; args: string[] } | null {
    if (!message.text) return null;

    const text = message.text.trim();
    
    // Check if it's a command (starts with /)
    if (!text.startsWith('/')) return null;

    const parts = text.split(/\s+/);
    const command = parts[0].substring(1).toLowerCase(); // Remove / and convert to lowercase
    const args = parts.slice(1);

    return { command, args };
  }

  /**
   * Handle /start command
   */
  async handleStart(message: TelegramMessage): Promise<string> {
    const userName = message.from.first_name || 'there';
    
    return `🎲 Welcome to WagerX, ${userName}!

I help you create and manage wagers on sports and crypto predictions using natural language or commands.

📝 **Quick Start:**
• Type naturally: "I bet 10 BNB that Lakers win on Dec 15th"
• Or use commands: /create, /accept, /resolve

🔧 **Available Commands:**
/create - Create a new wager
/accept <id> - Accept a wager
/resolve <id> - Resolve a wager
/cancel <id> - Cancel a wager
/list - List your wagers
/wager <id> - View wager details
/help - Show detailed help

💡 **Tip:** You can also open the Mini App for a better experience!

Need help? Type /help for more information.`;
  }

  /**
   * Handle /help command
   */
  async handleHelp(message: TelegramMessage): Promise<string> {
    return `📚 **WagerX Help**

**Natural Language Examples:**
• "I bet 10 BNB that Lakers beat Warriors on Dec 15th"
• "Wager 0.01 BNB that BTC > $50,000 by Dec 10th"
• "Accept wager #123"
• "Resolve wager #456"

**Commands:**
/create - Create a new wager
  Example: /create 10 BNB "Lakers win" @username

/accept <wagerId> - Accept a pending wager
  Example: /accept 123

/resolve <wagerId> - Resolve a wager (AI will verify)
  Example: /resolve 123

/cancel <wagerId> - Cancel a wager
  Example: /cancel 123

/list - List all your wagers
  Shows: pending, active, resolved wagers

/wager <wagerId> - View detailed wager info
  Example: /wager 123

**Wager Types:**
🏀 Sports - Football, Basketball, Soccer, etc.
💰 Crypto - BTC, ETH, BNB price predictions

**Charity:**
You can add charity donations when creating wagers:
"Bet 10 BNB with 5% to charity"

**Need Support?**
Open the Mini App for full features and wallet connection.`;
  }

  /**
   * Handle /create command
   */
  async handleCreate(message: TelegramMessage, args: string[]): Promise<string> {
    if (args.length < 3) {
      return `❌ **Invalid format**

Usage: /create <amount> <condition> <participant>

**Examples:**
/create 10 BNB "Lakers win on Dec 15th" @username
/create 0.01 BNB "BTC > $50k by Dec 10th" 0x1234...

**With charity:**
/create 10 BNB "Team wins" @user --charity 5%

💡 **Tip:** Use natural language for easier creation:
"I bet 10 BNB that Lakers win on Dec 15th"`;
    }

    // Parse arguments
    const amount = args[0];
    const condition = args.slice(1, -1).join(' '); // Everything except last arg
    const participant = args[args.length - 1];

    // Check for charity flag
    const charityIndex = args.findIndex(arg => arg.includes('--charity'));
    let charityPercentage = 0;
    if (charityIndex !== -1) {
      const charityArg = args[charityIndex];
      const match = charityArg.match(/(\d+)%/);
      if (match) {
        charityPercentage = parseInt(match[1]);
      }
    }

    try {
      // Call API to create wager
      const response = await axios.post(`${this.apiUrl}/api/wagers`, {
        amount,
        condition,
        participants: [message.from.id.toString(), participant],
        charityEnabled: charityPercentage > 0,
        charityPercentage,
        telegramUserId: message.from.id,
        telegramUsername: message.from.username,
      });

      if (response.data.wagerId) {
        return `✅ **Wager Created!**

📋 Wager ID: #${response.data.wagerId}
💰 Amount: ${amount}
📝 Condition: ${condition}
👥 Participants: You, ${participant}
${charityPercentage > 0 ? `💝 Charity: ${charityPercentage}%` : ''}

Share this wager ID with your friend to accept: ${response.data.wagerId}

View details: /wager ${response.data.wagerId}`;
      } else {
        throw new Error('Failed to create wager');
      }
    } catch (error: any) {
      return `❌ **Error creating wager**

${error.response?.data?.error || error.message}

💡 **Tip:** Make sure you're connected to a wallet in the Mini App first.`;
    }
  }

  /**
   * Handle /accept command
   */
  async handleAccept(message: TelegramMessage, args: string[]): Promise<string> {
    if (args.length === 0) {
      return `❌ **Missing wager ID**

Usage: /accept <wagerId>

Example: /accept 123`;
    }

    const wagerId = args[0];

    try {
      const response = await axios.post(`${this.apiUrl}/api/wagers/${wagerId}/accept`, {
        telegramUserId: message.from.id,
      });

      if (response.data.success) {
        return `✅ **Wager Accepted!**

📋 Wager ID: #${wagerId}
💰 Amount: ${response.data.amount}
📝 Condition: ${response.data.condition}

The wager is now active. It will be resolved automatically on the resolution date.

View details: /wager ${wagerId}`;
      } else {
        throw new Error('Failed to accept wager');
      }
    } catch (error: any) {
      return `❌ **Error accepting wager**

${error.response?.data?.error || error.message}

💡 Make sure:
• You're a participant in this wager
• You have sufficient BNB balance
• The wager is still pending`;
    }
  }

  /**
   * Handle /resolve command
   */
  async handleResolve(message: TelegramMessage, args: string[]): Promise<string> {
    if (args.length === 0) {
      return `❌ **Missing wager ID**

Usage: /resolve <wagerId>

Example: /resolve 123

🤖 AI will automatically verify the result and determine the winner.`;
    }

    const wagerId = args[0];

    try {
      const response = await axios.post(`${this.apiUrl}/api/wagers/${wagerId}/resolve`, {
        telegramUserId: message.from.id,
      });

      if (response.data.success) {
        const winner = response.data.winner;
        const evidence = response.data.evidence;

        return `✅ **Wager Resolved!**

📋 Wager ID: #${wagerId}
🏆 Winner: ${winner}
📊 Evidence: ${evidence}

${response.data.charityDonation ? `💝 Charity Donation: ${response.data.charityDonation.amount}` : ''}

View details: /wager ${wagerId}`;
      } else {
        throw new Error('Failed to resolve wager');
      }
    } catch (error: any) {
      return `❌ **Error resolving wager**

${error.response?.data?.error || error.message}

💡 Make sure:
• The resolution date has passed
• The wager is active
• AI verification completed successfully`;
    }
  }

  /**
   * Handle /cancel command
   */
  async handleCancel(message: TelegramMessage, args: string[]): Promise<string> {
    if (args.length === 0) {
      return `❌ **Missing wager ID**

Usage: /cancel <wagerId>

Example: /cancel 123`;
    }

    const wagerId = args[0];

    try {
      const response = await axios.post(`${this.apiUrl}/api/wagers/${wagerId}/cancel`, {
        telegramUserId: message.from.id,
      });

      if (response.data.success) {
        return `✅ **Wager Cancelled**

📋 Wager ID: #${wagerId}
💰 Refunds processed

All participants have been refunded.`;
      } else {
        throw new Error('Failed to cancel wager');
      }
    } catch (error: any) {
      return `❌ **Error cancelling wager**

${error.response?.data?.error || error.message}`;
    }
  }

  /**
   * Handle /list command
   */
  async handleList(msg: TelegramMessage): Promise<string> {
    try {
      const response: any = await axios.get(`${this.apiUrl}/api/wagers?telegramUserId=${msg.from.id}`);

      if (response.data.length === 0) {
        return `📋 **Your Wagers**

You don't have any wagers yet.

Create one with /create or use natural language:
"I bet 10 BNB that Team A wins"`;
      }

      const wagers = response.data;
      let message = `📋 **Your Wagers** (${wagers.length})\n\n`;

      wagers.slice(0, 10).forEach((wager: any) => {
        const statusEmojiMap: Record<string, string> = {
          pending: '⏳',
          active: '🟢',
          resolved: '✅',
          cancelled: '❌',
        };
        const statusEmoji = statusEmojiMap[wager.status] || '📋';

        message += `${statusEmoji} **#${wager.id}** - ${wager.condition}\n`;
        message += `   💰 ${wager.amount} BNB | Status: ${wager.status}\n`;
        message += `   /wager ${wager.id}\n\n`;
      });

      if (wagers.length > 10) {
        message += `\n... and ${wagers.length - 10} more. Open Mini App to see all.`;
      }

      return message;
    } catch (error: any) {
      return `❌ **Error fetching wagers**

${error.response?.data?.error || error.message}`;
    }
  }

  /**
   * Handle /payout command
   */
  async handlePayout(message: TelegramMessage, args: string[]): Promise<string> {
    if (args.length === 0) {
      return `❌ **Missing wager ID**

Usage: /payout <wagerId>

Example: /payout 123`;
    }

    const wagerId = args[0];

    try {
      const response: any = await axios.get(`${this.apiUrl}/api/wagers/${wagerId}`);
      
      if (!response.data) {
        return `❌ **Wager #${wagerId} not found.**`;
      }

      const wager = response.data;

      if (wager.status === 'resolved' && wager.winner) {
        return `✅ **Payout Status for Wager #${wagerId}**

Status: **Completed**
Winner: ${wager.winner}
Amount: ${wager.amount} BNB

Funds have been transferred to the winner's wallet.`;
      } else if (wager.status === 'resolved' && !wager.winner) {
        return `⚠️ **Payout Status for Wager #${wagerId}**

Status: **Resolved, but winner not recorded.**
Please contact support if you believe this is an error.`;
      } else if (wager.status === 'active' || wager.status === 'pending') {
        return `⏳ **Payout Status for Wager #${wagerId}**

Status: **${wager.status.charAt(0).toUpperCase() + wager.status.slice(1)}**
Payout will be processed once the wager is resolved.`;
      } else if (wager.status === 'cancelled') {
        return `❌ **Payout Status for Wager #${wagerId}**

Status: **Cancelled**
No payout was made for this wager.`;
      } else {
        return `❓ **Payout Status for Wager #${wagerId}**

Status: **Unknown**
Unable to determine payout status.`;
      }
    } catch (error: any) {
      console.error('Error checking payout status:', error);
      return `❌ **Error checking payout status for Wager #${wagerId}**

${error.message || 'An unexpected error occurred.'}`;
    }
  }

  /**
   * Handle /wager command
   */
  async handleWager(message: TelegramMessage, args: string[]): Promise<string> {
    if (args.length === 0) {
      return `❌ **Missing wager ID**

Usage: /wager <wagerId>

Example: /wager 123`;
    }

    const wagerId = args[0];

    try {
      const response = await axios.get(`${this.apiUrl}/api/wagers/${wagerId}`);

      if (response.data) {
        const wager = response.data;
        const statusEmojiMap: Record<string, string> = {
          pending: '⏳',
          active: '🟢',
          resolved: '✅',
          cancelled: '❌',
        };
        const statusEmoji = statusEmojiMap[wager.status] || '📋';

        let message = `${statusEmoji} **Wager #${wager.id}**\n\n`;
        message += `📝 **Condition:** ${wager.condition}\n`;
        message += `💰 **Amount:** ${wager.amount} BNB\n`;
        message += `📊 **Status:** ${wager.status}\n`;
        message += `👥 **Participants:** ${wager.participants.length}\n`;

        if (wager.winner) {
          message += `🏆 **Winner:** ${wager.winner}\n`;
        }

        if (wager.charityEnabled) {
          message += `💝 **Charity:** ${wager.charityPercentage}%`;
          if (wager.charityDonated) {
            message += ` (${wager.charityDonated} BNB donated)`;
          }
        }

        message += `\n\n**Actions:**\n`;
        if (wager.status === 'pending') {
          message += `/accept ${wager.id} - Accept this wager\n`;
        }
        if (wager.status === 'active') {
          message += `/resolve ${wager.id} - Resolve this wager\n`;
        }
        if (wager.status === 'pending' || wager.status === 'active') {
          message += `/cancel ${wager.id} - Cancel this wager\n`;
        }

        return message;
      } else {
        throw new Error('Wager not found');
      }
    } catch (error: any) {
      return `❌ **Wager not found**

${error.response?.data?.error || error.message}

💡 Make sure the wager ID is correct.`;
    }
  }

  /**
   * Process incoming message
   */
  async processMessage(message: TelegramMessage): Promise<string> {
    const parsed = this.parseCommand(message);
    
    if (!parsed) {
      // Not a command, try natural language processing
      try {
        const response = await axios.post(`${this.apiUrl}/api/intent`, {
          message: message.text,
          telegramUserId: message.from.id,
        });

        const intent = response.data;
        
        // Route based on intent
        switch (intent.type) {
          case 'create':
            return await this.handleCreate(message, [intent.amount || '', intent.condition || '', ...(intent.participants || [])]);
          case 'accept':
            return await this.handleAccept(message, intent.wagerId ? [intent.wagerId] : []);
          case 'resolve':
            return await this.handleResolve(message, intent.wagerId ? [intent.wagerId] : []);
          case 'query':
            return await this.handleList(message);
          default:
            return `🤔 I didn't understand that. Try:\n• Natural language: "I bet 10 BNB that..."\n• Commands: /help`;
        }
      } catch (error) {
        return `🤔 I didn't understand that. Try:\n• Natural language: "I bet 10 BNB that..."\n• Commands: /help`;
      }
    }

    const { command, args } = parsed;

    // Route to command handler
    switch (command) {
      case 'start':
        return await this.handleStart(message);
      case 'help':
        return await this.handleHelp(message);
      case 'create':
        return await this.handleCreate(message, args);
      case 'accept':
        return await this.handleAccept(message, args);
      case 'resolve':
        return await this.handleResolve(message, args);
      case 'cancel':
        return await this.handleCancel(message, args);
      case 'list':
        return await this.handleList(message);
      case 'wager':
        return await this.handleWager(message, args);
      case 'payout':
        return await this.handlePayout(message, args);
      default:
        return `❓ Unknown command: /${command}\n\nType /help for available commands.`;
    }
  }

  /**
   * Send message via Telegram Bot API
   */
  async sendMessage(chatId: number, text: string, parseMode: 'Markdown' | 'HTML' = 'Markdown'): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      });
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      throw error;
    }
  }

  /**
   * Set bot commands for Telegram menu
   */
  async setCommands(): Promise<void> {
    const commands = [
      { command: 'start', description: 'Start using WagerX' },
      { command: 'create', description: 'Create a new wager' },
      { command: 'accept', description: 'Accept a wager' },
      { command: 'resolve', description: 'Resolve a wager' },
      { command: 'list', description: 'List your wagers' },
      { command: 'wager', description: 'View wager details' },
      { command: 'help', description: 'Show help message' },
    ];

    try {
      await axios.post(`${this.baseUrl}/setMyCommands`, {
        commands,
      });
    } catch (error) {
      console.error('Error setting bot commands:', error);
    }
  }
}

export const telegramBotService = new TelegramBotService();

