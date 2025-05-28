# WagerX - Decentralized Betting Platform

WagerX is a Web3 Decentralized Application (DApp) designed to streamline friendly wagers within Telegram groups. It leverages an AI agent to automate the tedious aspects of betting, from setup and fund collection to outcome verification and payouts, all powered by the Solana blockchain.

## Features

- Natural language wager recognition in Telegram groups
- Automated Solana wallet management
- Secure fund collection and distribution
- Integration with OKX DEX for token swaps
- Outcome verification using Perplexity AI
- AI-powered deadline detection for wagers
- Interactive bot commands for wager management

## Key Integrations

- **OKX DEX API:** Enables automatic, on-chain token swaps (e.g., SOL to USDC) for escrow and payouts, ensuring all participants can use their preferred token and receive USDC regardless of how they funded the wager. The MVP includes a mock for region-restricted environments, so the demo always works.
- **Perplexity API:** Powers natural language wager detection and outcome verification, allowing users to create and resolve wagers using plain English. The bot uses Perplexity to extract wager details and to verify results based on real-world data.

## Perplexity API Usage

WagerX uses the Perplexity API (Sonar model) for two core features:
- **Wager Detection:** When a user sends a message, the bot sends it to Perplexity with a system prompt asking for a structured JSON response indicating if the message is a wager, and extracting the description, amount, asset, and participants.
- **Outcome Verification:** After the wager deadline, the bot sends the wager description and proposed outcome to Perplexity, which returns a confidence score and explanation for whether the outcome matches the wager conditions.

This allows WagerX to automate both the creation and resolution of wagers using natural language, making the experience seamless and user-friendly.

## OKX DEX API Usage

WagerX integrates the OKX DEX API to:
- **Swap Tokens Automatically:** When users fund a wager with SOL but the payout is in USDC, the bot uses OKX DEX to swap SOL to USDC on-chain.
- **Automate Payouts:** After a wager is resolved, the bot pays out the winner in USDC, regardless of the original funding token.
- **Demo-Ready:** If OKX DEX is not accessible due to region restrictions, the bot mocks the swap so the demo flow is never blocked.

## Key Integrations

- **OKX DEX API:** Enables automatic, on-chain token swaps (e.g., SOL to USDC) for escrow and payouts, ensuring all participants can use their preferred token and receive USDC regardless of how they funded the wager. The MVP includes a mock for region-restricted environments, so the demo always works.
- **Perplexity API:** Powers natural language wager detection and outcome verification, allowing users to create and resolve wagers using plain English. The bot uses Perplexity to extract wager details and to verify results based on real-world data.

## Perplexity API Usage

WagerX uses the Perplexity API (Sonar model) for two core features:
- **Wager Detection:** When a user sends a message, the bot sends it to Perplexity with a system prompt asking for a structured JSON response indicating if the message is a wager, and extracting the description, amount, asset, and participants.
- **Outcome Verification:** After the wager deadline, the bot sends the wager description and proposed outcome to Perplexity, which returns a confidence score and explanation for whether the outcome matches the wager conditions.

This allows WagerX to automate both the creation and resolution of wagers using natural language, making the experience seamless and user-friendly.

## OKX DEX API Usage

WagerX integrates the OKX DEX API to:
- **Swap Tokens Automatically:** When users fund a wager with SOL but the payout is in USDC, the bot uses OKX DEX to swap SOL to USDC on-chain.
- **Automate Payouts:** After a wager is resolved, the bot pays out the winner in USDC, regardless of the original funding token.
- **Demo-Ready:** If OKX DEX is not accessible due to region restrictions, the bot mocks the swap so the demo flow is never blocked.

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

    # OKX DEX API
   OKX_API_KEY=your_okx_api_key
   OKX_SECRET_KEY=your_okx_secret_key
   OKX_PASSPHRASE=your_okx_passphrase

   # Perplexity API
   PERPLEXITY_API_KEY=your_perplexity_api_key

   # Solana RPC URL (using devnet for development)
   SOLANA_RPC_URL=https://api.devnet.solana.com

   # Firebase Config
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   FIREBASE_APP_ID=your_firebase_app_id

<<<<<<< HEAD
   # OKX DEX API
   OKX_API_KEY=your_okx_api_key
   OKX_SECRET_KEY=your_okx_secret_key
   OKX_PASSPHRASE=your_okx_passphrase

   # Perplexity API
   PERPLEXITY_API_KEY=your_perplexity_api_key
=======
  
>>>>>>> f33791fe56ee8d78be337cd1c89657c35c5bbc82
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Set up your Telegram bot:
   - Create a new bot using BotFather on Telegram
   - Get the bot token and add it to your `.env.local` file
   - Set up the webhook URL to point to your deployment URL

6. **Local Development with ngrok:**
   - Install ngrok: https://ngrok.com/download
   - Start your dev server (`npm run dev`)
   - In a new terminal, run:
     ```bash
     ngrok http 3000
     ```
   - Copy the HTTPS forwarding URL from ngrok and set it as your Telegram webhook:
     ```
     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<NGROK_HTTPS_URL>/api/bot
     ```
   - Now Telegram can reach your local server for development and testing.

## Development

The project is built with:
- Next.js 14
- TypeScript
- Solana Web3.js
- Firebase
- Telegram Bot API
- OKX DEX API
- Perplexity API

## Project Structure

src/
├── app/
│ ├── api/
│ │ └── bot/
│ │ └── route.ts # Telegram bot webhook handler
│ ├── layout.tsx # Root layout
│ ├── page.tsx # Home page
│ └── globals.css # Global styles
├── lib/
│ ├── solana/ # Solana wallet and transaction utilities
│ ├── firebase/ # Firebase configuration and utilities
│ └── telegram/ # Telegram bot utilities
└── types/ # TypeScript type definitions


## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For support or inquiries, reach out to [your contact information].

## Acknowledgments

- Thanks to the Solana, OKX, and Perplexity teams for their support and APIs.
- Special thanks to all contributors and users of WagerX.
