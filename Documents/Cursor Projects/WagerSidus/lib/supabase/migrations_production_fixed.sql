-- ================================
-- WAGERX DATABASE SCHEMA (PRODUCTION) - FIXED VERSION
-- Complete setup matching user's requirements
-- This version handles existing tables gracefully
-- ================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================
-- USERS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id TEXT UNIQUE NOT NULL,
  username TEXT,
  wallet_address TEXT,
  total_wagers INTEGER DEFAULT 0,
  total_donated DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- WAGERS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS wagers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_telegram_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  wager_type TEXT DEFAULT 'sports' CHECK (wager_type IN ('sports', 'crypto')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'funded', 'active', 'resolving', 'resolved', 'paid_out', 'cancelled')),
  
  -- Group information
  group_id TEXT,
  group_name TEXT,
  
  -- Resolution
  outcome TEXT,
  winner_telegram_id TEXT,
  confidence_score INTEGER,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Charity
  charity_enabled BOOLEAN DEFAULT FALSE,
  charity_percentage INTEGER CHECK (charity_percentage >= 0 AND charity_percentage <= 10),
  charity_id TEXT,
  charity_name TEXT,
  charity_wallet TEXT,
  
  -- Blockchain
  contract_address TEXT,
  escrow_wallet TEXT,
  
  -- Timestamps
  deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if table already exists
DO $$ 
BEGIN
  -- Add wager_id_onchain if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wagers' AND column_name = 'wager_id_onchain'
  ) THEN
    ALTER TABLE wagers ADD COLUMN wager_id_onchain TEXT;
  END IF;
  
  -- Add tx_hash if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wagers' AND column_name = 'tx_hash'
  ) THEN
    ALTER TABLE wagers ADD COLUMN tx_hash TEXT;
  END IF;
END $$;

-- ================================
-- PARTICIPANTS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wager_id UUID REFERENCES wagers(id) ON DELETE CASCADE,
  telegram_id TEXT NOT NULL,
  telegram_username TEXT,
  wallet_address TEXT NOT NULL,
  prediction TEXT,
  funded BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(wager_id, telegram_id)
);

-- ================================
-- CHARITY DONATIONS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS charity_donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wager_id UUID REFERENCES wagers(id) ON DELETE CASCADE,
  amount DECIMAL NOT NULL,
  charity_id TEXT,
  charity_name TEXT NOT NULL,
  charity_wallet TEXT NOT NULL,
  tx_hash TEXT,
  donated_by_telegram_id TEXT,
  donated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- DELEGATION PERMISSIONS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS delegation_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delegator TEXT NOT NULL,
  delegate TEXT NOT NULL,
  target TEXT NOT NULL,
  selector TEXT NOT NULL,
  expires BIGINT NOT NULL,
  nonce BIGINT NOT NULL,
  signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(delegator, nonce)
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================
CREATE INDEX IF NOT EXISTS idx_wagers_status ON wagers(status);
CREATE INDEX IF NOT EXISTS idx_wagers_group_id ON wagers(group_id);
CREATE INDEX IF NOT EXISTS idx_wagers_creator ON wagers(creator_telegram_id);
CREATE INDEX IF NOT EXISTS idx_wagers_wager_id_onchain ON wagers(wager_id_onchain);
CREATE INDEX IF NOT EXISTS idx_participants_wager_id ON participants(wager_id);
CREATE INDEX IF NOT EXISTS idx_participants_telegram_id ON participants(telegram_id);
CREATE INDEX IF NOT EXISTS idx_participants_wallet ON participants(wallet_address);
CREATE INDEX IF NOT EXISTS idx_charity_donations_wager_id ON charity_donations(wager_id);
CREATE INDEX IF NOT EXISTS idx_delegation_delegator ON delegation_permissions(delegator);

-- ================================
-- ROW LEVEL SECURITY (RLS)
-- ================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wagers ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE charity_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegation_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "demo_users_select" ON users;
DROP POLICY IF EXISTS "demo_users_insert" ON users;
DROP POLICY IF EXISTS "demo_users_update" ON users;
DROP POLICY IF EXISTS "demo_wagers_select" ON wagers;
DROP POLICY IF EXISTS "demo_wagers_insert" ON wagers;
DROP POLICY IF EXISTS "demo_wagers_update" ON wagers;
DROP POLICY IF EXISTS "demo_participants_select" ON participants;
DROP POLICY IF EXISTS "demo_participants_insert" ON participants;
DROP POLICY IF EXISTS "demo_participants_update" ON participants;
DROP POLICY IF EXISTS "demo_charity_donations_select" ON charity_donations;
DROP POLICY IF EXISTS "demo_charity_donations_insert" ON charity_donations;
DROP POLICY IF EXISTS "demo_delegation_select" ON delegation_permissions;
DROP POLICY IF EXISTS "demo_delegation_insert" ON delegation_permissions;
DROP POLICY IF EXISTS "demo_delegation_update" ON delegation_permissions;
DROP POLICY IF EXISTS "demo_delegation_delete" ON delegation_permissions;

-- Create policies (allow all for demo/hackathon - restrict in production!)
CREATE POLICY "demo_users_select" ON users FOR SELECT USING (true);
CREATE POLICY "demo_users_insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "demo_users_update" ON users FOR UPDATE USING (true);

CREATE POLICY "demo_wagers_select" ON wagers FOR SELECT USING (true);
CREATE POLICY "demo_wagers_insert" ON wagers FOR INSERT WITH CHECK (true);
CREATE POLICY "demo_wagers_update" ON wagers FOR UPDATE USING (true);

CREATE POLICY "demo_participants_select" ON participants FOR SELECT USING (true);
CREATE POLICY "demo_participants_insert" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "demo_participants_update" ON participants FOR UPDATE USING (true);

CREATE POLICY "demo_charity_donations_select" ON charity_donations FOR SELECT USING (true);
CREATE POLICY "demo_charity_donations_insert" ON charity_donations FOR INSERT WITH CHECK (true);

CREATE POLICY "demo_delegation_select" ON delegation_permissions FOR SELECT USING (true);
CREATE POLICY "demo_delegation_insert" ON delegation_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "demo_delegation_update" ON delegation_permissions FOR UPDATE USING (true);
CREATE POLICY "demo_delegation_delete" ON delegation_permissions FOR DELETE USING (true);

-- ================================
-- FUNCTIONS
-- ================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_wagers_updated_at ON wagers;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wagers_updated_at BEFORE UPDATE ON wagers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- SUCCESS MESSAGE
-- ================================
DO $$
BEGIN
  RAISE NOTICE '✅ WagerX Database Schema Created Successfully!';
  RAISE NOTICE '📊 Tables: users, wagers, participants, charity_donations, delegation_permissions';
  RAISE NOTICE '🔒 Row Level Security enabled (demo mode)';
END $$;

SELECT 'WagerX Database Setup Complete! 🎉' as message;

