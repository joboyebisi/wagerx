# WagerSidus - Hackathon Submission

## 🎯 Project Overview

**WagerSidus** is a revolutionary Telegram Mini App that enables friends to create, manage, and resolve wagers on sports and cryptocurrency predictions using natural language. Built on BNB Chain with AI-powered verification, it combines the convenience of Telegram, the security of blockchain, and the intelligence of AI agents to create a seamless betting experience.

### Problem Statement

Traditional betting platforms suffer from several critical issues:
- **Complexity**: Users must navigate complicated forms and interfaces
- **Trust Issues**: Centralized platforms can manipulate outcomes
- **Limited Verification**: Manual verification of results is slow and error-prone
- **No Social Integration**: Existing platforms lack the social context of friendly wagers
- **Limited Categories**: Most platforms focus on one category (sports OR crypto)

### Our Solution

WagerSidus solves these problems by:
1. **Natural Language Interface**: Users simply type what they want to bet on in plain English
2. **Blockchain Security**: All wagers are executed on BNB Chain smart contracts, ensuring transparency and immutability
3. **AI-Powered Verification**: Perplexity AI automatically verifies outcomes using real-time data from APIs
4. **Telegram Integration**: Native Telegram Mini App experience - no app downloads required
5. **Multi-Category Support**: Sports and crypto predictions in one platform
6. **Charity Integration**: Optional donations to charity from winnings

---

## ✨ Key Features

### 1. Natural Language Wager Creation
Users can create wagers using conversational language:
- *"I bet $10 that Lakers will beat Warriors on December 15th"*
- *"Wager 0.01 BNB that BTC will be above $50,000 by December 10th"*
- *"Bet $20 on Manchester United winning, with 10% to charity"*

The system uses **Perplexity AI** with the `llama-3.1-sonar-small-128k-online` model to:
- Detect intent (create, accept, resolve, cancel, query)
- Extract participants, amounts, conditions, and dates
- Categorize as sports or crypto
- Identify optional charity donations

### 2. Multi-Wallet Support
- **TON Connect** (prioritized for Telegram users)
- **MetaMask** (Ethereum/BNB Chain)
- **WalletConnect** (universal wallet support)

Powered by **Privy** for seamless wallet management and authentication.

### 3. AI Agent Verification System
Our AI agents automatically verify wager outcomes:

**For Sports Wagers:**
- Uses Perplexity's real-time search to fetch game results
- Verifies conditions (team wins, scores, etc.)
- Provides evidence with citations
- Determines winner based on verified results

**For Crypto Wagers:**
- Fetches historical price data via CoinMarketCap API
- Verifies price conditions (e.g., "BTC > $50,000")
- Checks target dates and conditions
- Automatically determines winner

### 4. Smart Contract Integration
All wagers are executed on **BNB Chain (BSC Testnet)** using a custom Solidity smart contract:

**Key Contract Features:**
- Wager creation with participant management
- Secure fund escrow
- Automatic winner determination
- Charity donation distribution
- Refund mechanism for cancelled wagers
- Event emission for transparency

**Contract Functions:**
- `createWager()`: Create a new wager with participants, amount, and conditions
- `acceptWager()`: Accept and activate a pending wager
- `resolveWager()`: Resolve wager and distribute winnings (with optional charity)
- `cancelWager()`: Cancel and refund participants
- `getWager()`: Query wager details

### 5. Charity Donation Feature
Users can optionally donate a percentage (1-50%) of winnings to charity:
- Pre-configured charity addresses
- Custom charity address support
- Automatic distribution on wager resolution
- Transparent on-chain transactions
- Tax-deductible tracking

### 6. Membase Memory System
Persistent memory layer for:
- Conversation history
- User preferences
- Wager patterns
- Agent interoperability
- Knowledge base storage

### 7. Token Swap Integration
Built-in token swap functionality:
- Swap LINK tokens for BNB (for gas fees)
- PancakeSwap V3 integration
- Direct swap via smart contracts
- Balance checking and approval management

---

## 🏗️ Technical Architecture

### Frontend Architecture
```
Next.js 15.5.7 (App Router)
├── Components
│   ├── Dashboard.tsx - Main interface
│   ├── NaturalLanguageInput.tsx - NL processing UI
│   ├── WalletConnect.tsx - Wallet integration
│   ├── CharitySelector.tsx - Charity selection
│   └── SwapTokens.tsx - Token swap interface
├── API Routes
│   ├── /api/intent - Intent detection
│   ├── /api/wagers - Wager management
│   ├── /api/verify - Wager verification
│   ├── /api/memory - Memory operations
│   └── /api/charity - Charity operations
└── Services Layer
    ├── Perplexity Service - AI intent detection & resolution
    ├── AI Agent Service - Automated verification
    ├── Sidus AI Core - Smart contract deployment
    ├── Memory Service - Membase integration
    └── Verification Service - API data fetching
```

### Backend Architecture
```
API Layer (Next.js API Routes)
    ↓
Service Layer
    ├── Perplexity AI → Intent Detection & Resolution
    ├── CoinMarketCap API → Crypto Price Verification
    ├── Sports APIs → Game Result Verification
    └── Membase → Memory Storage
    ↓
Blockchain Layer
    ├── BNB Chain (BSC Testnet)
    ├── WagerContract.sol
    └── Ethers.js for interactions
```

### Data Flow

**Wager Creation Flow:**
1. User types natural language wager in Telegram
2. Perplexity AI extracts intent and parameters
3. System validates wager (category, participants, amount)
4. Smart contract deployed/updated via Sidus AI Core
5. User confirms transaction in wallet
6. Wager stored in Supabase (optional) and Membase
7. Participants notified via Telegram

**Wager Resolution Flow:**
1. Wager reaches resolution date
2. AI Agent Service triggers verification
3. Perplexity fetches real-time data (sports results or crypto prices)
4. Verification Service validates condition
5. AI determines winner based on verified data
6. Smart contract resolves wager and distributes funds
7. Charity donation processed (if enabled)
8. All participants notified

---

## 🔧 Tech Stack

### Frontend
- **Next.js 15.5.7** - React framework with App Router
- **TypeScript** - Type-safe development
- **React 18.3.1** - UI library
- **TailwindCSS** - Styling
- **Zustand** - State management

### Blockchain & Wallets
- **BNB Chain (BSC Testnet)** - Smart contract deployment
- **Solidity 0.8.20** - Smart contract language
- **Ethers.js 6.11.1** - Blockchain interactions
- **Privy** - Wallet authentication
- **TON Connect** - Telegram wallet integration
- **MetaMask** - Browser wallet
- **WalletConnect** - Universal wallet protocol

### AI & APIs
- **Perplexity AI** - Intent detection and wager resolution
  - Model: `llama-3.1-sonar-small-128k-online`
  - Real-time search capabilities
  - Citation support
- **CoinMarketCap API** - Cryptocurrency price data
- **Sports APIs** - Game result verification
- **Sidus AI Core** - Smart contract deployment automation

### Storage & Memory
- **Membase (Unibase)** - Decentralized AI memory layer
- **Supabase** - Optional relational database
  - Wager storage
  - Agent connections
  - User data

### Development Tools
- **Hardhat** - Smart contract development
- **solc** - Solidity compiler
- **ESLint** - Code linting
- **TypeScript** - Type checking

### Deployment
- **Vercel** - Frontend hosting
- **GitHub** - Version control

---

## 💻 Implementation Highlights

### 1. Natural Language Processing

**Perplexity Service Implementation:**
```typescript
// Intent detection with context awareness
async detectIntent(userMessage: string, context?: any): Promise<WagerIntent> {
  const systemPrompt = `You are an AI assistant that helps detect wager intents...`;
  
  const response = await axios.post(PERPLEXITY_API_URL, {
    model: 'llama-3.1-sonar-small-128k-online',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Context: ${JSON.stringify(context)}\n\nUser: ${userMessage}` }
    ],
    temperature: 0.2,
    return_citations: true
  });
  
  // Extract structured intent from AI response
  return parseIntent(response.data);
}
```

**Key Features:**
- Context-aware intent detection
- Multi-parameter extraction (amount, participants, dates, conditions)
- Category classification (sports vs crypto)
- Charity detection
- Confidence scoring

### 2. Smart Contract Design

**WagerContract.sol Highlights:**
- Gas-optimized struct design
- Secure fund escrow
- Charity donation mechanism
- Event emission for transparency
- Access control for resolution

**Security Features:**
- Participant validation
- Amount verification
- Status state machine
- Refund mechanism
- Owner controls

### 3. AI Agent Verification

**Automated Resolution Process:**
```typescript
async verifyWager(request: AgentVerificationRequest): Promise<AgentVerificationResponse> {
  // 1. Fetch real-time data via Perplexity
  const result = await perplexityService.resolveCryptoWager(
    symbol, condition, targetDate
  );
  
  // 2. Verify condition
  const verified = validateCondition(result, condition);
  
  // 3. Determine winner
  const winner = await determineWinner(wager, result);
  
  // 4. Calculate charity donation
  const charityDonation = charityService.calculateDonation(wager, totalWinnings);
  
  return { verified, winner, charityDonation, evidence: result.evidence };
}
```

### 4. Multi-Wallet Integration

**Privy Configuration:**
- Seamless wallet connection
- Multiple wallet support
- Transaction signing
- Network switching (BNB Chain)
- User authentication

### 5. Memory System

**Membase Integration:**
- Decentralized storage
- Agent interoperability
- Persistent conversation history
- Knowledge base management
- Local storage fallback

---

## 🚧 Challenges & Solutions

### Challenge 1: Natural Language Understanding
**Problem:** Users express wagers in various ways, making intent detection difficult.

**Solution:**
- Implemented Perplexity AI with specialized prompts
- Created fallback parsing for common patterns
- Added confidence scoring to handle ambiguous inputs
- Built context-aware detection using conversation history

### Challenge 2: Real-Time Verification
**Problem:** Verifying sports results and crypto prices requires real-time data access.

**Solution:**
- Leveraged Perplexity's real-time search capabilities
- Integrated CoinMarketCap API for crypto prices
- Used sports APIs for game results
- Implemented caching to reduce API calls

### Challenge 3: Smart Contract Deployment
**Problem:** Deploying contracts on BNB Chain required testnet BNB, which was difficult to obtain.

**Solution:**
- Created token swap functionality (LINK → BNB)
- Implemented direct `solc` compilation and deployment
- Built deployment scripts with error handling
- Documented multiple faucet options

### Challenge 4: Wallet Integration
**Problem:** Supporting multiple wallets (TON, MetaMask, WalletConnect) with different protocols.

**Solution:**
- Used Privy for unified wallet management
- Prioritized TON Connect for Telegram users
- Implemented fallback mechanisms
- Created wallet-agnostic transaction handling

### Challenge 5: Charity Distribution
**Problem:** Implementing automatic charity donations while maintaining transparency.

**Solution:**
- Built charity donation logic into smart contract
- Created charity selector UI component
- Implemented percentage-based calculations
- Added on-chain tracking for transparency

---

## 🎮 Demo & Usage

### Getting Started

1. **Install Dependencies:**
```bash
npm install
```

2. **Set Up Environment Variables:**
```bash
cp .env.local.example .env.local
# Add your API keys:
# - NEXT_PUBLIC_PERPLEXITY_API_KEY
# - NEXT_PUBLIC_PRIVY_APP_ID
# - MEMBASE_ID, MEMBASE_ACCOUNT, MEMBASE_SECRET_KEY
# - SIDUS_AI_API_KEY
# - COINMARKETCAP_API_KEY
```

3. **Run Development Server:**
```bash
npm run dev
```

4. **Access via Telegram:**
   - Open Telegram Mini App
   - Connect wallet (TON Connect recommended)
   - Start creating wagers!

### Example Wagers

**Sports Wager:**
```
"I bet $10 that the Lakers will beat the Warriors on December 15th, 
with 5% going to charity"
```

**Crypto Wager:**
```
"Wager 0.01 BNB that BTC will be above $50,000 by December 10th"
```

**Accepting a Wager:**
```
"Accept wager #123"
```

**Resolving a Wager:**
```
"Resolve wager #123"
```

### Smart Contract Interaction

**Deploy Contract:**
```bash
node scripts/deploy-with-solc.js
```

**Check Balance:**
```bash
node scripts/check-balance.js
```

**Swap Tokens:**
```bash
node scripts/swap-link-to-bnb.js
```

---

## 🔮 Future Improvements

### Short-Term (Next Sprint)
1. **Enhanced Sports Coverage**
   - Support for more sports leagues
   - Live score integration
   - Betting odds integration

2. **Improved AI Accuracy**
   - Fine-tuned prompts for better intent detection
   - Multi-model verification for critical wagers
   - Confidence threshold adjustments

3. **User Experience**
   - Wager templates
   - Quick actions (re-bet, copy wager)
   - Notification system

### Medium-Term (Next Quarter)
1. **Multi-Chain Support**
   - Ethereum mainnet
   - Polygon
   - Arbitrum

2. **Advanced Features**
   - Wager pools (multiple participants)
   - Conditional wagers (if-then scenarios)
   - Wager sharing via Telegram

3. **Analytics Dashboard**
   - Win/loss statistics
   - Profit tracking
   - Charity donation history

### Long-Term Vision
1. **Decentralized Governance**
   - DAO for platform decisions
   - Community-driven charity selection
   - Protocol upgrades

2. **AI Agent Marketplace**
   - Third-party verification agents
   - Custom agent creation
   - Agent reputation system

3. **Enterprise Features**
   - API for businesses
   - White-label solutions
   - Custom integrations

---

## 📊 Project Statistics

- **Lines of Code:** ~5,000+
- **Smart Contracts:** 1 (WagerContract.sol)
- **API Routes:** 5
- **React Components:** 6
- **Services:** 8
- **Dependencies:** 25+
- **Development Time:** Hackathon duration
- **Blockchain:** BNB Chain (BSC Testnet)

---

## 🏆 Hackathon Categories

This project fits into multiple hackathon categories:

1. **Best Use of AI/ML**
   - Perplexity AI for intent detection
   - Automated wager verification
   - AI agent system

2. **Best DeFi Project**
   - Smart contract-based wagers
   - Token swaps
   - On-chain charity donations

3. **Best Telegram Integration**
   - Native Telegram Mini App
   - TON Connect integration
   - Seamless user experience

4. **Best Social Impact**
   - Charity donation feature
   - Transparent on-chain donations
   - Community-driven giving

5. **Most Innovative**
   - Natural language wager creation
   - AI-powered verification
   - Multi-category support

---

## 🛠️ Technical Achievements

1. **Natural Language Processing**
   - Successfully implemented intent detection from conversational input
   - Extracted structured data from unstructured text
   - Handled edge cases and ambiguous inputs

2. **Blockchain Integration**
   - Deployed smart contracts on BNB Chain
   - Implemented secure fund escrow
   - Created gas-efficient contract design

3. **AI Verification System**
   - Automated wager resolution using real-time data
   - Multi-source verification (Perplexity + APIs)
   - Evidence-based winner determination

4. **Multi-Wallet Support**
   - Unified wallet management via Privy
   - TON Connect integration for Telegram
   - Cross-wallet compatibility

5. **Charity Integration**
   - On-chain charity donations
   - Percentage-based calculations
   - Transparent transaction tracking

---

## 📝 Code Quality

- **TypeScript** for type safety
- **ESLint** for code quality
- **Modular architecture** for maintainability
- **Error handling** throughout
- **Documentation** in code comments
- **Environment variable** management
- **Security best practices** in smart contracts

---

## 🔒 Security Considerations

1. **Smart Contract Security**
   - Input validation
   - Access control
   - Reentrancy protection
   - Safe math operations

2. **API Security**
   - Environment variable protection
   - Rate limiting (future)
   - Input sanitization
   - Error message sanitization

3. **Wallet Security**
   - Private key never exposed
   - Transaction signing via wallet
   - Network validation

---

## 📚 Documentation

- **README.md** - Project overview and quick start
- **Code Comments** - Inline documentation
- **Type Definitions** - TypeScript interfaces
- **API Documentation** - Route descriptions

---

## 🤝 Team & Acknowledgments

### Technologies Used
- **Perplexity AI** - For natural language understanding
- **Sidus AI Core** - For smart contract deployment
- **Membase** - For decentralized memory
- **Privy** - For wallet management
- **BNB Chain** - For blockchain infrastructure
- **Telegram** - For platform integration
- **Vercel** - For deployment

### Special Thanks
- Perplexity AI team for excellent API
- Sidus AI for agent infrastructure
- BNB Chain community for testnet support
- Telegram for Mini App platform

---

## 🚀 Deployment

### Production Deployment
1. **Frontend:** Deployed on Vercel
2. **Smart Contracts:** Deployed on BNB Chain Testnet
3. **Database:** Supabase (optional)
4. **Memory:** Membase

### Repository
- **GitHub:** https://github.com/joboyebisi/WagerSidus
- **Live Demo:** [Vercel URL]

---

## 📞 Contact & Links

- **GitHub Repository:** https://github.com/joboyebisi/WagerSidus
- **Demo Video:** [Link to demo]
- **Presentation:** [Link to slides]

---

## 🎯 Conclusion

WagerSidus represents a significant advancement in decentralized betting platforms by combining:
- **Natural language interfaces** for ease of use
- **AI-powered verification** for accuracy
- **Blockchain security** for trust
- **Social integration** via Telegram
- **Charity features** for social impact

We believe this project demonstrates the potential of AI + Blockchain + Social platforms to create innovative, user-friendly, and socially impactful applications.

---

**Built with ❤️ for the Hackathon**

