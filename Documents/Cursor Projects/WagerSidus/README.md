# WagerSidus - Telegram Wager Bot

A Telegram Mini App that enables friends to wager on **Sports** and **Crypto** predictions using natural language, powered by Sidus AI, DeepSeek, Membase, and BNB Chain.

## ✨ Features

- 🔐 **Wallet Integration**: TON Connect (prioritized) and BNB wallets
- 💬 **Natural Language Interface**: Create wagers using plain English
- 🏀 **Sports Wagers**: Bet on sports events with API verification
- 💰 **Crypto Wagers**: Predict crypto prices using CoinMarketCap
- 🤖 **AI Agent Verification**: Automatic result verification via APIs
- 💝 **Charity Donations**: Optional percentage of winnings to charity
- 🧠 **Membase Memory**: Persistent memory for agent interoperability
- ⛓️ **BNB Chain**: All wagers executed on BNB Chain smart contracts

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- API Keys:
  - Privy App ID
  - DeepSeek API Key
  - Sidus AI API Key
  - CoinMarketCap API Key
  - Membase API Key
  - Sports API Key (optional)

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd WagerSidus

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

### Build

```bash
npm run build
npm start
```

## 📚 Documentation

All documentation is included in this README. For deployment, see the deployment section below.

## 🏗️ Project Structure

```
WagerSidus/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── charity/       # Charity operations
│   │   ├── intent/        # Intent detection
│   │   ├── memory/        # Memory operations
│   │   ├── verify/        # Wager verification
│   │   └── wagers/        # Wager management
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── CharitySelector.tsx
│   ├── Dashboard.tsx
│   ├── NaturalLanguageInput.tsx
│   └── WalletConnect.tsx
├── lib/                   # Library code
│   ├── services/         # Business logic
│   │   ├── aiAgent.ts    # AI agent verification
│   │   ├── charity.ts    # Charity service
│   │   ├── deepseek.ts   # DeepSeek AI
│   │   ├── membase.ts    # Membase integration
│   │   ├── memory.ts     # Memory service
│   │   ├── sidusAI.ts    # Sidus AI Core
│   │   └── verification.ts # Result verification
│   └── supabase/         # Supabase (optional)
└── types/                # TypeScript definitions
```

## 🎯 Wager Types

### Sports Wagers
- Football, Basketball, Baseball, Soccer, etc.
- Verifiable via sports APIs
- Example: "Lakers beat Warriors on December 15th"

### Crypto Wagers
- Bitcoin, Ethereum, BNB, and all major coins
- Verifiable via CoinMarketCap API
- Example: "BTC > $50000 by December 10th"

## 💝 Charity Feature

Users can optionally donate a percentage (1-50%) of winnings to charity:
- Select from popular charities
- Or enter custom charity address
- Automatic processing on wager resolution
- Transparent on-chain transactions

## 🔧 Tech Stack

- **Framework**: Next.js 15.5.7 (patched)
- **Language**: TypeScript
- **Auth**: Privy
- **Wallets**: TON Connect, MetaMask, WalletConnect
- **AI**: DeepSeek, Sidus AI Core
- **Memory**: Membase
- **Verification**: CoinMarketCap API, Sports APIs
- **Blockchain**: BNB Chain (BSC)
- **Deployment**: Vercel

## 📝 Environment Variables

See `.env.local.example` for all required variables.

## 🚀 Deploy to Vercel

1. Push code to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or pull request.

## 📞 Support

For issues and questions, please open an issue on GitHub.
