# WagerX - Hackathon Submission

## 🎯 Project Overview

**WagerX** is a Telegram Mini App that enables friends to create and manage sports and crypto wagers using natural language. Built on BNB Chain, it combines AI-powered intent detection, smart contracts, and seamless wallet integration to make betting fun, social, and decentralized.

### Tagline
*"Bet with friends, not against the house. Natural language wagers powered by AI and blockchain."*

---

## ✨ Key Features

### 1. **Natural Language Wager Creation**
- Speak or type wagers in plain English
- AI-powered intent detection using Perplexity AI
- Automatic validation of wager parameters
- Example: *"I bet 10 BNB that Lakers beat Warriors on Dec 15th"*

### 2. **Multi-Chain Token Swaps**
- **Uniswap V4** integration for DEX swaps
- **Wormhole** for cross-chain token transfers
- **Circle CCTP** for USDC cross-chain transfers
- Comprehensive swap interface supporting multiple providers

### 3. **Smart Contract Escrow**
- Deployed on BNB Chain Testnet
- Automatic escrow management
- Winner payout with optional charity donations
- Transparent, on-chain resolution

### 4. **Telegram Integration**
- Native Telegram Mini App experience
- Bot commands for wager management
- Shareable invite links
- Real-time notifications

### 5. **Charity Donations**
- Optional percentage-based donations
- Automatic distribution to selected charities
- Transparent tracking on-chain

### 6. **Wallet Integration**
- **Privy** for embedded wallets (recommended)
- Support for existing wallets (MetaMask, WalletConnect, etc.)
- TON wallet support (optional)
- Seamless onboarding

---

## 🛠️ Technology Stack

### Frontend
- **Next.js 15.5.7** - React framework with App Router
- **TypeScript** - Type-safe development
- **Privy** - Wallet authentication and management
- **Telegram Mini App SDK** - Native Telegram integration
- **CSS Modules** - Scoped styling

### Backend & APIs
- **Next.js API Routes** - Serverless backend
- **Perplexity AI** - Natural language intent detection
- **Supabase** - Primary database (PostgreSQL)
- **Membase (Unibase)** - Optional decentralized memory layer

### Blockchain
- **BNB Chain (BSC Testnet)** - Smart contract deployment
- **Solidity** - Smart contract language
- **Ethers.js v6** - Blockchain interactions
- **Circle Programmable Wallets** - Escrow and USDC transfers

### Swap Providers
- **Uniswap V4 SDK** - DEX swaps
- **Wormhole TypeScript SDK** - Cross-chain transfers
- **Circle CCTP** - USDC cross-chain protocol

### AI & Plugins
- **Sidus AI Core** - Local AI agent framework
- **Custom Perplexity Plugin** - Exportable plugin for Sidus AI
- **Intent Detection** - Sports and crypto wager validation

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Telegram Mini App                      │
│  (Next.js Frontend + Telegram WebApp SDK)               │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌────────▼────────┐
│  Privy Wallets │   │  Telegram Bot   │
│  (Embedded)    │   │  (Commands)     │
└───────┬────────┘   └────────┬────────┘
        │                     │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │   Next.js API       │
        │   (Serverless)      │
        └──────────┬──────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼───┐   ┌──────▼──────┐  ┌───▼────┐
│Perplex│   │  Supabase   │  │Membase │
│ity AI │   │  (Primary)  │  │(Opt.)  │
└───┬───┘   └──────┬──────┘  └───┬────┘
    │              │              │
    └──────────────┼──────────────┘
                   │
        ┌──────────▼──────────┐
        │  BNB Chain (Testnet)│
        │  Smart Contracts    │
        └─────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Telegram account
- BNB Chain Testnet BNB (for gas)
- Environment variables configured

### Installation

```bash
# Clone the repository
git clone https://github.com/joboyebisi/wagerx.git
cd wagerx

# Install dependencies
npm install --legacy-peer-deps

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

### Environment Variables

See `.env.local.example` for required variables:
- `NEXT_PUBLIC_PRIVY_APP_ID` - Privy application ID
- `NEXT_PUBLIC_PERPLEXITY_API_KEY` - Perplexity AI key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `NEXT_PUBLIC_WAGER_CONTRACT_ADDRESS` - Deployed contract address

---

## 📱 Demo Instructions

### 1. **Access the Mini App**
- Open Telegram
- Search for your bot
- Click "Open Mini App" or use the web URL

### 2. **Create a Wager**
- Connect wallet (Privy recommended)
- Use natural language: *"Bet 5 BNB that Bitcoin hits $100k by Dec 31st"*
- AI validates and creates the wager
- Share invite link with friends

### 3. **Accept a Wager**
- Click on a pending wager
- Review details
- Click "Accept" and sign transaction
- Funds move to escrow

### 4. **Resolve a Wager**
- After condition is met, click "Resolve"
- Select winner
- Smart contract distributes funds
- Charity donation (if enabled) sent automatically

### 5. **Swap Tokens**
- Navigate to Swap section
- Choose swap provider (Uniswap/Wormhole/Circle)
- Enter amount and execute swap

---

## 🎨 Design Highlights

- **Mint green gradients** - Fresh, modern aesthetic
- **Blues and purples** - Trustworthy, professional feel
- **Telegram-native UI** - Seamless integration with Telegram theme
- **Responsive design** - Works on mobile and desktop
- **Accessibility** - WCAG-compliant components

---

## 🔐 Security Features

- **Smart contract escrow** - Funds locked until resolution
- **Multi-signature support** - For high-value wagers
- **Input validation** - AI-powered parameter checking
- **Transaction monitoring** - Real-time status tracking
- **Private key protection** - No server-side key storage

---

## 🌟 Innovation Points

1. **Natural Language Processing** - First-of-its-kind AI-powered wager creation
2. **Multi-Provider Swaps** - Unified interface for Uniswap, Wormhole, and Circle
3. **Telegram Native** - Deep integration with Telegram ecosystem
4. **Charity Integration** - Built-in donation mechanism
5. **Exportable Plugins** - Custom Perplexity plugin for Sidus AI framework

---

## 📊 Smart Contract Details

**Contract Address (BSC Testnet)**: `0xd8D86eCc3d2EFb0939611926c80DC8917440d776`

**Key Functions**:
- `createWager()` - Create new wager with escrow
- `acceptWager()` - Join existing wager
- `resolveWager()` - Distribute funds to winner
- `cancelWager()` - Cancel pending wager

**Features**:
- Automatic escrow management
- Charity donation support
- Multi-participant support
- On-chain resolution tracking

---

## 🔮 Future Enhancements

- [ ] Mainnet deployment
- [ ] Additional blockchain support (Ethereum, Polygon)
- [ ] Advanced AI features (odds calculation, risk assessment)
- [ ] Social features (leaderboards, achievements)
- [ ] Mobile app (React Native)
- [ ] Integration with sports data APIs
- [ ] Automated resolution via Chainlink oracles

---

## 📈 Metrics & Impact

- **Supported Chains**: BNB Chain (Testnet)
- **Supported Tokens**: BNB, USDC, LINK, and more via swaps
- **Transaction Speed**: ~3 seconds (BNB Chain)
- **Gas Efficiency**: Optimized smart contracts
- **User Experience**: < 5 clicks to create wager

---

## 👥 Team

**Developer**: [Your Name/Team Name]
**Contact**: [Your Email/Telegram]

---

## 📝 License

MIT License - Open source and available for community use

---

## 🔗 Links

- **GitHub Repository**: https://github.com/joboyebisi/wagerx
- **Live Demo**: [Your Vercel/Deployment URL]
- **Telegram Bot**: [Your Bot Username]
- **Video Demo**: [Link to demo video if available]

---

## 🏆 Hackathon Track

**Category**: [Web3 / DeFi / Social / AI - specify which]
**Track**: [Specify hackathon track if applicable]

---

## 📸 Screenshots

[Add screenshots of:]
1. Main dashboard
2. Natural language input
3. Wager creation flow
4. Swap interface
5. Telegram bot interaction

---

## 🎯 Problem Solved

Traditional betting platforms are:
- Centralized and take high fees
- Complex to use
- Not social
- Limited to specific sports/events

**WagerX solves this by:**
- ✅ Decentralized escrow (no house edge)
- ✅ Natural language interface (anyone can use)
- ✅ Social-first design (bet with friends)
- ✅ Flexible conditions (sports, crypto, custom)

---

## 💡 Technical Challenges Overcome

1. **Uniswap V4 SDK Compatibility** - Resolved ethers v6 compatibility issues with dynamic imports
2. **Next.js 15 Route Handlers** - Updated to async params pattern
3. **Telegram WebApp Integration** - Handled SSR issues and wallet conflicts
4. **Multi-Provider Swaps** - Unified interface for different swap protocols
5. **AI Intent Detection** - Robust validation of natural language wagers

---

## 🎬 Demo Video Script

1. **Introduction (0:00-0:30)**
   - Show Telegram Mini App opening
   - Explain the problem WagerX solves

2. **Wallet Connection (0:30-1:00)**
   - Connect wallet via Privy
   - Show seamless onboarding

3. **Create Wager (1:00-2:00)**
   - Use natural language to create wager
   - Show AI validation
   - Demonstrate shareable link

4. **Accept Wager (2:00-2:30)**
   - Show friend accepting wager
   - Transaction confirmation

5. **Resolve Wager (2:30-3:00)**
   - Show resolution flow
   - Winner payout
   - Charity donation (if enabled)

6. **Swap Feature (3:00-3:30)**
   - Demonstrate token swap
   - Show multiple providers

7. **Conclusion (3:30-4:00)**
   - Highlight key features
   - Call to action

---

## 📋 Submission Checklist

- [x] Code pushed to GitHub
- [x] Smart contracts deployed
- [x] Frontend deployed (Vercel)
- [x] Telegram bot configured
- [x] Documentation complete
- [ ] Demo video recorded
- [ ] Screenshots added
- [ ] Team information added
- [ ] License specified

---

## 🙏 Acknowledgments

- **Perplexity AI** - Natural language processing
- **Privy** - Wallet infrastructure
- **Circle** - Programmable wallets and CCTP
- **Wormhole** - Cross-chain infrastructure
- **Uniswap** - DEX protocol
- **Telegram** - Mini App platform
- **BNB Chain** - Blockchain infrastructure

---

**Built with ❤️ for the hackathon**
