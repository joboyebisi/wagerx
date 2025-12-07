# WagerSidus - Comprehensive TODO List

Based on PRD and current project state. Organized by priority and feature area.

## 🎯 Priority 1: Core Functionality (Must Have)

### 1. Environment & Configuration Setup
- [ ] **Set up environment variables**
  - Add `NEXT_PUBLIC_WAGER_CONTRACT_ADDRESS` to `.env.local`
  - Verify all required API keys are configured:
    - `NEXT_PUBLIC_PERPLEXITY_API_KEY`
    - `NEXT_PUBLIC_PRIVY_APP_ID`
    - `MEMBASE_ID`, `MEMBASE_ACCOUNT`, `MEMBASE_SECRET_KEY`
    - `NEXT_PUBLIC_SIDUS_AI_API_KEY` (optional)
    - `COINMARKETCAP_API_KEY`
    - `TELEGRAM_BOT_TOKEN` (for bot commands)
    - `TELEGRAM_WEBHOOK_URL` (for production webhook)
  - Create `.env.local.example` with all required variables

### 2. Smart Contract Integration Service
- [ ] **Create contract interaction service** (`lib/services/contract.ts`)
  - Initialize ethers.js contract instance with deployed address
  - Implement `createWager()` - call contract with participants, amount, condition, charity options
  - Implement `acceptWager(wagerId)` - call contract acceptWager function
  - Implement `resolveWager(wagerId, winner, evidence)` - call contract resolveWager function
  - Implement `getWager(wagerId)` - read wager data from contract
  - Implement `cancelWager(wagerId)` - call contract cancelWager function
  - Handle transaction signing via Privy wallet
  - Add error handling for contract calls
  - Add transaction receipt waiting and confirmation

### 3. Wager Creation Flow
- [ ] **Create wager creation page** (`app/wagers/create/page.tsx`)
  - Form with fields:
    - Participants (wallet addresses or Telegram usernames)
    - Amount (BNB)
    - Condition (text input, pre-filled from natural language if available)
    - Category (Sports/Crypto selector)
    - Resolution date
    - Charity options (enabled, percentage, address)
  - Pre-populate from natural language intent if coming from Dashboard
  - Connect to smart contract on submit
  - Show transaction status (pending, confirmed)
  - Redirect to wager detail page on success

- [ ] **Implement POST endpoint** (`app/api/wagers/route.ts` POST method)
  - Validate input data
  - Call smart contract createWager function
  - Store wager metadata in Supabase/Membase
  - Return wager ID and contract address
  - Handle errors gracefully

### 4. Wager List & Display
- [ ] **Create wager list page** (`app/wagers/page.tsx`)
  - Fetch wagers from database (filtered by user address)
  - Display wagers in cards with:
    - Wager ID
    - Condition/description
    - Amount
    - Status (pending, active, resolved, cancelled)
    - Participants
    - Created date
  - Add filtering by status
  - Add search functionality
  - Click to navigate to detail page

- [ ] **Update GET endpoint** (`app/api/wagers/route.ts` GET method)
  - Fetch wagers from database
  - Optionally sync with on-chain data
  - Filter by user address
  - Return formatted wager list

### 5. Wager Detail Page
- [ ] **Create wager detail page** (`app/wagers/[id]/page.tsx`)
  - Display full wager information:
    - Contract address and wager ID
    - All participants with addresses
    - Amount and currency
    - Condition/description
    - Category (sports/crypto)
    - Status
    - Created date, resolution date
    - Winner (if resolved)
    - Charity information (if enabled)
  - Action buttons based on status:
    - **Pending**: "Accept Wager" button (if user is participant)
    - **Active**: "Resolve Wager" button (if resolution date passed)
    - **Resolved**: Show winner and transaction details
    - **Cancelled**: Show cancellation info
  - Connect actions to smart contract functions
  - Show transaction status for all actions

## 🎯 Priority 2: Smart Contract Integration (Critical)

### 6. Wager Acceptance Flow
- [ ] **Implement accept wager functionality**
  - In wager detail page, add "Accept Wager" button
  - Check user is a participant
  - Check user has sufficient BNB balance
  - Call smart contract `acceptWager(wagerId)` with user's wallet
  - Show transaction pending state
  - Wait for transaction confirmation
  - Update wager status to "active"
  - Show success message
  - Refresh wager data

### 7. Wager Resolution Flow
- [ ] **Implement resolve wager functionality**
  - In wager detail page, add "Resolve Wager" button
  - Check resolution date has passed
  - Call AI verification service (`/api/verify`)
  - Get winner from AI agent
  - Call smart contract `resolveWager(wagerId, winner, evidence)`
  - Show transaction pending state
  - Wait for transaction confirmation
  - Update wager status to "resolved"
  - Show winner and payout information
  - Show charity donation (if enabled)

- [ ] **Update verify endpoint** (`app/api/verify/route.ts`)
  - Accept wager ID or wager data
  - Call AI agent service to verify outcome
  - Return winner address and evidence
  - Handle sports and crypto verification differently

### 8. Natural Language Integration
- [ ] **Connect natural language to smart contract**
  - Update Dashboard `handleIntentDetected` function
  - For "create" intent: Navigate to create page with pre-filled data
  - For "accept" intent: Call acceptWager contract function directly
  - For "resolve" intent: Call resolveWager contract function with AI verification
  - Show transaction status in UI
  - Handle errors and show user-friendly messages

### 9. Transaction Status Tracking
- [ ] **Add transaction status UI**
  - Show loading spinner during transaction
  - Display transaction hash
  - Show "Pending" status with link to BSCScan
  - Poll for transaction confirmation
  - Show "Confirmed" status when transaction is mined
  - Display transaction receipt details
  - Handle failed transactions with error messages

## 🎯 Priority 3: Data Synchronization (Important)

### 10. Wager Status Synchronization
- [ ] **Sync on-chain and off-chain data**
  - Create sync function to read wager status from contract
  - Update database when status changes on-chain
  - Handle status transitions: pending -> active -> resolved
  - Add event listeners for contract events (WagerCreated, WagerResolved)
  - Periodic sync job or API endpoint

### 11. Database Schema & Storage
- [ ] **Ensure proper wager storage**
  - Verify Supabase schema matches wager structure
  - Store wager metadata (condition, participants, dates)
  - Store contract address and wager ID mapping
  - Store transaction hashes for all actions
  - Store charity information
  - Add indexes for efficient queries

## 🎯 Priority 4: User Experience (Enhancement)

### 12. Error Handling & User Feedback
- [ ] **Comprehensive error handling**
  - Insufficient BNB balance errors
  - Network errors (RPC failures)
  - Contract revert errors (with readable messages)
  - API errors (Perplexity, CoinMarketCap)
  - User-friendly error messages
  - Retry mechanisms for transient errors
  - Toast notifications for success/error states

### 13. Charity Donation Flow
- [ ] **Verify charity functionality**
  - Test charity percentage calculation
  - Verify charity address validation
  - Test charity distribution on resolution
  - Show charity donation in wager details
  - Display charity transaction hash

### 14. Wager Filtering & Search
- [ ] **Enhanced wager list features**
  - Filter by status (all, pending, active, resolved, cancelled)
  - Filter by category (sports, crypto)
  - Filter by date range
  - Search by condition text
  - Sort by date, amount, status
  - Pagination for large lists

### 15. Balance Checking
- [ ] **Add BNB balance display**
  - Show user's BNB balance in Dashboard
  - Check balance before creating wager
  - Check balance before accepting wager
  - Warn if insufficient funds
  - Link to swap tokens if needed

## 🎯 Priority 5: Automation & Advanced Features (Nice to Have)

### 16. Automatic Wager Resolution
- [ ] **Background resolution system**
  - API endpoint to check wagers ready for resolution
  - Cron job or scheduled task to run resolution checks
  - Automatically trigger AI verification when resolution date passes
  - Automatically call resolveWager contract function
  - Send notifications to participants

### 17. Telegram Notifications
- [ ] **Telegram Bot integration**
  - Send notification when wager is created
  - Send notification when wager is accepted
  - Send notification when wager is resolved
  - Send notification when user is mentioned as participant
  - Use Telegram Bot API

### 18. Wager Cancellation
- [ ] **Implement cancellation flow**
  - Add "Cancel Wager" button (only for creator or before acceptance)
  - Call smart contract `cancelWager(wagerId)`
  - Verify refunds are processed correctly
  - Update status to "cancelled"
  - Show cancellation transaction

## 🎯 Priority 6: Testing & Polish (Final Steps)

### 19. End-to-End Testing
- [ ] **Test complete wager flow**
  - Create wager with natural language
  - Accept wager from another wallet
  - Wait for resolution date (or manually trigger)
  - Verify AI resolution works correctly
  - Verify funds are distributed correctly
  - Verify charity donation (if enabled)
  - Test error scenarios (insufficient funds, network errors)

### 20. UI/UX Polish
- [ ] **Improve user interface**
  - Add skeleton loaders for async data
  - Add success/error toast notifications
  - Smooth transitions and animations
  - Responsive design for mobile
  - Loading states for all async operations
  - Empty states for no wagers
  - Better error messages and recovery options

### 21. Code Quality
- [ ] **Final code improvements**
  - Add TypeScript types for all contract interactions
  - Add JSDoc comments for complex functions
  - Remove console.logs and add proper logging
  - Optimize API calls and reduce redundant requests
  - Add input validation on all forms
  - Security review (no private keys in client code)

## 📋 Implementation Order Recommendation

1. **Week 1: Foundation**
   - Todo #1: Environment setup
   - Todo #2: Smart contract service
   - Todo #3: Wager creation page
   - Todo #6: POST endpoint

2. **Week 2: Core Features**
   - Todo #4: Wager list page
   - Todo #5: Wager detail page
   - Todo #7: Accept wager flow
   - Todo #8: Resolve wager flow

3. **Week 3: Integration**
   - Todo #9: Natural language integration
   - Todo #10: Transaction tracking
   - Todo #11: Status synchronization
   - Todo #12: Error handling

4. **Week 4: Polish**
   - Todo #13-15: UX enhancements
   - Todo #19-20: Testing and polish
   - Todo #16-18: Advanced features (if time permits)

## 🔧 Technical Notes

### Smart Contract Functions Reference
```solidity
// Create wager
createWager(
  address[] participants,
  uint256 amount,
  string condition,
  bool charityEnabled,
  uint8 charityPercentage,
  address charityAddress
) returns (uint256 wagerId)

// Accept wager
acceptWager(uint256 wagerId)

// Resolve wager
resolveWager(
  uint256 wagerId,
  address winner,
  string evidence
)

// Get wager
getWager(uint256 wagerId) returns (Wager memory)

// Cancel wager
cancelWager(uint256 wagerId)
```

### Required Environment Variables
```
NEXT_PUBLIC_WAGER_CONTRACT_ADDRESS=<deployed_contract_address>
NEXT_PUBLIC_PERPLEXITY_API_KEY=<key>
NEXT_PUBLIC_PRIVY_APP_ID=<app_id>
MEMBASE_ID=<id>
MEMBASE_ACCOUNT=<account>
MEMBASE_SECRET_KEY=<key>
COINMARKETCAP_API_KEY=<key>
BSC_TESTNET_RPC_URL=<rpc_url>
```

### Key Files to Create/Update
- `lib/services/contract.ts` - NEW: Smart contract interaction service
- `app/wagers/create/page.tsx` - NEW: Wager creation page
- `app/wagers/page.tsx` - NEW: Wager list page
- `app/wagers/[id]/page.tsx` - NEW: Wager detail page
- `app/api/wagers/route.ts` - UPDATE: Add POST method
- `components/Dashboard.tsx` - UPDATE: Connect to contract
- `app/api/verify/route.ts` - UPDATE: Improve verification logic

## 🎯 Priority 7: Telegram Bot & Mini App Enhancement (New)

### 22. Telegram Bot Commands
- [ ] **Create Telegram bot service** (`lib/services/telegramBot.ts`)
  - Implement command handlers: /start, /create, /accept, /resolve, /cancel, /list, /wager, /help
  - Parse commands and arguments
  - Route to appropriate handlers
  - Fallback to natural language processing if not a command
  - Send formatted responses via Telegram Bot API

- [ ] **Create webhook API route** (`app/api/telegram/webhook/route.ts`)
  - Handle incoming Telegram updates
  - Process messages and callback queries
  - Send responses back to users
  - Error handling and logging

- [ ] **Set up Telegram bot**
  - Create bot via @BotFather
  - Get bot token and add to environment variables
  - Set webhook URL (production) or use polling (development)
  - Register bot commands with Telegram

### 23. Telegram Mini App Enhancements
- [ ] **Create Telegram hook** (`lib/hooks/useTelegram.ts`)
  - Detect if running in Telegram
  - Get Telegram user info
  - Apply Telegram theme colors
  - Handle back button
  - Handle viewport changes

- [ ] **Enhance Mini App UI**
  - Optimize for mobile viewport
  - Use Telegram theme colors throughout
  - Add proper touch targets
  - Handle back button navigation
  - Add Telegram-specific UI elements (haptic feedback, etc.)

- [ ] **Update components for Telegram**
  - Update Dashboard to use Telegram hook
  - Apply Telegram theme in all components
  - Add Telegram user info display
  - Optimize for mobile interactions

### 24. Command Menu & Help System
- [ ] **Register bot commands**
  - Use Telegram Bot API setMyCommands
  - Create command menu for users
  - Add descriptions for each command

- [ ] **Create help system**
  - Comprehensive /help command
  - Usage examples for each command
  - Natural language examples
  - Link to Mini App for full features

- [ ] **Add inline keyboards** (optional)
  - Quick action buttons
  - Wager action buttons (accept, resolve, cancel)
  - Navigation buttons

---

**Status Legend:**
- ⬜ Not Started
- 🔄 In Progress
- ✅ Completed
- ❌ Blocked/Cancelled

