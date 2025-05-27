# WagerX - Decentralized Betting Platform

WagerX is a Web3 Decentralized Application (DApp) designed to streamline friendly wagers within Telegram groups. It leverages an AI agent to automate the tedious aspects of betting, from setup and fund collection to outcome verification and payouts, all powered by the Solana blockchain.

## Features

- Natural language wager recognition in Telegram groups
- Automated Solana wallet management
- Secure fund collection and distribution
- Integration with OKX DEX for token swaps
- Outcome verification using Perplexity AI

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with the following variables:
   ```
   # Telegram Bot Token
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

   # Solana RPC URL (using devnet for development)
   SOLANA_RPC_URL=https://api.devnet.solana.com

   # Firebase Config
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   FIREBASE_APP_ID=your_firebase_app_id

   # OKX DEX API
   OKX_API_KEY=your_okx_api_key
   OKX_SECRET_KEY=your_okx_secret_key
   OKX_PASSPHRASE=your_okx_passphrase
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Set up your Telegram bot:
   - Create a new bot using BotFather on Telegram
   - Get the bot token and add it to your `.env.local` file
   - Set up the webhook URL to point to your deployment URL

## Development

The project is built with:
- Next.js 14
- TypeScript
- Solana Web3.js
- Firebase
- Telegram Bot API
- OKX DEX API

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── bot/
│   │       └── route.ts    # Telegram bot webhook handler
│   ├── layout.tsx          # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── lib/
│   ├── solana/            # Solana wallet and transaction utilities
│   ├── firebase/          # Firebase configuration and utilities
│   └── telegram/          # Telegram bot utilities
└── types/                 # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT 